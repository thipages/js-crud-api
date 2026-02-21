#!/usr/bin/env node

/**
 * Build script: Bundles all .log files into a single JSON file
 * to make them accessible in the browser
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const functionalDir = join(root, 'tests', 'php-crud-tests', 'functional');
const outputFile = join(root, 'tests', 'browser', 'test-data.json');

/**
 * Recursively walks a directory and returns all .log files
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
    console.warn(`Unable to read directory ${dir}:`, error.message);
  }
  return result;
};

/**
 * Main
 */
const main = async () => {
  console.log('Bundling .log files to JSON...');
  console.log(`Source: ${functionalDir}`);
  console.log(`Output: ${outputFile}`);

  const logFiles = await walkLogs(functionalDir);

  if (logFiles.length === 0) {
    console.error('No .log files found.');
    console.log('Run first: npm run test:sync');
    process.exit(1);
  }

  console.log(`${logFiles.length} .log files found`);

  const testData = {};

  for (const file of logFiles) {
    const relativePath = relative(functionalDir, file);
    const content = await readFile(file, 'utf8');

    // Create a hierarchical key (e.g. "001_records/001_find_all.log")
    const key = relativePath.replace(/\\/g, '/');
    testData[key] = content;

    console.log(`  ${key}`);
  }

  const json = JSON.stringify(testData, null, 2);
  await writeFile(outputFile, json, 'utf8');

  console.log(`\nBundle created: ${outputFile}`);
  console.log(`Size: ${(json.length / 1024).toFixed(2)} KB`);
};

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
