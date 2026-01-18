# Plan de travail : Tests JS-CRUD-API dans le navigateur

## Contexte

Actuellement, les tests fonctionnels sont exécutés dans Node.js via `run-php-crud-tests.test.js`. Ce plan décrit comment adapter cette stratégie pour exécuter les tests directement dans un navigateur, en utilisant la librairie `esm/index.js`.

## Objectifs

1. Créer une interface web pour exécuter les tests fonctionnels PHP-CRUD-API
2. Traduire les appels REST bruts (des fichiers `.log`) en appels à l'API JS-CRUD-API
3. Afficher les résultats de tests dans le navigateur avec un reporting visuel
4. Conserver la compatibilité avec les tests Node.js existants

## Architecture proposée

### Structure des fichiers

```
test-new/
├── browser/
│   ├── index.html              # Page principale des tests
│   ├── test-runner.js          # Runner de tests côté navigateur (ESM)
│   ├── test-adapter.js         # Adaptateur .log → appels JS-CRUD-API
│   ├── test-reporter.js        # Reporting visuel des résultats
│   ├── log-parser.js           # Parser des fichiers .log (réutilisé depuis Node)
│   └── styles.css              # Styles pour l'interface
├── shared/
│   ├── log-parser.js           # Parser partagé Node/Browser
│   ├── normalizers.js          # Normalisations (IP, headers, etc.)
│   └── cookie-jar.js           # Gestion des cookies (si nécessaire en browser)
└── [fichiers existants...]
```

## Phases de développement

### Phase 1 : Infrastructure de base (2-3h)

