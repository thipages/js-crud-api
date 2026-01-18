#!/usr/bin/env node

/**
 * Script de build : Bundle tous les fichiers .log en un fichier JSON
 * pour les rendre accessibles côté navigateur
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const functionalDir = join(root, 'test-new', 'php-crud-tests', 'functional');
const outputFile = join(root, 'test-new', 'browser', 'test-data.json');

/**
 * Parcourt récursivement un dossier et retourne tous les fichiers .log
 */
const walkLogs = async (dir) => {
  const result = [];
  try {
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
  } catch (error) {
    console.warn(`⚠️  Impossible de lire le dossier ${dir}:`, error.message);
  }
  return result;
};

/**
 * Main
 */
const main = async () => {
  console.log('📦 Bundle des fichiers .log en JSON...');
  console.log(`📂 Source: ${functionalDir}`);
  console.log(`📝 Sortie: ${outputFile}`);

  const logFiles = await walkLogs(functionalDir);

  if (logFiles.length === 0) {
    console.error('❌ Aucun fichier .log trouvé.');
    console.log('💡 Lancez d\'abord: npm run test:sync');
    process.exit(1);
  }

  console.log(`✅ ${logFiles.length} fichiers .log trouvés`);

  const testData = {};

  for (const file of logFiles) {
    const relativePath = relative(functionalDir, file);
    const content = await readFile(file, 'utf8');
    
    // Créer une clé hiérarchique (ex: "001_records/001_find_all.log")
    const key = relativePath.replace(/\\/g, '/');
    testData[key] = content;
    
    console.log(`  ✓ ${key}`);
  }

  const json = JSON.stringify(testData, null, 2);
  await writeFile(outputFile, json, 'utf8');

  console.log(`\n✨ Bundle créé avec succès: ${outputFile}`);
  console.log(`📊 Taille: ${(json.length / 1024).toFixed(2)} KB`);
};

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
