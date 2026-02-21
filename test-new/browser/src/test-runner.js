/**
 * TestRunner - Exécute les tests et compare les résultats
 */

import { parseLogFile, toJsonIfPossible } from '../../shared/log-parser.js';
import { normalizeResponse, buildUrl } from '../../shared/normalizers.js';
import { TestAdapter } from './test-adapter.js';

const SESSION_AUTH_ENDPOINTS = ['/login', '/logout', '/register', '/password', '/me'];
// JWT (X-Authorization) et Basic (Authorization) créent des sessions PHP.
// Les requêtes suivantes dans le même fichier dépendent de l'état de session,
// nécessitant credentials: 'include' pour partager les cookies.
// Les API Key (X-API-Key, X-API-Key-DB) ne créent pas cette dépendance de session.
const SESSION_CREATING_HEADERS = ['x-authorization', 'authorization'];

/**
 * Restaure la casse standard des headers HTTP.
 * Le log-parser met tout en minuscules, mais certains serveurs PHP
 * (et notamment le serveur intégré) sont sensibles à la casse
 * pour les headers d'authentification (Authorization, X-API-Key, etc.)
 */
const HEADER_CASE_MAP = {
  'authorization': 'Authorization',
  'x-authorization': 'X-Authorization',
  'x-api-key': 'X-API-Key',
  'x-api-key-db': 'X-API-Key-DB',
  'content-type': 'Content-Type',
  'content-length': 'Content-Length',
  'accept': 'Accept',
};
const normalizeHeaderName = (name) => HEADER_CASE_MAP[name] || name;

