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

## Soirées à thème (v0.3, partie 5)

Ouvertes avec les tendances, au premier lundi après le palier 2. Programmées au briefing, payées tout de suite, valables pour la soirée. Valeurs dans `balance.ts` (`THEMES`, `THEME_LASSITUDE`) :

| Thème | Coût | Supplément | Ce qui le distingue | Fatigue |
| --- | --- | --- | --- | --- |
| Soirée masquée | 100 € | +10 % | attire les affaires (× 1,8), qui l'adorent (+0,08) | × 1 |
| Soirée burlesque | 120 € | +15 % | bouche-à-oreille × 1,5 ; groupes et touristes ravis, habitués agacés ; +20 min de patience | × 1,2 |
| Soirée jazz | 80 € | +10 % | attire et comble les habitués ; disputes × 0,7 | × 0,85 |
| Années folles | 150 € | +15 % | bar × 1,8 (recette et bouteilles) ; tout le monde un peu plus content | × 1,3 |

Un même thème répété dans la semaine perd la moitié de ses effets à chaque reprise (le coût, lui, reste entier).

Premiers réglages, et ce qu'ils ont appris :

- Avec des coûts de 200 à 350 € et sans supplément, un thème perdait toujours de l'argent : la maison étant pleine, l'afflux ne se transforme pas en rendez-vous. D'où les coûts divisés par deux et le supplément payé par chaque client.
- **Quai plein** : un client qui passe son chemin devant un quai complet ne coûte plus de réputation (`REPUTATION_FILE_PLEINE` 0,05 → 0) ; un client parti las d'attendre coûte 0,1 au lieu de 0,15. Ce n'était pas la cause principale (l'effet est faible), mais c'est plus juste et ça allège le paradoxe de la saturation.
- Le burlesque ne servait à rien (il attire du monde qu'on ne peut pas recevoir) : il est devenu le thème du bouche-à-oreille.

Mesures, thème le vendredi et le samedi (8 graines, 35 nuits, classique à 3 ; argent = résultat réel par jour des nuits 15 à 35) :

| Semaine | Sans thème | Masquée | Burlesque | Jazz | Années folles |
| --- | --- | --- | --- | --- | --- |
| Sans tendance | 441 € · 34 | 472 € · 36 | 438 € · 35 | 424 € · 37 | 443 € · 33 |
| Match européen | 399 € · 18 | 429 € · 19 | 424 € · 21 | 402 € · 21 | 432 € · 18 |
| Congrès médical | 536 € · 30 | 550 € · 31 | 521 € · 29 | 511 € · 33 | 548 € · 29 |

- Chaque thème soigne son monde : masquée → affaires +8, jazz → habitués +7, années folles → bar +20 %, burlesque → réputation un soir de match (21 contre 18).
- Deux soirées par semaine coûtent peu et rapportent un peu de réputation. Un thème est un investissement en réputation, pas une machine à cash : le joueur adaptatif avec thèmes finit à 41 de réputation contre 34 sans, pour 1 600 € de moins sur le mois.
- `src/engine/equilibrage-themes.test.ts` garde ces résultats ; `equilibrage-semaine.test.ts` vérifie que les thèmes achètent de la réputation sans ruiner (au moins 97 % de l'argent du joueur qui ne touche à rien).

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 5 | 30 / 31 / 32 | 682 € | 1 118 € | 11 716 € | 79 | 0,0 | 21 / 30 / 16 / 33 | 29 / 38 / 18 / 41 |
| Classique, 4 | 3 à 4 | 33 / 36 / 32 | 908 € | 1 351 € | 16 384 € | 64 | 0,6 | 24 / 31 / 18 / 28 | 33 / 39 / 18 / 39 |
| Happy hour, 4 | 3 à 3 | 35 / 35 / 30 | 614 € | 1 059 € | 9 604 € | 58 | 0,7 | 35 / 26 / 11 / 28 | 42 / 34 / 6 / 35 |
| Feutrée, 4 | 3 à 4 | 33 / 41 / 48 | 833 € | 1 273 € | 14 517 € | 74 | 0,0 | 22 / 37 / 15 / 26 | 44 / 57 / 35 / 52 |
| Adaptatif (suit les tendances), 3 | 3 à 5 | 30 / 33 / 38 | 717 € | 1 177 € | 12 521 € | 80 | 0,0 | 21 / 35 / 18 / 26 | 33 / 48 / 31 / 36 |
| Classique 3, sans bar | 3 à 5 | 30 / 32 / 33 | 585 € | 911 € | 12 913 € | 78 | 0,0 | 23 / 33 / 16 / 28 | 34 / 40 / 21 / 37 |
| Classique 3, bar à 2, sans avance | 3 à 5 | 30 / 32 / 33 | 538 € | 1 121 € | 9 758 € | 79 | 0,0 | 20 / 30 / 16 / 33 | 31 / 39 / 19 / 41 |
| Classique 3, champagne | 3 à 5 | 29 / 28 / 25 | 877 € | 1 314 € | 14 599 € | 81 | 0,1 | 16 / 31 / 20 / 33 | 7 / 26 / 30 / 38 |
| Classique 3, tarif −20 % | 3 à 5 | 30 / 33 / 30 | 472 € | 907 € | 6 910 € | 74 | 0,0 | 29 / 29 / 14 / 28 | 41 / 31 / 5 / 42 |
| Classique 3, tarif +20 % | 3 à 5 | 28 / 27 / 27 | 956 € | 1 392 € | 15 654 € | 81 | 0,0 | 14 / 30 / 24 / 32 | 8 / 37 / 31 / 31 |
| Classique 3, formule courte | 3 à 5 | 32 / 37 / 39 | 616 € | 1 052 € | 10 752 € | 79 | 0,0 | 20 / 29 / 27 / 24 | 35 / 36 / 43 / 47 |
| Classique 3, soirée complète | 3 à 5 | 29 / 28 / 30 | 673 € | 1 107 € | 12 757 € | 78 | 0,0 | 23 / 42 / 8 / 28 | 29 / 46 / 8 / 34 |
| Classique 3, sélection laxiste | 3 à 5 | 29 / 25 / 23 | 584 € | 1 020 € | 11 013 € | 78 | 0,0 | 22 / 30 / 11 / 37 | 26 / 21 / 5 / 45 |
| Classique 3, sélection stricte | 3 à 5 | 32 / 37 / 42 | 458 € | 893 € | 9 511 € | 79 | 0,0 | 21 / 39 / 21 / 18 | 36 / 55 / 40 / 33 |
| Classique 3, habitués d’abord | 3 à 5 | 30 / 33 / 34 | 651 € | 1 085 € | 11 105 € | 80 | 0,0 | 20 / 33 / 16 / 31 | 32 / 43 / 18 / 42 |
| Classique 3, pressés d’abord | 3 à 5 | 30 / 33 / 34 | 682 € | 1 117 € | 11 755 € | 78 | 0,0 | 22 / 30 / 17 / 32 | 31 / 40 / 23 / 42 |
| Passif (classique, sans recruter ni rénover) | jamais | 13 / 8 / 4 | 13 € | 232 € | 2 129 € | 49 | 0,0 | 53 / 47 / 0 / 0 | 5 / 4 / 0 / 0 |

À surveiller :

- Le jazz ne sert à rien une semaine de pluie ou de fin du mois : les habitués sont déjà là en nombre. Josée ne le conseille plus ces semaines-là.
- Les écarts restent modestes (±30 € par jour, ±3 de réputation) : deux soirs sur sept. Un joueur qui programme un thème tous les soirs paie la lassitude.

## Rééquilibrage final (v0.3, partie 6)

Trois problèmes relevés au fil des parties :

1. **L'argent était trop facile** : 10 000 à 18 000 € après la première mensualité pour un joueur actif.
2. **La maison était presque toujours pleine** : un tiers des clients repartait sans être reçu en soirée classique. Tout ce qui attire du monde (happy hour, tendances chargées, thèmes, bar) se transformait en clients perdus.
3. **Le tarif −20 % ne servait jamais.**

Réglages :

| Valeur | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| `ARRIVEES_BONUS_REPUTATION` | 2,4 | 1,8 | Moins de saturation : clients perdus en semaine 2, classique à 3, de 33 % à 26 % ; joueur adaptatif 21 % |
| `REPUTATION_FILE_PLEINE` | 0,05 | 0 | Un quai complet n'est pas une déception (partie 5) |
| `REPUTATION_CLIENT_PERDU` | 0,15 | 0,1 | Idem |
| `BUDGET_CLIENTS` (nouveau) | 1 | 0,8 | Levier général des recettes |
| `CHARGES_FIXES` | 600 € | 1 350 € | Le mois se boucle de justesse |
| `SALAIRE_MENAGE` / `SALAIRE_BAR` | 90 / 110 € | 110 / 130 € | Dans la fourchette des spécifications |
| Soirée complète, prix | × 1,7 | × 1,85 | Elle perdait de l'argent dans une maison moins pleine |
| Thèmes, coût | 80 à 150 € | 60 à 130 € | Budgets plus bas, supplément plus faible |
| Thèmes, qualité du segment visé | +0,08 à +0,12 | +0,15 à +0,2 | Avec des satisfactions plus hautes, l'effet devenait invisible |
| Burlesque, bouche-à-oreille | × 1,5 | × 1,8 | Idem |

Le « net par nuit » garde sa cible des spécifications (600 à 1 000 € : recettes de la nuit moins ses dépenses) ; ce qui a changé, c'est ce qu'il en reste après les salaires et les charges (200 à 400 € par jour).

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 31 / 33 / 35 | 267 € | 886 € | 2 801 € | 26 % | 78 | 0,0 | 21 / 30 / 19 / 30 | 33 / 41 / 21 / 43 |
| Classique, 4 | 3 à 4 | 33 / 37 / 39 | 449 € | 1 069 € | 6 693 € | 14 % | 69 | 0,3 | 24 / 28 / 18 / 31 | 39 / 42 / 26 / 48 |
| Happy hour, 4 | 3 à 3 | 37 / 39 / 35 | 227 € | 841 € | 1 923 € | 27 % | 59 | 0,8 | 35 / 24 / 16 / 25 | 43 / 37 / 18 / 42 |
| Feutrée, 4 | 3 à 4 | 33 / 41 / 49 | 260 € | 920 € | 2 873 € | 4 % | 80 | 0,0 | 19 / 43 / 13 / 25 | 44 / 60 / 35 / 53 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 31 / 35 / 44 | 347 € | 968 € | 3 503 € | 21 % | 82 | 0,0 | 19 / 34 / 23 / 24 | 38 / 53 / 40 / 40 |
| Classique 3, sans bar | 3 à 4 | 31 / 32 / 35 | 236 € | 709 € | 4 159 € | 28 % | 79 | 0,0 | 22 / 31 / 17 / 30 | 35 / 41 / 22 / 42 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 31 / 33 / 37 | 112 € | 870 € | 2 005 € | 25 % | 76 | 0,0 | 23 / 31 / 17 / 29 | 36 / 44 / 23 / 44 |
| Classique 3, champagne | 3 à 4 | 31 / 32 / 29 | 369 € | 988 € | 5 449 € | 15 % | 81 | 0,1 | 18 / 29 / 22 / 31 | 13 / 31 / 32 / 40 |
| Classique 3, tarif −20 % | 3 à 4 | 32 / 34 / 37 | 77 € | 625 € | 437 € | 35 % | 79 | 0,0 | 27 / 30 / 13 / 30 | 49 / 40 / 11 / 49 |
| Classique 3, tarif +20 % | 3 à 4 | 29 / 30 / 28 | 391 € | 1 004 € | 6 136 € | 13 % | 81 | 0,0 | 18 / 28 / 25 / 29 | 10 / 37 / 36 / 31 |
| Classique 3, formule courte | 3 à 4 | 32 / 37 / 43 | 126 € | 744 € | 1 594 € | 12 % | 82 | 0,0 | 20 / 26 / 30 / 24 | 40 / 40 / 46 / 50 |
| Classique 3, soirée complète | 3 à 4 | 30 / 32 / 33 | 392 € | 995 € | 5 361 € | 30 % | 79 | 0,0 | 22 / 42 / 7 / 28 | 32 / 47 / 10 / 38 |
| Classique 3, sélection laxiste | 3 à 4 | 29 / 29 / 28 | 205 € | 808 € | 2 897 € | 26 % | 77 | 0,0 | 30 / 26 / 12 / 33 | 34 / 24 / 8 / 47 |
| Classique 3, sélection stricte | 3 à 4 | 31 / 37 / 43 | 66 € | 654 € | 1 022 € | 8 % | 81 | 0,0 | 17 / 43 / 22 / 18 | 37 / 55 / 41 / 34 |
| Classique 3, habitués d’abord | 3 à 4 | 31 / 32 / 36 | 215 € | 829 € | 2 791 € | 26 % | 79 | 0,0 | 23 / 33 / 16 / 29 | 34 / 45 / 22 / 43 |
| Classique 3, pressés d’abord | 3 à 4 | 31 / 33 / 37 | 264 € | 883 € | 3 259 € | 26 % | 76 | 0,0 | 22 / 31 / 19 / 29 | 35 / 42 / 25 / 43 |
| Passif (classique, sans recruter ni rénover) | jamais | 15 / 9 / 6 | -154 € | 192 € | -1 614 € | 71 % | 42 | 0,0 | 56 / 44 / 0 / 0 | 7 / 4 / 0 / 0 |

Gardes ajoutées (`src/engine/equilibrage-mois.test.ts`, `equilibrage-semaine.test.ts`) :

- joueur actif (classique à 3, trois chambres et le bar rouverts) : 0 à 4 000 € en moyenne après la mensualité du jour 28 (2 800 € mesurés), aucune partie sous −2 000 €, trésorerie jamais sous le découvert toléré ;
- joueur passif : léger déficit (−1 600 € mesurés, garde entre −3 000 et 0 €) ;
- tarif −20 % : presque gratuit et apprécié pendant une semaine creuse (contrôles : −4 € par jour, +4 de réputation), ruineux le reste du temps (−180 € par jour) ;
- les gardes des parties précédentes tiennent toujours (palier 2 entre les nuits 3 et 7, aucune offre ni règle gagnante partout, bar rentable sur six semaines, thèmes qui soignent leur monde).

`npm test` : 278 tests en 10 secondes environ (14 secondes et 187 tests avant la v0.3).

### La question de la v0.3 : l'offre change-t-elle vraiment la partie ?

Oui, et les gardes le vérifient :

- **La clientèle suit l'offre** : 18 points d'écart sur la part des touristes entre happy hour et soirée feutrée.
- **Chaque règle rapporte et coûte** : aucune ne gagne à la fois sur l'argent et sur la réputation.
- **La bonne réponse dépend de la semaine** : le tarif +20 % rapporte 60 % de plus pendant un congrès et perd de l'argent pendant une semaine de contrôles ; le −20 % est l'inverse ; un soir de match, le portier sauve la réputation.
- **Suivre les tendances paie** : le joueur adaptatif finit le mois avec plus d'argent et plus de réputation que celui qui ne touche à rien. Avec deux soirées à thème par semaine, il achète encore de la réputation.

À surveiller en jouant :

- le bar coûte plus qu'il ne rapporte le premier mois (rénovation, salaire, remboursement du grossiste) : c'est un investissement qui paie à partir de la cinquième ou sixième semaine ;
- une semaine creuse fait perdre de l'argent (−65 à −100 € par jour) : c'est voulu, la réserve est là pour ça ;
- les effets des thèmes restent modestes : à juger au téléphone.
