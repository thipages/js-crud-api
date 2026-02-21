# JS-CRUD-API Functional Tests

Automated tests validating the JavaScript library **JS-CRUD-API** (`esm/index.js`) in Node.js and browser environments, using PHP-CRUD-API functional tests as reference.

## Overview

PHP-CRUD-API functional tests are `.log` files describing REST request/response sequences. Two runners replay them:

- **REST** (`test:rest`): direct `fetch()` calls to the PHP API, serving as reference.
- **JCA** (`test:jca`): calls via the JS-CRUD-API library through an adapter that translates REST requests into JS methods (`list`, `read`, `create`, `update`, `delete`). API Key auth goes through the library via `config.headers`. In the browser, JWT, Basic Auth and dbAuth are also routed through the library. Non-adaptable requests (batch create/update, XML, session auth in Node.js, etc.) automatically fall back to `fetch()`.

A **browser interface** also allows running these tests in the browser.

## Project structure

```
tests/
├── README.md
├── .env                              # Configuration (URLs, options)
├── api.php                           # PHP-CRUD-API endpoint
├── reset-db.php                      # SQLite DB reset (PHP endpoint)
├── init-sqlite.js                    # SQLite database initialization
├── sync-php-crud-tests.js            # Sync tests from PHP-CRUD-API
├── build-test-data.js                # Bundle tests -> JSON for browser
├── run-php-crud-tests.test.js        # Node.js REST tests (raw fetch)
├── run-jca-tests.test.js             # Node.js JS-CRUD-API tests (adapter)
├── unit-api-formats.test.js          # Unit tests for JS API parameter formats
├── var/
│   └── php-crud-api.sqlite           # SQLite database
├── shared/                           # Shared utilities (Node/browser)
│   ├── env.js                        # .env loader
│   ├── fs-utils.js                   # File utilities (walkLogs)
│   ├── jca-adapter.js                # REST -> JS-CRUD-API adapter
│   ├── log-parser.js                 # .log file parser
│   └── normalizers.js                # Response normalization (IP, JSON)
├── browser/                          # Browser interface
│   ├── index.html                    # Main page
│   ├── styles.css                    # Styles
│   ├── test-data.json                # Bundled tests (generated)
│   ├── src/
│   │   ├── app.js                    # Main application
│   │   ├── test-adapter.js           # REST -> JS-CRUD-API adapter
│   │   ├── test-reporter.js          # Results display
│   │   └── test-runner.js            # Test execution
│   └── lib/
│       └── js-crud-api.js            # Copy of ../../esm/index.js
└── php-crud-tests/                   # Reference tests (synced)
    ├── config/                       # PHP configuration per DBMS
    ├── fixtures/                     # SQL fixtures (blog_sqlite.sql, etc.)
    └── functional/                   # Functional tests (.log)
        ├── 001_records/              # CRUD, filters, pagination, joins
        ├── 002_auth/                 # JWT, Basic Auth, DB Auth, API Key
        ├── 003_columns/              # Column and table management
        ├── 004_cache/                # Clear cache
        └── 005_custom_controller/    # Custom endpoint
```

## Quick start

### Prerequisites

- Node.js (>= 18)
- PHP (with built-in server)
- sqlite3 (in PATH)

### Setup

```bash
# 1. Sync tests from PHP-CRUD-API
npm run test:sync

# 2. Initialize the SQLite database
npm run test:init:sqlite
```

### Node.js tests

```bash
# Unit tests (JS API parameter formats)
npm run test:unit

# REST tests (raw fetch) - reference
npm run test:rest

# JS-CRUD-API tests (adapter)
npm run test:jca
```

### Browser tests

```bash
# 1. Generate tests as JSON
npm run test:build

# 2. Start PHP server from tests/
cd tests
php -S localhost:8080

# 3. Open http://localhost:8080/browser/
```

**Important**: the PHP server must be started **from the `tests/` directory**. This directory contains `api.php` and `reset-db.php` which must be at the server root. The API URL is auto-detected from the page origin (same-origin), which avoids CORS issues.

Tests start automatically when the page loads.

## Results

| Environment   | Tests   | Skip | Rate |
|---------------|---------|------|------|
| Node.js REST  | 108/108 | 14   | 100% |
| Node.js JCA   | 108/108 | 14   | 100% |
| Browser       | 105/105 | 16   | 100% |

## Architecture

### REST -> JS-CRUD-API adapter

The adapter (`shared/jca-adapter.js` for Node, `browser/src/test-adapter.js` for the browser) translates REST requests into JS-CRUD-API calls:

| REST                           | JS-CRUD-API                          |
|--------------------------------|--------------------------------------|
| `GET /records/posts`           | `api.list('posts')`                  |
| `GET /records/posts/1`         | `api.read('posts', 1)`               |
| `GET /records/posts/1,2`       | `api.read('posts', '1,2')`           |
| `POST /records/posts`          | `api.create('posts', {...})`         |
| `PUT /records/posts/1`         | `api.update('posts', 1, {...})`      |
| `DELETE /records/posts/1`      | `api.delete('posts', 1)`             |
| `DELETE /records/posts/1,2`    | `api.delete('posts', '1,2')`         |
| `POST /login`                  | `api.login(user, pass)` (browser)    |
| `POST /logout`                 | `api.logout()` (browser)             |
| `GET /me`                      | `api.me()` (browser)                 |
| `POST /register`               | `api.register(user, pass)` (browser) |
| `POST /password`               | `api.password(user, pass, new)` (browser)|

