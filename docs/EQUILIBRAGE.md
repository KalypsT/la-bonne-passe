# Notes d'équilibrage

Mesures faites avec le moteur (simulation, nettoyage express dès l'alerte, linge commandé chaque soir).
Toutes les valeurs sont dans `src/content/balance.ts`.

`npm run rapport` rejoue les stratégies du joueur simulé (10 graines, 28 nuits) et affiche le tableau ci-dessous, à recopier ici après chaque réglage. Il ne vérifie rien : les garde-fous sont dans `src/engine/equilibrage.test.ts` (10 graines, 14 nuits).

## Réputation et offres (v0.2, parties 1 et 4)

En v0.1, la réputation atteignait 25 dès la première nuit en soirée feutrée, et 50 à 60 en 4 nuits.

Réglage v0.2 :

- `REPUTATION_PAR_RDV` : 8 → 2 ; `REPUTATION_FREIN` = 2 : les gains sont multipliés par (1 − réputation / 100)², les pertes tombent en entier ;
- `REPUTATION_CLIENT_PERDU` : 0,2 → 0,15 ;
- `ARRIVEES_BONUS_REPUTATION` : 3,2 → 2,4, pour que la demande ne sature pas toujours la maison ;
- offres : soirée feutrée +0,04 de qualité (au lieu de +0,10) ; happy hour sans malus de qualité, et ×1,5 sur les gains de réputation (bouche-à-oreille) ;
- moral : −2 par rendez-vous, remontée naturelle de 0,15 par heure jusqu'à 60 seulement.

Simulation d'un joueur actif (`src/engine/simulation.ts` : il embauche Mila, Jonas et Inès, rénove dès qu'il a 1 600 €, met au repos quiconque dépasse 55 de fatigue), 14 nuits, moyenne de 5 graines :

| Offre, rendez-vous max | Palier 2 (nuit) | Réputation nuit 7 | Réputation nuit 14 | Net par nuit, semaine 2 | Moral final |
| --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 5 | 32 | 35 | 905 € | 70 |
| Classique, 4 | 3 à 4 | 35 | 43 | 1 120 € | 63 |
| Happy hour, 4 | 3 à 4 | 41 | 41 | 810 € | 60 |
| Soirée feutrée, 4 | 3 à 4 | 36 | 51 | 1 085 € | 66 |

Lecture : la classique rapporte le plus, le happy hour fait connaître la maison le plus vite, la soirée feutrée construit la meilleure réputation. Quatre rendez-vous par personne rapportent plus mais usent le moral : 3 départs sur 5 parties en happy hour à 4 rendez-vous.

`src/engine/equilibrage.test.ts` garde ces cibles : palier 2 entre la nuit 3 et la nuit 7, 600 à 1 200 € net par nuit, aucune offre gagnante partout, 4 rendez-vous plus rentables mais plus usants, réputation sous 50 la première semaine.

## Personnel (v0.2, partie 3)

Valeurs dans `balance.ts`, sections « Personnel complet » :

