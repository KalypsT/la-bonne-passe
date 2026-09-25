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

## Règles de la maison (v0.3, partie 2)

Ouvertes au palier 2, réglables à tout moment dans l'onglet Clientèle. Valeurs dans `balance.ts` : `TARIFS`, `ELASTICITE_PRIX`, `PRIX_RESSENTI`, `PATIENCE_TARIF`, `FORMULES`, `SELECTIONS`, `REFUS_SATISFACTION`, `PRIORITE_QUALITE`.

- **Tarif** (−20 %, normal, +20 %) : le prix payé suit le cran. La demande d'un segment varie de −élasticité × écart (touristes 1,5, groupes 1, habitués 0,8, affaires 0,2). Le prix se sent aussi dans l'avis (qualité ressentie − élasticité × écart × 0,8) et dans la patience sur le quai (× 1 − écart).
- **Formule** : court (durée × 0,6, prix × 0,6, charge 0,75, arrivées × 1,1, affaires attirés), classique, soirée complète (durée × 1,5, prix × 1,7, charge 1,5, arrivées × 0,8, affaires repoussés, habitués attirés). Le maximum de rendez-vous du planning se compte désormais en charge : 3 = 4 courts ou 2 soirées complètes.
- **Sélection** : laxiste (groupes × 1,4, disputes × 1,6, fête pour groupes et touristes, bruit pour habitués et affaires) ; stricte (portier 80 € par soir, refuse 50 % des groupes et 20 % des touristes, disputes × 0,4, calme apprécié des habitués et des affaires). Un refus coûte autant de satisfaction qu'un client parti las d'attendre.
- **Priorité d'accueil** : ordre d'arrivée, habitués d'abord, pressés d'abord (patience la plus courte). Le segment servi en priorité gagne +0,04 de qualité ressentie.

Premier constat en réglant : la maison du joueur actif est presque toujours pleine (l'équipe atteint son maximum de rendez-vous chaque soir). Tout ce qui ajoute du monde crée surtout des clients perdus. D'où la charge des formules (sinon la formule courte contournait le maximum et gagnait partout), la patience liée au tarif, et le portier payant (sinon la sélection stricte gagnait partout : refuser du monde ne coûtait rien).

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 6 | 30 / 31 / 33 | 574 € | 900 € | 13 336 € | 76 | 0,0 | 27 / 30 / 15 / 28 | 36 / 39 / 19 / 37 |
| Classique, 4 | 3 à 4 | 32 / 36 / 39 | 768 € | 1 094 € | 17 775 € | 65 | 0,1 | 26 / 29 / 15 / 29 | 39 / 45 / 26 / 44 |
| Happy hour, 4 | 3 à 3 | 34 / 34 / 28 | 469 € | 811 € | 9 671 € | 59 | 1,0 | 40 / 24 / 12 / 25 | 41 / 34 / 5 / 28 |
| Feutrée, 4 | 3 à 4 | 33 / 40 / 48 | 692 € | 1 022 € | 14 948 € | 73 | 0,0 | 22 / 39 / 12 / 26 | 46 / 59 / 34 / 49 |
| Classique 3, tarif −20 % | 4 à 6 | 30 / 32 / 33 | 381 € | 707 € | 8 081 € | 77 | 0,0 | 31 / 27 / 12 / 30 | 45 / 37 / 8 / 42 |
| Classique 3, tarif +20 % | 4 à 6 | 29 / 28 / 26 | 796 € | 1 124 € | 17 431 € | 80 | 0,0 | 20 / 33 / 18 / 28 | 12 / 33 / 29 / 27 |
| Classique 3, formule courte | 4 à 6 | 32 / 35 / 38 | 486 € | 812 € | 10 841 € | 77 | 0,0 | 23 / 29 / 21 / 28 | 37 / 34 / 37 / 46 |
| Classique 3, soirée complète | 4 à 6 | 28 / 28 / 29 | 688 € | 1 014 € | 15 418 € | 78 | 0,0 | 28 / 35 / 8 / 29 | 33 / 41 / 4 / 35 |
| Classique 3, sélection laxiste | 4 à 6 | 29 / 29 / 26 | 586 € | 913 € | 12 855 € | 78 | 0,0 | 26 / 24 / 13 / 37 | 34 / 23 / 6 / 45 |
| Classique 3, sélection stricte | 4 à 6 | 31 / 36 / 42 | 529 € | 856 € | 12 063 € | 79 | 0,0 | 28 / 40 / 18 / 15 | 40 / 55 / 37 / 28 |
| Classique 3, habitués d’abord | 4 à 6 | 30 / 32 / 34 | 598 € | 923 € | 13 582 € | 77 | 0,0 | 24 / 32 / 15 / 29 | 34 / 43 / 18 / 40 |
| Classique 3, pressés d’abord | 4 à 6 | 30 / 32 / 33 | 590 € | 916 € | 13 584 € | 76 | 0,0 | 28 / 30 / 16 / 27 | 34 / 37 / 22 / 37 |
| Passif (classique, sans recruter ni rénover) | jamais | 11 / 5 / 2 | 10 € | 231 € | 2 148 € | 46 | 0,0 | 58 / 42 / 0 / 0 | 2 / 1 / 0 / 0 |

Lecture, par rapport à la classique à 3 rendez-vous :

| Règle | Ce qu'elle rapporte | Ce qu'elle coûte |
| --- | --- | --- |
| Tarif +20 % | +220 € par jour | réputation −7 à la nuit 28, touristes à 12 |
| Tarif −20 % | touristes plus nombreux et plus contents | −190 € par jour ; inutile quand la maison refuse du monde |
| Formule courte | réputation +5, affaires à 37 | −90 € par jour |
| Soirée complète | +110 € par jour, habitués attirés | réputation −4, affaires à 4 |
| Sélection stricte | réputation +9, habitués à 55, calme | −45 € par jour, groupes chassés (15 % de la clientèle, satisfaction 28) |
| Sélection laxiste | groupes à 37 % de la clientèle, satisfaction 45 | réputation −7, habitués à 23 |
| Habitués d'abord | habitués +4 | touristes −2 |
| Pressés d'abord | affaires +3 | presque rien |

`src/engine/equilibrage-regles.test.ts` garde ces compromis (10 graines, 21 nuits) : chaque règle rapporte et coûte, et aucune ne gagne à la fois sur l'argent et sur la réputation.

À surveiller :

- Le tarif −20 % ne sert que dans une maison qui n'est pas pleine. Les tendances (partie 4) doivent créer des semaines creuses où il devient utile.
- La sélection laxiste ne rapporte presque pas d'argent tant que le bar n'existe pas : les groupes devraient y dépenser (partie 3).
- La priorité d'accueil a des effets faibles, parce que le quai ne tient que 4 personnes.
