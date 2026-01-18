# Tests Navigateur pour JS-CRUD-API

Tests automatisés pour valider le comportement de la librairie JavaScript **JS-CRUD-API** (`esm/index.js`) en environnement navigateur.

## 🎯 Objectif

Valider que la librairie JS-CRUD-API fonctionne correctement en utilisant les tests fonctionnels de PHP-CRUD-API comme référence.

## 📁 Structure du projet

```
test-new/
├── README.md                          # Ce fichier
├── docs/                              # 📚 Documentation
│   ├── BROWSER-README.md              # Guide interface navigateur
│   ├── JS-CRUD-API-PHP-TEST-STRATEGY.md  # Stratégie initiale
│   ├── PHASE-2-RESULTAT.md            # Résultats Phase 2
│   ├── PLAN-TESTS-NAVIGATEUR.md       # Plan de travail complet
│   ├── POC-COMPLETE.md                # Validation Phase 1
│   ├── QUICK-START.md                 # Démarrage rapide
│   └── VALIDATION-POC.md              # Validation POC
│
├── browser/                           # 🌐 Interface navigateur
│   ├── index.html                     # Page principale
│   ├── styles.css                     # Styles
│   ├── test-data.json                 # Tests bundlés (généré)
│   ├── src/                           # Code source
│   │   ├── app.js                     # App principale
│   │   ├── test-adapter.js            # Adaptateur REST→JS-CRUD-API
│   │   ├── test-reporter.js           # Affichage résultats
│   │   └── test-runner.js             # Exécution tests
│   └── lib/                           # Librairies
│       └── js-crud-api.js             # Copie de ../../esm/index.js
│
├── shared/                            # 🔧 Utilitaires partagés
│   ├── log-parser.js                  # Parser fichiers .log
│   └── normalizers.js                 # Normalisation réponses
│
├── php-crud-tests/                    # 📋 Tests de référence
│   └── functional/                    # Tests fonctionnels (.log)
│
├── api.php                            # API PHP-CRUD-API
├── reset-db.php                       # Endpoint reset DB
├── build-test-data.js                 # Bundling tests
└── var/blog.db                        # Base SQLite
```

## 🚀 Démarrage rapide

```bash
# 1. Initialiser la DB
npm run test:init:sqlite

# 2. Générer les tests
npm run test:build

# 3. Lancer le serveur
php -S localhost:8081 -t test-new

# 4. Ouvrir le navigateur
http://localhost:8081/browser/
```

Les tests se lancent automatiquement !

## 📊 Résultats

### Phase 1 : fetch() pur
✅ **105/105 tests (100%)** - Référence stable

### Phase 2 : Adaptateur JS-CRUD-API  
⚠️ **74/105 tests (70%)** - 31 échecs
- Voir [docs/PHASE-2-RESULTAT.md](docs/PHASE-2-RESULTAT.md)

## 📖 Documentation

**Démarrage :**
- [docs/QUICK-START.md](docs/QUICK-START.md) - Guide 5 min
- [docs/BROWSER-README.md](docs/BROWSER-README.md) - Guide complet

**Technique :**
- [docs/PLAN-TESTS-NAVIGATEUR.md](docs/PLAN-TESTS-NAVIGATEUR.md) - Plan complet
- [docs/PHASE-2-RESULTAT.md](docs/PHASE-2-RESULTAT.md) - Analyse échecs

## 🔧 Scripts

```bash
npm run test:init:sqlite  # Init DB
npm run test:build        # Build tests
npm run test:run          # Tests Node.js
```

## 🐛 Problèmes identifiés (Phase 2)

1. **Codes HTTP** (11 tests) - 500 au lieu de 422/409
2. **Données** (10 tests) - user_id, compteurs incorrects  
3. **Auth** (4 tests) - Table invisibles inaccessible
4. **Pagination** (6 tests) - Format page=X,Y mal parsé

## 🔍 Prochaines étapes

Investigation recommandée des bugs critiques avant de continuer.

👉 Voir documentation complète dans [docs/](docs/)