**1.1 Créer l'interface HTML principale**
- [ ] Créer `test-new/browser/index.html` avec :
  - Sélecteur de tests (par catégorie : records, auth, columns, etc.)
  - Zone de configuration (URL de base de l'API)
  - Boutons de contrôle (Run, Stop, Reset DB)
  - Zone d'affichage des résultats
  - Barre de progression

**1.2 Préparer les modules partagés**
- [ ] Extraire le code de parsing des `.log` dans `shared/log-parser.js`
- [ ] Extraire les fonctions de normalisation dans `shared/normalizers.js`
- [ ] S'assurer que ces modules sont compatibles ESM (Node + Browser)

**1.3 Servir les fichiers de tests**
- [ ] Créer un endpoint ou mécanisme pour lire les fichiers `.log` depuis le navigateur
  - Option A : Les bundler dans un JSON à la build
  - Option B : Les servir via un endpoint PHP/Node
  - Option C : Les charger dynamiquement via fetch (si CORS permet)

### Phase 2 : Adaptateur REST → JS-CRUD-API (3-4h)

**2.1 Créer le module `test-adapter.js`**
- [ ] Transformer les requêtes REST en appels JS-CRUD-API :
  ```javascript
  // Exemple :
  // GET /records/posts/1 → api.read('posts', 1)
  // POST /records/posts → api.create('posts', {...})
  // PUT /records/posts/1 → api.update('posts', 1, {...})
  // DELETE /records/posts/1 → api.delete('posts', 1)
  // GET /records/posts?filter=id,eq,1 → api.list('posts', {filter: ['id', 'eq', 1]})
  ```

**2.2 Mapper les méthodes HTTP**
- [ ] Implémenter la détection du type d'opération depuis l'URL et la méthode
- [ ] Gérer les query parameters (filter, include, exclude, join, etc.)
- [ ] Parser les corps de requête JSON pour les transformer en arguments

**2.3 Gérer les cas spéciaux**
- [ ] Endpoints personnalisés (custom controllers)
- [ ] Requêtes d'authentification (login/logout)
- [ ] Requêtes vers /openapi, /columns, etc.
- [ ] Requêtes avec upload de fichiers (FormData)

### Phase 3 : Runner de tests navigateur (2-3h)

**3.1 Créer `test-runner.js`**
- [ ] Charger et parser les fichiers `.log` sélectionnés
- [ ] Pour chaque paire requête/réponse :
  - Adapter la requête REST en appel JS-CRUD-API
  - Exécuter l'appel
  - Comparer la réponse avec la réponse attendue
  - Enregistrer le résultat (pass/fail)

**3.2 Gestion des cookies/sessions**
- [ ] Implémenter un cookie jar simple si nécessaire
  - Note : Le navigateur gère déjà les cookies automatiquement
  - Vérifier si cela suffit pour les tests d'auth
  - Sinon, adapter le cookie jar de Node

**3.3 Gestion du reset de DB**
- [ ] Créer un endpoint PHP pour réinitialiser la base SQLite
- [ ] Appeler cet endpoint avant chaque suite de tests
- [ ] Afficher un indicateur visuel du reset en cours

### Phase 4 : Reporting et UI (2h)

**4.1 Créer `test-reporter.js`**
- [ ] Affichage en temps réel des tests en cours
- [ ] Indicateurs visuels (✓ pass, ✗ fail, ⊘ skip)
- [ ] Affichage des diffs en cas d'échec :
  - Status code attendu vs reçu
  - JSON attendu vs reçu (avec highlighting)
  - Headers (si mode strict)

**4.2 Interface de navigation**
- [ ] Liste déroulante des suites de tests
- [ ] Filtres (afficher seulement les échecs, etc.)
- [ ] Statistiques globales (X/Y tests passés)
- [ ] Export des résultats (JSON, texte)

**4.3 Styling**
- [ ] CSS pour une interface claire et lisible
- [ ] Mise en évidence des différences
- [ ] Responsive design basique

### Phase 5 : Optimisations et fonctionnalités avancées (optionnel, 2-3h)

**5.1 Mode debug**
- [ ] Afficher les requêtes HTTP brutes
- [ ] Console log détaillée
- [ ] Breakpoints sur les tests

**5.2 Parallélisation**
- [ ] Exécuter plusieurs tests en parallèle (avec précaution pour la DB)
- [ ] Gérer les dépendances entre tests

**5.3 Sauvegarde de l'état**
- [ ] Sauvegarder la configuration dans localStorage
- [ ] Sauvegarder les résultats des derniers runs
- [ ] Historique des exécutions

## Défis techniques à anticiper

### 1. Différences entre les appels REST bruts et JS-CRUD-API

**Problème** : Les fichiers `.log` contiennent des requêtes REST complètes, alors que JS-CRUD-API expose des méthodes JavaScript haut niveau.

**Solution** :
- Créer un mapping intelligent REST → JS API
- Pour les endpoints non supportés par l'API JS, faire des appels `fetch` directs
- Documenter les cas où l'API JS ne couvre pas le REST complet

### 2. CORS et sécurité

**Problème** : Le navigateur impose des restrictions CORS que Node n'a pas.

**Solution** :
- S'assurer que le serveur PHP renvoie les bons headers CORS
- Tester depuis le même origin si possible (servir HTML depuis PHP)
- Documenter la configuration CORS nécessaire

### 3. Gestion des cookies

**Problème** : Le navigateur gère les cookies automatiquement (pas besoin de cookie jar manuel), mais cela peut créer des différences avec les tests Node.

**Solution** :
- Utiliser les cookies natifs du navigateur
- Vérifier que les tests d'auth fonctionnent correctement
- Si besoin, ajouter une option pour gérer manuellement les cookies

### 4. Reset de la base de données

**Problème** : Le navigateur ne peut pas directement exécuter SQLite ou des commandes système.

**Solution** :
- Créer un endpoint PHP dédié pour reset la DB
- Exemple : `GET /reset-db.php` qui exécute le script d'init
- Appeler cet endpoint avant chaque suite de tests

### 5. Chargement des fichiers `.log`

**Problème** : Les fichiers `.log` sont dans le système de fichiers, pas accessibles directement depuis le browser.

**Solutions possibles** :
- **Option A (recommandée)** : Créer un script de build qui bundle tous les `.log` dans un fichier JSON importable
- **Option B** : Créer un endpoint PHP qui liste et sert les fichiers `.log`
- **Option C** : Les copier dans le dossier public et les charger via fetch

### 6. Tests asynchrones

**Problème** : Tous les appels sont asynchrones dans le navigateur.

**Solution** :
- Utiliser async/await systématiquement
- Gérer correctement les erreurs et timeouts
- Afficher la progression en temps réel

## Plan d'implémentation recommandé

### Étape 0 : Préparation (30min)
1. Créer la structure de dossiers `browser/` et `shared/`
2. Configurer le serveur PHP pour servir les fichiers de test
3. Vérifier que `esm/index.js` est bien accessible

### Étape 1 : POC minimal (2h)
1. Créer une page HTML basique qui charge `esm/index.js`
2. Faire un appel simple à l'API (ex: `list('posts')`)
3. Afficher le résultat dans la page
4. **Validation** : Un appel JS-CRUD-API fonctionne dans le navigateur

### Étape 2 : Parser un fichier .log (2h)
1. Extraire le parser dans `shared/log-parser.js`
2. Bundle un fichier `.log` simple en JSON
3. Le charger et parser dans le navigateur
4. Afficher les paires requête/réponse
5. **Validation** : Les fichiers .log sont lisibles côté navigateur

### Étape 3 : Adapter une requête simple (2h)
1. Implémenter `test-adapter.js` pour un cas simple (GET /records/posts)
2. Exécuter l'appel adapté
3. Comparer la réponse avec l'attendu
4. Afficher le résultat (pass/fail)
5. **Validation** : Une requête simple passe du .log à JS-CRUD-API

### Étape 4 : Runner complet (3h)
1. Étendre l'adaptateur à tous les types de requêtes
2. Implémenter le runner pour une suite complète
3. Gérer les tests multiples et la progression
4. **Validation** : Une suite complète de tests s'exécute

### Étape 5 : UI et reporting (2h)
1. Créer l'interface complète
2. Afficher les résultats en temps réel
3. Gérer les erreurs et les diffs
4. **Validation** : L'interface est fonctionnelle et lisible

### Étape 6 : Finalisation (1h)
1. Gérer le reset de DB
2. Tester toutes les suites de tests
3. Documentation
4. **Validation** : Tous les tests passent comme en Node

## Critères de succès

- [ ] L'interface navigateur peut exécuter au moins une suite de tests complète (ex: 001_records)
- [ ] Les résultats correspondent à ceux du runner Node.js
- [ ] L'interface est claire et montre les succès/échecs
- [ ] Le code est réutilisable et maintenable
- [ ] La documentation permet à quelqu'un d'autre de comprendre et utiliser le système

## Estimations

- **Temps minimum (POC fonctionnel)** : 8-10 heures
- **Temps complet (toutes fonctionnalités)** : 15-20 heures
- **Temps avec optimisations** : 20-25 heures

## Prochaine action

**Validation de ce plan** puis démarrage par l'**Étape 0** et le **POC minimal (Étape 1)**.

---

## Notes complémentaires

### Alternative : Tests hybrides

Au lieu de tout refaire pour le navigateur, on pourrait créer une interface HTML qui :
1. Affiche les résultats des tests Node.js en temps réel
2. Utilise WebSocket ou SSE pour streamer les résultats
3. Permet de contrôler l'exécution (start/stop)

**Avantages** :
- Moins de code à écrire
- Réutilise tout le runner existant
- Plus rapide à mettre en place

**Inconvénients** :
- Ne teste pas vraiment JS-CRUD-API dans le navigateur
- Nécessite Node.js en arrière-plan

### Recommandation

Commencer par le **POC minimal** (Étapes 0-3) pour valider la faisabilité, puis décider si on continue avec l'approche complète ou si on bascule sur une approche hybride.
