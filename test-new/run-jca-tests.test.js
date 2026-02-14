/**
 * Tests Node.js pour la librairie JS-CRUD-API (esm/index.js)
 *
 * Valide que la librairie JS-CRUD-API produit les mêmes résultats
 * que l'API REST PHP-CRUD-API en utilisant les fichiers .log comme référence.
 *
 * Stratégie :
 * - Chaque requête adaptable passe par JS-CRUD-API (list, read, create, update, delete)
 * - Les requêtes non adaptables (batch, XML, form-encoded, auth, etc.) passent par fetch()
 * - Les fichiers contenant des flux d'auth (login/logout) sont traités entièrement via fetch()
 *   car les cookies de session ne sont pas partagés entre l'adaptateur et fetch()
 * - Les résultats sont comparés aux réponses attendues des fichiers .log
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
const functionalDir = join(root, 'test-new', 'php-crud-tests', 'functional');

loadEnv(join(root, 'test-new', '.env'));

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8081/api.php';
const logRequests = process.env.JCA_TEST_LOG === '1';
const resetDb = process.env.RESET_DB !== '0';
const dbPath = process.env.SQLITE_DB || join(root, 'test-new', 'var', 'php-crud-api.sqlite');
const fixturePath = process.env.SQLITE_FIXTURE || join(root, 'test-new', 'php-crud-tests', 'fixtures', 'blog_sqlite.sql');

const AUTH_ENDPOINTS = ['/login', '/logout', '/register', '/password', '/me'];
const AUTH_HEADERS = ['x-authorization', 'authorization', 'x-api-key', 'x-api-key-db'];

/**
 * Détermine si un fichier .log contient des flux d'auth.
 * Détecte les endpoints d'auth ET les headers d'auth (JWT, Basic, API key).
 * Ces fichiers doivent être traités entièrement via fetch() pour maintenir
 * la cohérence des cookies de session entre les requêtes.
 */
const fileHasAuthFlow = (pairs) => {
  return pairs.some(({ request }) => {
    const pathOnly = request.path.split('?')[0];
    if (AUTH_ENDPOINTS.includes(pathOnly)) return true;
    if (request.headers instanceof Map) {
      for (const key of request.headers.keys()) {
        if (AUTH_HEADERS.includes(key)) return true;
      }
    }
    return false;
  });
};

/**
 * Exécute une requête via fetch() brut (pour les cas non adaptables)
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
 * Compare la réponse obtenue avec la réponse attendue
 */
const compareResponse = (actual, expected, context) => {
  assert.equal(
    actual.status,
    expected.status,
    `Status attendu ${expected.status}, reçu ${actual.status} | ${context}`
  );

  const actualBody = normalizeResponse(toJsonIfPossible(actual.body));
  const expectedBody = normalizeResponse(toJsonIfPossible(expected.body));
  assert.deepEqual(actualBody, expectedBody, `Body différent | ${context}`);
};

/**
 * Convertit les headers Map en objet plat pour canAdapt()
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
  test('tests téléchargés absents', () => {
    assert.fail('Aucun test trouvé. Lancez: npm run test:sync');
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
        throw new Error('SQLite init failed. Vérifie sqlite3 et le chemin des fixtures.');
      }
    }

    const adapter = new JcaAdapter(baseUrl);
    const logFiles = await walkLogs(functionalDir);
    assert.ok(logFiles.length > 0, 'Aucun fichier .log trouvé');

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

      // Si le fichier contient des flux d'auth, tout passe par fetch()
      const forceRawFetch = fileHasAuthFlow(parsed.pairs);

      // Cookie jar par fichier (comme le test de référence REST)
      const cookieJar = new Map();

      await t.test(relPath, async () => {
        for (let i = 0; i < parsed.pairs.length; i++) {
          const { request, response: expected } = parsed.pairs[i];
          const context = `${relPath}[${i + 1}] ${request.method} ${request.path}`;

          if (forceRawFetch) {
            // Fichier avec auth → tout via fetch()
            fetchCount++;
            if (logRequests) console.log(`  [FETCH/auth] ${context}`);

            const actual = await fetchDirect(request, cookieJar);
            compareResponse(actual, expected, context);
          } else {
            const headersObj = headersToObject(request.headers);
            const { adaptable, reason } = adapter.canAdapt(
              request.method, request.path, headersObj, request.body
            );

            if (adaptable) {
              // Via JS-CRUD-API
              jcaCount++;
              if (logRequests) console.log(`  [JCA] ${context}`);

              const actual = await adapter.executeAsResponse(
                request.method,
                request.path,
                request.body || undefined
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

    console.log(`\n  JCA: ${jcaCount} requêtes | FETCH: ${fetchCount} requêtes | SKIP: ${skipCount} fichiers`);
  });
}
