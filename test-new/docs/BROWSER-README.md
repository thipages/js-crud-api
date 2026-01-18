# Tests navigateur JS-CRUD-API

Interface web pour exécuter les tests fonctionnels de JS-CRUD-API directement dans le navigateur.

## Prérequis

1. **Tests synchronisés**
   ```bash
   npm run test:sync
   ```

2. **Tests bundlés en JSON**
   ```bash
   npm run test:build
   ```

3. **Serveur PHP démarré**
   ```bash
   php -S localhost:8081 -t test-new
   ```

4. **Base de données initialisée**
   ```bash
   npm run test:init:sqlite
   ```

## Utilisation

1. Ouvrir le navigateur sur : **http://localhost:8081/browser/**

2. Configurer l'URL de l'API (par défaut : `http://localhost:8081/api.php`)

3. Sélectionner une suite de tests ou lancer tous les tests

4. Cliquer sur "▶ Lancer les tests"

## Fonctionnalités

### Configuration
- **URL de base de l'API** : URL complète de l'API PHP-CRUD-API
- **Mode strict** : Compare aussi les headers HTTP (recommandé : désactivé)
- **Logger les requêtes** : Affiche les détails dans la console navigateur

### Contrôles
- **▶ Lancer les tests** : Exécute la suite sélectionnée
- **▶▶ Lancer tous les tests** : Exécute toutes les suites (121 tests)
- **🔄 Reset DB** : Réinitialise la base SQLite
- **⏹ Stop** : Arrête l'exécution en cours

### Résultats
- **Statistiques en temps réel** : Total, réussis, échoués, ignorés
- **Barre de progression** : Avancement de l'exécution
- **Détails des tests** : Affiche les requêtes/réponses et les différences
- **Filtres** : Tous / Échoués / Réussis / Ignorés

### Reset de la base de données

Le bouton "Reset DB" appelle le fichier `reset-db.php` qui :
- Supprime la base SQLite existante
- La recrée à partir de la fixture `blog_sqlite.sql`
- Garantit un état déterministe pour les tests

## Architecture

```
test-new/
├── browser/
│   ├── index.html          # Page principale
│   ├── app.js              # Application principale
│   ├── test-runner.js      # Runner de tests
│   ├── test-reporter.js    # Affichage des résultats
│   ├── test-data.json      # Tests bundlés (généré)
│   └── styles.css          # Styles
├── shared/
│   ├── log-parser.js       # Parser de fichiers .log
│   └── normalizers.js      # Normalisations (IP, etc.)
├── reset-db.php            # Endpoint pour reset DB
└── api.php                 # API PHP-CRUD-API
```

## Différences avec les tests Node.js

### Ce qui fonctionne pareil
- Parsing des fichiers `.log`
- Comparaison des réponses (status + body)
- Normalisation des IPs (::1 → 127.0.0.1)
- Cookie jar (géré automatiquement par le navigateur)

### Limitations actuelles
- **Pas d'utilisation de JS-CRUD-API** : Pour le POC, les tests font des appels REST directs avec `fetch()`
- **CORS** : Le serveur PHP doit autoriser les requêtes cross-origin
- **Reset DB** : Nécessite un endpoint PHP dédié
- **Tests CORS skippés** : Les tests `041_cors_pre_flight.log` et `042_cors_headers.log` sont automatiquement ignorés car le navigateur impose le header `Origin` selon l'origine réelle (ex: `http://localhost:8081`). On ne peut pas falsifier ce header pour tester différentes origines comme en Node.js (sécurité Same-Origin Policy).

## Prochaines étapes

### Phase 2 : Adaptateur JS-CRUD-API
Créer un adaptateur qui traduit les requêtes REST en appels à la librairie JS-CRUD-API :
- `GET /records/posts/1` → `api.read('posts', 1)`
- `POST /records/posts` → `api.create('posts', {...})`
- `PUT /records/posts/1` → `api.update('posts', 1, {...})`
- etc.

Cela permettra de tester réellement la librairie JS côté navigateur.

## Dépannage

### Les tests ne se chargent pas
→ Lancez `npm run test:build` pour générer `test-data.json`

### Erreur CORS
→ Vérifiez que le serveur PHP est bien sur le même port (8080)
→ Ou ajoutez les headers CORS dans `api.php`

### Reset DB ne fonctionne pas
→ Vérifiez que `sqlite3` est installé et dans le PATH
→ Vérifiez que `reset-db.php` est accessible

### Les tests échouent
→ Vérifiez que la base est initialisée (`npm run test:init:sqlite`)
→ Lancez un Reset DB depuis l'interface
→ Comparez avec les résultats des tests Node.js (`npm run test:rest`)

## Configuration localStorage

La configuration est sauvegardée automatiquement dans le localStorage du navigateur :
- URL de base
- Mode strict
- Logger les requêtes

Elle est restaurée au rechargement de la page.
