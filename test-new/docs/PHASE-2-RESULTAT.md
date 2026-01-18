# Phase 2 : Adaptateur JS-CRUD-API - Résultat

## Résumé

**Statut** : ✅ Partiel (70% de réussite)

**Résultats** :
- **74/105 tests réussis** (70.5%)
- 31 tests échoués
- 16 tests ignorés (SQLite incompatible + CORS)

**Comparaison avec Phase 1** (fetch pur) :
- Phase 1 : 105/105 tests réussis (100%)
- Phase 2 : 74/105 tests réussis (70%)
- **Régression** : 31 tests (29.5%)

---

## Objectif de la Phase 2

Remplacer les appels `fetch()` directs vers l'API REST par des appels via la librairie **JS-CRUD-API** (`esm/index.js`), tout en maintenant les mêmes résultats de tests.

**Avantages attendus** :
- API plus ergonomique (méthodes `create()`, `read()`, `update()`, `delete()`, `list()`)
- Abstraction des détails HTTP (headers, méthodes, parsing)
- Code client plus lisible et maintenable

**Résultat** : L'adaptateur fonctionne pour **70% des cas d'usage**, mais révèle des **différences de comportement** entre l'API REST et JS-CRUD-API.

---

## Architecture de l'adaptateur

### Fichiers créés

1. **`test-adapter.js`** : Traduit requêtes HTTP → appels JS-CRUD-API
   - `canAdapt(method, path, headers)` : Détermine si la requête peut utiliser l'adaptateur
   - `execute(method, path, body)` : Exécute via JS-CRUD-API
   - `executeAsResponse(...)` : Simule une réponse HTTP
   - `parsePath(path)` : Parse URL et query params

2. **`js-crud-api.js`** : Copie de `esm/index.js` pour accès navigateur

### Détection et fallback

L'adaptateur **rejette** automatiquement les requêtes non supportées et utilise `fetch()` :

- ❌ Endpoints non-CRUD : `/columns`, `/openapi`, `/cache`
- ❌ Content-Type form-encoded : `application/x-www-form-urlencoded`
- ❌ Query params non supportés : `?format=xml`, `?q=` (search)
- ❌ IDs multiples : `/records/posts/1,2` (batch operations)
- ❌ Tableaux POST/PUT : Batch create/update

**Résultat** : Environ **30-40% des requêtes** passent par `fetch()` (fallback).

---

## Analyse des 31 échecs

### 1. Pagination avancée (5 tests)

**Problème** : Format `page=numéro,taille` mal interprété

```
✗ GET /records/posts?page=2,2&order=id,desc
  Attendu: page 2, taille 2 → IDs [12, 11]
  Reçu: Mauvais résultats
```

**Cause** : L'adaptateur parse `page=2,2` en `['2', '2']` mais JS-CRUD-API ne comprend pas ce format.

**Impact** : Tests 019, 020, 022, 024, 077, 087 (6 tests)

---

### 2. Codes HTTP incorrects (11 tests)

**Problème** : JS-CRUD-API retourne `500` au lieu des codes spécifiques

```
✗ POST /records/posts (données invalides)
  Attendu: 422 (Unprocessable Entity)
  Reçu: 500 (Internal Server Error)

✗ POST /records/posts (foreign key violation)
  Attendu: 409 (Conflict)
  Reçu: 422
```

**Cause** : Gestion d'erreur différente entre l'API REST (PHP-CRUD-API) et JS-CRUD-API.

**Impact** : Tests 018, 040, 043, 044, 045, 051, 067, 072, 003_columns/015, 003_columns/016 (11 tests)

---

### 3. Authentification (4 tests)

**Problème** : Table `invisibles` retourne `404` au lieu de `200`

```
✗ GET /records/invisibles/e42c77c6-...
  Attendu: 200 (avec données)
  Reçu: 404 (Not Found)
```

**Cause** : JS-CRUD-API ne gère pas les permissions de la même manière que l'API REST.

**Impact** : Tests 002_auth/001, 002_auth/002, 002_auth/004, 002_auth/005 (4 tests)

---

### 4. Données incorrectes (10 tests)

**Problème** : Différences de contenu ou compteurs

