import { readFileSync } from 'node:fs';

/**
 * Charge un fichier .env dans process.env (sans écraser les variables existantes)
 */
export const loadEnv = (path) => {
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env non trouvé, on utilise les variables d'environnement existantes
  }
};
