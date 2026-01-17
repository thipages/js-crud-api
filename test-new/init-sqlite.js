import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(process.cwd());
const testsRoot = join(root, 'test-new', 'php-crud-tests');
const fixturePath = process.env.SQLITE_FIXTURE || join(testsRoot, 'fixtures', 'blog_sqlite.sql');
const dbPath = process.env.SQLITE_DB || join(root, 'test-new', 'var', 'php-crud-api.sqlite');

const ensureDir = () => {
  const dir = join(root, 'test-new', 'var');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

const run = async () => {
  ensureDir();

  const sql = await readFile(fixturePath, 'utf8');

  const sqlite = spawn('sqlite3', [dbPath], { stdio: ['pipe', 'inherit', 'inherit'] });

  sqlite.stdin.write(sql);
  sqlite.stdin.end();

  await new Promise((resolvePromise, reject) => {
    sqlite.on('error', reject);
    sqlite.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`sqlite3 exited with code ${code}`));
      } else {
        resolvePromise();
      }
    });
  });

  console.log(`SQLite DB ready: ${dbPath}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
