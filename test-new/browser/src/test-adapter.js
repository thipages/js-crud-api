/**
 * Adaptateur REST → JS-CRUD-API
 * Traduit les requêtes REST brutes en appels à la librairie JS-CRUD-API
 */

import JSCRUDAPI from '../lib/js-crud-api.js';

export class TestAdapter {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.api = JSCRUDAPI(baseUrl);
  }

  /**
   * Détermine si une requête peut être adaptée à JS-CRUD-API
   */
  canAdapt(method, path, headers = {}) {
    // Rejeter les requêtes form-encoded (non supporté par JS-CRUD-API)
    const contentType = headers['Content-Type'] || headers['content-type'] || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return false;
    }

    // Endpoints qui doivent utiliser fetch() direct
    const nonCrudEndpoints = [
      '/openapi',
      '/columns',
      '/cache',
      '/register',
      '/login',
      '/logout',
      '/password',
      '/me'
    ];

    // Vérifier si c'est un endpoint non-CRUD
    for (const endpoint of nonCrudEndpoints) {
      if (path.startsWith(endpoint)) {
        return false;
      }
    }

    // Vérifier si c'est un endpoint /records (CRUD)
    if (!path.startsWith('/records/')) {
      return false;
    }

    // Détecter les opérations multiples (non supportées par JS-CRUD-API)
    // Exemple: POST /records/comments avec array, PUT /records/posts/1,2
    const [pathOnly, queryString] = path.split('?');
    const parts = pathOnly.split('/').filter(Boolean);
    
    // Rejeter les query params non supportés par JS-CRUD-API
    if (queryString) {
      // ?format=xml - non supporté
      if (queryString.includes('format=')) {
        return false;
      }
      // ?q= (search) - non supporté
      if (queryString.includes('q=')) {
        return false;
      }
    }
    
    // Si plusieurs IDs séparés par des virgules (GET /posts/1,2 ou PUT /posts/1,2)
    if (parts[2] && parts[2].includes(',')) {
      return false; // Fallback sur fetch pour opérations batch
    }

    return true;
  }

  /**
   * Parse le path et les query params
   */
  parsePath(path) {
    const [pathOnly, queryString] = path.split('?');
    const parts = pathOnly.split('/').filter(Boolean);
    
    // Parse query string
    const conditions = {};
    if (queryString) {
      const params = new URLSearchParams(queryString);
      for (const [key, value] of params) {
        if (key === 'filter') {
          // Multiples possibles : filter=id,eq,1&filter=name,like,A%
          if (!conditions[key]) conditions[key] = [];
          conditions[key].push(value.split(','));
        } else if (key === 'order') {
          // Multiples possibles : order=id,desc&order=name,asc
          if (!conditions[key]) conditions[key] = [];
          conditions[key].push(value.split(','));
        } else if (key === 'include' || key === 'exclude') {
          // Valeur unique avec virgules : include=id,name
          conditions[key] = value.split(',');
        } else if (key === 'join') {
          // Multiples possibles : join=comments&join=tags
          if (!conditions[key]) conditions[key] = [];
          conditions[key].push(value);
        } else if (key === 'page') {
          // Format: page=2,10 (numéro de page, taille)
          conditions[key] = value.split(',');
        } else if (key === 'size') {
          // Format: size=10
          conditions[key] = [value];
        } else {
          // Autres params (satisfy, q, etc.)
          if (!conditions[key]) conditions[key] = [];
          if (value.includes(',')) {
            conditions[key].push(value.split(','));
          } else {
            conditions[key].push(value);
          }
        }
      }
    }

    return { parts, conditions };
  }

  /**
   * Exécute une requête via JS-CRUD-API
   */
  async execute(method, path, body) {
    const { parts, conditions } = this.parsePath(path);

    // parts[0] = 'records'
    // parts[1] = table name
    // parts[2] = id(s) (optionnel)

    if (parts[0] !== 'records') {
      throw new Error(`Endpoint non supporté: ${path}`);
    }

    const table = parts[1];
    const id = parts[2];

    try {
      switch (method) {
        case 'GET':
          if (id) {
            // read: GET /records/posts/1
            return await this.api.read(table, id, conditions);
          } else {
            // list: GET /records/posts
            return await this.api.list(table, conditions);
          }

        case 'POST':
          // create: POST /records/posts
          const createData = typeof body === 'string' ? JSON.parse(body) : body;
          
          // Détecter POST array (batch create) - non supporté
          if (Array.isArray(createData)) {
            throw new Error('Batch create non supporté par JS-CRUD-API');
          }
          
          return await this.api.create(table, createData);

        case 'PUT':
        case 'PATCH':
          // update: PUT /records/posts/1
          if (!id) {
            throw new Error('ID requis pour UPDATE');
          }
          const updateData = typeof body === 'string' ? JSON.parse(body) : body;
          return await this.api.update(table, id, updateData);

        case 'DELETE':
          // delete: DELETE /records/posts/1
          if (!id) {
            throw new Error('ID requis pour DELETE');
          }
          return await this.api.delete(table, id);

        default:
          throw new Error(`Méthode HTTP non supportée: ${method}`);
      }
    } catch (error) {
      // L'API JS renvoie des rejections avec code/message
      // On doit les transformer en format compatible avec les tests
      if (error.code !== undefined) {
        throw error; // Déjà au bon format
      }
      throw {
        code: -1,
        message: error.message || String(error)
      };
    }
  }

  /**
   * Wrapper qui retourne une réponse au format attendu par le test runner
   * (avec status, headers, body comme fetch)
   */
  async executeAsResponse(method, path, body) {
    try {
      const data = await this.execute(method, path, body);
      
      // Simuler une réponse HTTP réussie
      return {
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', ['application/json; charset=utf-8']]
        ]),
        body: JSON.stringify(data)
      };
    } catch (error) {
      // L'API a rejeté : simuler une erreur HTTP
      const errorData = error.code ? error : { code: -1, message: error.message };
      
      // Déterminer le status code selon le type d'erreur
      let status = 500;
      if (error.code === 1001) status = 404; // Not found
      if (error.code === 1003) status = 404; // Table not found
      if (error.code === 1004) status = 422; // Input validation
      if (error.code === 1005) status = 409; // Duplicate key
      if (error.code === 1010) status = 422; // Invalid argument
      
      return {
        status: status,
        statusText: errorData.message || 'Error',
        headers: new Map([
          ['content-type', ['application/json; charset=utf-8']]
        ]),
        body: JSON.stringify(errorData)
      };
    }
  }
}
