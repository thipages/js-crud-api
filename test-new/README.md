# Tests fonctionnels JS-CRUD-API

Tests automatises validant la librairie JavaScript **JS-CRUD-API** (`esm/index.js`) en environnement Node.js et navigateur, en utilisant les tests fonctionnels de PHP-CRUD-API comme reference.

## Principe

Les tests fonctionnels de PHP-CRUD-API sont des fichiers `.log` decrivant des sequences de requetes REST et de reponses attendues. Deux runners les rejouent :

- **REST** (`test:rest`) : appels `fetch()` directs vers l'API PHP, servant de reference.
- **JCA** (`test:jca`) : appels via la librairie JS-CRUD-API grace a un adaptateur qui traduit les requetes REST en methodes JS (`list`, `read`, `create`, `update`, `delete`). Les requetes non adaptables (batch, XML, auth, etc.) retombent automatiquement sur `fetch()`.

Une **interface navigateur** permet egalement d'executer ces tests dans le browser.

## Structure du projet

```
test-new/
├── README.md
├── .env                              # Configuration (URLs, options)
├── api.php                           # API PHP-CRUD-API
├── reset-db.php                      # Reset base SQLite (endpoint PHP)
├── init-sqlite.js                    # Initialisation base SQLite
├── sync-php-crud-tests.js            # Synchronisation tests depuis PHP-CRUD-API
├── build-test-data.js                # Bundling tests -> JSON pour navigateur
├── run-php-crud-tests.test.js        # Tests Node.js REST (fetch pur)
├── run-jca-tests.test.js             # Tests Node.js JS-CRUD-API (adaptateur)
├── var/
│   └── php-crud-api.sqlite           # Base de donnees SQLite
├── shared/                           # Utilitaires partages Node/navigateur
│   ├── env.js                        # Chargement .env
│   ├── fs-utils.js                   # Utilitaires fichiers (walkLogs)
│   ├── jca-adapter.js                # Adaptateur REST -> JS-CRUD-API
│   ├── log-parser.js                 # Parser fichiers .log
│   └── normalizers.js                # Normalisation reponses (IP, JSON)
├── browser/                          # Interface navigateur
│   ├── index.html                    # Page principale
│   ├── styles.css                    # Styles
│   ├── test-data.json                # Tests bundles (genere)
│   ├── src/
│   │   ├── app.js                    # Application principale
│   │   ├── test-adapter.js           # Adaptateur REST -> JS-CRUD-API
│   │   ├── test-reporter.js          # Affichage resultats
│   │   └── test-runner.js            # Execution tests
│   └── lib/
│       └── js-crud-api.js            # Copie de ../../esm/index.js
└── php-crud-tests/                   # Tests de reference (synchronises)
    ├── config/                       # Configuration PHP par SGBD
    ├── fixtures/                     # Fixtures SQL (blog_sqlite.sql, etc.)
    └── functional/                   # Tests fonctionnels (.log)
        ├── 001_records/              # CRUD, filtres, pagination, joins
        ├── 002_auth/                 # JWT, Basic Auth, DB Auth, API Key
        ├── 003_columns/              # Gestion colonnes et tables
        ├── 004_cache/                # Clear cache
        └── 005_custom_controller/    # Custom endpoint
```

## Demarrage rapide

### Prerequis

- Node.js (>= 18)
- PHP (avec serveur integre)
- sqlite3 (dans le PATH)

### Installation

```bash
# 1. Synchroniser les tests depuis PHP-CRUD-API
npm run test:sync

# 2. Initialiser la base de donnees SQLite
npm run test:init:sqlite
```

### Tests Node.js

```bash
# Tests REST (fetch pur) - reference
npm run test:rest

# Tests JS-CRUD-API (adaptateur)
npm run test:jca
```

### Tests navigateur

```bash
# 1. Generer les tests en JSON
npm run test:build

# 2. Lancer le serveur PHP depuis test-new/
cd test-new
php -S localhost:8080

# 3. Ouvrir http://localhost:8080/browser/
```

**Important** : le serveur PHP doit etre lance **depuis le dossier `test-new/`**. Ce dossier contient `api.php` et `reset-db.php` qui doivent etre a la racine du serveur. L'URL de l'API est auto-detectee depuis l'origine de la page (same-origin), ce qui evite les problemes CORS.

Les tests se lancent automatiquement au chargement de la page.

## Resultats

