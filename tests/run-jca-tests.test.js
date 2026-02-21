/**
 * Node.js tests for the JS-CRUD-API library (esm/index.js)
 *
 * Validates that the JS-CRUD-API library produces the same results
 * as the PHP-CRUD-API REST API using .log files as reference.
 *
 * Strategy:
 * - Each adaptable request goes through JS-CRUD-API (list, read, create, update, delete)
 * - Non-adaptable requests (batch create/update, XML, form-encoded, etc.) go through fetch()
 * - API Key auth goes through the library via config.headers (stateless)
 * - Files with session auth (dbAuth, JWT, Basic) are handled via fetch()
 *   because they create PHP sessions and Node.js has no native cookie jar
 * - Results are compared to expected responses from .log files
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

import { loadEnv } from './shared/env.js';
import {
  parseLogFile,
  parseHeaders,
  toJsonIfPossible,
  cookieJarFromSetCookie,
} from './shared/log-parser.js';
import { normalizeResponse, buildUrl } from './shared/normalizers.js';
import { walkLogs } from './shared/fs-utils.js';
import { JcaAdapter } from './shared/jca-adapter.js';

const root = resolve(process.cwd());
const functionalDir = join(root, 'tests', 'php-crud-tests', 'functional');

loadEnv(join(root, 'tests', '.env'));

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8081/api.php';
const logRequests = process.env.JCA_TEST_LOG === '1';
const resetDb = process.env.RESET_DB !== '0';
const dbPath = process.env.SQLITE_DB || join(root, 'tests', 'var', 'php-crud-api.sqlite');
const fixturePath = process.env.SQLITE_FIXTURE || join(root, 'tests', 'php-crud-tests', 'fixtures', 'blog_sqlite.sql');

const SESSION_AUTH_ENDPOINTS = ['/login', '/logout', '/register', '/password', '/me'];
// JWT (X-Authorization) and Basic (Authorization) create PHP sessions.
// Subsequent requests in the same file may depend on session state,
// which requires a shared cookie jar not available via the library in Node.js.
// API Keys (X-API-Key, X-API-Key-DB) do not create this session dependency.
const SESSION_CREATING_HEADERS = ['x-authorization', 'authorization'];

/**
 * Determines whether a .log file requires session handling (cookies).
 * Detects dbAuth endpoints AND JWT/Basic headers that create PHP sessions.
 * These files must be handled entirely via fetch() in Node.js
 * because fetch() does not handle session cookies automatically.
 * API Keys go through the library via config.headers (no session dependency).
 */
const fileHasSessionAuth = (pairs) => {
  return pairs.some(({ request }) => {
    const pathOnly = request.path.split('?')[0];
    if (SESSION_AUTH_ENDPOINTS.includes(pathOnly)) return true;
    if (request.headers instanceof Map) {
      for (const key of request.headers.keys()) {
        if (SESSION_CREATING_HEADERS.includes(key)) return true;
      }
    }
    return false;
  });
};

/**
 * Executes a request via raw fetch() (for non-adaptable cases)
 */
const fetchDirect = async (request, cookieJar) => {
  const headers = {};
  for (const [name, values] of request.headers.entries()) {
    if (name === 'host' || name === 'content-length') continue;
    const headerName = name === 'x-api-key'
      ? 'X-API-Key'
      : name === 'x-api-key-db'
        ? 'X-API-Key-DB'
        : name;
    headers[headerName] = values.join(', ');
  }

  if (!headers.cookie && cookieJar.size) {
    headers.cookie = Array.from(cookieJar.values()).join('; ');
  }

  const url = buildUrl(baseUrl, request.path);
  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.body || undefined,
  });

  const responseText = await response.text();

  const headerLines = Array.from(response.headers.entries()).map(([k, v]) => `${k}: ${v}`);
  if (typeof response.headers.getSetCookie === 'function') {
    for (const cookie of response.headers.getSetCookie()) {
      headerLines.push(`set-cookie: ${cookie}`);
    }
  } else if (response.headers.get('set-cookie')) {
    headerLines.push(`set-cookie: ${response.headers.get('set-cookie')}`);
  }

  const actual = {
    status: response.status,
    statusText: response.statusText,
    headers: parseHeaders(headerLines),
    body: responseText,
  };

  const newCookies = cookieJarFromSetCookie(actual.headers);
  for (const [name, value] of newCookies.entries()) {
    cookieJar.set(name, value);
  }

  return actual;
};

