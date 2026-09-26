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

`npm test` : 279 tests en 10 secondes environ (14 secondes et 187 tests avant la v0.3).

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

Partie jouée de bout en bout dans le navigateur (nouvelle partie, didacticiel passé, ×4 jusqu'au jour 15, sans erreur) : palier 1 à la première nuit, palier 2 vers la nuit 4, bar rouvert le jour 4, grossiste le jour 6. La semaine 2 finit à +10 € ; le bilan du lundi annonce la caisse sous zéro dans deux semaines (mensualité et remboursement du grossiste), et Josée prévient. Ce test a aussi fait apparaître une projection trop optimiste (les charges fixes absentes de la première semaine), corrigée.

## Intrigues et renouvellement des soirées (v0.4, partie 1)

### Le moteur d'intrigues

Une intrigue est une chaîne de cartes sur plusieurs jours, décrite dans `src/content/intrigues.ts` : un déclencheur (vérifié chaque matin), des étapes à heure fixe (une heure de soirée attend l'ouverture), des délais en jours, et à chaque échéance une condition qui peut dénouer l'histoire sans carte (« le quai s'est calmé »). Une « suite » est une intrigue courte, démarrée par un choix quelques jours plus tard : c'est le mécanisme des conséquences différées, commun aux imprévus et aux intrigues. Valeurs dans `balance.ts` : `INTRIGUES_MAX_ACTIVES` = 2 (les suites ne comptent pas), `INTRIGUES_ECART_JOURS` = 2.

Premières cartes :

- **« Le voisin du dessus »** (palier 2) : plainte, sonomètre, lettre d'avocate, sept dénouements (apaisé, invité, insonorisé, fou rire, arrangement, bluff, condamnation). Coûts dans `VOISIN` : bouteille 40 €, insonorisation 900 €, arrangement 350 €, amende 800 €.
- **« L'homme au costume »** : suite de l'imprévu du client généreux, quand la maison refuse. Il revient trois jours plus tard, pour la même personne.

### Le tapage du quartier

Nouvelle jauge cachée, de 0 à 100 (`TAPAGE`), affichée en trois mots dans l'onglet Maison (calme, agacé, excédé) à partir du palier 2 :

- chaque client d'un groupe présent (quai ou chambre) ajoute 2 par heure, les autres 0,3 ;
- porte laxiste × 1,4, stricte × 0,6 ; burlesque × 1,5, années folles × 1,3, masquée × 0,9, jazz × 0,6 ; une maison insonorisée × 0,5 ;
- une dispute qui dégénère : +8 ;
- chaque matin, × 0,6.

Le voisin descend le matin qui suit une nuit à 45 ou plus (`plainte`, lu avant la baisse du matin : il se plaint de la nuit passée) ; il revient tant que le tapage reste à 25 ou plus (`recidive`).

Réglage : avec le seuil lu après la baisse du matin, le voisin ne descendait que dans 2 parties sur 10 chez le joueur classique. Lu avant, au seuil 45 :

| Joueur (28 nuits, 10 graines) | Tapage moyen à la fermeture, nuits 7 / 14 / 21 / 28 | Le voisin sonne |
| --- | --- | --- |
| Classique, 3 | 27 / 31 / 32 / 32 | 9 parties sur 10, vers la nuit 15 |
| Adaptatif | 27 / 19 / 23 / 29 | 5 sur 10 (il met un portier les semaines chargées) |
| Sélection laxiste | 46 / 58 / 62 / 61 | 10 sur 10, vers la nuit 9 |
| Sélection stricte | 11 / 11 / 14 / 12 | jamais |
| Match toutes les semaines, burlesque le week-end | 27 / 60 / 72 / 67 | 10 sur 10, vers la nuit 10 |

Le voisin devient un coût de la porte laxiste et des thèmes bruyants : sur 30 graines, une semaine de match, le burlesque rapportait +2 de réputation au joueur prudent ; avec le voisin (bouteille puis arrangement), cet avantage disparaît (24,2 contre 24,8). Comme pour les tendances, les gardes qui mesurent une mécanique seule (`equilibrage-regles.test.ts`, `equilibrage-themes.test.ts`) jouent sans intrigue (option `intrigues: false` de la simulation). Le voisin a ses propres gardes (`equilibrage-renouvellement.test.ts`) : porte laxiste → plainte avant la nuit 14 dans au moins 8 parties sur 10, porte stricte → jamais, joueur classique → au moins 6 parties sur 10 dans le mois, au moins 3 dénouements atteints en tranchant au hasard.

### La mesure du renouvellement

La simulation compte désormais, nuit par nuit : les imprévus tirés, les cartes d'intrigue, les alertes apparues pendant la soirée (une par apparition) et les **décisions significatives** (imprévus + cartes d'intrigue en soirée + alertes). Elle peut trancher les cartes au hasard (`politique: 'hasard'`, graine à part) pour parcourir toutes les issues. `mesurerRenouvellement` résume une partie ; `npm run rapport` affiche un second tableau.

Mesure de départ de la v0.4 (cartes tranchées au hasard) :

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3,9 | 49 % | 2,1 | 1,6 | 5,4 | 15,8 | 87 % | 5,2 | 9 sur 10, nuit 15 |
| Feutrée, 4 | 3,5 | 55 % | 1,7 | 1,6 | 5,6 | 15,6 | 86 % | 4,0 | 1 sur 10, nuit 23 |
| Adaptatif (suit les tendances), 3 | 3,5 | 53 % | 1,8 | 1,6 | 5,5 | 15,1 | 87 % | 3,6 | 5 sur 10, nuit 18 |
| Classique 3, sélection laxiste | 4,4 | 33 % | 2,7 | 1,6 | 5,7 | 15,0 | 87 % | 5,0 | 10 sur 10, nuit 9 |
| Classique 3, sélection stricte | 3,4 | 54 % | 1,6 | 1,7 | 5,4 | 15,9 | 88 % | 2,9 | 0 sur 10 |

Lecture : c'est le point de départ que la v0.4 doit corriger.

- **3,5 à 4,4 décisions par soirée**, pour une cible de 6 à 10 ; une soirée sur deux en compte moins de 4.
- **Les imprévus tournent en rond** : 5 à 6 cartes différentes sur le mois, la plus fréquente revient environ 15 fois, et 87 % des imprévus ont déjà été vus dans les 7 nuits précédentes.
- **Environ 2 alertes par soirée** (linge surtout, puis chambres sales), pour une cible de 4 à 8.
- La porte laxiste donne déjà plus de décisions (4,4) : plus de disputes, et le voisin.

Tableau d'équilibrage après la partie 1 (le voisin compris) : peu de changements, l'argent bouge de quelques centaines d'euros selon les dénouements.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 31 / 32 / 34 | 260 € | 883 € | 2 688 € | 26 % | 79 | 0,0 | 21 / 30 / 19 / 30 | 32 / 39 / 21 / 42 |
| Classique, 4 | 3 à 4 | 33 / 36 / 40 | 441 € | 1 063 € | 5 608 € | 14 % | 75 | 0,3 | 23 / 28 / 17 / 32 | 40 / 45 / 27 / 46 |
| Happy hour, 4 | 3 à 3 | 37 / 39 / 33 | 188 € | 817 € | 1 160 € | 26 % | 58 | 0,9 | 35 / 25 / 16 / 25 | 41 / 37 / 15 / 36 |
| Feutrée, 4 | 3 à 4 | 33 / 41 / 49 | 260 € | 920 € | 2 852 € | 4 % | 80 | 0,0 | 19 / 43 / 13 / 25 | 44 / 60 / 35 / 53 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 31 / 35 / 43 | 347 € | 968 € | 3 547 € | 21 % | 82 | 0,0 | 19 / 34 / 23 / 24 | 38 / 53 / 40 / 40 |
| Classique 3, sans bar | 3 à 4 | 31 / 32 / 35 | 232 € | 709 € | 4 078 € | 27 % | 78 | 0,0 | 22 / 31 / 17 / 30 | 34 / 41 / 22 / 41 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 31 / 33 / 37 | 106 € | 867 € | 1 379 € | 25 % | 79 | 0,0 | 23 / 31 / 17 / 29 | 37 / 42 / 24 / 42 |
| Classique 3, champagne | 3 à 4 | 31 / 32 / 28 | 365 € | 987 € | 5 409 € | 15 % | 82 | 0,1 | 18 / 29 / 22 / 31 | 12 / 31 / 31 / 40 |
| Classique 3, tarif −20 % | 3 à 4 | 32 / 33 / 31 | 57 € | 614 € | -295 € | 35 % | 77 | 0,0 | 28 / 31 / 13 / 29 | 43 / 32 / 6 / 44 |
| Classique 3, tarif +20 % | 3 à 4 | 29 / 30 / 29 | 391 € | 1 004 € | 6 297 € | 14 % | 80 | 0,0 | 17 / 28 / 25 / 29 | 10 / 38 / 36 / 30 |
| Classique 3, formule courte | 3 à 4 | 32 / 37 / 43 | 116 € | 734 € | 1 122 € | 12 % | 82 | 0,0 | 20 / 26 / 30 / 24 | 39 / 41 / 46 / 48 |
| Classique 3, soirée complète | 3 à 4 | 30 / 31 / 32 | 385 € | 992 € | 5 552 € | 29 % | 77 | 0,0 | 22 / 43 / 7 / 28 | 31 / 46 / 10 / 38 |
| Classique 3, sélection laxiste | 3 à 4 | 29 / 28 / 26 | 207 € | 799 € | 2 601 € | 24 % | 77 | 0,0 | 30 / 26 / 13 / 32 | 33 / 22 / 6 / 45 |
| Classique 3, sélection stricte | 3 à 4 | 31 / 37 / 43 | 66 € | 654 € | 1 022 € | 8 % | 81 | 0,0 | 17 / 43 / 22 / 18 | 37 / 55 / 41 / 34 |
| Classique 3, habitués d’abord | 3 à 4 | 31 / 32 / 36 | 210 € | 828 € | 3 137 € | 26 % | 77 | 0,0 | 22 / 33 / 16 / 29 | 33 / 44 / 21 / 42 |
| Classique 3, pressés d’abord | 3 à 4 | 31 / 33 / 34 | 258 € | 881 € | 2 999 € | 26 % | 76 | 0,0 | 21 / 31 / 19 / 29 | 33 / 38 / 23 / 41 |
| Passif (classique, sans recruter ni rénover) | jamais | 15 / 9 / 6 | -154 € | 192 € | -1 614 € | 71 % | 42 | 0,0 | 56 / 44 / 0 / 0 | 7 / 4 / 0 / 0 |

Partie jouée dans le navigateur (version compilée, 844 × 390 et 667 × 375) : une sauvegarde du jour 6, au palier 2, après une nuit bruyante. Le voisin sonne le lendemain à 11 h, la carte affiche l'issue du choix puis le dénouement ; le sonomètre tombe deux jours plus tard à 23 h, maison ouverte ; l'onglet Journal montre l'intrigue en cours, l'onglet Maison l'humeur du voisinage. Aucune erreur.

`npm test` : 302 tests en 14 secondes environ.

## Ambitions et arcs personnels (v0.4, partie 2)

### Les ambitions

Chaque personne a désormais une ambition, affichée sur sa fiche et à l'entretien d'embauche (`src/content/ambitions.ts`) : Sanne veut devenir gérante, Mila être la tête d'affiche, Jonas financer ses études, Inès partir une saison à Ibiza. Les candidats du marché en tirent une parmi sept, à partir de leur identifiant : ça ne touche pas au hasard de la partie, et une ancienne sauvegarde retrouve la même. Pour l'instant, seules celles de Mila et de Jonas portent un arc.

### Le moteur, complété

- **Conditions sur la personne de l'arc** : moral au moins ou au plus, nuits travaillées, période d'essai finie.
- **Mémoire de l'intrigue** : chaque choix peut ajouter des points (`points`) ; une étape peut en exiger (`pointsMin`, `pointsMax`). Le dénouement dépend ainsi de l'ensemble des choix, pas seulement du dernier. Une avance d'argent est gardée en mémoire et remboursée plus tard (`avance`, `rembourser`).
- **Nouveaux effets** : part minimale, talents, traits gagnés ou perdus, promesse de repos (la même qu'en entretien), départ.
- Deux traits qu'on ne gagne qu'au bout d'un arc, jamais tirés pour un candidat : **Tête d'affiche** (habitués × 1,3 dans les arrivées quand elle travaille) et **Juriste** (amendes et arrangements divisés par deux, ceux du voisin compris).

### Les deux arcs

| Arc | Déclencheur | Étapes | Dénouements |
| --- | --- | --- | --- |
| Mila, la tête d'affiche | essai fini, 5 nuits travaillées | affiche en vitrine (120 €), photographe du Nachtblad (visibilité contre discrétion), 55 % de part, puis le sacre ou la valise | tête d'affiche, formatrice (conversation +1), amère, rentrée d'elle-même, retenue (55 %), partie |
| Jonas et ses examens | essai fini, 6 nuits travaillées | un soir pour réviser, 600 € d'inscription, les résultats | juriste, contrats (discrétion +1), rattrapage, abandon |

- Mila fait sa valise seulement si la maison ne l'a jamais mise en avant (points ≤ 0) et a refusé ses 55 %. Mise en avant au moins une fois, elle range sa valise d'elle-même. Au sacre, il lui faut au moins 45 de moral.
- Jonas réussit s'il a pu réviser au calme et payer son inscription (3 points sur 4 : réviser au calme 2, au salon 1 ; inscription avancée 2, à moitié 1) et s'il a au moins 45 de moral. Sinon, il rate de peu, et une carte de plus tombe le lendemain.

Premier réglage : avec des seuils de moral seuls, le joueur simulé (qui tient son équipe de bonne humeur) réussissait toujours, et Mila ne partait jamais. Avec les points, les dénouements varient :

| Joueur, cartes tranchées… (28 nuits, 10 graines) | Mila | Jonas |
| --- | --- | --- |
| Classique, prudemment (premier choix) | tête d'affiche 10 fois, vers la nuit 10 | juriste 8 fois, vers la nuit 11 ; 2 arcs encore en cours |
| Classique, au hasard | tête 4, partie 2, retenue 2, formatrice 2 | contrats 5, juriste 2, rattrapage 2, abandon 1 ; 1 en cours |
| Adaptatif, au hasard | formatrice 5, rentrée 3, tête 2 | rattrapage 4, abandon 3, contrats 3 |

Effet sur la partie (classique à 3, 28 nuits) : en tranchant prudemment, les histoires rapportent un peu (2 918 € contre 2 801 € sans intrigue, réputation 37 contre 35 : la Tête d'affiche attire des habitués) ; au hasard, elles coûtent (1 300 € contre 2 300 €, surtout l'amende du voisin et le départ de Mila).

### Gardes

Nouvelles gardes dans `equilibrage-renouvellement.test.ts` : les deux arcs commencent avant la nuit 20 dans au moins 8 parties sur 10, chacun atteint au moins 3 dénouements différents au hasard, et les histoires ne font pas perdre plus de 20 % de l'argent ni plus de 3 points de réputation à un joueur raisonnable.

Comme les intrigues déplacent l'argent de plusieurs centaines d'euros selon les choix, les gardes du bar et de la semaine jouent maintenant sans intrigue (option `intrigues: false`), comme celles des règles et des thèmes depuis la partie 1. Sur 20 graines et 42 nuits, avec les intrigues, le bar finissait 250 € sous la maison sans bar, contre 100 € au-dessus sans intrigue. La Tête d'affiche et la patience du bar amènent encore du monde dans une maison déjà pleine, et plus de bruit pour le voisin.

À surveiller :

- **Deux intrigues au plus à la fois** : Mila et Jonas occupent les deux places des nuits 10 à 20 environ, et le voisin arrive plus tard (joueur adaptatif : 3 parties sur 10, contre 5 en partie 1). À revoir en partie 6 si les arcs se font trop attendre.
- **Accepter les 55 % de Mila** reste le choix le plus sûr : il coûte 5 points de part, mais la Tête d'affiche rapporte des habitués.
- Les cartes d'intrigue passent de 3 à 5 par mois à environ 10 à 11. La plupart tombent en journée : elles ne comptent pas encore dans les décisions de soirée (4,0 pour le joueur classique).

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4,0 | 46 % | 2,2 | 1,6 | 5,7 | 15,5 | 87 % | 11,2 | 8 sur 10, nuit 15 |
| Feutrée, 4 | 3,6 | 52 % | 1,8 | 1,7 | 5,8 | 15,7 | 86 % | 11,4 | 3 sur 10, nuit 24 |
| Adaptatif (suit les tendances), 3 | 3,5 | 53 % | 1,7 | 1,6 | 5,6 | 15,1 | 86 % | 10,0 | 3 sur 10, nuit 14 |
| Classique 3, sélection laxiste | 4,3 | 37 % | 2,5 | 1,7 | 5,9 | 16,2 | 86 % | 11,4 | 9 sur 10, nuit 8 |
| Classique 3, sélection stricte | 3,4 | 51 % | 1,6 | 1,6 | 5,3 | 14,9 | 88 % | 10,2 | 0 sur 10 |

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 31 / 34 / 37 | 211 € | 849 € | 2 918 € | 30 % | 81 | 0,0 | 25 / 29 / 18 / 28 | 42 / 42 / 21 / 43 |
| Classique, 4 | 3 à 4 | 33 / 38 / 40 | 415 € | 1 054 € | 5 547 € | 15 % | 76 | 0,4 | 24 / 27 / 18 / 31 | 44 / 44 / 22 / 48 |
| Happy hour, 4 | 3 à 3 | 37 / 41 / 39 | 173 € | 816 € | 943 € | 28 % | 74 | 0,7 | 35 / 24 / 15 / 25 | 51 / 45 / 17 / 40 |
| Feutrée, 4 | 3 à 4 | 33 / 42 / 49 | 226 € | 900 € | 3 413 € | 8 % | 81 | 0,0 | 19 / 42 / 13 / 26 | 48 / 60 / 33 / 52 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 31 / 37 / 43 | 304 € | 943 € | 4 455 € | 22 % | 81 | 0,0 | 20 / 34 / 24 / 23 | 39 / 52 / 37 / 40 |
| Classique 3, sans bar | 3 à 4 | 31 / 34 / 37 | 194 € | 686 € | 3 661 € | 27 % | 83 | 0,0 | 23 / 32 / 17 / 27 | 41 / 43 / 22 / 42 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 31 / 34 / 39 | 75 € | 852 € | 1 313 € | 29 % | 81 | 0,0 | 25 / 30 / 17 / 28 | 44 / 45 / 24 / 44 |
| Classique 3, champagne | 3 à 4 | 31 / 33 / 34 | 343 € | 981 € | 4 011 € | 17 % | 86 | 0,0 | 19 / 28 / 23 / 30 | 24 / 37 / 32 / 44 |
| Classique 3, tarif −20 % | 3 à 4 | 32 / 37 / 41 | 70 € | 642 € | -78 € | 36 % | 82 | 0,0 | 29 / 30 / 13 / 27 | 54 / 46 / 13 / 50 |
| Classique 3, tarif +20 % | 3 à 4 | 29 / 31 / 29 | 342 € | 971 € | 4 167 € | 18 % | 84 | 0,0 | 20 / 28 / 24 / 29 | 17 / 38 / 30 / 30 |
| Classique 3, formule courte | 3 à 4 | 32 / 39 / 46 | 108 € | 739 € | 1 288 € | 12 % | 85 | 0,0 | 21 / 27 / 28 / 25 | 46 / 44 / 43 / 51 |
| Classique 3, soirée complète | 3 à 4 | 30 / 33 / 36 | 376 € | 999 € | 4 070 € | 30 % | 82 | 0,0 | 24 / 41 / 8 / 28 | 39 / 51 / 10 / 40 |
| Classique 3, sélection laxiste | 3 à 4 | 29 / 32 / 29 | 211 € | 837 € | 1 742 € | 22 % | 83 | 0,0 | 30 / 25 / 14 / 31 | 37 / 29 / 6 / 47 |
| Classique 3, sélection stricte | 3 à 4 | 31 / 39 / 45 | 27 € | 628 € | 1 016 € | 12 % | 83 | 0,0 | 19 / 41 / 23 / 17 | 43 / 56 / 40 / 35 |
| Classique 3, habitués d’abord | 3 à 4 | 31 / 34 / 36 | 209 € | 842 € | 3 248 € | 27 % | 80 | 0,0 | 24 / 32 / 15 / 29 | 38 / 44 / 17 / 41 |
| Classique 3, pressés d’abord | 3 à 4 | 31 / 34 / 38 | 216 € | 854 € | 2 679 € | 29 % | 80 | 0,0 | 24 / 29 / 19 / 28 | 42 / 41 / 24 / 42 |
| Passif (classique, sans recruter ni rénover) | jamais | 15 / 9 / 6 | -154 € | 192 € | -1 614 € | 71 % | 42 | 0,0 | 56 / 44 / 0 / 0 | 7 / 4 / 0 / 0 |

Parties jouées dans le navigateur (version compilée) : une sauvegarde du jour 9 avec Mila et Jonas confirmés. En 844 × 390, les deux arcs se déroulent sur 12 jours de jeu ; en choisissant de ne jamais mettre Mila en avant puis de refuser ses 55 %, elle fait sa valise et part, avec sa carte d'adieu ; Jonas, qui révise au salon et ne reçoit que la moitié de son inscription, rate son examen et repassera à l'automne. Une ancienne sauvegarde (version 16) reçoit les ambitions et l'humeur du voisinage, présentées par Josée ; la fiche de chaque personne montre son ambition. En 667 × 375, la carte d'arc la plus longue (portrait compris) tient en hauteur ; les cartes défilent désormais si un texte déborde. Aucune erreur.

`npm test` : 321 tests en 11 secondes environ.

## Imprévus liés à l'état du jeu (v0.4, partie 3)

### Ce qui a changé

- **24 imprévus** (6 avant), dont 10 opportunités parmi les 18 nouveaux. Ils dépendent de l'état de la maison : palier, réputation, tendance de la semaine (congrès, match), thème du soir (masquée, burlesque, jazz, années folles), bar qui sert, règles (sélection stricte ou laxiste, tarif +20 %), clients présents (un habitué, un groupe, une touriste), place libre dans l'équipe. Certaines circonstances en rendent d'autres plus probables sans les exiger (`bonus` : ×3) : l'enterrement de vie de garçon tombe plus souvent pendant la saison des EVG ou avec une porte laxiste.
- **7 suites différées** (`src/content/suites.ts`) : l'inspecteur qui revient, la vidéo qui tourne, l'article flatteur ou acide, le club de bridge, l'échevin reconnaissant, le chat Rembrandt, et l'homme au costume.
- **Nouveaux effets** : clients d'un segment donné (ils passent la porte sans sélection : la maison les a invités), bouteilles au bar, fatigue de toute l'équipe, candidate ou candidat remarquable (deux talents à 5 et 4, exige 60 %).
- **Anti-répétition compté en nuits** (`IMPREVU_REPOS_NUITS` = 8) : une carte vue ne revient pas avant 8 nuits. S'il n'y a rien d'autre à tirer, la soirée se passe d'imprévu plutôt que de répéter. Une carte jamais vue pèse 3 fois plus. Trois cartes sont uniques (l'anniversaire, le loup tombé, le chat). Sauvegarde en version 18 (`imprevusNuit`).
- **Effets adoucis** : les effets de réputation et de satisfaction des imprévus sont multipliés par 0,5 (`IMPREVU_FORCE_SATISFACTION`) ; nombreux, ils pesaient trop.

### Ce que la mesure a révélé : l'équilibre de la v0.3 reposait sur une répétition

En v0.3, « Un client généreux » sortait environ 15 fois par mois (il ne demande qu'une personne disponible). Au premier choix, il rapportait 180 € et envoyait la personne au repos pour la nuit. Il faisait donc à la fois une bonne part de l'argent du mois (environ 2 000 €) et un frein caché à la réputation (une place de moins presque un soir sur deux).

Dilué parmi 24 cartes et soumis au délai de repos, il sort environ 4 fois par mois. Sans rien retoucher, le joueur actif perdait environ 1 500 € sur le mois, et sa réputation montait d'une dizaine de points (34 → 45 à la nuit 28). Même en retirant toutes les cartes, les constantes de la v0.3 ne tiennent plus leurs gardes.

Réglages :

| Valeur | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| `CHARGES_FIXES` | 1 350 € | 1 000 € | Rendre l'argent que le client généreux apportait |
| `BAR_RECETTE` | 14 / 10 / 24 / 30 € | 15 / 11 / 26 / 33 € | Le bar se remboursait de justesse en 42 nuits ; il ne se remboursait plus |
| `IMPREVU_CHANCE_PAR_HEURE` | 0,35 | 0,5 | Compenser les soirs où tout est en repos (le nombre de cartes possibles limite plus que la chance) |
| `IMPREVU_FORCE_SATISFACTION` | (1) | 0,5 | Réputation de 46 à 43 à la nuit 28 |
| Premier choix des cartes | | | Le joueur simulé « prudent » prend le premier choix : c'est l'option économe (faire comme d'habitude, chanter, offrir un verre), pas celle qui coûte |

Essayés et écartés : baisser `REPUTATION_PAR_RDV` (2 → 1,5 ou 1,8) ou relever `REPUTATION_FREIN` (2 → 2,5 ou 3) ramenait la réputation vers 40, mais cassait l'ordre des offres (la soirée feutrée ne construisait plus la meilleure réputation) ou la rentabilité du bar. Relever `REPUTATION_CLIENT_PERDU` (0,1 → 0,2) aussi.

### Les gardes, revues

Beaucoup de gardes comparaient deux stratégies à 1 ou 2 points près sur 6 à 10 graines. Avec des cartes qui font bifurquer chaque partie, l'argent d'une partie varie de 2 000 € d'une graine à l'autre (écart-type mesuré sur 40 graines), et ces écarts deviennent du bruit. D'où :

- **Gardes de mécanique sans cartes** (option `cartes: false` : ni imprévu ni intrigue) : offres (`equilibrage.test.ts`), règles, bar, semaine, thèmes. Elles vérifient les mécaniques telles qu'elles sont ; les gardes du mois et du renouvellement jouent avec toutes les cartes.
- **Deux affirmations affaiblies, à reprendre en partie 6** (`equilibrage-semaine.test.ts`, 12 graines au lieu de 6) :
  - le joueur qui suit les tendances fait toujours mieux en réputation (+4 sur 40 graines), mais plus en argent (−300 € ± 450). La garde vérifie désormais qu'il ne perd pas plus de 800 € ;
  - deux soirées à thème par semaine n'achètent plus que +1 de réputation (contre +3 exigés), mais rapportent +535 € : la réputation sature vers 49 et le frein écrase ce qu'elles ajoutent. La garde vérifie qu'elles ne coûtent pas de réputation et ne font pas perdre plus de 800 €.
- **Voisin** (partie 1) : « avant la nuit 14 dans 8 parties sur 10 » devient « dans le mois dans 8 parties sur 10, en médiane avant la nuit 14 ». Mila et Jonas occupent les deux places d'intrigue dès la nuit 10, et le voisin attend son tour.
- **Arcs** (partie 2) : « pas plus de 20 % d'argent perdu » devient « pas plus de 1 000 € ».
- **Nouvelles gardes** : au moins 12 imprévus différents par mois, aucun plus de 5 fois, moins de 10 % déjà vus dans les 7 nuits précédentes, au moins 1,2 imprévu par soirée. La porte stricte fait sortir « Refoulé à la porte » et jamais « Une enceinte sur le quai » ; la porte laxiste, l'inverse.

### Renouvellement

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3,7 | 50 % | 2,2 | 1,3 | 15,0 | 4,0 | 0 % | 15,5 | 8 sur 10, nuit 15 |
| Feutrée, 4 | 3,3 | 62 % | 1,8 | 1,3 | 15,1 | 3,9 | 0 % | 14,2 | 2 sur 10, nuit 17 |
| Adaptatif (suit les tendances), 3 | 3,5 | 55 % | 1,8 | 1,5 | 18,5 | 4,0 | 0 % | 14,7 | 4 sur 10, nuit 18 |
| Classique 3, sélection laxiste | 3,8 | 48 % | 2,2 | 1,4 | 15,7 | 4,0 | 0 % | 15,5 | 10 sur 10, nuit 14 |
| Classique 3, sélection stricte | 3,2 | 60 % | 1,6 | 1,4 | 15,6 | 4,0 | 0 % | 13,3 | 0 sur 10 |

Avant (partie 2) : 5 à 6 imprévus différents par mois, le plus fréquent 15 fois, 87 % déjà vus dans la semaine. Après : 15 à 18 cartes différentes, au plus 4 fois la même, aucune dans la même semaine.

Le prix à payer : 1,3 à 1,5 imprévu par soirée au lieu de 1,6, donc 3,2 à 3,8 décisions par soirée. Le délai de 8 nuits est le bon compromis : avec 9, plus aucune répétition mais 1,2 imprévu par soirée ; avec 5, 1,6 par soirée mais la moitié des cartes déjà vues dans la semaine. Pour atteindre 2 imprévus par soirée sans répétition, il faudra plus de cartes sans condition. Les alertes de la partie 4 doivent apporter le reste des décisions.

### À surveiller

- **La réputation monte plus haut qu'en v0.3** : 49 à la nuit 28 en classique (35 avant), 59 en soirée feutrée, 54 avec une porte stricte. Le palier 4 (réputation 50 et 4 personnes) arriverait vers la fin du premier mois pour un bon joueur. À reprendre au rééquilibrage de la partie 6.
- **Le joueur passif** atteint parfois le palier 2 (une partie sur 10, nuit 8) : sans le client généreux qui envoyait Sanne se reposer, la maison reste ouverte.
- **Le résultat réel de la semaine 2 baisse** (74 € par jour en classique, contre 267) : les rénovations et le bar sont payés plus tard. L'avoir du mois reste dans la cible : 2 080 € après la mensualité, pire partie au-dessus de −2 000 €.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 34 / 41 / 49 | 74 € | 726 € | 2 080 € | 25 % | 85 | 0,0 | 27 / 28 / 13 / 32 | 66 / 50 / 23 / 54 |
| Classique, 4 | 3 à 4 | 36 / 44 / 46 | 559 € | 1 176 € | 6 677 € | 15 % | 72 | 0,4 | 26 / 24 / 22 / 29 | 64 / 44 / 26 / 51 |
| Happy hour, 4 | 3 à 3 | 42 / 46 / 49 | 60 € | 708 € | 777 € | 20 % | 76 | 0,9 | 37 / 24 / 12 / 28 | 70 / 50 / 22 / 51 |
| Feutrée, 4 | 3 à 4 | 36 / 48 / 59 | 69 € | 625 € | 1 181 € | 1 % | 84 | 0,0 | 20 / 40 / 12 / 28 | 74 / 64 / 32 / 61 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 34 / 45 / 53 | 120 € | 732 € | 2 125 € | 16 % | 88 | 0,0 | 27 / 33 / 15 / 25 | 66 / 58 / 36 / 51 |
| Classique 3, sans bar | 3 à 4 | 34 / 40 / 43 | 211 € | 655 € | 3 833 € | 23 % | 84 | 0,0 | 29 / 27 / 14 / 30 | 60 / 45 / 19 / 47 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 34 / 41 / 48 | -15 € | 729 € | 1 203 € | 25 % | 84 | 0,0 | 27 / 28 / 13 / 32 | 65 / 49 / 25 / 52 |
| Classique 3, champagne | 3 à 4 | 34 / 40 / 40 | 195 € | 847 € | 4 647 € | 20 % | 85 | 0,2 | 26 / 26 / 17 / 31 | 47 / 37 / 30 / 49 |
| Classique 3, tarif −20 % | 3 à 4 | 35 / 42 / 38 | -28 € | 499 € | -605 € | 28 % | 84 | 0,0 | 33 / 21 / 13 / 34 | 62 / 33 / 8 / 51 |
| Classique 3, tarif +20 % | 3 à 4 | 31 / 37 / 42 | 280 € | 843 € | 3 544 € | 12 % | 90 | 0,0 | 23 / 25 / 19 / 33 | 46 / 44 / 34 / 45 |
| Classique 3, formule courte | 3 à 4 | 35 / 45 / 52 | 24 € | 524 € | 1 037 € | 10 % | 86 | 0,0 | 23 / 28 / 20 / 29 | 67 / 45 / 42 / 55 |
| Classique 3, soirée complète | 3 à 4 | 33 / 40 / 43 | 262 € | 854 € | 5 031 € | 18 % | 84 | 0,0 | 26 / 35 / 5 / 34 | 61 / 51 / 12 / 46 |
| Classique 3, sélection laxiste | 3 à 4 | 33 / 39 / 39 | 84 € | 696 € | 1 306 € | 17 % | 87 | 0,0 | 24 / 30 / 11 / 35 | 58 / 35 / 13 / 52 |
| Classique 3, sélection stricte | 3 à 4 | 35 / 47 / 54 | 136 € | 682 € | 1 910 € | 15 % | 85 | 0,0 | 25 / 38 / 18 / 19 | 67 / 61 / 38 / 44 |
| Classique 3, habitués d’abord | 3 à 4 | 34 / 42 / 48 | 123 € | 784 € | 2 873 € | 23 % | 84 | 0,0 | 25 / 28 / 15 / 32 | 62 / 50 / 24 / 52 |
| Classique 3, pressés d’abord | 3 à 4 | 34 / 41 / 44 | 97 € | 734 € | 2 005 € | 24 % | 86 | 0,0 | 28 / 26 / 14 / 32 | 61 / 44 / 23 / 49 |
| Passif (classique, sans recruter ni rénover) | 8 à 99 | 21 / 21 / 22 | -130 € | 171 € | -1 565 € | 63 % | 45 | 0,0 | 51 / 46 / 1 / 1 | 22 / 22 / 8 / 9 |

Partie jouée dans le navigateur (version compilée, 844 × 390) : quatre soirées depuis une sauvegarde du jour 9, 9 imprévus et 9 cartes différentes (averse, client généreux, chat, critique, live, querelle, tireuse, enterrement de vie de garçon, voleur), sans erreur. Les cartes les plus longues (soirée privée, critique, candidate remarquable) tiennent en 667 × 375 ; la candidate apparaît dans l'onglet Personnel.

`npm test` : 337 tests en 12 secondes environ.

## Alertes minutées (v0.4, partie 4)

### Six nouvelles alertes

Chacune est une bulle sur la maison, avec un anneau qui se vide. On la touche pour ouvrir sa carte (en pause), qui propose une ou deux actions ou « Plus tard ». Ignorée, elle a une conséquence. Textes dans `src/content/alertes.ts`, valeurs dans `ALERTES` (`balance.ts`).

| Alerte | Quand | Actions | Si on l'ignore |
| --- | --- | --- | --- |
| Un client pressé | un client d'affaires sur le quai à 20 minutes de patience ou moins (une fois par client) | le faire passer devant (les autres attendent 5 minutes de plus) ; un verre (10 € ou une bouteille du bar, +20 minutes) | il part, et les affaires perdent 3 de satisfaction en plus |
| Du bruit sur le quai | un groupe sur le quai et un tapage de 25 ou plus | faire entrer le groupe (tapage −1,5, groupes un peu vexés) ; un verre à l'intérieur (tapage −1) | tapage +8 |
| Un client éméché | le bar sert, un groupe ou une touriste sur le quai | café et eau (réussit 7 fois sur 10, sinon dispute) ; un taxi (20 €, il rentre) | dispute sur le quai, tapage +5 |
| Une bouteille à servir | le bar sert, un habitué ou un client d'affaires présent | la servir (+40 € au bar) | rien, sinon la recette perdue |
| Un photographe sur le quai | palier 2, réputation 30 ou plus, un client d'affaires présent | le faire déguerpir (7 fois sur 10 ; sinon il revient) ; un billet (20 €) | les affaires perdent 3 de satisfaction |
| {prenom} demande une pause | une personne en service, libre, fatiguée (50 à 80) | accorder 20 minutes (indisponible, fatigue −10, moral +3) ; pas maintenant (moral −3) | moral −6, loyauté −2 |

Une alerte s'éteint sans conséquence quand elle perd son objet (le client pressé est reçu, le client éméché monte en chambre) et à la fermeture. Sauvegarde en version 19.

### Deux choix de conception

- **Un générateur à part** (`etat.hasardAlertes`) pour la naissance des alertes. Sans lui, chaque alerte tirée décalait tout le hasard de la soirée : les parties bifurquaient, et les gardes qui comparent deux stratégies à un ou deux points près basculaient au moindre réglage. Avec lui, les gardes de mécanique (`cartes: false`, désormais sans alertes minutées ni règlement des disputes, comme le joueur simulé de la v0.3) retrouvent exactement leurs résultats de la partie 3.
- **Le joueur simulé réagit** : prudent, il prend la première action de chaque alerte dès qu'elle apparaît et offre un verre à chaque dispute (jusqu'ici, il ignorait les disputes). Au hasard, il laisse filer une alerte sur quatre et choisit l'action au hasard.

### Réglages

- **Bouteille** : 0,6 chance par heure à 60 € faisait gagner 4 500 € au mois (plus de 4 000 € de cible). Désormais 0,35 par heure, 40 €.
- **Bruit** : faire entrer le groupe coûtait 1 de satisfaction aux groupes à chaque fois. Un soir de match au burlesque, la réputation perdait 7 points. Désormais 0,3 de satisfaction.
- **Le voisin ne venait plus** : le joueur prudent calmait chaque bruit aussitôt (tapage −4 puis −2), et le voisin ne descendait plus que dans 2 parties sur 10. Faire entrer le groupe ne retire plus que 1,5 de tapage : l'alerte ménage le voisin sans l'effacer.
- **L'arc de Jonas démarre plus tard** (après 14 nuits travaillées au lieu de 6, vers la nuit 16) : Mila et lui prenaient ensemble les deux places d'intrigue dès la nuit 10, et le voisin attendait la nuit 23. Les histoires s'étalent mieux sur le mois (Mila vers la nuit 10, Jonas vers la 16).

### Des soirées actives

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 7,1 | 19 % | 5,6 | 1,4 | 14,8 | 4,0 | 0 % | 15,2 | 8 sur 10, nuit 16 |
| Feutrée, 4 | 4,1 | 50 % | 2,6 | 1,3 | 14,5 | 3,9 | 0 % | 14,2 | 0 sur 10 |
| Adaptatif (suit les tendances), 3 | 5,9 | 24 % | 4,3 | 1,5 | 18,0 | 4,0 | 0 % | 15,1 | 3 sur 10, nuit 14 |
| Classique 3, sélection laxiste | 7,2 | 25 % | 5,6 | 1,4 | 15,6 | 4,0 | 0 % | 16,0 | 10 sur 10, nuit 9 |
| Classique 3, sélection stricte | 5,0 | 32 % | 3,5 | 1,4 | 15,3 | 4,0 | 0 % | 14,7 | 0 sur 10 |

| Par soirée | Partie 1 | Partie 3 | Partie 4 |
| --- | --- | --- | --- |
| Alertes (classique) | 2,1 | 2,2 | 5,6 |
| Décisions (classique) | 3,9 | 3,7 | 7,1 |
| Soirées sous 4 décisions (classique) | 49 % | 50 % | 19 % |

Nouvelle garde (`equilibrage-renouvellement.test.ts`, semaines 2 à 4) : pour le joueur classique, avec la porte laxiste ou stricte, 3,5 à 8 alertes et au moins 5 décisions par soirée, moins de 30 % de soirées sous 4 décisions. La soirée feutrée reste la plus calme (4,1 décisions) : peu de clients, peu d'alertes. C'est son caractère.

### À surveiller

- **La réputation monte encore** : 54 à la nuit 28 en classique (49 en partie 3, 35 en v0.3), 60 en soirée feutrée. Les disputes réglées ne coûtent plus leurs 2 points de réputation, et les alertes récompensent un joueur attentif. **C'est le premier chantier de la partie 6** : le palier 4 (réputation 50) arriverait vers la nuit 20 pour un bon joueur. Le happy hour atteint parfois le palier 2 dès la nuit 2 (hors garde, qui joue sans cartes).
- **L'argent** : 3 440 € après la mensualité en classique, dans la cible (0 à 4 000 €) mais en haut de la fourchette.
- **Le joueur passif** finit à −850 € et atteint le palier 2 dans quelques parties (nuit 6 à 25) : ses alertes aussi sont réglées aussitôt.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 35 / 45 / 54 | 161 € | 773 € | 3 443 € | 17 % | 88 | 0,0 | 28 / 24 / 13 / 35 | 76 / 55 / 23 / 59 |
| Classique, 4 | 3 à 4 | 35 / 47 / 58 | 580 € | 1 168 € | 8 506 € | 9 % | 81 | 0,0 | 28 / 28 / 14 / 30 | 81 / 61 / 24 / 63 |
| Happy hour, 4 | 2 à 3 | 42 / 53 / 58 | 265 € | 881 € | 3 829 € | 15 % | 80 | 0,3 | 34 / 28 / 14 / 24 | 85 / 62 / 21 / 61 |
| Feutrée, 4 | 3 à 4 | 36 / 48 / 60 | 183 € | 786 € | 3 595 € | 1 % | 85 | 0,0 | 21 / 35 / 13 / 31 | 76 / 66 / 29 / 65 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 35 / 47 / 57 | 151 € | 718 € | 2 644 € | 13 % | 90 | 0,0 | 27 / 29 / 12 / 31 | 72 / 63 / 30 / 58 |
| Classique 3, sans bar | 3 à 4 | 35 / 45 / 51 | 199 € | 642 € | 3 970 € | 20 % | 88 | 0,0 | 28 / 24 / 14 / 35 | 72 / 53 / 21 / 56 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 35 / 45 / 54 | 54 € | 775 € | 1 644 € | 18 % | 89 | 0,0 | 28 / 25 / 13 / 35 | 76 / 55 / 25 / 59 |
| Classique 3, champagne | 3 à 4 | 35 / 43 / 47 | 270 € | 884 € | 5 448 € | 15 % | 90 | 0,0 | 24 / 25 / 15 / 36 | 59 / 47 / 26 / 57 |
| Classique 3, tarif −20 % | 3 à 4 | 37 / 49 / 58 | 39 € | 619 € | 535 € | 32 % | 88 | 0,0 | 33 / 26 / 14 / 28 | 85 / 61 / 19 / 63 |
| Classique 3, tarif +20 % | 3 à 4 | 32 / 40 / 44 | 225 € | 832 € | 5 550 € | 4 % | 91 | 0,0 | 20 / 30 / 17 / 32 | 50 / 50 / 29 / 45 |
| Classique 3, formule courte | 3 à 4 | 35 / 47 / 56 | 15 € | 542 € | 735 € | 9 % | 89 | 0,0 | 26 / 30 / 16 / 28 | 75 / 53 / 34 / 61 |
| Classique 3, soirée complète | 3 à 4 | 34 / 43 / 51 | 531 € | 1 112 € | 6 667 € | 31 % | 87 | 0,0 | 27 / 35 / 7 / 31 | 72 / 59 / 16 / 52 |
| Classique 3, sélection laxiste | 3 à 4 | 35 / 46 / 53 | 144 € | 798 € | 2 745 € | 20 % | 87 | 0,0 | 29 / 24 / 13 / 35 | 77 / 53 / 19 / 61 |
| Classique 3, sélection stricte | 3 à 4 | 35 / 46 / 54 | 83 € | 660 € | 1 716 € | 14 % | 89 | 0,0 | 26 / 36 / 18 / 20 | 70 / 64 / 29 / 48 |
| Classique 3, habitués d’abord | 3 à 4 | 35 / 45 / 54 | 133 € | 767 € | 2 159 € | 21 % | 89 | 0,0 | 25 / 29 / 10 / 36 | 73 / 59 / 23 / 58 |
| Classique 3, pressés d’abord | 3 à 4 | 35 / 46 / 54 | 166 € | 780 € | 3 548 € | 20 % | 89 | 0,0 | 27 / 25 / 13 / 35 | 73 / 55 / 27 / 58 |
| Passif (classique, sans recruter ni rénover) | 6 à 25 | 24 / 25 / 27 | -109 € | 193 € | -848 € | 61 % | 49 | 0,0 | 45 / 46 / 4 / 5 | 36 / 27 / 18 / 25 |

Partie jouée dans le navigateur (version compilée) : six alertes en même temps sur une sauvegarde préparée, en 844 × 390 et 667 × 375 (bulles bien placées, carte lisible, pause accordée), puis trois soirées en ×4 depuis le jour 9 avec des alertes touchées au hasard, sans erreur.

`npm test` : 352 tests en 14 secondes environ.
