<!--
version: 0.5.0
created: 2026-02-21T00:00:00+01:00
modified: 2026-02-21T00:00:00+01:00
status: draft
author: Thierry PAGES
tags: roadmap, planning
related: ../changelog.md, ../api.md
-->

# Roadmap v0.5

## JavaScript API improvements

### New endpoints

- [ ] Implement `/openapi` — already commented out in source (`esm/index.js:66`)
- [ ] Implement `/geojson`
- [ ] Implement `/columns`
- [ ] Implement `/status/ping`

### Authentication

- [ ] JWT and Basic Auth support — to analyze (already usable via `config.headers`, may only need documentation)

### Robustness

- [ ] Use `encodeURIComponent` on condition values (`esm/index.js:1` — existing TODO)
- [ ] Evaluate [better-fetch](https://github.com/Swizec/better-fetch) adoption or similar approach (`esm/index.js:2` — existing TODO)
- [ ] Explicitly list dispatcher cases and implement an error system (`esm/index.js:18` — existing TODO)
- [ ] Properly handle `Content-Type` header (`application/json` vs `multipart/form-data`) (`esm/index.js:22` — existing TODO)
- [ ] Handle `FormData` arrays (`esm/index.js:34` — existing TODO)
- [ ] Clarify `read()` behavior without IDs — JS error or delegate to `list()`? (`esm/index.js:56` — existing TODO)

## Build modernization

### Dependency updates (medium priority)

- [ ] Replace deprecated `rollup-plugin-babel` with `@rollup/plugin-babel`
- [ ] Update `@rollup/plugin-node-resolve` from `^9.0.0` to latest
- [ ] Update `@babel/core` and `@babel/preset-env` to latest

### Babel evaluation (medium priority)

- [ ] Evaluate whether ES5 transpilation for the IIFE build is still needed
- [ ] If targeted browsers support ES6+, remove Babel to reduce `min.js` size
- [ ] Move `@rollup/plugin-terser` from `dependencies` to `devDependencies`

## Miscellaneous (low priority)

- [ ] Consider a plugin/middleware system for extending functionality
- [ ] Improve filter condition documentation with more examples
