/**
 * Response normalization functions
 * ESM compatible (Node.js and Browser)
 */

/**
 * Normalizes IP addresses (::1 -> 127.0.0.1)
 */
export const normalizeIpAddress = (value) => {
  if (value === '::1') return '127.0.0.1';
  return value;
};

/**
 * Recursively normalizes responses (IP, etc.)
 */
export const normalizeResponse = (body) => {
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

/**
 * Builds a full URL from a baseUrl and a path
 */
export const buildUrl = (baseUrl, path) => {
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