- menace de départ sous 20 de moral, levée au-dessus de 30 ; 3 jours pour réagir (+2 pour une personne Fidèle, +1 si loyauté ≥ 70) ;
- un soir de repos : +8 de moral (+4 de plus pour un Solitaire) ;
- entretien : écouter +8, promettre +14 (−15 et −10 de loyauté si la promesse n'est pas tenue sous 3 jours), recadrer −8 mais +0,06 de qualité le soir même ;
- primes : 50 € (+8) ou 120 € (+18), une par semaine ;
- imprévus : 0,35 par heure, 75 minutes d'écart au moins, 3 par nuit au plus. Un test vérifie la moyenne, entre 1,2 et 3 par soirée.

À surveiller : une Diva sans chambre premium perd 4 de moral par nuit, et arrive à la menace de départ en une dizaine de nuits sans entretien ni prime.

## Clientèle : satisfaction par segment (v0.3, partie 1)

Chaque segment (Touristes, Habitués, Affaires, Groupes) a sa satisfaction, de 0 à 100. La réputation globale est leur moyenne pondérée, sur les segments ouverts : `POIDS_REPUTATION` = touristes 1, habitués 1,2, affaires 0,9, groupes 0,8.

- Un client ne touche que son segment : gains et pertes multipliés par `SATISFACTION_PAR_CLIENT` = 2,2, pour que la réputation globale avance au même rythme qu'en v0.2 avant le palier 2. Après, avec 4 segments, elle monte plus lentement (voulu : le palier 4 est à 50).
- Le frein des gains se calcule sur la satisfaction du segment, plus sur la réputation globale.
- Client parti sans être reçu : perte × `SENSIBILITE_ATTENTE` (affaires × 2, groupes × 0,8).
- Départ d'une personne : −3 chez les habitués seulement (`DEPART_SATISFACTION_HABITUES`), au lieu de −1 partout.
- Dispute qui dégénère, imprévus : tous les segments bougent d'autant.
- Attrait d'un segment dans les arrivées : 0,5 + satisfaction × pente (touristes 0,02, habitués 0,035, affaires 0,025, groupes 0,015). Remplace l'ancien bonus des habitués (0,6 + réputation / 60).
- Au palier 2, Affaires et Groupes partent de la réputation acquise : la moyenne ne chute pas.

Les parties simulées modifient désormais l'état sur place (`tickSurPlace`) au lieu de le copier à chaque pas : une partie de 14 nuits passe de 670 ms à 50 ms, `npm test` de 13 s à 3 s, pour des résultats identiques (un test le vérifie).

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 6 | 30 / 31 / 33 | 574 € | 900 € | 13 336 € | 76 | 0,0 | 27 / 30 / 15 / 28 | 36 / 39 / 19 / 37 |
| Classique, 4 | 3 à 4 | 32 / 36 / 39 | 768 € | 1 094 € | 17 775 € | 65 | 0,1 | 26 / 29 / 15 / 29 | 39 / 45 / 26 / 44 |
| Happy hour, 4 | 3 à 3 | 34 / 34 / 28 | 469 € | 811 € | 9 671 € | 59 | 1,0 | 40 / 24 / 12 / 25 | 41 / 34 / 5 / 28 |
| Feutrée, 4 | 3 à 4 | 33 / 40 / 48 | 692 € | 1 022 € | 14 948 € | 73 | 0,0 | 22 / 39 / 12 / 26 | 46 / 59 / 34 / 49 |
| Passif (classique, sans recruter ni rénover) | jamais | 11 / 5 / 2 | 10 € | 231 € | 2 148 € | 46 | 0,0 | 58 / 42 / 0 / 0 | 2 / 1 / 0 / 0 |

Lecture :

- **L'offre change la clientèle.** Le happy hour fait 40 % de touristes, la soirée feutrée 39 % d'habitués : 18 points d'écart dans chaque sens. Un test garde au moins 10 points d'écart, et vérifie qu'à la nuit 14 chaque offre soigne le segment qu'elle attire (touristes en happy hour, habitués en soirée feutrée, 59 à la nuit 28).
- **Le happy hour tous les soirs finit par coûter.** Sur 28 nuits, le quai déborde, les clients d'affaires repartent fâchés (satisfaction 5) et la réputation redescend de 34 à 28. C'est une offre de lancement, pas un régime.
- **La soirée feutrée construit le mieux** : réputation 48 à la nuit 28, tous les segments au-dessus de 34.
- **Les clients d'affaires sont les plus durs à contenter** (19 à 34) : ils partent vite et le racontent deux fois plus fort. La priorité d'accueil de la partie 2 leur donnera un levier.
- **L'argent reste trop facile** : 9 700 à 17 800 € après la première mensualité, pour un joueur actif. Le « net par nuit » (900 à 1 100 €) ne compte pas les salaires ni les charges : le résultat réel par jour tourne autour de 570 à 770 €. À resserrer en partie 6, sur le résultat réel.
- **Le joueur passif** (Sanne seule, une chambre) garde environ 2 000 € au jour 28, mais sa réputation s'effondre à 2 : les clients perdus faute de place pèsent plus que ceux qu'il sert.
