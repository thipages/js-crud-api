import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

const root = resolve(process.cwd());
const functionalDir = join(root, 'test-new', 'php-crud-tests', 'functional');

loadEnv(join(root, 'test-new', '.env'));

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8081/api.php';
const strict = process.env.JCA_TEST_STRICT === '1';
const logRequests = process.env.JCA_TEST_LOG === '1';
const resetDb = process.env.RESET_DB !== '0';
const dbPath = process.env.SQLITE_DB || join(root, 'test-new', 'var', 'php-crud-api.sqlite');
const fixturePath = process.env.SQLITE_FIXTURE || join(root, 'test-new', 'php-crud-tests', 'fixtures', 'blog_sqlite.sql');

const compareResponse = (actual, expected, context) => {
  assert.equal(
    actual.status,
    expected.status,
    `Status attendu ${expected.status}, reçu ${actual.status} | ${context}`
  );

  const actualBody = normalizeResponse(toJsonIfPossible(actual.body));
  const expectedBody = normalizeResponse(toJsonIfPossible(expected.body));
  assert.deepEqual(actualBody, expectedBody, `Body différent | ${context}`);

  if (strict) {
    for (const [name, values] of expected.headers.entries()) {
      if (name === 'content-length') continue;
      const actualValues = actual.headers.get(name) || [];
      assert.deepEqual(actualValues, values, `Header ${name} différent | ${context}`);
    }
  }
};

if (!existsSync(functionalDir)) {
  test('tests téléchargés absents', () => {
    assert.fail('Aucun test trouvé. Lancez: npm run test:sync');
  });
} else {
  test('PHP-CRUD-API REST tests (SQLite)', async () => {
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
        throw new Error('SQLite init failed. Vérifie sqlite3 et le chemin des fixtures.');
      }
    }

    if (logRequests) console.log(`[REST] baseUrl=${baseUrl}`);

    const logFiles = await walkLogs(functionalDir);
    assert.ok(logFiles.length > 0, 'Aucun fichier .log trouvé');

    for (const file of logFiles) {
      if (file.includes('redirect_to_ssl.log')) {
        if (logRequests) console.log(`[REST] skip-ssl-redirect: ${file}`);
        continue;
      }

      const content = await readFile(file, 'utf8');
      const parsed = parseLogFile(content);

      if (parsed.skip) {
        if (logRequests) console.log(`[REST] ${parsed.reason}`);
        continue;
      }

      let cookieJar = new Map();

      for (let i = 0; i < parsed.pairs.length; i++) {
        const { request, response: expected } = parsed.pairs[i];

        assert.ok(request.method, `Requête invalide dans ${file}`);
        assert.ok(request.path, `Chemin invalide dans ${file}`);

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
        if (logRequests) {
          console.log(`[REST] ${request.method} ${url}`);
          if (Object.keys(headers).length) {
            console.log(`[REST] headers ${JSON.stringify(headers)}`);
          }
        }

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

        const context = `${file} | ${request.method} ${request.path}`;
        compareResponse(actual, expected, context);
      }
    }
  });
}
