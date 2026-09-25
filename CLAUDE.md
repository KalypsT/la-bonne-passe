# La bonne passe — consignes pour Claude Code

Jeu de gestion en temps réel, sur navigateur mobile en paysage : on dirige une maison close à Amsterdam, partie de presque rien. Les spécifications complètes sont dans `docs/SPECIFICATIONS.md` : c'est la source de vérité. Relis la section concernée avant chaque tâche.

Le développeur travaille depuis son téléphone. Il ne lit pas le code en détail : il teste le jeu sur son téléphone après chaque fusion.

## Pile technique

- Vite + React + TypeScript (mode strict), Zustand pour l'état de l'interface.
- Scène en SVG piloté par React. Aucune image bitmap : tout est vectoriel, dessiné en code.
- Vitest pour les tests du moteur.
- PWA (manifest avec `"orientation": "landscape"`, service worker simple pour le hors-ligne).
- Déploiement : GitHub Actions vers GitHub Pages, à chaque push sur `main`. Base Vite : `/la-bonne-passe/`.
- Polices : Jost (interface) et Yellowtail (néon), via Google Fonts, avec des polices de repli.

## Architecture (à respecter)

```
src/engine/     moteur de simulation, TypeScript pur
src/content/    données et textes du jeu (clients, personnel, événements…)
src/ui/         écrans React, panneau, cartes
src/scene/      maison SVG, personnages, animations
src/save/       sauvegardes et migrations
docs/           spécifications et notes d'équilibrage
prototype/      prototypes HTML de référence
```

- **Le moteur n'importe jamais React, le DOM ou `window`.** Il reçoit un état et des ordres, avance le temps par pas fixes de 5 minutes de jeu et renvoie le nouvel état et les événements produits.
- **Hasard à graine fixe** dans le moteur (pas de `Math.random` direct), pour pouvoir rejouer et tester.
- **Tous les textes et les contenus** (clients, candidats, traits, événements, répliques) vivent dans `src/content/`, jamais en dur dans les composants.
- **Paliers** : chaque système a un drapeau d'ouverture dans l'état ; l'interface masque ou verrouille ce qui n'est pas ouvert.
- **Les animations sont purement visuelles** et ne bloquent jamais la simulation.
- **Sauvegardes** : 3 emplacements dans localStorage, chacune versionnée, avec migrations. Tout accès à localStorage est protégé par try/catch.

## Interface mobile

- Paysage uniquement ; en portrait, afficher un écran « tourne ton téléphone ».
- Écran de référence : 844 × 390 pixels. Tester aussi 667 × 375.
- Scène à gauche (environ 60 %), panneau de gestion permanent à droite.
- Zones tactiles d'au moins 40 pixels. Aucune interaction au survol. Respecter les marges de sécurité (`env(safe-area-inset-*)`), balise viewport avec `viewport-fit=cover`.
- Palette : #0E2229 (nuit), #5C1530 (velours), #FF4F8B (néon), #D4A64A (laiton), #F4DCC8 (crème).
- Référence visuelle : `prototype/la-bonne-passe-proto3.html` (décor de la maison, personnages vectoriels, rideaux, bulles d'alerte, didacticiel). S'en inspirer pour le rendu, **pas pour la structure du code**, qui est une ébauche monolithique.

## Contenu et ton

- Français uniquement, ton réaliste, glamour et décalé.
- Suggestif, jamais explicite : pas de nudité, pas de scène sexuelle. Les rideaux se ferment sur chaque rendez-vous.
- Tous les personnages sont adultes (18 ans et plus, âge affiché).
- Le personnel travaille librement : il peut refuser, négocier, partir. Aucune mécanique de contrainte ou de traite.

## Façon de travailler

- Une tâche par session, en suivant la feuille de route des spécifications.
- Avant de terminer : `npm run build` et `npm test` doivent passer.
- Ne modifie pas `.github/workflows/deploy.yml` sans que ce soit demandé.
- Ajoute des tests Vitest pour chaque règle du moteur (économie, fatigue, paliers…).
- Les valeurs d'équilibrage (prix, seuils, vitesses) sont regroupées dans un seul fichier, `src/content/balance.ts`, pour pouvoir les ajuster facilement.
- En fin de session, résume en français : ce qui a changé, ce qu'il faut tester sur téléphone (étape par étape), et les points d'équilibrage à surveiller.
- Si une demande contredit les spécifications, signale-le avant de coder.
