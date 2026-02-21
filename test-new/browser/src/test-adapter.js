/**
 * REST -> JS-CRUD-API adapter (browser)
 * Translates raw REST requests into JS-CRUD-API library calls
 */

import JSCRUDAPI from '../lib/js-crud-api.js';

export class TestAdapter {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.options = options;
    // credentials: 'omit' by default prevents the browser from sending cookies (PHPSESSID)
    // on library requests. This reproduces Node.js behavior.
    // For dbAuth tests, use credentials: 'include' to enable cookies.
    this.api = JSCRUDAPI(baseUrl, { credentials: options.credentials || 'omit' });
  }

  /**
   * Determines whether a request can be adapted to JS-CRUD-API.
   * Returns an object { adaptable, reason, headers } to document skips.
   * If adaptable, headers contains the auth headers to pass via config.headers.
   *
   * @param {string} method - HTTP method
   * @param {string} path   - Path (e.g. /records/posts/1?include=id)
   * @param {object} headers - Headers as a flat object
   * @param {string} body   - Request body (optional)
   * @returns {{ adaptable: boolean, reason: string|null, headers?: object }}
   */
  canAdapt(method, path, headers = {}, body = '') {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return { adaptable: false, reason: 'form-encoded not supported' };
    }
    if (contentType.includes('application/xml')) {
      return { adaptable: false, reason: 'XML not supported' };
    }

    // OPTIONS (CORS preflight) is not handled by the library
    if (method === 'OPTIONS') {
      return { adaptable: false, reason: 'CORS preflight not supported' };
    }

    // PATCH does not exist in the library (update() sends PUT).
    // PATCH has incremental semantics in PHP-CRUD-API,
    // so we must use fetch() to preserve this behavior.
    if (method === 'PATCH') {
      return { adaptable: false, reason: 'PATCH not supported (library uses PUT)' };
    }

    const [pathOnly, queryString] = path.split('?');

    // Non-JSON body (form-encoded, invalid, etc.)
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const trimmed = typeof body === 'string' ? body.trim() : '';
      if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return { adaptable: false, reason: 'non-JSON body (form-encoded or other)' };
      }
      if (trimmed) {
        try { JSON.parse(trimmed); } catch {
          return { adaptable: false, reason: 'invalid JSON body' };
        }
      }
    }

    // Unsupported query params
    if (queryString) {
      if (queryString.includes('format=')) {
        return { adaptable: false, reason: 'XML format not supported' };
      }
      if (queryString.includes('q=')) {
        return { adaptable: false, reason: 'text search not supported' };
      }
    }

    // Collect auth headers for transmission via config.headers
    const authHeaders = this.#collectAuthHeaders(headers);

    // CRUD endpoints (/records/...)
    if (pathOnly.startsWith('/records/')) {
      const parts = pathOnly.split('/').filter(Boolean);
      const hasMultipleIds = parts[2] && parts[2].includes(',');

      // PUT with multiple IDs (batch update):
      // js-crud-api loses partial errors (status 424)
      if (hasMultipleIds && method === 'PUT') {
        return { adaptable: false, reason: 'batch update (partial errors not handled)' };
      }

      // POST with array body (batch create):
      // js-crud-api loses partial errors (status 424)
      if (method === 'POST' && body) {
        const trimmed = typeof body === 'string' ? body.trim() : '';
        if (trimmed.startsWith('[')) {
          return { adaptable: false, reason: 'batch create (partial errors not handled)' };
        }
      }

      // PUT with include/exclude: the library does not pass
      // query params on update(), which changes server behavior
      if (method === 'PUT' && queryString) {
        const params = new URLSearchParams(queryString);
        if (params.has('include') || params.has('exclude')) {
          return { adaptable: false, reason: 'include/exclude on update not supported' };
        }
      }

      return { adaptable: true, reason: null, headers: authHeaders };
    }

    // Auth endpoints (dbAuth): adaptable in browser
    // Session cookies work with credentials: 'include'
    const authEndpoints = ['/login', '/logout', '/register', '/password', '/me'];
    if (authEndpoints.includes(pathOnly)) {
      return { adaptable: true, reason: null };
    }

    // All other endpoints: not supported
    return { adaptable: false, reason: `endpoint ${pathOnly} not supported` };
  }

  /**
   * Collects and normalizes authentication headers.
   * Returns an object with standard-case header names,
   * or undefined if no auth header is present.
   */
  #collectAuthHeaders(headers) {
    const AUTH_HEADER_MAP = {
      'x-api-key': 'X-API-Key',
      'x-api-key-db': 'X-API-Key-DB',
      'x-authorization': 'X-Authorization',
      'authorization': 'Authorization',
    };
    const result = {};
    for (const [lower, proper] of Object.entries(AUTH_HEADER_MAP)) {
      if (headers[lower] || headers[proper]) {
        result[proper] = headers[lower] || headers[proper];
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Parses the path and query params into JS-CRUD-API conditions
   */
  parsePath(path) {
    const [pathOnly, queryString] = path.split('?');
    const parts = pathOnly.split('/').filter(Boolean);

    const conditions = {};
    if (queryString) {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params) {
        switch (key) {
          case 'filter':
          case 'order':
            if (!conditions[key]) conditions[key] = [];
            conditions[key].push(value);
            break;
          case 'include':
          case 'exclude':
            conditions[key] = value;
            break;
          case 'join':
            if (!conditions[key]) conditions[key] = [];
            conditions[key].push(value);
            break;
          case 'page':
          case 'size':
            conditions[key] = value;
            break;
          default:
            if (!conditions[key]) conditions[key] = [];
            conditions[key].push(value);
            break;
        }
      }
    }

    return { parts, conditions };
  }

  /**
   * Executes a request via JS-CRUD-API
   */
  async execute(method, path, body, headers) {
    const api = (headers && Object.keys(headers).length > 0)
      ? JSCRUDAPI(this.baseUrl, {
          credentials: this.options.credentials || 'omit',
          headers
        })
      : this.api;
    const { parts, conditions } = this.parsePath(path);
    const [pathOnly] = path.split('?');

    // Auth endpoints (dbAuth)
    switch (pathOnly) {
      case '/login': {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return api.login(data.username, data.password);
      }
      case '/logout':
        return api.logout();
      case '/me':
        return api.me();
      case '/register': {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return api.register(data.username, data.password);
      }
      case '/password': {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return api.password(data.username, data.password, data.newPassword);
      }
    }

    if (parts[0] !== 'records') {
      throw { code: -1, message: `Unsupported endpoint: ${path}` };
    }

    const table = parts[1];
    const id = parts[2];
    const hasConditions = Object.keys(conditions).length > 0;

    switch (method) {
      case 'GET':
        if (id) {
          return api.read(table, id, hasConditions ? conditions : undefined);
        }
        return api.list(table, hasConditions ? conditions : undefined);

      case 'POST': {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return api.create(table, data);
      }

      case 'PUT': {
        if (!id) throw { code: -1, message: 'ID required for UPDATE' };
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return api.update(table, id, data);
      }

      case 'DELETE':
        if (!id) throw { code: -1, message: 'ID required for DELETE' };
        return api.delete(table, id);

      default:
        throw { code: -1, message: `Unsupported HTTP method: ${method}` };
    }
  }

  /**
   * Executes a request and returns a comparable response object
   */
  async executeAsResponse(method, path, body, headers) {
    try {
      const data = await this.execute(method, path, body, headers);
      return {
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', ['application/json; charset=utf-8']]
        ]),
        body: JSON.stringify(data)
      };
    } catch (error) {
      const errorData = error && error.code !== undefined
        ? error
        : { code: -1, message: error?.message || String(error) };

      return {
        status: this.#errorCodeToStatus(errorData.code),
        statusText: errorData.message || 'Error',
        headers: new Map([
          ['content-type', ['application/json; charset=utf-8']]
        ]),
        body: JSON.stringify(errorData)
      };
    }
  }

  /**
   * Maps PHP-CRUD-API error codes to HTTP status codes
   */
  #errorCodeToStatus(code) {
    switch (code) {
      case 1001: return 404;  // Record not found
      case 1002: return 422;  // Argument count mismatch
      case 1003: return 404;  // Table not found
      case 1004: return 422;  // Argument count mismatch
      case 1005: return 405;  // Read-only
      case 1006: return 404;  // Table already exists
      case 1007: return 404;  // Column not found
      case 1008: return 422;  // Cannot read
      case 1009: return 409;  // Duplicate key
      case 1010: return 409;  // Data integrity violation
      case 1011: return 401;  // Authentication required
      case 1012: return 403;  // Authentication failed
      case 1013: return 422;  // Input validation failed
      case 1014: return 403;  // Authorization required
      case 1015: return 404;  // Page not found
      case 1016: return 405;  // Table in use
      case 1017: return 404;  // Column exists
      case 1018: return 422;  // HTTP message not readable
      case 1019: return 403;  // Pagination forbidden
      case 1020: return 409;  // User already exists
      case 1021: return 422;  // Password too short
      case 1022: return 422;  // Origin not allowed
      case 1023: return 404;  // Primary key not found
      case 9999: return 500;  // Internal
      default: return 500;
    }
  }
}
