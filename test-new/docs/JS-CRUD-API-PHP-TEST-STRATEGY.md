# Stratégie de test JS-CRUD-API basée sur les tests PHP-CRUD-API

## Objectif
Utiliser les tests fonctionnels de PHP-CRUD-API (fichiers `.log`) pour valider le comportement du client JS-CRUD-API. L’idée est de rejouer côté client JS les mêmes scénarios REST et de comparer les résultats aux réponses attendues des tests PHP.

## Principe
- Les tests PHP-CRUD-API décrivent une séquence de requêtes REST et de réponses attendues.
- Le runner Node transforme ces `.log` en appels HTTP via `fetch` et compare :
  - le statut HTTP,
  - le JSON de réponse (normalisé si nécessaire).
- Les tests marqués `skip-*` sont ignorés.

## Pourquoi c’est pertinent pour JS-CRUD-API
- JS-CRUD-API est un client HTTP : sa validité dépend du respect des contrats REST.
- Rejouer les `.log` permet de vérifier :
  - la compatibilité des endpoints,
  - la cohérence des réponses,
  - la gestion des erreurs.

## Adaptations nécessaires (cas spécifiques)
1. **URL join**
   - Les `.log` contiennent des paths relatifs et parfois des URLs complètes.
   - Le runner conserve le `baseUrl` et les query strings.

2. **Sessions et auth (cookie jar)**
   - Certaines suites d’auth nécessitent des cookies de session.
   - Le runner conserve et fusionne les cookies `Set-Cookie`.

3. **Reset SQLite**
   - Les tests modifient les données.
   - Avant chaque run, la base est réinitialisée depuis la fixture SQL pour garantir des résultats déterministes.

4. **Normalisation d’IP locale**
   - `::1` est normalisé en `127.0.0.1` dans les réponses.

5. **Headers instables**
   - `content-length` est ignoré en mode strict.

6. **SSL redirect**
   - `sslRedirect` est désactivé en local, et le test dédié est ignoré.

## Résultat attendu
Un test est considéré “pass” si :
- Tous les `.log` joués renvoient les mêmes statuts et JSON attendus.
- Les tests incompatibles sont correctement ignorés.

## Limites
- Les `.log` testent REST, pas directement les méthodes JS.
- Pour un test UI navigateur, une traduction explicite REST → JS sera nécessaire.

## Étape suivante (optionnelle)
- Générer automatiquement une suite de tests navigateur en traduisant chaque `.log` en appels JS-CRUD-API.