/**
 * Détermine si un fichier .log nécessite la gestion de session (cookies).
 * Détecte les endpoints dbAuth ET les headers JWT/Basic qui créent des sessions PHP.
 * En navigateur : un adaptateur avec credentials: 'include' est créé pour ces fichiers.
 * Les API Key passent par la librairie via config.headers (pas de dépendance session).
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

export class TestRunner {
  constructor(baseUrl, options = {}, reporter) {
    this.baseUrl = baseUrl;
    this.strictMode = options.strictMode || false;
    this.logRequests = options.logRequests || false;
    this.reporter = reporter;
    this.stopped = false;
    this.adapter = new TestAdapter(baseUrl);
  }

  /**
   * Arrête l'exécution des tests
   */
  stop() {
    this.stopped = true;
    console.log('⏹ Arrêt des tests demandé');
  }

  /**
   * Exécute une liste de tests
   */
  async runTests(tests) {
    this.stopped = false;
    this.reporter.start(tests.length);

    let current = 0;

    for (const [testPath, testContent] of tests) {
      if (this.stopped) {
        this.reporter.reportTest(testPath, {
          status: 'skipped',
          details: 'Arrêté par l\'utilisateur'
        });
        continue;
      }

      current++;
      this.reporter.updateProgress(current, tests.length, `Test ${current}/${tests.length}: ${testPath}`);

      await this.runTest(testPath, testContent);

      // Petit délai entre les tests pour ne pas surcharger le serveur
      await this.sleep(100);
    }

    this.reporter.finish();
  }

  /**
   * Exécute un seul test
   */
  async runTest(testPath, testContent) {
    if (this.logRequests) {
      console.log(`\n📝 Test: ${testPath}`);
    }

    // Parser le fichier .log
    const parsed = parseLogFile(testContent);

    // Vérifier s'il faut skip
    if (parsed.skip) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: parsed.reason
      });
      return;
    }

    // Skip le test redirect_to_ssl
    if (testPath.includes('redirect_to_ssl.log')) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: 'skip-ssl-redirect'
      });
      return;
    }

    // Skip les tests CORS (ne fonctionnent pas en navigateur)
    // Raison : En mode navigateur, le header Origin est imposé automatiquement par le browser
    // selon l'origine réelle (ex: http://localhost:8081). On ne peut pas le falsifier pour
    // tester différentes origines comme dans Node.js où on peut envoyer Origin: http://example.com.
    // Le serveur répond donc toujours avec Access-Control-Allow-Origin: http://localhost:8081
    // au lieu de la valeur attendue dans les tests (http://example.com).
    // Ces tests sont valides en Node.js mais impossibles à reproduire fidèlement en navigateur
    // pour des raisons de sécurité (Same-Origin Policy).
    if (testPath.includes('cors_pre_flight.log') || testPath.includes('cors_headers.log')) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: 'skip-cors (headers Origin imposés par le navigateur - sécurité Same-Origin Policy)'
      });
      return;
    }

    // Effacer la session PHP entre chaque fichier test
    // pour éviter les fuites de session (le navigateur partage les cookies)
    document.cookie = 'PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

    // Cookie jar pour ce test (utilisé pour les headers manuels,
    // le navigateur gère aussi ses propres cookies en parallèle)
    const cookieJar = new Map();

    // Si le fichier contient des endpoints d'auth session, utiliser un adaptateur
    // avec credentials: 'include' pour supporter les cookies (dbAuth)
    const hasSessionAuth = fileHasSessionAuth(parsed.pairs);
    const currentAdapter = hasSessionAuth
      ? new TestAdapter(this.baseUrl, { credentials: 'include' })
      : this.adapter;

    // Exécuter chaque paire requête/réponse
    for (let i = 0; i < parsed.pairs.length; i++) {
      const { request, response: expectedResponse } = parsed.pairs[i];

      try {
        const actualResponse = await this.executeRequest(request, cookieJar, currentAdapter);
        this.compareResponse(actualResponse, expectedResponse, `${testPath} [${i + 1}]`);
      } catch (error) {
        this.reporter.reportTest(testPath, {
          status: 'failed',
          details: `Requête ${i + 1}/${parsed.pairs.length}: ${request.method} ${request.path}`,
          error: error.message,
          diff: error.diff
        });
        return;
      }
    }

    // Tous les tests sont passés
    this.reporter.reportTest(testPath, {
      status: 'passed',
      details: `${parsed.pairs.length} requête(s) validée(s)`
    });
  }

  /**
   * Exécute une requête HTTP (via adaptateur JS-CRUD-API ou fetch direct)
   */
  async executeRequest(request, cookieJar, adapter) {
    // Convertir Map headers en objet pour canAdapt()
    const headersObj = {};
    if (request.headers && request.headers instanceof Map) {
      for (const [key, values] of request.headers) {
        headersObj[key] = Array.isArray(values) ? values[0] : values;
      }
    }

    // Décider si on utilise l'adaptateur ou fetch direct
    const result = adapter.canAdapt(request.method, request.path, headersObj, request.body);
    const useAdapter = result.adaptable;
    const reason = result.reason || '';
    const adaptHeaders = result.headers;

    if (useAdapter && this.logRequests) {
      console.log(`🔄 Via JS-CRUD-API: ${request.method} ${request.path}`);
    }

    if (useAdapter) {
      // Utiliser l'adaptateur JS-CRUD-API
      try {
        const response = await adapter.executeAsResponse(
          request.method,
          request.path,
          request.body,
          adaptHeaders
        );

        if (this.logRequests) {
          console.log(`← ${response.status} ${response.statusText}`);
          console.log('  Body:', response.body.substring(0, 100));
        }

        return response;
      } catch (error) {
        console.error('Erreur adaptateur:', error);
        // En cas d'erreur de l'adaptateur, fallback sur fetch
        console.warn('Fallback sur fetch direct');
      }
    }

    // Fetch direct (pour endpoints non-CRUD ou en fallback)
    if (this.logRequests && !useAdapter) {
      console.log(`🌐 Via fetch(): ${request.method} ${request.path}${reason ? ` (${reason})` : ''}`);
    }

    const url = buildUrl(this.baseUrl, request.path);
    
    // Préparer les headers
    const headers = {};
    
    // Ajouter les cookies
    if (cookieJar.size > 0) {
      headers['Cookie'] = Array.from(cookieJar.values()).join('; ');
    }

    // Ajouter les headers de la requête (avec casse standard restaurée)
    for (const [name, values] of request.headers) {
      if (name !== 'host' && name !== 'content-length') {
        headers[normalizeHeaderName(name)] = values.join(', ');
      }
    }

    // Préparer la config fetch
    // credentials: 'include' garantit l'envoi des cookies (PHPSESSID)
    // même en contexte cross-origin (port différent entre page et API)
    const fetchConfig = {
      method: request.method,
      headers: headers,
      credentials: 'include'
    };

    // Ajouter le body si présent
    if (request.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      fetchConfig.body = request.body;
    }

    if (this.logRequests) {
      console.log(`→ ${request.method} ${url}`);
      console.log('  Headers:', headers);
      if (request.body) {
        console.log('  Body:', request.body.substring(0, 100));
      }
    }

    // Exécuter la requête
    const response = await fetch(url, fetchConfig);

    // Lire le body
    const body = await response.text();

    // Extraire les headers de réponse
    const responseHeaders = new Map();
    response.headers.forEach((value, name) => {
      if (!responseHeaders.has(name)) {
        responseHeaders.set(name, []);
      }
      responseHeaders.get(name).push(value);
    });

    // Mettre à jour le cookie jar
    const setCookieHeaders = responseHeaders.get('set-cookie') || [];
    for (const cookie of setCookieHeaders) {
      const part = cookie.split(';')[0].trim();
      if (part) {
        const eqIndex = part.indexOf('=');
        if (eqIndex !== -1) {
          const name = part.slice(0, eqIndex).trim();
          cookieJar.set(name, part);
        }
      }
    }

    if (this.logRequests) {
      console.log(`← ${response.status} ${response.statusText}`);
      console.log('  Body:', body.substring(0, 100));
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: body
    };
  }

  /**
   * Compare la réponse actuelle avec la réponse attendue
   */
  compareResponse(actual, expected, context) {
    // Comparer le statut
    if (actual.status !== expected.status) {
      const error = new Error(`Status attendu ${expected.status}, reçu ${actual.status}`);
      error.diff = {
        expected: expected.status,
        actual: actual.status
      };
      throw error;
    }

    // Comparer le body
    const actualBody = normalizeResponse(toJsonIfPossible(actual.body));
    const expectedBody = normalizeResponse(toJsonIfPossible(expected.body));

    if (!this.deepEqual(actualBody, expectedBody)) {
      const error = new Error(`Body différent`);
      error.diff = {
        expected: expectedBody,
        actual: actualBody
      };
      throw error;
    }

    // Comparer les headers en mode strict
    if (this.strictMode) {
      for (const [name, values] of expected.headers.entries()) {
        if (name === 'content-length') continue;
        
        const actualValues = actual.headers.get(name) || [];
        if (!this.deepEqual(actualValues, values)) {
          const error = new Error(`Header ${name} différent`);
          error.diff = {
            expected: values,
            actual: actualValues
          };
          throw error;
        }
      }
    }
  }

  /**
   * Compare profondément deux valeurs
   */
  deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Utilitaire sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
