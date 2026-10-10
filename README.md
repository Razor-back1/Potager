# Atelier Potager

App de gestion de potager, de jardin de fleurs et de verger : plan, plantations, rotation, journal, récoltes,
météo, arrosage GARDENA, synchronisation entre appareils et amis invités.

**Utiliser l'app** : https://razor-back1.github.io/Potager/ — sur iPhone, ouvrir dans Safari →
Partager → « Sur l'écran d'accueil ».

## Organisation du dépôt

| Dossier / fichier | Rôle |
|---|---|
| `src/head.html`, `src/body.html` | en-tête et squelette de l'interface |
| `src/css/base.css` | le style Classique |
| `src/css/styles.css` | les styles iOS, Verre sombre et Widgets (couches par-dessus Classique) |
| `src/js/NN-*.js` | le code, un fichier par partie, assemblé dans l'ordre des numéros |
| `src/relais/relais.js` | le relais Cloudflare (synchro, amis, notifications, calendrier, GARDENA) |
| `tools/build.py` | assemble `src/` puis construit tout ce qui est publié |
| `tests/` | tests automatiques |
| `index.html`, `sw.js`, `manifest.webmanifest`, icônes | l'app publiée (générés, ne pas modifier à la main) |
| `source-artifact.html` | l'app en un seul fichier (générée, publiée comme artifact Claude) |
| `gardena-worker.js` | le code du relais à copier dans Cloudflare (généré) |

## Modifier l'app

1. Modifier les fichiers de `src/`.
2. `python3 tools/build.py`
3. `cd tests && npm install && npx playwright install chromium && npm test`
4. Commiter les sources **et** les fichiers générés.

Les fichiers JavaScript partagent une seule portée (ils sont mis bout à bout dans un même script) :
une fonction déclarée dans un fichier est utilisable dans tous les autres.

## Tests

À chaque push, GitHub Actions reconstruit l'app (et vérifie que les fichiers publiés
correspondent aux sources), puis lance :

- `tests/app.test.mjs` : l'app dans un iPhone simulé — les 4 styles et tous les onglets sans erreur,
  série de planches + annuler/rétablir, historique d'annulation après rechargement, plusieurs jardins,
  jardin de fleurs, semis échelonnés et calendrier, cultures modifiables, variétés, objectif de récolte, verger (mise à fruit,
  pollinisation, gel sur fleurs, planter un arbre),
  invitations, et une synchro iPhone → iPad
  qui passe par le vrai code du relais ;
- `tests/relais.test.mjs` : le relais avec une base D1 simulée — accès, potagers, conflits de version,
  amis, photos, calendrier.
