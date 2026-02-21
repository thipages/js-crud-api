<!--
version: 0.4.2
created: 2026-02-21T00:00:00+01:00
modified: 2026-02-21T00:00:00+01:00
status: stable
author: Thierry PAGES
tags: api, reference
related: README.md, architecture.md
-->

# API Reference

## Import

```javascript
// ESM (npm)
import jscrudapi from 'js-crud-api';

// Browser (IIFE)
// <script src="min.js"></script> → jscrudapi available globally
```

## Initialization

```javascript
const jca = jscrudapi(baseUrl, config);
```

| Parameter | Type | Description |
|---|---|---|
| `baseUrl` | `string` | PHP-CRUD-API entry point URL (e.g. `'http://localhost/api.php'`) |
| `config` | `object` | Optional configuration passed to `fetch()` (headers, credentials, etc.) |

## CRUD functions

All functions return a `Promise`.

### `list(table, conditions)`

Lists records from a table.

| Parameter | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `conditions` | `object` | Optional conditions (see [Conditions](#conditions)) |

### `read(table, ids, conditions)`

Reads one or more records by ID.

| Parameter | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `ids` | `number \| string \| Array` | ID(s) to read. E.g. `1`, `'1,2'`, `[1, 2]` |
| `conditions` | `object` | Optional conditions |

### `create(table, data)`

Creates one or more records.

| Parameter | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `data` | `object \| Array` | Data to insert. A single object or an array of objects |

### `update(table, idOrList, data)`

Updates one or more records.

| Parameter | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `idOrList` | `number \| string \| Array` | ID(s) to update |
| `data` | `object \| Array` | New data |

### `delete(table, idOrList)`

Deletes one or more records.

| Parameter | Type | Description |
|---|---|---|
| `table` | `string` | Table name |
| `idOrList` | `number \| string \| Array` | ID(s) to delete |

## Authentication functions

Implements [PHP-CRUD-API DBAuth](https://github.com/mevdschee/php-crud-api#database-authentication).

| Function | Parameters | Description |
|---|---|---|
| `register(username, password)` | `string, string` | Register a new user |
| `login(username, password)` | `string, string` | Log in |
| `password(username, password, newPassword)` | `string, string, string` | Change password |
| `logout()` | — | Log out |
| `me()` | — | Get current user info |

## Conditions

Conditions are passed as an object. Values can be `string`, `number` or `Array`.

### Filtering

```javascript
jca.list('table', { filter: 'field,eq,value' });
jca.list('table', { filter: ['field1,eq,v1', 'field2,gt,v2'] });       // AND
jca.list('table', { filter: 'field1,eq,v1', filter1: 'field2,eq,v2' }); // OR
```

Modifiers: `cs`, `sw`, `ew`, `eq`, `lt`, `le`, `ge`, `gt`, `bt`, `in`, `is`. Negate with `n` prefix (e.g. `neq`).

### Joining

```javascript
jca.list('table', { join: 'other' });
jca.list('table', { join: ['t1', 't2'] });         // path: table>t1>t2
jca.list('table', { join: [['t1'], ['t2']] });      // paths: table>t1 and table>t2
```

### Pagination and size

```javascript
jca.list('table', { page: '1,50' });
jca.list('table', { size: 10 });
```

### Column selection

```javascript
jca.list('table', { include: 'field1,field2' });
jca.list('table', { exclude: ['field1'] });
```

### Ordering

```javascript
jca.list('table', { order: 'field,desc' });
jca.list('table', { order: ['field1,desc', 'field2'] });
```

## Error handling

All functions reject the Promise on error with a `{ code, message }` object.

| Code | Source |
|---|---|
| `-1` | JavaScript network error (fetch) |
| Others | [PHP-CRUD-API error codes](https://github.com/mevdschee/php-crud-api#errors) |

## Current limitations

- Endpoints not implemented: `/openapi`, `/geojson`, `/columns`, `/status/ping`
- Only DBAuth is supported (not JWT or Basic Auth)
- No `encodeURIComponent` encoding on condition values
