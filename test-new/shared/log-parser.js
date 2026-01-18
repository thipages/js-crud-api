/**
 * Parser pour les fichiers .log des tests PHP-CRUD-API
 * Compatible ESM (Node.js et Browser)
 */

/**
 * Normalise les retours à la ligne
 */
export const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

/**
 * Découpe le contenu d'un fichier .log en blocs requête/réponse
 */
export const splitRequestResponsePairs = (content) => {
  const normalized = normalizeNewlines(content);
  const blocks = normalized
    .split(/^===\s*$/m)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks;
};

/**
 * Parse les headers HTTP (format "Name: Value")
 */
export const parseHeaders = (lines) => {
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

/**
 * Parse une requête HTTP brute
 */
export const parseHttpRequest = (raw) => {
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

/**
 * Parse une réponse HTTP brute
 */
export const parseHttpResponse = (raw) => {
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

/**
 * Tente de parser le texte en JSON, sinon retourne le texte tel quel
 */
export const toJsonIfPossible = (text) => {
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

/**
 * Parse un fichier .log complet et retourne les paires requête/réponse
 */
export const parseLogFile = (content) => {
  const parts = splitRequestResponsePairs(content);
  const pairs = [];

  // Vérifier si le fichier doit être ignoré
  if (parts[0] && (parts[0].startsWith('skip-for-sqlite:') || parts[0].startsWith('skip-always:'))) {
    return { skip: true, reason: parts[0], pairs: [] };
  }

  for (let i = 0; i < parts.length; i += 2) {
    if (i + 1 >= parts.length) break;
    const request = parseHttpRequest(parts[i]);
    const response = parseHttpResponse(parts[i + 1]);
    pairs.push({ request, response });
  }

  return { skip: false, reason: null, pairs };
};

/**
 * Extrait les cookies depuis les headers Set-Cookie
 */
export const cookieJarFromSetCookie = (headers) => {
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
