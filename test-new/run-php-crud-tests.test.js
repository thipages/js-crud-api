import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync, unlinkSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

const root = resolve(process.cwd());
const testsRoot = join(root, 'test-new', 'php-crud-tests');
const functionalDir = join(testsRoot, 'functional');

dotenv.config({ path: join(root, 'test-new', '.env') });

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8081/api.php';
const strict = process.env.JCA_TEST_STRICT === '1';
const logRequests = process.env.JCA_TEST_LOG === '1';
const resetDb = process.env.RESET_DB !== '0';
const dbPath = process.env.SQLITE_DB || join(root, 'test-new', 'var', 'php-crud-api.sqlite');
const fixturePath = process.env.SQLITE_FIXTURE || join(root, 'test-new', 'php-crud-tests', 'fixtures', 'blog_sqlite.sql');

const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

const splitRequestResponsePairs = (content) => {
  const normalized = normalizeNewlines(content);
  const blocks = normalized
    .split(/^===\s*$/m)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks;
};

const parseHeaders = (lines) => {
  const headers = new Map();
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!headers.has(name)) headers.set(name, []);
    headers.get(name).push(value);
  }
  return headers;
};

const parseHttpRequest = (raw) => {
  const text = normalizeNewlines(raw);
  const [head, ...bodyParts] = text.split('\n\n');
  const lines = head.split('\n');
  const [requestLine, ...headerLines] = lines;
  if (!requestLine) {
    return { method: '', path: '', headers: new Map(), body: '' };
  }
  const [method, path] = requestLine.trim().split(' ');
  const headers = parseHeaders(headerLines);
  const body = bodyParts.length ? bodyParts.join('\n\n') : '';
  return { method, path, headers, body };
};

const parseHttpResponse = (raw) => {
  const text = normalizeNewlines(raw);
  const [head, ...bodyParts] = text.split('\n\n');
  const lines = head.split('\n');
  const [statusLine, ...headerLines] = lines;
  const statusParts = statusLine.trim().split(' ');
  const hasHttp = statusParts[0].toUpperCase().startsWith('HTTP/');
  const status = Number(hasHttp ? statusParts[1] : statusParts[0]);
  const statusText = hasHttp ? statusParts.slice(2).join(' ') : statusParts.slice(1).join(' ');
  const headers = parseHeaders(headerLines);
  const body = bodyParts.length ? bodyParts.join('\n\n') : '';
  return { status, statusText, headers, body };
};

const toJsonIfPossible = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const cookieJarFromSetCookie = (headers) => {
  const cookies = headers.get('set-cookie') || [];
  const jar = new Map();
  for (const c of cookies) {
    const part = c.split(';')[0].trim();
    if (!part) continue;
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;
    const name = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    jar.set(name, `${name}=${value}`);
  }
  return jar;
};

const walkLogs = async (dir) => {
  const result = [];
  const entries = await readdir(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) {
      result.push(...(await walkLogs(full)));
    } else if (entry.endsWith('.log')) {
      result.push(full);
    }
  }
  return result;
};

const buildUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = new URL(baseUrl);
  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const queryIndex = cleanPath.indexOf('?');
  const pathOnly = queryIndex >= 0 ? cleanPath.slice(0, queryIndex) : cleanPath;
  const search = queryIndex >= 0 ? cleanPath.slice(queryIndex + 1) : '';
  base.pathname = `${basePath}${pathOnly}`;
  base.search = search ? `?${search}` : '';
  base.hash = '';
  return base.toString();
};

const normalizeIpAddress = (value) => {
  if (value === '::1') return '127.0.0.1';
  return value;
};

const normalizeResponse = (body) => {
  if (body && typeof body === 'object') {
    if (Array.isArray(body)) {
      return body.map(normalizeResponse);
    }
    const copy = { ...body };
    if (typeof copy.ip_address === 'string') {
      copy.ip_address = normalizeIpAddress(copy.ip_address);
    }
    if (Array.isArray(copy.records)) {
      copy.records = copy.records.map(normalizeResponse);
    }
    return copy;
  }
  return body;
};

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
    const expectedHeaders = expected.headers;
    for (const [name, values] of expectedHeaders.entries()) {
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
        if (existsSync(dbPath)) {
          unlinkSync(dbPath);
        }
      } catch {
        // ignore
      }
      const sql = readFileSync(fixturePath, 'utf8');
      const init = spawnSync('sqlite3', [dbPath], {
        input: sql,
        encoding: 'utf8',
        stdio: ['pipe', 'inherit', 'inherit']
      });
      if (init.status !== 0) {
        throw new Error('SQLite init failed. Vérifie sqlite3 et le chemin des fixtures.');
      }
    }

    if (logRequests) {
      console.log(`[REST] baseUrl=${baseUrl}`);
    }
    const logFiles = await walkLogs(functionalDir);
    assert.ok(logFiles.length > 0, 'Aucun fichier .log trouvé');

    for (const file of logFiles) {
      if (file.includes('redirect_to_ssl.log')) {
        if (logRequests) {
          console.log(`[REST] skip-ssl-redirect: ${file}`);
        }
        continue;
      }

      const content = await readFile(file, 'utf8');
      const parts = splitRequestResponsePairs(content);

      if (parts[0] && (parts[0].startsWith('skip-for-sqlite:') || parts[0].startsWith('skip-always:'))) {
        if (logRequests) {
          console.log(`[REST] ${parts[0]}`);
        }
        continue;
      }

      let cookieJar = new Map();

      for (let i = 0; i < parts.length; i += 2) {
        const requestRaw = parts[i];
        const responseRaw = parts[i + 1];
        if (!responseRaw) continue;

        const request = parseHttpRequest(requestRaw);
        const expected = parseHttpResponse(responseRaw);

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

        const url = buildUrl(request.path);
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
        if (newCookies.size) {
          for (const [name, value] of newCookies.entries()) {
            cookieJar.set(name, value);
          }
        }

        const context = `${file} | ${request.method} ${request.path}`;
        compareResponse(actual, expected, context);
      }
    }
  });
}