| Environnement | Tests | Skip | Taux |
|---------------|-------|------|------|
| Node.js REST  | 108/108 | 14 | 100% |
| Node.js JCA   | 108/108 | 14 | 100% |
| Navigateur    | 105/105 | 16 | 100% |

## Architecture

### Adaptateur REST -> JS-CRUD-API

L'adaptateur (`shared/jca-adapter.js` pour Node, `browser/src/test-adapter.js` pour le navigateur) traduit les requetes REST en appels JS-CRUD-API :

| REST                           | JS-CRUD-API                    |
|--------------------------------|--------------------------------|
| `GET /records/posts`           | `api.list('posts')`            |
| `GET /records/posts/1`         | `api.read('posts', 1)`         |
| `POST /records/posts`          | `api.create('posts', {...})`   |
| `PUT /records/posts/1`         | `api.update('posts', 1, {...})`|
| `DELETE /records/posts/1`      | `api.delete('posts', 1)`       |

La methode `canAdapt(method, path, headers, body)` determine si une requete peut passer par la librairie. Les requetes non adaptables retombent sur `fetch()` :

- Endpoints non-CRUD (`/columns`, `/openapi`, `/cache`)
- Content-Type `application/x-www-form-urlencoded`
- Query params non supportes (`?format=xml`, `?q=`)
- IDs multiples (`/records/posts/1,2`)
- Batch (tableaux POST/PUT)
- Flux d'authentification (cookies de session non partages)

### Log parser

Le parser (`shared/log-parser.js`) lit les fichiers `.log` de PHP-CRUD-API et extrait les paires requete/reponse. Il detecte les marqueurs `skip-for-sqlite:` et `skip-always:` pour ignorer les tests incompatibles.

### Normalisation

Le module `shared/normalizers.js` normalise les reponses pour la comparaison :
- IP locale : `::1` -> `127.0.0.1`
- Parsing JSON quand possible
- Ignore `content-length` en mode strict

## Tests ignores

### Node.js (14 tests ignores)

**Incompatibilites SQLite** (12 tests) :

| Test | Raison |
|------|--------|
| `001_records/075` | Pas de support des types sur les vues |
| `001_records/076` | Pas de fonctions geometriques (spatialite) |
| `001_records/081` | Pas de fonctions geometriques (spatialite) |
| `001_records/082` | Pas de fonctions geometriques (spatialite) |
| `001_records/083` | Pas de fonctions geometriques (spatialite) |
| `003_columns/001` | Les cles auto-increment doivent etre integer (pas bigint) |
| `003_columns/004` | Les colonnes ne peuvent pas etre alterees online |
| `003_columns/005` | Les colonnes ne peuvent pas etre alterees online |
| `003_columns/006` | Les colonnes ne peuvent pas etre alterees online |
| `003_columns/007` | Les colonnes ne peuvent pas etre alterees online |
| `003_columns/009` | Les colonnes ne peuvent pas etre alterees online |
| `003_columns/011` | Les colonnes ne peuvent pas etre alterees online |

**Autres** (2 tests) :

| Test | Raison |
|------|--------|
| `001_records/086` | Test trop couteux pour l'execution automatique |
| `001_records/089` | Redirection SSL non applicable en local |

### Navigateur (16 tests ignores = 14 ci-dessus + 2)

| Test | Raison |
|------|--------|
| `001_records/041` | CORS : le navigateur impose le header `Origin` (Same-Origin Policy) |
| `001_records/042` | CORS : le navigateur impose le header `Origin` (Same-Origin Policy) |

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run test:sync` | Synchronise les fichiers `.log` depuis PHP-CRUD-API |
| `npm run test:init:sqlite` | Initialise (ou reinitialise) la base SQLite |
| `npm run test:rest` | Lance les tests REST Node.js (fetch pur) |
| `npm run test:jca` | Lance les tests JS-CRUD-API Node.js (adaptateur) |
| `npm run test:build` | Genere `browser/test-data.json` pour les tests navigateur |

## Depannage

**Les tests ne se chargent pas dans le navigateur** : lancer `npm run test:build` pour generer `test-data.json`.

**Tests echouent massivement** : reinitialiser la base avec `npm run test:init:sqlite` ou via le bouton Reset DB dans l'interface navigateur.

**Serveur PHP : erreur 404 sur api.php** : verifier que le serveur est lance depuis `test-new/` (pas depuis la racine du projet).

**Reset DB ne fonctionne pas** : verifier que `sqlite3` est installe et present dans le PATH.
