/**
 * Adaptateur REST → JS-CRUD-API pour Node.js
 * Traduit les requêtes HTTP brutes des fichiers .log en appels à esm/index.js
 */

import jscrudapi from '../../esm/index.js';

export class JcaAdapter {
  #api;

  constructor(baseUrl) {
    this.#api = jscrudapi(baseUrl);
  }

  /**
   * Détermine si une requête peut être adaptée à JS-CRUD-API.
   * Retourne un objet { adaptable, reason } pour documenter les skips.
   *
   * @param {string} method - Méthode HTTP
   * @param {string} path   - Chemin (ex: /records/posts/1?include=id)
   * @param {object} headers - Headers sous forme d'objet plat
   * @param {string} body   - Corps de la requête (optionnel)
   */
  canAdapt(method, path, headers = {}, body = '') {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return { adaptable: false, reason: 'form-encoded non supporté' };
    }
    if (contentType.includes('application/xml')) {
      return { adaptable: false, reason: 'XML non supporté' };
    }

    // Headers d'authentification non transmissibles via JS-CRUD-API
    if (headers['x-api-key'] || headers['X-API-Key']) {
      return { adaptable: false, reason: 'header X-API-Key non transmis' };
    }
    if (headers['x-api-key-db'] || headers['X-API-Key-DB']) {
      return { adaptable: false, reason: 'header X-API-Key-DB non transmis' };
    }
    if (headers['x-authorization'] || headers['X-Authorization']) {
      return { adaptable: false, reason: 'header X-Authorization (JWT) non transmis' };
    }
    if (headers['authorization'] || headers['Authorization']) {
      return { adaptable: false, reason: 'header Authorization non transmis' };
    }

    // OPTIONS (CORS preflight) n'est pas géré par la librairie
    if (method === 'OPTIONS') {
      return { adaptable: false, reason: 'CORS preflight non supporté' };
    }

    // PATCH n'existe pas dans la librairie (update() envoie PUT).
    // PATCH a une sémantique incrémentale côté PHP-CRUD-API,
    // donc on doit passer par fetch() pour préserver ce comportement.
    if (method === 'PATCH') {
      return { adaptable: false, reason: 'PATCH non supporté (la librairie utilise PUT)' };
    }

    const [pathOnly, queryString] = path.split('?');

    // Body non-JSON (form-encoded, invalide, etc.)
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const trimmed = typeof body === 'string' ? body.trim() : '';
      if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return { adaptable: false, reason: 'body non-JSON (form-encoded ou autre)' };
      }
      if (trimmed) {
        try { JSON.parse(trimmed); } catch {
          return { adaptable: false, reason: 'body JSON invalide' };
        }
      }
    }

    // Query params non supportés
    if (queryString) {
      if (queryString.includes('format=')) {
        return { adaptable: false, reason: 'format XML non supporté' };
      }
      if (queryString.includes('q=')) {
        return { adaptable: false, reason: 'recherche textuelle non supportée' };
      }
    }

    // Endpoints CRUD (/records/...)
    if (pathOnly.startsWith('/records/')) {
      const parts = pathOnly.split('/').filter(Boolean);
      const hasMultipleIds = parts[2] && parts[2].includes(',');

      // PUT/PATCH avec IDs multiples (batch update) :
      // js-crud-api perd les erreurs partielles (status 424)
      if (hasMultipleIds && (method === 'PUT' || method === 'PATCH')) {
        return { adaptable: false, reason: 'batch update (erreurs partielles non gérées)' };
      }

      // POST avec body array (batch create) :
      // js-crud-api perd les erreurs partielles (status 424)
      if (method === 'POST' && body) {
        const trimmed = typeof body === 'string' ? body.trim() : '';
        if (trimmed.startsWith('[')) {
          return { adaptable: false, reason: 'batch create (erreurs partielles non gérées)' };
        }
      }

      // PUT/PATCH avec include/exclude : la librairie ne transmet pas
      // les query params sur update(), ce qui change le comportement serveur
      if ((method === 'PUT' || method === 'PATCH') && queryString) {
        const params = new URLSearchParams(queryString);
        if (params.has('include') || params.has('exclude')) {
          return { adaptable: false, reason: 'include/exclude sur update non supporté' };
        }
      }

      return { adaptable: true, reason: null };
    }

    // Endpoints d'authentification : pas adaptables en Node.js
    // car fetch() ne gère pas les cookies de session automatiquement
    const authEndpoints = ['/login', '/logout', '/register', '/password', '/me'];
    if (authEndpoints.includes(pathOnly)) {
      return { adaptable: false, reason: 'auth endpoint (cookies non gérés en Node.js)' };
    }

    // Tous les autres endpoints : non supportés
    return { adaptable: false, reason: `endpoint ${pathOnly} non supporté` };
  }

  /**
   * Parse le path et les query params en conditions JS-CRUD-API
   */
  #parsePath(path) {
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
            // satisfy, filter1, filter2, etc.
            if (!conditions[key]) conditions[key] = [];
            conditions[key].push(value);
            break;
        }
      }
    }

    return { parts, conditions };
  }

  /**
   * Exécute une requête via JS-CRUD-API.
   * Retourne la donnée ou lance une erreur {code, message}.
   */
  async execute(method, path, body) {
    const { parts, conditions } = this.#parsePath(path);

    if (parts[0] !== 'records') {
      throw { code: -1, message: `Endpoint non supporté: ${path}` };
    }

    const table = parts[1];
    const id = parts[2];
    const hasConditions = Object.keys(conditions).length > 0;

    switch (method) {
      case 'GET':
        if (id) {
          return this.#api.read(table, id, hasConditions ? conditions : undefined);
        }
        return this.#api.list(table, hasConditions ? conditions : undefined);

      case 'POST': {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return this.#api.create(table, data);
      }

      case 'PUT':
      case 'PATCH': {
        if (!id) throw { code: -1, message: 'ID requis pour UPDATE' };
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        return this.#api.update(table, id, data);
      }

      case 'DELETE':
        if (!id) throw { code: -1, message: 'ID requis pour DELETE' };
        return this.#api.delete(table, id);

      default:
        throw { code: -1, message: `Méthode HTTP non supportée: ${method}` };
    }
  }

  /**
   * Exécute une requête et retourne un objet réponse comparable
   * au format {status, body} attendu par les tests.
   */
  async executeAsResponse(method, path, body) {
    try {
      const data = await this.execute(method, path, body);
      return {
        status: 200,
        body: JSON.stringify(data),
      };
    } catch (error) {
      const errorData = error && error.code !== undefined
        ? error
        : { code: -1, message: error?.message || String(error) };

      return {
        status: this.#errorCodeToStatus(errorData.code),
        body: JSON.stringify(errorData),
      };
    }
  }

  /**
   * Mappe les codes d'erreur PHP-CRUD-API vers les status HTTP
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
