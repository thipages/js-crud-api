import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Parcourt récursivement un dossier et retourne tous les fichiers .log triés
 */
export const walkLogs = async (dir) => {
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
  return result.sort();
};
