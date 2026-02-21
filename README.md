# JS-CRUD-API

> **v0.4.2** — JavaScript client library for [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api)

Zero runtime dependency. Uses native `fetch`. 68 lines of source code.

## Installation

```bash
npm i js-crud-api
```

```javascript
import jscrudapi from 'js-crud-api';
const jca = jscrudapi('http://localhost/api.php');
```

Or via HTML:

```html
<script src="min.js"></script>
<script>
  const jca = jscrudapi('http://localhost/api.php');
</script>
```

## Quick example

```javascript
// List
jca.list('posts', { filter: 'id,gt,5', order: 'id,desc' });

// CRUD
jca.read('posts', 1);
jca.create('posts', { title: 'Hello' });
jca.update('posts', 1, { title: 'Updated' });
jca.delete('posts', 1);

// Auth (DBAuth)
jca.login('user', 'pass');
```

All functions are Promise-based. Errors return `{ code, message }`.

## Limitations

- Endpoints not implemented: `/openapi`, `/geojson`, `/columns`, `/status/ping`
- Only DBAuth (not JWT/Basic Auth)

## Companion

[JCA-FILTER](https://github.com/thipages/jca-filter) — facilitates filter creation for JS-CRUD-API

## Documentation

Detailed documentation (in French) is available in [`docs/`](docs/README.md):
- [API Reference](docs/api.md) — full API documentation
- [Architecture](docs/architecture.md) — project structure and internals
- [Changelog](docs/changelog.md) — version history
- [Roadmap 0.5](docs/roadmap/roadmap-0.5.md) — upcoming features

## Tests

Built on PHP-CRUD-API v2.14.25, SQLite v3.43.2.

```bash
npm run test:unit    # Unit tests (parameter formats)
npm run test:rest    # REST integration tests
npm run test:jca     # JCA adapter tests
```

## License

[MIT](LICENSE) — Thierry PAGES
