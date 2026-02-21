import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const repo = process.env.PHP_CRUD_API_REPO || 'https://github.com/mevdschee/php-crud-api.git';
const ref = process.env.PHP_CRUD_API_REF || 'main';

const root = resolve(process.cwd());
const cacheDir = join(root, '.cache', 'php-crud-api');
const targetDir = join(root, 'tests', 'php-crud-tests');

const run = (cmd, args, cwd = root) => {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`);
  }
};

const ensureRepo = () => {
  if (existsSync(cacheDir)) {
    run('git', ['-C', cacheDir, 'fetch', '--depth=1', 'origin', ref]);
    run('git', ['-C', cacheDir, 'checkout', '--force', 'FETCH_HEAD']);
    return;
  }

  run('git', ['clone', '--depth=1', '--branch', ref, repo, cacheDir]);
};

const copyTests = async () => {
  await mkdir(targetDir, { recursive: true });

  const sourceTests = join(cacheDir, 'tests');
  const copies = [
    ['functional', 'functional'],
    ['fixtures', 'fixtures'],
    ['config', 'config']
  ];

  for (const [from, to] of copies) {
    const src = join(sourceTests, from);
    const dst = join(targetDir, to);
    if (!existsSync(src)) {
      continue;
    }
    await cp(src, dst, { recursive: true });
  }
};

const main = async () => {
  await mkdir(join(root, '.cache'), { recursive: true });

  ensureRepo();

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  await copyTests();

  console.log('Tests synced to tests/php-crud-tests');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