/**
 * Compares the actual response with the expected response
 */
const compareResponse = (actual, expected, context) => {
  assert.equal(
    actual.status,
    expected.status,
    `Expected status ${expected.status}, got ${actual.status} | ${context}`
  );

  const actualBody = normalizeResponse(toJsonIfPossible(actual.body));
  const expectedBody = normalizeResponse(toJsonIfPossible(expected.body));
  assert.deepEqual(actualBody, expectedBody, `Body mismatch | ${context}`);
};

/**
 * Converts Map headers to a flat object for canAdapt()
 */
const headersToObject = (headers) => {
  const obj = {};
  if (headers instanceof Map) {
    for (const [key, values] of headers) {
      obj[key] = Array.isArray(values) ? values[0] : values;
    }
  }
  return obj;
};

if (!existsSync(functionalDir)) {
  test('downloaded tests missing', () => {
    assert.fail('No tests found. Run: npm run test:sync');
  });
} else {
  test('JS-CRUD-API tests (SQLite)', async (t) => {
    if (resetDb) {
      try {
        if (existsSync(dbPath)) unlinkSync(dbPath);
      } catch { /* ignore */ }
      const sql = readFileSync(fixturePath, 'utf8');
      const init = spawnSync('sqlite3', [dbPath], {
        input: sql,
        encoding: 'utf8',
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      if (init.status !== 0) {
        throw new Error('SQLite init failed. Check sqlite3 and fixture path.');
      }
    }

    const adapter = new JcaAdapter(baseUrl);
    const logFiles = await walkLogs(functionalDir);
    assert.ok(logFiles.length > 0, 'No .log files found');

    let jcaCount = 0;
    let fetchCount = 0;
    let skipCount = 0;

    for (const file of logFiles) {
      const relPath = relative(functionalDir, file).replace(/\\/g, '/');

      // Skip SSL redirect
      if (file.includes('redirect_to_ssl.log')) {
        skipCount++;
        await t.test(relPath, { skip: 'ssl-redirect' }, () => {});
        continue;
      }

      const content = await readFile(file, 'utf8');
      const parsed = parseLogFile(content);

      if (parsed.skip) {
        skipCount++;
        await t.test(relPath, { skip: parsed.reason }, () => {});
        continue;
      }

      // If the file contains session auth endpoints, everything goes through fetch()
      const forceRawFetch = fileHasSessionAuth(parsed.pairs);

      // Cookie jar per file (like the reference REST test)
      const cookieJar = new Map();

      await t.test(relPath, async () => {
        for (let i = 0; i < parsed.pairs.length; i++) {
          const { request, response: expected } = parsed.pairs[i];
          const context = `${relPath}[${i + 1}] ${request.method} ${request.path}`;

          if (forceRawFetch) {
            // File with auth -> everything via fetch()
            fetchCount++;
            if (logRequests) console.log(`  [FETCH/auth] ${context}`);

            const actual = await fetchDirect(request, cookieJar);
            compareResponse(actual, expected, context);
          } else {
            const headersObj = headersToObject(request.headers);
            const { adaptable, reason, headers: adaptHeaders } = adapter.canAdapt(
              request.method, request.path, headersObj, request.body
            );

            if (adaptable) {
              // Via JS-CRUD-API
              jcaCount++;
              if (logRequests) console.log(`  [JCA] ${context}`);

              const actual = await adapter.executeAsResponse(
                request.method,
                request.path,
                request.body || undefined,
                adaptHeaders
              );
              compareResponse(actual, expected, context);
            } else {
              // Fallback fetch()
              fetchCount++;
              if (logRequests) console.log(`  [FETCH] ${context} (${reason})`);

              const actual = await fetchDirect(request, cookieJar);
              compareResponse(actual, expected, context);
            }
          }
        }
      });
    }

    console.log(`\n  JCA: ${jcaCount} requests | FETCH: ${fetchCount} requests | SKIP: ${skipCount} files`);
  });
}