```
✗ GET /records/posts/3
  Attendu: user_id = 1
  Reçu: user_id = 2

✗ GET /records/events/1
  Attendu: visitors = 0
  Reçu: visitors = 3

✗ DELETE /records/posts/4
  Attendu: 1 (supprimé)
  Reçu: 0 (non supprimé)
```

**Causes possibles** :
- Requêtes précédentes modifient l'état de la DB différemment
- Isolation des transactions
- Reset DB incomplet entre certains tests

**Impact** : Tests 009, 015, 016, 069, 074, 078 (6 tests)

---

### 5. POST form-encoded (2 tests)

**Problème** : Certains cas edge ne sont pas détectés correctement

```
✗ POST /records/posts (form-encoded)
  Attendu: 200
  Reçu: 500
```

**Cause** : Headers non transmis ou format body non détecté pour certains tests.

**Impact** : Tests 013, 014 (2 tests)

---

### 6. Batch operations (2 tests)

**Problème** : Opérations sur IDs multiples ou arrays

```
✗ PUT /records/comments/7,8
  Attendu: [1, 1]
  Reçu: [0, 0]

✗ POST /records/comments (array)
  Attendu: 200
  Reçu: 500
```

**Cause** : Détection incomplète ou comportement différent.

**Impact** : Tests 090, 091, 093 (3 tests)

---

## Améliorations apportées

### ✅ Phase 1 → Phase 2

1. **Auto-lancement** : Tests démarrent automatiquement au chargement
2. **Export groupé** : Résultats groupés par type d'erreur (POST form, query params, auth, etc.)
3. **Détection Content-Type** : Rejette `application/x-www-form-urlencoded` ✅
4. **Détection query params** : Rejette `?format=`, `?q=` ✅
5. **Détection batch** : Rejette IDs multiples `/posts/1,2` ✅
6. **Reset DB automatique** : Base réinitialisée avant chaque exécution ✅
7. **Bouton copier sans alerte** : Export silencieux ✅

---

## Recommandations

### Court terme

**Utiliser Phase 1 (fetch) comme référence stable** :
- 100% de tests passent
- Comportement identique à l'API REST
- Pas de surprises

**Phase 2 (adaptateur) comme option expérimentale** :
- Ajouter une checkbox "Utiliser JS-CRUD-API (expérimental - 70%)"
- Mode par défaut : fetch pur
- Mode expérimental : adaptateur avec fallback

### Moyen terme

**Investiguer les différences** :
1. Comparer le code source de JS-CRUD-API vs comportement REST
2. Vérifier la gestion des erreurs (codes HTTP)
3. Tester l'isolation des transactions
4. Documenter les limitations de JS-CRUD-API

**Améliorer l'adaptateur** :
1. Corriger le parsing de `page=X,Y`
2. Mapper les codes d'erreur correctement
3. Gérer l'authentification et permissions
4. Détecter plus de cas edge (form-encoded, batch)

### Long terme

**Contribuer à JS-CRUD-API** :
- Signaler les différences de comportement
- Proposer des améliorations (codes HTTP, pagination)
- Aligner le comportement avec l'API REST

---

## Conclusion

La **Phase 2 démontre** que :

✅ **L'adaptateur fonctionne** pour 70% des cas d'usage courants (CRUD simple)
❌ **Des limitations existent** pour les cas avancés (pagination, erreurs, auth)
⚠️ **JS-CRUD-API n'est pas 100% compatible** avec l'API REST PHP-CRUD-API

**Recommandation finale** : Conserver les 2 modes (fetch + adaptateur) et documenter les différences pour que les utilisateurs puissent choisir en connaissance de cause.

---

## Fichiers modifiés

- `test-new/browser/test-adapter.js` : Adaptateur créé ✅
- `test-new/browser/js-crud-api.js` : Copie de esm/index.js ✅
- `test-new/browser/test-runner.js` : Intégration adaptateur ✅
- `test-new/browser/test-reporter.js` : Export groupé ✅
- `test-new/browser/app.js` : Auto-lancement, copie silencieuse ✅

**Date** : 18 janvier 2026
**Tests** : 74/105 réussis (70.5%)
**Statut** : Phase 2 partiellement validée
