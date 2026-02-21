<!--
version: 0.4.2
created: 2026-02-21T00:00:00+01:00
modified: 2026-02-21T00:00:00+01:00
status: stable
author: Thierry PAGES
tags: changelog
related: README.md, roadmap/roadmap-0.5.md
-->

# Changelog

## v0.4.1 (2026-02-21)

- Compliance with Claude Conventions v1.2.0 (flat YAML frontmatter)
- Created `docs/` structure (README, changelog, api, architecture, roadmap)
- Fixed license author
- Removed leftover `test-new/` directory
- Removed obsolete `tests.html`

## v0.4.0

- Complete test refactoring: replaced legacy `tests/` with `test-new/` renamed as `tests/`
- Translated French text in tests to English
- Added unit tests for API parameter formats (`unit-api-formats.test.js`)
- Added JCA adapter tests
- Browser test interface (interactive HTML)

## v0.3.0

- Initial release on npm
- JavaScript client for PHP-CRUD-API
- Full CRUD support: `read`, `list`, `create`, `update`, `delete`
- DBAuth authentication: `register`, `login`, `logout`, `password`, `me`
- Advanced conditions: filters, joins, pagination, column selection, ordering
- ESM and IIFE (browser) exports
- Zero runtime dependencies
