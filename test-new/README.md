# test-new

Ce dossier contient un runner NodeJS pour rejouer les tests REST de PHP-CRUD-API (SQLite) contre une instance PHP-CRUD-API locale.

## 1. Synchroniser les tests depuis PHP-CRUD-API

```bash
npm run test:sync
```

Par défaut, le script récupère les tests depuis la branche `main` du repo PHP-CRUD-API et copie :
- `tests/functional/**/*.log`
- `tests/fixtures/**`
- `tests/config/**`

Les tests sont copiés dans :
- `test-new/php-crud-tests/`

Variables utiles :
- `PHP_CRUD_API_REF` : branche ou tag (ex: `v2.14.25`).
- `PHP_CRUD_API_REPO` : repo Git (par défaut `https://github.com/mevdschee/php-crud-api.git`).

## 2. Démarrer l’API PHP-CRUD-API (SQLite)

Le runner attend une API opérationnelle. Exemple minimal :
- Base SQLite initialisée avec `test-new/php-crud-tests/fixtures/blog_sqlite.sql`.
- API accessible via une URL du type : `http://localhost:8080/api.php`.

Démarrage conseillé (docroot = `test-new`) :

```bash
php -S localhost:8080 -t test-new
```

Pour initialiser rapidement la base SQLite (via le binaire `sqlite3`) :

```bash
npm run test:init:sqlite
```

Variables utiles :
- `SQLITE_FIXTURE` : chemin vers le SQL de fixture (par défaut `test-new/php-crud-tests/fixtures/blog_sqlite.sql`).
- `SQLITE_DB` : chemin du fichier SQLite (par défaut `test-new/var/php-crud-api.sqlite`).

## 3. Exécuter les tests

```bash
npm run test:rest
```

Variables utiles :
- `TEST_BASE_URL` : URL de base de l’API (par défaut `http://localhost:8080/api.php`).
- `JCA_TEST_STRICT=1` : compare aussi les headers (sinon, comparaison statut + body).
- `JCA_TEST_LOG=1` : log détaillé des requêtes et headers.
- `RESET_DB=0` : ne réinitialise pas la base avant le run (par défaut, reset activé).
- `SQLITE_DB` : chemin vers la base SQLite (par défaut `test-new/var/php-crud-api.sqlite`).
- `SQLITE_FIXTURE` : fixture SQL utilisée pour reset (par défaut `test-new/php-crud-tests/fixtures/blog_sqlite.sql`).

### Exemple complet de `.env`

```dotenv
# URL de base de l’API PHP-CRUD-API
TEST_BASE_URL=http://localhost:8081/api.php

# Comparer aussi les headers (hors content-length)
JCA_TEST_STRICT=1

# Log détaillé des requêtes et headers
JCA_TEST_LOG=1

# Réinitialiser la base avant chaque run (1=oui, 0=non)
RESET_DB=1

# Chemins vers la base SQLite et la fixture
SQLITE_DB=test-new/var/php-crud-api.sqlite
SQLITE_FIXTURE=test-new/php-crud-tests/fixtures/blog_sqlite.sql
```

Notes :
- Les tests sont rejoués dans l’ordre des fichiers `.log`.
- Un cookie jar simple est conservé par fichier de tests si un `Set-Cookie` est renvoyé.

## Détails importants (cas difficiles)

### 1) Construction d’URL (baseUrl + path)
Les fichiers `.log` contiennent des chemins comme `/records/posts` et parfois des URLs absolues.
Le runner construit l’URL finale en concaténant proprement `baseUrl` et le chemin, et **préserve les query strings** (`?include=...`).

### 2) Cookie jar (auth)
Certaines suites (auth) dépendent d’une session PHP. Le runner conserve les cookies retournés (`Set-Cookie`) et les renvoie ensuite via `Cookie`.
Le cookie jar **fusionne** les cookies au lieu de remplacer l’ensemble, pour éviter de perdre des sessions en cours.

### 3) Reset de la base SQLite avant chaque run
Les tests modifient la base. Pour garantir des résultats reproductibles, le runner **réinitialise** la base à partir de la fixture SQL avant l’exécution.

### 4) Adresse IP locale
Sur certaines machines, l’IP locale apparaît en IPv6 (`::1`) au lieu de `127.0.0.1`.
Le runner normalise automatiquement `ip_address` pour comparer correctement les sorties.

### 5) `content-length`
La valeur `content-length` peut varier selon l’encodeur JSON ou l’IP locale.
En mode strict, le runner **ignore** ce header lors de la comparaison.

### 6) Tests marqués “skip”
Certains tests sont incompatibles avec SQLite ou volontairement exclus. Les `.log` peuvent commencer par :
- `skip-for-sqlite:`
- `skip-always:`
Le runner les saute automatiquement.

### 7) Redirection SSL
Le middleware `sslRedirect` est désactivé pour les tests locaux (sinon redirection HTTP→HTTPS).
Le test `redirect_to_ssl` est donc ignoré.

## Dépannage (HTTP → HTTPS)

Si `http://localhost:8080/api.php/...` redirige vers `https://localhost:8080/...` :
- un autre serveur sur 8080 applique une redirection,
- ou le navigateur a mémorisé une règle (HSTS).

Solution rapide : lancer l’API sur un autre port, par ex. :

```bash
php -S localhost:8081 -t test-new
```

et définir :
- `TEST_BASE_URL=http://localhost:8081/api.php`
