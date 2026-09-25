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

## Bar et équipe Bar (v0.3, partie 3)

Valeurs dans `balance.ts`, section « Bar et équipe Bar » :

- rénovation 1 200 €, 8 h ; 20 bouteilles trouvées à la cave ;
- équipe Bar : 0 à 2 personnes à 110 € par jour ; une suffit pour servir, la deuxième ajoute +0,02 de qualité partout ;
- chaque client reçu passe au bar : recette toute à la maison (touristes 14 €, habitués 10 €, affaires 24 €, groupes 30 €), bouteilles bues (0,4 à 1,2) ;
- commande au briefing : 40 bouteilles pour 240 € ; livraison express : 20 pour 200 € ; alerte sous 6 bouteilles ;
- un bar qui sert : qualité +0,02 à +0,06 (les groupes le plus), patience +10 min sur le quai ; un bar vide : groupes −0,06, touristes −0,02 ;
- avance du grossiste, le lendemain de la réouverture à 11 h : 250 bouteilles (1 500 €) sans payer, 1 650 € remboursés 14 jours plus tard ;
- formule champagne (bar qui sert) : prix × 1,25, fatigue × 1,3, une bouteille par rendez-vous ; affaires et groupes +0,05, touristes et habitués −0,06 (ils trouvent l'addition salée).

Le joueur simulé rouvre le bar une fois les trois chambres rénovées (vers la nuit 7), avec une personne au comptoir, commande quand le stock passe sous 30 et accepte l'avance.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 6 | 30 / 32 / 33 | 695 € | 1 131 € | 12 343 € | 79 | 0,0 | 26 / 31 / 16 / 28 | 35 / 39 / 16 / 42 |
| Classique, 4 | 3 à 4 | 32 / 38 / 40 | 937 € | 1 378 € | 18 082 € | 62 | 0,4 | 28 / 29 / 15 / 28 | 42 / 44 / 25 / 47 |
| Happy hour, 4 | 3 à 3 | 34 / 33 / 29 | 633 € | 1 081 € | 9 106 € | 60 | 1,0 | 39 / 24 / 12 / 25 | 41 / 35 / 4 / 33 |
| Feutrée, 4 | 3 à 4 | 33 / 42 / 49 | 809 € | 1 249 € | 14 691 € | 72 | 0,0 | 22 / 41 / 12 / 26 | 47 / 60 / 34 / 53 |
| Classique 3, sans bar | 4 à 6 | 30 / 31 / 33 | 574 € | 900 € | 13 336 € | 76 | 0,0 | 27 / 30 / 15 / 28 | 36 / 39 / 19 / 37 |
| Classique 3, bar à 2, sans avance | 4 à 6 | 30 / 33 / 32 | 577 € | 1 161 € | 10 894 € | 79 | 0,0 | 26 / 29 / 17 / 28 | 33 / 36 / 16 / 42 |
| Classique 3, champagne | 4 à 6 | 30 / 30 / 29 | 944 € | 1 380 € | 16 575 € | 74 | 0,3 | 25 / 25 / 18 / 32 | 26 / 27 / 21 / 47 |
| Classique 3, tarif −20 % | 4 à 6 | 29 / 32 / 34 | 491 € | 928 € | 7 590 € | 75 | 0,0 | 33 / 26 / 13 / 28 | 47 / 37 / 4 / 46 |
| Classique 3, tarif +20 % | 4 à 6 | 29 / 30 / 29 | 909 € | 1 347 € | 17 379 € | 77 | 0,0 | 21 / 32 / 19 / 28 | 16 / 34 / 31 / 36 |
| Classique 3, formule courte | 4 à 6 | 32 / 35 / 38 | 663 € | 1 099 € | 12 066 € | 77 | 0,0 | 25 / 28 / 19 / 28 | 38 / 35 / 33 / 49 |
| Classique 3, soirée complète | 4 à 6 | 29 / 30 / 30 | 697 € | 1 132 € | 13 147 € | 78 | 0,0 | 30 / 38 / 5 / 27 | 32 / 43 / 3 / 38 |
| Classique 3, sélection laxiste | 4 à 6 | 29 / 29 / 27 | 717 € | 1 153 € | 12 808 € | 76 | 0,0 | 26 / 25 / 14 / 35 | 35 / 25 / 5 / 46 |
| Classique 3, sélection stricte | 4 à 6 | 31 / 38 / 43 | 633 € | 1 069 € | 11 423 € | 78 | 0,0 | 27 / 38 / 19 / 17 | 42 / 55 / 40 / 31 |
| Classique 3, habitués d’abord | 4 à 6 | 30 / 33 / 35 | 694 € | 1 130 € | 12 656 € | 77 | 0,0 | 27 / 31 / 14 / 29 | 37 / 43 / 17 / 40 |
| Classique 3, pressés d’abord | 4 à 6 | 31 / 33 / 34 | 716 € | 1 152 € | 13 180 € | 79 | 0,0 | 25 / 31 / 17 / 27 | 35 / 38 / 21 / 43 |
| Passif (classique, sans recruter ni rénover) | jamais | 11 / 5 / 2 | 10 € | 231 € | 2 148 € | 46 | 0,0 | 58 / 42 / 0 / 0 | 2 / 1 / 0 / 0 |

Mesures sur 42 nuits (10 graines, classique à 3) :

| Variante | Résultat par jour, semaines 5 et 6 | Avoir après 42 nuits | Réputation nuit 42 |
| --- | --- | --- | --- |
| Sans bar | 508 € | 20 450 € | 33 |
| Bar, une personne | 605 € | 21 170 € | 31 |
| Bar, formule champagne | 615 € | 24 980 € | 25 |

Lecture :

- **Le bar rapporte environ 100 € de plus par jour** une fois rouvert. Il se rembourse (rénovation, salaires, stock, intérêts de l'avance) en cinq à six semaines. `src/engine/equilibrage-bar.test.ts` le garde.
- **La deuxième personne au bar ne se paie pas** en argent (110 € par jour pour +0,02 de qualité). Elle achète un peu de réputation.
- **La sélection laxiste rapporte enfin quelque chose** : les groupes boivent 30 € chacun. Elle passe à +22 € par jour, toujours au prix de −6 de réputation.
- **La formule champagne** : +250 € par jour au début, mais touristes et habitués décrochent (26 et 27 de satisfaction) et le personnel se fatigue plus vite. En réglant, un poids de 1,15 par rendez-vous faisait tomber un maximum de 3 à 2 rendez-vous par soir et ruinait la formule : attention aux paliers entiers de la charge.
- **Paradoxe à traiter en partie 6** : la patience en plus sur le quai et la meilleure qualité attirent plus de monde dans une maison déjà pleine, donc plus de clients perdus. D'où la réputation un peu plus basse avec le bar (31 contre 33 sans). La pénalité des clients perdus pèse trop lourd face à la saturation.

## La semaine : tendances et bilan du lundi (v0.3, partie 4)

- **Comptes par poste** (`src/engine/comptes.ts`) : chaque mouvement d'argent passe par `depenser`, `encaisser` ou `noterDepense`, avec son poste. Un test vérifie, sur 5 semaines simulées, que le résultat de chaque bilan égale exactement la variation de trésorerie + réserve d'un lundi à l'autre.
- **Bilan du lundi** à 5 h (carte en pause) : recettes et dépenses par poste, résultat, réputation, clients, satisfaction par segment, et avoir projeté sur 4 semaines (résultat de la semaine hors travaux, mensualités et remboursement du grossiste à leur date).
- **Tendances** : ouvertes au premier lundi après le palier 2, 1 tendance par semaine et 40 % de chances d'une deuxième, parmi celles dont les segments sont ouverts. Elles multiplient la demande d'un segment (le volume des arrivées suit) et parfois les disputes (`TENDANCES_EFFETS`).
- **Élasticité au prix relevée** : touristes 1,5 → 2, groupes 1 → 1,3. Chaque formule a un écart de prix ressenti (champagne +0,15, soirée complète +0,05) : sans lui, le champagne gagnait toutes les semaines creuses.
- **Semaines creuses creusées** : grève (touristes × 0,3, groupes × 0,4, affaires × 0,6, habitués × 0,8), contrôles (tout × 0,4 à 0,5). Sinon la maison restait pleine et rien ne changeait.

### L'offre change-t-elle la partie ?

Première mesure, avant réglage : la même réponse gagnait toutes les semaines (tarif +20 % pour l'argent, soirée feutrée pour la réputation). La maison étant presque toujours pleine, les tendances ne changeaient rien.

Après réglage, une même tendance forcée toutes les semaines (6 graines, 35 nuits, classique à 3 ; argent = résultat réel par jour des nuits 15 à 35, puis réputation à la nuit 35) :

| Semaine | Classique | Tarif +20 % | Sélection stricte | Sélection laxiste |
| --- | --- | --- | --- | --- |
| Congrès médical | 518 € · 30 | 850 € · 20 | 557 € · 38 | 530 € · 22 |
| Contrôles de police | 285 € · 48 | 173 € · 36 | 100 € · 50 | 304 € · 43 |
| Match européen | 407 € · 15 | 665 € · 17 | 404 € · 36 | 399 € · 11 |

- Le tarif +20 % rapporte 60 % de plus pendant un congrès, et 40 % de moins pendant une semaine de contrôles.
- Un soir de match, le portier fait passer la réputation de 15 à 36 ; la porte ouverte la fait tomber à 11.
- Pendant une semaine creuse, brader ne sert à rien (le tarif −20 % perd 25 à 40 %) : mieux vaut vendre plus à ceux qui viennent (soirée complète, champagne). Josée le dit.

Un joueur simulé qui suit les tendances (`choixAdaptatif` dans `simulation.ts`) finit le mois avec une réputation de 36 contre 29 pour la classique fixe, et 1 000 € de plus. `src/engine/equilibrage-semaine.test.ts` garde ces trois résultats. Les tests d'équilibrage du bar et des règles jouent sans tendance, pour mesurer la mécanique et pas le hasard des semaines.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 6 | 30 / 27 / 29 | 709 € | 1 144 € | 12 640 € | 78 | 0,0 | 23 / 28 / 18 / 32 | 28 / 34 / 14 / 37 |
| Classique, 4 | 3 à 4 | 32 / 34 / 34 | 801 € | 1 245 € | 15 736 € | 68 | 0,4 | 24 / 31 / 19 / 26 | 36 / 41 / 18 / 41 |
| Happy hour, 4 | 3 à 3 | 34 / 34 / 33 | 593 € | 1 039 € | 9 252 € | 64 | 0,7 | 33 / 28 / 11 / 28 | 44 / 37 / 8 / 40 |
| Feutrée, 4 | 3 à 4 | 33 / 41 / 47 | 769 € | 1 209 € | 13 782 € | 73 | 0,1 | 21 / 39 / 17 / 23 | 45 / 56 / 35 / 49 |
| Adaptatif (suit les tendances), 3 | 4 à 6 | 30 / 32 / 36 | 811 € | 1 247 € | 13 638 € | 80 | 0,0 | 22 / 34 / 20 / 24 | 26 / 47 / 33 / 36 |
| Classique 3, sans bar | 4 à 6 | 30 / 29 / 29 | 554 € | 880 € | 12 326 € | 80 | 0,0 | 25 / 31 / 15 / 29 | 28 / 37 / 17 / 33 |
| Classique 3, bar à 2, sans avance | 4 à 6 | 30 / 29 / 31 | 573 € | 1 156 € | 10 303 € | 81 | 0,0 | 23 / 28 / 18 / 32 | 30 / 36 / 16 / 38 |
| Classique 3, champagne | 4 à 6 | 30 / 28 / 22 | 884 € | 1 321 € | 15 478 € | 79 | 0,2 | 18 / 32 / 21 / 30 | 5 / 25 / 27 / 36 |
| Classique 3, tarif −20 % | 4 à 6 | 30 / 32 / 32 | 458 € | 894 € | 6 378 € | 76 | 0,0 | 26 / 32 / 14 / 27 | 44 / 35 / 5 / 41 |
| Classique 3, tarif +20 % | 4 à 6 | 29 / 27 / 24 | 836 € | 1 272 € | 16 062 € | 80 | 0,0 | 16 / 32 / 23 / 29 | 5 / 35 / 30 / 25 |
| Classique 3, formule courte | 4 à 6 | 32 / 35 / 39 | 644 € | 1 080 € | 10 816 € | 81 | 0,0 | 20 / 28 / 23 / 28 | 36 / 36 / 37 / 49 |
| Classique 3, soirée complète | 4 à 6 | 29 / 27 / 30 | 743 € | 1 179 € | 13 298 € | 79 | 0,0 | 21 / 40 / 6 / 33 | 24 / 48 / 8 / 37 |
| Classique 3, sélection laxiste | 4 à 6 | 29 / 26 / 23 | 609 € | 1 045 € | 10 749 € | 79 | 0,0 | 20 / 32 / 13 / 35 | 26 / 22 / 5 / 43 |
| Classique 3, sélection stricte | 4 à 6 | 31 / 36 / 42 | 480 € | 915 € | 8 963 € | 80 | 0,0 | 25 / 36 / 21 / 18 | 40 / 53 / 37 / 34 |
| Classique 3, habitués d’abord | 4 à 6 | 30 / 29 / 30 | 710 € | 1 146 € | 11 885 € | 78 | 0,0 | 23 / 31 / 18 / 28 | 27 / 39 / 13 / 39 |
| Classique 3, pressés d’abord | 4 à 6 | 31 / 29 / 29 | 732 € | 1 168 € | 12 332 € | 77 | 0,0 | 22 / 28 / 20 / 30 | 27 / 32 / 19 / 39 |
| Passif (classique, sans recruter ni rénover) | jamais | 11 / 5 / 2 | 10 € | 231 € | 2 148 € | 46 | 0,0 | 58 / 42 / 0 / 0 | 2 / 1 / 0 / 0 |

À surveiller :

- **Les semaines chargées font baisser la réputation de tout le monde** : plus de demande dans une maison pleine, ce sont plus de clients perdus. La classique fixe tombe à 29 à la nuit 28 (33 sans tendance). C'est le paradoxe déjà noté : à traiter en partie 6.
- **Le tarif −20 % ne rapporte jamais**, même en semaine creuse (il faudrait 25 % de clients en plus rien que pour compenser). Il ne sert qu'à la satisfaction des touristes. À revoir en partie 6, avec la saturation.
- **Champagne et tarif +20 % font tomber les touristes à 5** sur un mois : ceux qui jouent l'argent à fond le paient.