Authentication headers (JWT, Basic, API Key) are passed via `config.headers` by creating a temporary library instance.

The `canAdapt(method, path, headers, body)` method determines whether a request can go through the library. Non-adaptable requests fall back to `fetch()`:

- Non-CRUD endpoints (`/columns`, `/openapi`, `/cache`)
- Content-Type `application/x-www-form-urlencoded`
- Unsupported query params (`?format=xml`, `?q=`)
- Batch create (POST with array body) — risk of partial errors (status 424)
- Batch update (PUT with multiple IDs) — risk of partial errors (status 424)
- dbAuth endpoints in Node.js (`/login`, `/logout`, `/me`, etc.) — cookies not handled

### Authentication strategy in tests

Authentication tests (`002_auth/`) use three mechanisms, handled differently depending on PHP session dependency:

**API Key (stateless)** — `X-API-Key`, `X-API-Key-DB`:
- Headers are passed to the library via `config.headers`
- A temporary JS-CRUD-API instance is created for each request with these headers
- Works in **Node.js and browser** via the library
- Related files: `004_api_key`, `005_api_key_db`

**JWT and Basic Auth (PHP session)** — `X-Authorization`, `Authorization`:
- PHP-CRUD-API validates the token/credentials and stores the result in `$_SESSION`
- Subsequent requests in the file depend on session state (cookies `PHPSESSID`)
- In **browser**: an adapter with `credentials: 'include'` is created to share cookies. Requests go through the library with auth headers passed via `config.headers`
- In **Node.js**: native `fetch` has no cookie jar. These files stay on `fetch()` with manual cookie handling
- Related files: `001_jwt`, `002_basic_auth`

**dbAuth (PHP session)** — login, logout, register, password, me:
- Requires session cookies (`PHPSESSID`) shared between requests
- In **browser**: an adapter with `credentials: 'include'` routes dbAuth endpoints to library methods (`api.login()`, `api.logout()`, `api.me()`, etc.)
- In **Node.js**: these files stay entirely on `fetch()` with manual cookie handling
- Related file: `003_db_auth`

**Minor divergence**: the library's `logout()` method sends `{}` as body (`JSON.stringify({})`) while PHP-CRUD-API expects a POST without body. This has no impact as the server ignores the logout body.

### Log parser

The parser (`shared/log-parser.js`) reads PHP-CRUD-API `.log` files and extracts request/response pairs. It detects `skip-for-sqlite:` and `skip-always:` markers to ignore incompatible tests.

### Normalization

The `shared/normalizers.js` module normalizes responses for comparison:
- Local IP: `::1` -> `127.0.0.1`
- JSON parsing when possible
- Ignores `content-length` in strict mode

## Skipped tests

### Node.js (14 skipped tests)

**SQLite incompatibilities** (12 tests):

| Test | Reason |
|------|--------|
| `001_records/075` | No type support on views |
| `001_records/076` | No geometry functions (spatialite) |
| `001_records/081` | No geometry functions (spatialite) |
| `001_records/082` | No geometry functions (spatialite) |
| `001_records/083` | No geometry functions (spatialite) |
| `003_columns/001` | Auto-increment keys must be integer (not bigint) |
| `003_columns/004` | Columns cannot be altered online |
| `003_columns/005` | Columns cannot be altered online |
| `003_columns/006` | Columns cannot be altered online |
| `003_columns/007` | Columns cannot be altered online |
| `003_columns/009` | Columns cannot be altered online |
| `003_columns/011` | Columns cannot be altered online |

**Other** (2 tests):

| Test | Reason |
|------|--------|
| `001_records/086` | Test too expensive for automated execution |
| `001_records/089` | SSL redirect not applicable locally |

### Browser (16 skipped tests = 14 above + 2)

| Test | Reason |
|------|--------|
| `001_records/041` | CORS: the browser enforces the `Origin` header (Same-Origin Policy) |
| `001_records/042` | CORS: the browser enforces the `Origin` header (Same-Origin Policy) |

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run unit tests for JS API parameter formats |
| `npm run test:sync` | Sync `.log` files from PHP-CRUD-API |
| `npm run test:init:sqlite` | Initialize (or reset) the SQLite database |
| `npm run test:rest` | Run Node.js REST tests (raw fetch) |
| `npm run test:jca` | Run Node.js JS-CRUD-API tests (adapter) |
| `npm run test:build` | Generate `browser/test-data.json` for browser tests |

## Troubleshooting

**Tests don't load in the browser**: run `npm run test:build` to generate `test-data.json`.

**Tests fail massively**: reset the database with `npm run test:init:sqlite` or via the Reset DB button in the browser interface.

**PHP server: 404 error on api.php**: check that the server is started from `tests/` (not from the project root).

**Reset DB doesn't work**: check that `sqlite3` is installed and in the PATH.
