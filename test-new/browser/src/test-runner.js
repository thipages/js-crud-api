/**
 * TestRunner - Executes tests and compares results
 */

import { parseLogFile, toJsonIfPossible } from '../../shared/log-parser.js';
import { normalizeResponse, buildUrl } from '../../shared/normalizers.js';
import { TestAdapter } from './test-adapter.js';

const SESSION_AUTH_ENDPOINTS = ['/login', '/logout', '/register', '/password', '/me'];
// JWT (X-Authorization) and Basic (Authorization) create PHP sessions.
// Subsequent requests in the same file depend on session state,
// requiring credentials: 'include' to share cookies.
// API Keys (X-API-Key, X-API-Key-DB) do not create this session dependency.
const SESSION_CREATING_HEADERS = ['x-authorization', 'authorization'];

/**
 * Restores standard HTTP header casing.
 * The log-parser lowercases everything, but some PHP servers
 * (notably the built-in server) are case-sensitive
 * for authentication headers (Authorization, X-API-Key, etc.)
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
 * Determines whether a .log file requires session handling (cookies).
 * Detects dbAuth endpoints AND JWT/Basic headers that create PHP sessions.
 * In browser: an adapter with credentials: 'include' is created for these files.
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
   * Stops test execution
   */
  stop() {
    this.stopped = true;
    console.log('Test stop requested');
  }

  /**
   * Runs a list of tests
   */
  async runTests(tests) {
    this.stopped = false;
    this.reporter.start(tests.length);

    let current = 0;

    for (const [testPath, testContent] of tests) {
      if (this.stopped) {
        this.reporter.reportTest(testPath, {
          status: 'skipped',
          details: 'Stopped by user'
        });
        continue;
      }

      current++;
      this.reporter.updateProgress(current, tests.length, `Test ${current}/${tests.length}: ${testPath}`);

      await this.runTest(testPath, testContent);

      // Small delay between tests to avoid overloading the server
      await this.sleep(100);
    }

    this.reporter.finish();
  }

  /**
   * Runs a single test
   */
  async runTest(testPath, testContent) {
    if (this.logRequests) {
      console.log(`\nTest: ${testPath}`);
    }

    // Parse the .log file
    const parsed = parseLogFile(testContent);

    // Check if we should skip
    if (parsed.skip) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: parsed.reason
      });
      return;
    }

    // Skip redirect_to_ssl test
    if (testPath.includes('redirect_to_ssl.log')) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: 'skip-ssl-redirect'
      });
      return;
    }

    // Skip CORS tests (do not work in browser)
    // Reason: In browser mode, the Origin header is automatically set by the browser
    // based on the actual origin (e.g. http://localhost:8081). It cannot be spoofed to
    // test different origins as in Node.js where you can send Origin: http://example.com.
    // The server always responds with Access-Control-Allow-Origin: http://localhost:8081
    // instead of the value expected in the tests (http://example.com).
    // These tests are valid in Node.js but impossible to faithfully reproduce in browser
    // for security reasons (Same-Origin Policy).
    if (testPath.includes('cors_pre_flight.log') || testPath.includes('cors_headers.log')) {
      this.reporter.reportTest(testPath, {
        status: 'skipped',
        details: 'skip-cors (Origin headers enforced by browser - Same-Origin Policy security)'
      });
      return;
    }

    // Clear PHP session between each test file
    // to prevent session leaks (browser shares cookies)
    document.cookie = 'PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

    // Cookie jar for this test (used for manual headers,
    // the browser also manages its own cookies in parallel)
    const cookieJar = new Map();

    // If the file contains session auth endpoints, use an adapter
    // with credentials: 'include' to support cookies (dbAuth)
    const hasSessionAuth = fileHasSessionAuth(parsed.pairs);
    const currentAdapter = hasSessionAuth
      ? new TestAdapter(this.baseUrl, { credentials: 'include' })
      : this.adapter;

    // Execute each request/response pair
    for (let i = 0; i < parsed.pairs.length; i++) {
      const { request, response: expectedResponse } = parsed.pairs[i];

      try {
        const actualResponse = await this.executeRequest(request, cookieJar, currentAdapter);
        this.compareResponse(actualResponse, expectedResponse, `${testPath} [${i + 1}]`);
      } catch (error) {
        this.reporter.reportTest(testPath, {
          status: 'failed',
          details: `Request ${i + 1}/${parsed.pairs.length}: ${request.method} ${request.path}`,
          error: error.message,
          diff: error.diff
        });
        return;
      }
    }

    // All tests passed
    this.reporter.reportTest(testPath, {
      status: 'passed',
      details: `${parsed.pairs.length} request(s) validated`
    });
  }

  /**
   * Executes an HTTP request (via JS-CRUD-API adapter or direct fetch)
   */
  async executeRequest(request, cookieJar, adapter) {
    // Convert Map headers to object for canAdapt()
    const headersObj = {};
    if (request.headers && request.headers instanceof Map) {
      for (const [key, values] of request.headers) {
        headersObj[key] = Array.isArray(values) ? values[0] : values;
      }
    }

    // Decide whether to use the adapter or direct fetch
    const result = adapter.canAdapt(request.method, request.path, headersObj, request.body);
    const useAdapter = result.adaptable;
    const reason = result.reason || '';
    const adaptHeaders = result.headers;

    if (useAdapter && this.logRequests) {
      console.log(`Via JS-CRUD-API: ${request.method} ${request.path}`);
    }

    if (useAdapter) {
      // Use the JS-CRUD-API adapter
      try {
        const response = await adapter.executeAsResponse(
          request.method,
          request.path,
          request.body,
          adaptHeaders
        );

        if (this.logRequests) {
          console.log(`<- ${response.status} ${response.statusText}`);
          console.log('  Body:', response.body.substring(0, 100));
        }

        return response;
      } catch (error) {
        console.error('Adapter error:', error);
        // On adapter error, fallback to fetch
        console.warn('Falling back to direct fetch');
      }
    }

    // Direct fetch (for non-CRUD endpoints or as fallback)
    if (this.logRequests && !useAdapter) {
      console.log(`Via fetch(): ${request.method} ${request.path}${reason ? ` (${reason})` : ''}`);
    }

    const url = buildUrl(this.baseUrl, request.path);

    // Prepare headers
    const headers = {};

    // Add cookies
    if (cookieJar.size > 0) {
      headers['Cookie'] = Array.from(cookieJar.values()).join('; ');
    }

    // Add request headers (with standard casing restored)
    for (const [name, values] of request.headers) {
      if (name !== 'host' && name !== 'content-length') {
        headers[normalizeHeaderName(name)] = values.join(', ');
      }
    }

    // Prepare fetch config
    // credentials: 'include' ensures cookies (PHPSESSID) are sent
    // even in cross-origin context (different port between page and API)
    const fetchConfig = {
      method: request.method,
      headers: headers,
      credentials: 'include'
    };

    // Add body if present
    if (request.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      fetchConfig.body = request.body;
    }

    if (this.logRequests) {
      console.log(`-> ${request.method} ${url}`);
      console.log('  Headers:', headers);
      if (request.body) {
        console.log('  Body:', request.body.substring(0, 100));
      }
    }

    // Execute the request
    const response = await fetch(url, fetchConfig);

    // Read the body
    const body = await response.text();

    // Extract response headers
    const responseHeaders = new Map();
    response.headers.forEach((value, name) => {
      if (!responseHeaders.has(name)) {
        responseHeaders.set(name, []);
      }
      responseHeaders.get(name).push(value);
    });

    // Update cookie jar
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
      console.log(`<- ${response.status} ${response.statusText}`);
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
   * Compares the actual response with the expected response
   */
  compareResponse(actual, expected, context) {
    // Compare status
    if (actual.status !== expected.status) {
      const error = new Error(`Expected status ${expected.status}, got ${actual.status}`);
      error.diff = {
        expected: expected.status,
        actual: actual.status
      };
      throw error;
    }

    // Compare body
    const actualBody = normalizeResponse(toJsonIfPossible(actual.body));
    const expectedBody = normalizeResponse(toJsonIfPossible(expected.body));

    if (!this.deepEqual(actualBody, expectedBody)) {
      const error = new Error(`Body mismatch`);
      error.diff = {
        expected: expectedBody,
        actual: actualBody
      };
      throw error;
    }

    // Compare headers in strict mode
    if (this.strictMode) {
      for (const [name, values] of expected.headers.entries()) {
        if (name === 'content-length') continue;

        const actualValues = actual.headers.get(name) || [];
        if (!this.deepEqual(actualValues, values)) {
          const error = new Error(`Header ${name} mismatch`);
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
   * Deep comparison of two values
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
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
