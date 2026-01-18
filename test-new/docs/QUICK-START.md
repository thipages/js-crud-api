# 🚀 Démarrage Rapide - Tests Navigateur

## Installation en 4 étapes

```bash
# 1. Synchroniser les tests depuis PHP-CRUD-API
npm run test:sync

# 2. Builder les tests en JSON pour le navigateur
npm run test:build

# 3. Initialiser la base de données SQLite
npm run test:init:sqlite

# 4. Démarrer le serveur PHP
php -S localhost:8081 -t test-new
```

## Utilisation

1. **Ouvrir l'interface** : http://localhost:8081/browser/

2. **Vérifier l'URL de l'API** : `http://localhost:8081/api.php` (devrait être pré-remplie)

3. **Lancer un test** :
   - Option 1 : Sélectionner une suite (ex: `001_records`)
   - Option 2 : Cliquer sur "▶▶ Lancer tous les tests"

4. **Observer les résultats** :
   - ✅ Statistiques en temps réel
   - ✅ Barre de progression
   - ✅ Détails des tests avec diffs en cas d'erreur

## Commandes utiles

```bash
# Re-synchroniser les tests (si PHP-CRUD-API a été mis à jour)
npm run test:sync

# Re-builder les tests (après sync)
npm run test:build

# Réinitialiser la base (si corrompue)
npm run test:init:sqlite

# Comparer avec les tests Node.js
npm run test:rest
```

## 🔍 Debugging

### Problème : "Impossible de charger les tests"
**Solution** : `npm run test:build`

### Problème : Tests échouent massivement
**Solutions** :
1. Cliquer sur "🔄 Reset DB" dans l'interface
2. Ou via terminal : `npm run test:init:sqlite`

### Problème : Serveur PHP ne démarre pas
**Solution** : 
- Vérifier qu'aucun autre serveur n'utilise le port 8081
- Utiliser un autre port : `php -S localhost:8082 -t test-new`

### Problème : Reset DB ne fonctionne pas
**Solution** :
- Vérifier que `sqlite3` est installé et dans le PATH
- Windows : Télécharger depuis https://www.sqlite.org/download.html

## 📊 Tests disponibles

- **001_records** : 94 tests (CRUD, filtres, pagination, joins, etc.)
- **002_auth** : 5 tests (JWT, Basic Auth, DB Auth, API Key)
- **003_columns** : 19 tests (Gestion des colonnes et tables)
- **004_cache** : 1 test (Clear cache)
- **005_custom_controller** : 1 test (Custom endpoint)

**Total : 121 tests**

## ⚙️ Options

- **Mode strict** : Compare aussi les headers HTTP (peut créer des faux positifs)
- **Logger les requêtes** : Affiche les détails dans la console navigateur (F12)

## 📝 Notes

- La configuration est sauvegardée automatiquement (localStorage)
- Les tests sont exécutés séquentiellement avec un délai de 100ms entre chaque
- Le navigateur gère automatiquement les cookies (pas de cookie jar manuel)

## ✨ Prochaine étape

Une fois le POC validé, passer à la **Phase 2** : créer l'adaptateur pour utiliser la librairie JS-CRUD-API au lieu de faire des appels `fetch()` directs.

Voir [PLAN-TESTS-NAVIGATEUR.md](../PLAN-TESTS-NAVIGATEUR.md) pour plus de détails.
