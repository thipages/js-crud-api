<!--
version: 0.4.2
created: 2026-02-21T00:00:00+01:00
modified: 2026-02-21T00:00:00+01:00
status: stable
author: Thierry PAGES
tags: architecture
related: README.md, api.md
-->

# Technical architecture

## Overview

js-crud-api is an ultra-lightweight JavaScript library (68 lines) that wraps the [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api) REST API into a Promise-based JavaScript interface.

## Project structure

```
js-crud-api/
├── esm/
│   └── index.js              # Single source file (68 lines)
├── rollup/
│   ├── rollup.config_esm.js      # ESM build
│   ├── rollup.config_esm_min.js  # Minified ESM build
│   └── rollup.config_iife_min.js # Browser IIFE build
├── tests/
│   ├── unit-api-formats.test.js   # Unit tests (node:test)
│   ├── run-php-crud-tests.test.js # Direct REST tests
│   ├── run-jca-tests.test.js      # JCA adapter tests
│   ├── shared/                    # Shared utilities
│   │   ├── jca-adapter.js         # REST → JS API adapter
│   │   ├── log-parser.js          # .log file parser
│   │   ├── normalizers.js         # Response normalizers
│   │   ├── env.js                 # .env loader
│   │   └── fs-utils.js            # File utilities
│   ├── php-crud-tests/            # 121 reference .log files (gitignored, generated)
│   ├── browser/                   # Browser test interface
│   └── var/                       # Test SQLite database (gitignored)
├── docs/                          # Documentation
├── index.js                       # ESM build output
├── index.min.js                   # Minified ESM build output
├── min.js                         # Browser IIFE build output
├── package.json
└── composer.json                  # PHP dependencies (test infrastructure)
```

## Source code architecture

### Principle

The single source file (`esm/index.js`) exports a factory function that returns an API object:

```
jscrudapi(baseUrl, config) → { list, read, create, update, delete, register, login, ... }
```

### Internal components

1. **Functional utilities** — `castArray`, `prefix`, `join`, `mapN`, `push`: array and string manipulation
2. **Query string builder** — `query()`, `dispatch()`, `pca_join()`: transforms JavaScript conditions into PHP-CRUD-API compliant URL parameters
3. **Fetch layer** — `_fetch()`: wraps `fetch()` with error handling and JSON parsing
4. **Public API** — returned object with CRUD and authentication methods

### Call flow

```
jca.list('posts', {filter: 'id,gt,5'})
  → _readOrList([['posts'], {filter: 'id,gt,5'}])
    → _fetch('GET', null, ['records', 'posts', '?filter=id,gt,5'])
      → fetch('http://base/api.php/records/posts?filter=id,gt,5', config)
        → Promise<data> | Promise.reject({code, message})
```

## Build pipeline

Three Rollup configurations produce the distribution artifacts:

| Configuration | Output | Format | Usage |
|---|---|---|---|
| `rollup.config_esm.js` | `index.js` | ESM | npm `import` |
| `rollup.config_esm_min.js` | `index.min.js` | Minified ESM | Optimized import |
| `rollup.config_iife_min.js` | `min.js` | Minified IIFE | Browser `<script>` |

The IIFE build uses Babel for ES5 transpilation and exposes the `jscrudapi` global.

## Test strategy

| Layer | File | Dependencies |
|---|---|---|
| Unit | `unit-api-formats.test.js` | None (mock fetch) |
| REST | `run-php-crud-tests.test.js` | PHP server + SQLite |
| JCA | `run-jca-tests.test.js` | PHP server + SQLite + adapter |
| Browser | `tests/browser/` | PHP server + browser |

REST and JCA tests replay 121 `.log` scenarios extracted from PHP-CRUD-API via `sync-php-crud-tests.js`.

## Dependencies

- **Runtime:** none (native Fetch API)
- **Build:** Rollup, Babel, Terser
- **Test (PHP):** PHP-CRUD-API, SQLite, Composer
- **Test (JS):** `node:test`, `node:assert` (Node.js built-in)
