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

## Bilans : défi de la semaine, objectif du mois, fin de mois (v0.4, partie 5)

### Le défi de la semaine

Il s'ouvre avec les tendances, au premier lundi après le palier 2. Il est annoncé au bilan du lundi, suivi dans l'onglet Maison (où on en est, ce qu'il rapporte), et jugé le lundi suivant. Onze défis (`src/content/defis.ts`), cibles dans `DEFIS` :

- **Sept liés à une tendance** : congrès (12 clients d'affaires), match (au plus 3 disputes sur le quai), haute saison (28 touristes), enterrements de vie de garçon (2 000 € au bar, ou 25 clients des groupes sans bar), semaine creuse (55 clients), pluie ou fin du mois (+5 de satisfaction chez les habitués).
- **Quatre ordinaires** : au plus 3 alertes laissées filer, 1 800 € au bar, au plus 15 % de clients perdus, 80 clients.

Un défi lié à une tendance de la semaine pèse 3 fois plus au tirage, et jamais deux fois de suite le même. Le tirage a sa propre graine (numéro de la semaine) : il ne décale pas le hasard de la partie.

Récompenses modestes : quelques points de satisfaction d'un segment, un point de réputation, du moral, des bouteilles offertes par le grossiste. Un défi raté ne coûte rien.

### L'objectif du mois et le bilan de fin de mois

Le jour de la mensualité, une carte en pause fait le bilan :

- ce qui a été payé (et combien vient de la réserve) ;
- l'avoir restant ;
- la lettre de la banque si la mensualité est passée à découvert (un simple rappel à l'ordre : les conséquences viendront en v0.6) ;
- l'objectif jugé, la mention de Josée et l'objectif du mois qui commence.

| Mois | Objectif | Cible |
| --- | --- | --- |
| 1 | Se faire un nom | réputation 52 (`OBJECTIFS.reputationMois1`) |
| 2 | Fidéliser la clientèle principale (le segment le plus reçu ces dernières nuits) | sa satisfaction + 8 |
| 3 | Garder une réserve | 3 000 € après la mensualité |
| 4 | Se faire un nom | réputation + 8 |
| 5 | Garder l'équipe | aucun départ |

Réussi : réputation +2 et moral +4 pour toute l'équipe.

Après la première mensualité, le panneau « Prochain palier » et le bilan disent que la suite (palier 3) arrive avec la prochaine version : le joueur ne croit plus à un bug.

Sauvegarde en version 20. Josée présente les objectifs (et les défis, si les tendances sont ouvertes) aux parties déjà avancées.

### Réglages

Mesures sur 20 parties de 56 nuits :

- **Premier jet trop facile.** « Pas de dispute qui dégénère » réussissait toujours, car le joueur simulé règle chaque dispute : le défi compte désormais les disputes déclenchées. La semaine creuse (30 clients) réussissait 24 fois sur 25, et la recette du bar dépassait 2 000 € quand on en visait 700.
- **Les défis ordinaires ne sortaient jamais**, parce qu'il y a une tendance chaque semaine. D'où le poids de 3 contre 1 plutôt qu'une priorité absolue.
- **L'objectif du mois 1 à 35 de réputation réussissait 20 fois sur 20** (réputation moyenne de 54 au jour 28). À 52 : 14 sur 20 en classique, 18 en adaptatif, 20 en feutrée, 0 pour le passif.
- **« Fidéliser le segment le moins content » échouait 19 fois sur 20.** C'est justement celui que la stratégie du joueur néglige, et il continue de baisser. On vise désormais la clientèle principale : 13 à 17 réussites sur 20.

| Défi (classique / adaptatif, 20 parties × 8 semaines) | Réussis |
| --- | --- |
| Congrès | 7 sur 12 / 13 sur 13 : suivre la tendance paie |
| Match | 0 sur 6 / 1 sur 4 : le portier aide, mais c'est dur |
| Choyer les habitués | 6 sur 13 / 10 sur 16 |
| Semaine creuse | 6 sur 12 / 14 sur 17 |
| Rien ne nous échappe | 20 sur 24 / 16 sur 16 : le joueur simulé ne laisse rien filer ; un humain, si |

### Renouvellement et bilans

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 7,2 | 20 % | 5,6 | 1,4 | 14,8 | 4,0 | 0 % | 15,9 | 9 sur 10, nuit 17 | 11 sur 20 | 6 sur 10 |
| Feutrée, 4 | 4,3 | 49 % | 2,8 | 1,3 | 14,5 | 3,9 | 0 % | 14,7 | 1 sur 10, nuit 25 | 12 sur 20 | 10 sur 10 |
| Adaptatif (suit les tendances), 3 | 5,8 | 25 % | 4,1 | 1,5 | 17,6 | 4,0 | 0 % | 14,7 | 2 sur 10, nuit 10 | 12 sur 20 | 5 sur 10 |
| Classique 3, sélection laxiste | 7,3 | 21 % | 5,7 | 1,4 | 15,5 | 4,0 | 0 % | 15,8 | 10 sur 10, nuit 9 | 15 sur 20 | 3 sur 10 |
| Classique 3, sélection stricte | 5,0 | 34 % | 3,5 | 1,4 | 15,4 | 4,0 | 0 % | 14,7 | 0 sur 10 | 11 sur 20 | 6 sur 10 |

Les gardes de mécanique (`cartes: false`) ignorent aussi défis et objectifs : leurs récompenses touchent la réputation. La garde « le voisin descend pour au moins 6 joueurs classiques sur 10 » passe à 5 sur 10 : sur 20 graines, 12 parties sur 20, mais les 10 premières graines n'en donnent que 5.

### À surveiller

- **La réputation** : 55 à la nuit 28 en classique, 62 en happy hour ou en soirée feutrée. Les cibles des objectifs (52 au premier mois) sont calées sur ce niveau : **à revoir avec le rééquilibrage de la réputation de la partie 6**.
- **Le défi du match** est presque impossible sans portier : voulu, mais à juger au téléphone.
- **Le défi « Rien ne nous échappe »** dépend de l'attention du joueur, que la simulation ne sait pas mesurer.

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 3 à 4 | 35 / 45 / 55 | 161 € | 773 € | 3 654 € | 17 % | 90 | 0,0 | 28 / 24 / 13 / 35 | 78 / 56 / 24 / 60 |
| Classique, 4 | 3 à 4 | 35 / 47 / 60 | 580 € | 1 168 € | 8 607 € | 9 % | 83 | 0,0 | 28 / 28 / 14 / 30 | 82 / 61 / 30 / 66 |
| Happy hour, 4 | 2 à 3 | 42 / 53 / 62 | 265 € | 881 € | 3 999 € | 15 % | 83 | 0,3 | 34 / 28 / 14 / 24 | 87 / 66 / 25 / 64 |
| Feutrée, 4 | 3 à 4 | 36 / 48 / 62 | 183 € | 786 € | 3 392 € | 1 % | 87 | 0,0 | 21 / 35 / 13 / 31 | 79 / 68 / 32 / 68 |
| Adaptatif (suit les tendances), 3 | 3 à 4 | 35 / 47 / 59 | 151 € | 718 € | 2 837 € | 13 % | 93 | 0,0 | 27 / 29 / 12 / 31 | 74 / 64 / 33 / 60 |
| Classique 3, sans bar | 3 à 4 | 35 / 45 / 52 | 199 € | 642 € | 3 964 € | 20 % | 89 | 0,0 | 28 / 24 / 14 / 35 | 74 / 53 / 22 / 56 |
| Classique 3, bar à 2, sans avance | 3 à 4 | 35 / 45 / 57 | 54 € | 775 € | 1 174 € | 18 % | 92 | 0,0 | 28 / 25 / 13 / 35 | 80 / 58 / 28 / 61 |
| Classique 3, champagne | 3 à 4 | 35 / 43 / 48 | 270 € | 884 € | 5 307 € | 15 % | 92 | 0,0 | 24 / 25 / 15 / 36 | 61 / 48 / 26 / 57 |
| Classique 3, tarif −20 % | 3 à 4 | 37 / 49 / 59 | 39 € | 619 € | 553 € | 32 % | 90 | 0,0 | 33 / 26 / 14 / 28 | 85 / 61 / 21 / 64 |
| Classique 3, tarif +20 % | 3 à 4 | 32 / 40 / 46 | 225 € | 832 € | 5 541 € | 4 % | 91 | 0,0 | 20 / 30 / 17 / 32 | 51 / 50 / 32 / 46 |
| Classique 3, formule courte | 3 à 4 | 35 / 47 / 59 | 15 € | 542 € | 959 € | 9 % | 91 | 0,0 | 26 / 30 / 16 / 28 | 78 / 55 / 38 / 64 |
| Classique 3, soirée complète | 3 à 4 | 34 / 43 / 52 | 531 € | 1 112 € | 6 909 € | 31 % | 88 | 0,0 | 27 / 35 / 7 / 31 | 72 / 61 / 17 / 53 |
| Classique 3, sélection laxiste | 3 à 4 | 35 / 46 / 56 | 144 € | 798 € | 2 882 € | 20 % | 91 | 0,0 | 29 / 24 / 13 / 35 | 80 / 55 / 22 / 64 |
| Classique 3, sélection stricte | 3 à 4 | 35 / 46 / 57 | 83 € | 660 € | 1 803 € | 14 % | 90 | 0,0 | 26 / 36 / 18 / 20 | 72 / 66 / 32 / 50 |
| Classique 3, habitués d’abord | 3 à 4 | 35 / 45 / 55 | 133 € | 767 € | 2 166 € | 21 % | 90 | 0,0 | 25 / 29 / 10 / 36 | 74 / 59 / 24 / 60 |
| Classique 3, pressés d’abord | 3 à 4 | 35 / 46 / 56 | 166 € | 780 € | 3 233 € | 20 % | 91 | 0,0 | 27 / 25 / 13 / 35 | 77 / 57 / 29 / 60 |
| Passif (classique, sans recruter ni rénover) | 6 à 25 | 24 / 25 / 27 | -109 € | 193 € | -848 € | 61 % | 49 | 0,0 | 45 / 46 / 4 / 5 | 36 / 27 / 18 / 25 |

Parties jouées dans le navigateur (version compilée, 844 × 390 et 667 × 375) : une ancienne sauvegarde reçoit les objectifs et les défis, présentés par Josée ; l'onglet Maison affiche le défi en cours (7 sur 12 clients d'affaires) et l'objectif du mois ; la veille de la mensualité, le temps avance et la carte « Fin du mois 1 » s'ouvre (objectif raté, 590 € pris dans la réserve, objectif suivant) ; la veille d'un lundi, le bilan de la semaine juge le défi du bar et annonce le suivant. Aucune erreur.

`npm test` : 365 tests en 14 secondes environ.

## Rééquilibrage final (v0.4, partie 6)

### La réputation montait trop haut

Au fil des parties 3 à 5, la réputation du joueur actif s'était envolée : 55 à la nuit 28 en classique (35 en v0.3), 62 en soirée feutrée et en happy hour. Trois causes cumulées :

- le client généreux ne vidait plus l'équipe un soir sur deux (partie 3) ;
- les disputes réglées ne coûtaient plus leurs 2 points (partie 4) ;
- les alertes récompensent un joueur attentif (partie 4).

Le palier 4 (réputation 50 et 4 personnes) serait tombé vers la nuit 20. Le joueur passif atteignait parfois le palier 2.

Le levier retenu est **`REPUTATION_FREIN` : 2 → 3,5**. Les gains de satisfaction sont multipliés par (1 − satisfaction / 100)^3,5 : le début de partie ne change presque pas (le palier 2 tombe toujours entre les nuits 3 et 5), mais la réputation plafonne plus tôt.

| Frein (toutes cartes actives, 12 graines) | Classique, nuits 7 / 14 / 28 | Meilleure stratégie, nuit 28 | Passif, nuit 28 | Palier 2 |
| --- | --- | --- | --- | --- |
| 2 (partie 5) | 35 / 45 / 55 | 63 (happy hour) | 27, palier 2 parfois | nuits 2 à 4 |
| 3 | 31 / 41 / 47 | 54 (feutrée) | 24 | nuits 3 à 4 |
| **3,5** | **30 / 37 / 42** | **49 (feutrée)** | **23** | **nuits 3 à 5** |
| 4 | 29 / 35 / 40 | 47 | 21 | nuits 3 à 5 |

4 atteignait aussi les cibles, mais écrasait les écarts entre stratégies : la soirée feutrée ne construisait plus la meilleure réputation.

Ce que le frein a demandé en plus, pour que chaque choix garde son sens :

| Valeur | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| Soirée feutrée, réputation | × 1 | × 1,25 | Le happy hour (× 1,5) construisait une meilleure réputation qu'elle à la nuit 14 : 36,2 contre 35,4 (20 graines) |
| Burlesque, bouche-à-oreille | × 1,8 | × 3 | Le frein réduit les gains, pas les pertes : le monde en plus un soir de match devenait des clients perdus (−0,9 de réputation sur 30 graines ; +2,2 après) |
| `CHARGES_FIXES` | 1 000 € | 1 150 € | Moins de clients perdus, un peu plus d'argent : l'avoir du joueur classique dépassait 4 000 € |
| Client pressé, seuil | 20 min | 15 min | Le joueur classique dépassait 8 alertes par soirée |
| Bouteille à servir, chance | 0,35 | 0,3 | Idem |
| Objectif du mois 1 | réputation 52 | réputation 42 | Recalé sur la nouvelle échelle |
| Défi « Personne ne repart » | 15 % perdus | 20 % | 2 réussites sur 19 en classique |

### Gardes revues

- `equilibrage.test.ts` passe de 10 à 20 graines : sur 10, deux offres proches (classique et happy hour à 4 rendez-vous) s'inversaient par hasard.
- L'avance du joueur adaptatif en réputation est exigée à +1,5 au lieu de +2 : +1,9 mesuré sur 30 graines, contre +7 en v0.3, avant que le frein ne comprime les écarts.
- Les dénouements des arcs se comptent sur 20 parties jouées au hasard (10 ne montraient parfois que deux fins de Mila, contre 5 sur 20).
- Au plus un tiers de soirées calmes (30 % avant) : une porte stricte fait une maison plus calme, par nature.

### Mesures finales

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 5 | 30 / 37 / 43 | 208 € | 881 € | 3 920 € | 23 % | 87 | 0,0 | 30 / 29 / 15 / 26 | 64 / 43 / 17 / 43 |
| Classique, 4 | 3 à 4 | 31 / 40 / 48 | 300 € | 940 € | 5 693 € | 8 % | 85 | 0,1 | 27 / 26 / 12 / 35 | 70 / 48 / 21 / 50 |
| Happy hour, 4 | 3 à 3 | 34 / 40 / 46 | 303 € | 939 € | 3 281 € | 26 % | 81 | 0,3 | 37 / 26 / 14 / 23 | 70 / 49 / 16 / 48 |
| Feutrée, 4 | 3 à 4 | 33 / 43 / 53 | 134 € | 767 € | 3 279 € | 1 % | 87 | 0,0 | 26 / 35 / 10 / 28 | 71 / 56 / 27 / 56 |
| Adaptatif (suit les tendances), 3 | 4 à 5 | 30 / 39 / 49 | 268 € | 918 € | 3 552 € | 15 % | 92 | 0,0 | 23 / 33 / 19 / 26 | 64 / 52 / 28 / 49 |
| Classique 3, sans bar | 4 à 5 | 30 / 37 / 46 | 267 € | 729 € | 3 691 € | 24 % | 88 | 0,0 | 29 / 29 / 15 / 27 | 67 / 47 / 21 / 47 |
| Classique 3, bar à 2, sans avance | 4 à 5 | 30 / 37 / 44 | 97 € | 886 € | 2 563 € | 23 % | 87 | 0,0 | 30 / 29 / 15 / 26 | 64 / 45 / 18 / 45 |
| Classique 3, champagne | 4 à 5 | 30 / 36 / 38 | 335 € | 1 009 € | 4 791 € | 18 % | 90 | 0,0 | 25 / 29 / 18 / 28 | 51 / 38 / 19 / 43 |
| Classique 3, tarif −20 % | 4 à 5 | 32 / 39 / 45 | -25 € | 492 € | -6 € | 28 % | 88 | 0,0 | 32 / 27 / 10 / 31 | 69 / 47 / 14 / 49 |
| Classique 3, tarif +20 % | 4 à 5 | 29 / 34 / 37 | 452 € | 1 079 € | 5 881 € | 14 % | 92 | 0,0 | 20 / 27 / 20 / 32 | 47 / 39 / 22 / 39 |
| Classique 3, formule courte | 4 à 5 | 31 / 40 / 49 | 16 € | 578 € | 937 € | 10 % | 90 | 0,0 | 27 / 25 / 17 / 31 | 69 / 44 / 31 / 51 |
| Classique 3, soirée complète | 4 à 5 | 29 / 37 / 43 | 324 € | 950 € | 4 679 € | 24 % | 89 | 0,0 | 26 / 39 / 4 / 31 | 61 / 47 / 15 / 44 |
| Classique 3, sélection laxiste | 4 à 5 | 31 / 36 / 44 | 214 € | 846 € | 2 679 € | 24 % | 91 | 0,0 | 26 / 20 / 12 / 43 | 64 / 41 / 20 / 49 |
| Classique 3, sélection stricte | 4 à 5 | 31 / 38 / 46 | 8 € | 579 € | 879 € | 7 % | 90 | 0,0 | 24 / 37 / 22 / 17 | 61 / 52 / 26 / 39 |
| Classique 3, habitués d’abord | 4 à 5 | 30 / 38 / 48 | 214 € | 888 € | 3 550 € | 22 % | 86 | 0,0 | 29 / 29 / 15 / 27 | 68 / 49 / 23 / 48 |
| Classique 3, pressés d’abord | 4 à 5 | 30 / 37 / 45 | 215 € | 888 € | 3 134 € | 24 % | 88 | 0,0 | 28 / 29 / 15 / 27 | 65 / 45 / 21 / 46 |
| Passif (classique, sans recruter ni rénover) | 16 à 99 | 21 / 22 / 23 | -126 € | 198 € | -1 383 € | 60 % | 48 | 0,0 | 49 / 51 / 0 / 0 | 26 / 23 / 16 / 18 |

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 7,0 | 17 % | 5,5 | 1,4 | 15,1 | 4,0 | 0 % | 15,0 | 9 sur 10, nuit 18 | 10 sur 20 | 5 sur 10 |
| Feutrée, 4 | 4,6 | 42 % | 3,1 | 1,3 | 14,9 | 3,9 | 0 % | 13,9 | 0 sur 10 | 7 sur 20 | 10 sur 10 |
| Adaptatif (suit les tendances), 3 | 5,6 | 28 % | 4,0 | 1,5 | 18,0 | 3,9 | 0 % | 13,9 | 1 sur 10, nuit 27 | 13 sur 20 | 6 sur 10 |
| Classique 3, sélection laxiste | 5,9 | 33 % | 4,4 | 1,4 | 15,5 | 4,0 | 0 % | 14,8 | 9 sur 10, nuit 13 | 11 sur 20 | 6 sur 10 |
| Classique 3, sélection stricte | 4,6 | 39 % | 3,0 | 1,4 | 15,7 | 4,0 | 0 % | 14,5 | 0 sur 10 | 11 sur 20 | 5 sur 10 |

## La question de la v0.4 : les soirées se renouvellent-elles ?

Oui, et les gardes le vérifient (`equilibrage-renouvellement.test.ts`, joueur classique, 28 nuits) :

| Mesure | v0.3 | v0.4 | Garde |
| --- | --- | --- | --- |
| Décisions par soirée | 3,9 | 7,0 | au moins 5 |
| Soirées sous 4 décisions | 49 % | 17 % | au plus un tiers |
| Alertes par soirée | 2,1 | 5,5 | entre 3,5 et 8 |
| Imprévus différents dans le mois | 5 à 6 | 15 à 18 | au moins 12 |
| Répétitions de l'imprévu le plus fréquent | environ 15 | 4 | au plus 5 |
| Imprévus déjà vus dans les 7 nuits | 87 % | 0 % | au plus 10 % |
| Cartes d'intrigue dans le mois | 0 | 14 à 16 | |

- **Les soirées dépendent de l'état de la maison.** La porte stricte fait sortir « Refoulé à la porte » et jamais « Une enceinte sur le quai », la laxiste l'inverse. Un soir de match, de congrès ou de soirée masquée apporte ses propres cartes.
- **Chaque semaine a son défi** (une semaine sur deux réussie en jouant classique, davantage en suivant les tendances) et chaque mois son objectif, jugés à des moments différents.
- **Trois intrigues** donnent un fil sur plusieurs jours : le voisin (9 parties sur 10 avec une porte laxiste), Mila (vers la nuit 10), Jonas (vers la nuit 16). Leurs dénouements dépendent de l'ensemble des choix.
- **Ce qui reste creux** :
  - la soirée feutrée et la porte stricte donnent des soirées plus calmes (4,6 décisions, 40 % sous 4) ;
  - les imprévus plafonnent à 1,3 à 1,5 par soirée, faute de cartes sans condition (la cible est de 2).

  À enrichir en v0.5 avec les relations et la rivale.

### À surveiller en jouant

- **Le rythme des alertes à ×1** : 5 à 7 décisions en 6 minutes, est-ce agréable ou harcelant au téléphone ?
- **L'argent du premier mois** est confortable pour un joueur actif (3 900 € en classique après la mensualité, dans la cible de 0 à 4 000 €). Le bar ne se rembourse qu'à partir de la cinquième semaine.
- **Le défi du match** est presque impossible sans portier ; « Rien ne nous échappe » dépend de l'attention du joueur, que la simulation ne mesure pas.
- **Les gardes de mécanique** jouent sans les cartes de la v0.4 (`cartes: false`) ; les gardes du jeu complet (mois, renouvellement) les gardent toutes. Un changement de contenu (une carte, une alerte) ne doit donc pas faire basculer les premières.

### Partie jouée dans le navigateur (vite preview, 844 × 390)

Nouvelle partie à ×4, rénovations et choix au hasard, jusqu'au bilan du mois 1 ; aucune erreur dans la console.

- Argent aux nuits 7, 14, 21 et 27 : 2 257 €, 4 882 €, 4 499 €, 4 226 € ; 1 855 € après la mensualité.
- Réputation aux mêmes nuits : 28, 32, 34, 33 ; l'objectif « Se faire un nom » (42) est donc raté, comme prévu pour un jeu au hasard.
- Défis : touristes 22 sur 28, puis habitués 1 sur 5, tous deux ratés.
- 42 cartes différentes vues, dont les trois intrigues avec leurs suites (inspecteur, homme au costume, vidéo, articles, bridge, chat).
- Répétitions : « Un client pressé » (16) et les demandes de pause (13 pour Sanne) sont les plus fréquentes.

`npm test` : 365 tests passent.


## Rythme : la soirée passe à 3 minutes (v0.5, partie 1)

Au téléphone, 6 minutes par soirée à ×1, c'était trop long. `SECONDES_REELLES_SOIREE` passe de 360 à 180 : 3 minutes à ×1, 1 min 30 à ×2, 45 s à ×4. La journée (5 h – 19 h) ne change pas : 45 s à ×1.

### Ce que le joueur doit faire à temps

Tout est compté en minutes de jeu : pour garder le même temps de réaction réel, ces délais doublent.

| Réaction | v0.4 | v0.5 | Secondes réelles à ×1 |
| --- | --- | --- | --- |
| Groupe bruyant (`ALERTES.bruit.delai`) | 30 min | 60 min | 22,5 |
| Pause demandée (`ALERTES.pause.delai`) | 30 min | 60 min | 22,5 |
| Client éméché (`ALERTES.ivre.delai`) | 25 min | 50 min | 18,75 |
| Photographe (`ALERTES.photographe.delai`, sa relance à moitié) | 25 min | 50 min | 18,75 |
| Bouteille à servir (`ALERTES.bouteille.delai`) | 20 min | 40 min | 15 |
| Client pressé (`ALERTES.presse.seuilPatience`) | 15 min | 30 min | 11,25 au plus |
| Dispute sur le quai (`DISPUTE_DELAI`) | 40 min | 80 min | 30 |

Ne changent pas, parce que ce sont des durées de simulation ou des fréquences : la patience des clients, la durée des rendez-vous et de la pause (20 min), la patience gagnée avec un verre, les chances d'alerte et d'imprévu par heure de jeu, l'écart entre deux imprévus, la fenêtre sans nouvelle alerte (30 dernières minutes). Les imprévus et les cartes d'intrigue mettent le jeu en pause : pas de délai. Chambre sale, linge et bar vide suivent le rythme des rendez-vous : le joueur a deux fois moins de temps réel entre deux rendez-vous, c'est voulu. Le test « rythme en temps réel » (`tick.test.ts`) vérifie la durée de la soirée et le temps de réaction réel de chaque alerte.

Une alerte encore active à la fermeture s'éteint sans conséquence, comme en v0.4 ; une dispute aussi. J'ai essayé de faire dégénérer à la fermeture une dispute non réglée : le joueur qui laisse tout filer perdait 3 points de réputation de plus en un mois (40 graines), c'était trop dur.

### Ce que la mesure a révélé

- **Une erreur de comptage** : la simulation comptait comme une seule deux alertes minutées présentes en même temps. Corrigée (`simulation.ts`) ; la v0.4 remesurée donne 6,1 alertes par soirée en classique au lieu de 5,5.
- **Le photographe qui revient** (chassé, il revient une fois sur trois) gardait l'heure de sa première apparition : le joueur simulé ne le voyait jamais et le laissait filer. La relance est désormais une nouvelle bulle, avec son propre compte à rebours (la bulle se remplit de nouveau à l'écran). Le joueur simulé y répond, la satisfaction des clients d'affaires monte (17 → 32 à la nuit 28 en classique) et la réputation avec (43 → 48). C'est la mesure qui change, pas le jeu d'un humain attentif.
- **Grève et contrôles la même semaine** : le changement de rythme a décalé le hasard, et une partie de la garde du premier mois est tombée sur les deux tendances creuses ensemble : sept soirs presque vides, −3 136 € au plus bas. Le tirage n'en autorise plus qu'une par semaine (`tendanceCreuse` dans `semaine.ts`, avec son test).
- **Les disputes laissées à elles-mêmes** : une dispute occupe le quai deux fois plus longtemps en minutes de jeu, il en éclate donc un peu moins pour le joueur simulé des gardes de mécanique (`cartes: false`), qui ne les règle jamais. Les écarts entre règles se resserrent un peu (soir de match : le portier gagne 10,0 points de réputation sur la porte normale, contre 13,6 en v0.4, sur 40 graines). Pour un humain qui règle ses disputes, rien ne change.

### Le même nombre d'alertes ?

Oui. Joueur qui tranche au hasard et laisse filer une alerte sur quatre, 40 graines, 28 nuits :

| Par soirée | v0.4 | v0.5 |
| --- | --- | --- |
| Alertes, classique | 5,6 | 5,0 |
| Alertes, porte laxiste | 5,1 | 5,7 |
| Alertes, porte stricte | 3,4 | 3,1 |
| Alertes, soirée feutrée | 3,0 | 3,2 |
| Décisions, classique / stricte | 7,1 / 5,0 | 6,5 / 4,7 |
| Imprévus, classique | 1,3 | 1,3 |

Les écarts vont dans les deux sens et restent dans le bruit de la mesure. Une alerte ignorée bloque son type (une seule bulle de chaque sorte à la fois) pendant le même temps réel, donc deux fois plus de minutes de jeu : un joueur distrait voit un peu moins de bulles, un joueur attentif autant. Joueur attentif (répond à tout), 40 graines, semaines 2 à 4 : 7,7 alertes en classique (7,1 en v0.4), 4,2 en porte stricte (4,3).

### Gardes revues

- `equilibrage-regles.test.ts` (10 → 20 graines), `equilibrage-semaine.test.ts` (12 → 20) et `equilibrage-renouvellement.test.ts` (10 → 20) : les écarts resserrés passaient sous le bruit de 10 graines. Sur 10 graines, la v0.4 remesurée montait déjà à 8,2 alertes en classique, au-dessus de la garde.
- Soirées calmes avec la porte stricte : 34 % en v0.4, 36 % aujourd'hui (40 graines). La garde tolère 40 % pour elle seule, en attendant les cartes du quartier (partie 5) qui doivent la ramener sous un tiers.

`npm run rapport` affiche désormais un troisième tableau : les alertes par soirée, selon leur type.

### Mesures (10 graines, 28 nuits)

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 5 | 30 / 39 / 48 | 233 € | 906 € | 3 945 € | 22 % | 89 | 0,0 | 29 / 27 / 16 / 29 | 67 / 46 / 32 / 47 |
| Classique, 4 | 3 à 4 | 31 / 41 / 53 | 377 € | 1 043 € | 5 909 € | 8 % | 87 | 0,0 | 26 / 27 / 13 / 34 | 71 / 51 / 36 / 52 |
| Happy hour, 4 | 3 à 3 | 35 / 43 / 52 | 376 € | 1 006 € | 3 513 € | 26 % | 83 | 0,2 | 40 / 20 / 16 / 24 | 72 / 51 / 35 / 51 |
| Feutrée, 4 | 3 à 4 | 33 / 44 / 55 | 181 € | 818 € | 3 437 € | 1 % | 87 | 0,0 | 26 / 33 / 12 / 29 | 69 / 56 / 36 / 56 |
| Adaptatif (suit les tendances), 3 | 4 à 5 | 30 / 40 / 52 | 263 € | 911 € | 3 670 € | 12 % | 92 | 0,0 | 23 / 35 / 20 / 22 | 63 / 54 / 41 / 48 |
| Classique 3, sans bar | 4 à 5 | 30 / 39 / 46 | 293 € | 755 € | 4 919 € | 23 % | 89 | 0,0 | 27 / 28 / 17 / 28 | 63 / 43 / 33 / 44 |
| Classique 3, bar à 2, sans avance | 4 à 5 | 30 / 39 / 49 | 116 € | 911 € | 2 402 € | 22 % | 88 | 0,0 | 29 / 27 / 16 / 29 | 67 / 47 / 33 / 47 |
| Classique 3, champagne | 4 à 5 | 30 / 37 / 42 | 333 € | 1 007 € | 5 809 € | 19 % | 90 | 0,0 | 28 / 25 / 19 / 28 | 51 / 38 / 36 / 44 |
| Classique 3, tarif −20 % | 4 à 5 | 32 / 41 / 52 | -10 € | 491 € | -17 € | 29 % | 89 | 0,0 | 28 / 25 / 12 / 35 | 73 / 49 / 32 / 51 |
| Classique 3, tarif +20 % | 4 à 5 | 29 / 35 / 41 | 458 € | 1 083 € | 6 234 € | 13 % | 92 | 0,0 | 22 / 27 / 22 / 30 | 47 / 40 / 35 / 39 |
| Classique 3, formule courte | 4 à 5 | 31 / 40 / 51 | -5 € | 574 € | 85 € | 10 % | 93 | 0,0 | 26 / 25 / 19 / 30 | 67 / 43 / 41 / 52 |
| Classique 3, soirée complète | 4 à 5 | 29 / 37 / 45 | 323 € | 950 € | 5 417 € | 25 % | 89 | 0,0 | 28 / 38 / 5 / 30 | 61 / 48 / 23 / 44 |
| Classique 3, sélection laxiste | 4 à 5 | 31 / 38 / 47 | 222 € | 852 € | 2 527 € | 22 % | 91 | 0,0 | 29 / 19 / 13 / 39 | 67 / 42 / 31 / 50 |
| Classique 3, sélection stricte | 4 à 5 | 31 / 39 / 50 | 3 € | 575 € | 1 505 € | 7 % | 92 | 0,0 | 25 / 36 / 22 / 17 | 61 / 53 / 41 / 41 |
| Classique 3, habitués d’abord | 4 à 5 | 30 / 39 / 49 | 241 € | 915 € | 3 158 € | 22 % | 91 | 0,0 | 28 / 27 / 17 / 29 | 66 / 48 / 32 / 47 |
| Classique 3, pressés d’abord | 4 à 5 | 30 / 39 / 49 | 260 € | 937 € | 3 904 € | 21 % | 88 | 0,0 | 28 / 24 / 18 / 30 | 68 / 46 / 35 / 47 |
| Passif (classique, sans recruter ni rénover) | 16 à 99 | 21 / 22 / 23 | -126 € | 198 € | -1 558 € | 60 % | 50 | 0,0 | 49 / 51 / 0 / 0 | 26 / 22 / 16 / 18 |

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 6,1 | 27 % | 4,6 | 1,3 | 14,7 | 4,0 | 0 % | 15,3 | 5 sur 10, nuit 16 | 9 sur 20 | 7 sur 10 |
| Feutrée, 4 | 4,7 | 40 % | 3,2 | 1,3 | 15,0 | 3,9 | 0 % | 14,1 | 0 sur 10 | 5 sur 20 | 10 sur 10 |
| Adaptatif (suit les tendances), 3 | 6,0 | 20 % | 4,4 | 1,5 | 18,0 | 4,0 | 0 % | 14,4 | 1 sur 10, nuit 24 | 15 sur 20 | 6 sur 10 |
| Classique 3, sélection laxiste | 7,0 | 24 % | 5,4 | 1,4 | 15,8 | 4,0 | 0 % | 14,9 | 9 sur 10, nuit 12 | 12 sur 20 | 5 sur 10 |
| Classique 3, sélection stricte | 4,9 | 35 % | 3,3 | 1,4 | 15,2 | 4,0 | 0 % | 13,5 | 0 sur 10 | 11 sur 20 | 5 sur 10 |

| Stratégie | presse | bruit | ivre | bouteille | photographe | pause | dispute | chambreSale | linge | barVide | epuisement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 0,3 | 0,2 | 0,5 | 0,6 | 0,6 | 0,4 | 0,3 | 0,8 | 0,9 | 0,0 | 0,0 |
| Feutrée, 4 | 0,0 | 0,0 | 0,1 | 0,5 | 0,5 | 0,4 | 0,1 | 0,7 | 0,8 | 0,0 | 0,0 |
| Adaptatif (suit les tendances), 3 | 0,2 | 0,1 | 0,3 | 0,8 | 0,7 | 0,4 | 0,2 | 0,7 | 1,0 | 0,0 | 0,0 |
| Classique 3, sélection laxiste | 0,3 | 0,5 | 0,6 | 0,5 | 0,6 | 0,5 | 0,6 | 0,8 | 0,9 | 0,0 | 0,0 |
| Classique 3, sélection stricte | 0,2 | 0,0 | 0,1 | 0,3 | 0,6 | 0,3 | 0,1 | 0,6 | 0,9 | 0,0 | 0,0 |

### Dans le navigateur (vite preview, 844 × 390 et 667 × 375)

Une partie de la nuit 16 (porte laxiste, bar ouvert), rechargée depuis une sauvegarde, jouée à ×1 en laissant filer les bulles : de 20 h à 4 h, **178,7 secondes** de soirée hors pauses. Bulles laissées filer : photographe 18,6 s, pause d'Inès 22,2 s, client éméché 15,1 s (les autres se sont éteintes plus tôt, le client étant reçu). La carte d'alerte reste lisible aux deux tailles ; elle annonce « Encore 50 minutes de jeu » (le délai en temps de jeu). Aucune erreur dans la console (hors polices bloquées par le réseau du bac à sable).

### À surveiller au téléphone

- **Le rythme** : 5 à 7 décisions en 3 minutes. Intense, voulu ; à juger en main.
- **Chambre sale et linge** n'ont pas de délai, mais arrivent deux fois plus vite en temps réel.
- **« Encore 50 minutes de jeu »** sur la carte d'alerte : le chiffre a doublé alors que le temps réel est le même. S'il trompe, afficher plutôt une jauge ou des secondes.


## Relations avec le quartier et palier 3 (v0.5, partie 2)

Le palier 3 s'ouvre le matin de la première mensualité (jour 28), après le bilan du mois. Il ouvre l'onglet Relations : voisins, mairie, presse et police, une jauge de −100 à +100 chacun. Toutes les valeurs sont dans `RELATIONS`, `ACTIONS_RELATIONS` et `QUARTIER_ARGENT` (`balance.ts`).

### Comment les jauges bougent

- **Voisins** : chaque matin, (30 − tapage de la nuit) × 0,15. Une nuit calme les apaise jusqu'à +30 au plus ; au-delà, il faut des gestes. Le point neutre (30) est calé sur le tapage mesuré au deuxième mois : 34 en moyenne en classique, 43 porte laxiste, 17 porte stricte, 24 en soirée feutrée. Premier essai à 28 avec une pente de 0,3 au-dessus de 25 : les voisins tombaient à −72 en classique et −98 en laxiste, c'était une punition, pas une relation.
- **Mairie, police** : reviennent de 2 % par jour vers leur valeur de départ (3 % au premier essai : même le joueur qui soignait ses relations n'atteignait jamais les bons termes). Une nuit à plus de 50 de tapage coûte 1 point de police ; des voisins en mauvais termes coûtent 0,5 point de mairie par jour.
- **Presse** : revient vers (réputation − 35) × 0,6, soit environ +10 à la réputation 50.
- **Cartes** : l'inspection, la vidéo, les critiques, l'échevin, le voleur, l'enceinte, les prolongations, l'intrigue du voisin et le magazine de Mila touchent les jauges. Le photographe et le groupe bruyant laissés filer aussi.

### Seuils, services et ennuis

En bons termes (au moins +40) ou en mauvais termes (−40 au plus), chaque matin, une chance sur trois (0,35) qu'un acteur se manifeste, puis 7 jours de répit pour lui. Huit cartes, deux par acteur, dans `src/content/quartier.ts`. Elles ont leur propre générateur (`hasardQuartier`), comme les actions : le reste de la partie ne bifurque pas.

### Actions

Deux par acteur, une par semaine et par acteur, de 30 € (café au commissariat, +4) à 450 € (mécène du festival du canal, +16 mairie, +4 voisins). Deux ont un risque (le déjeuner avec l'échevin, la soirée pour la presse).

### Mesures (10 graines, 56 nuits, cartes tranchées au hasard)

Le joueur « relations entretenues » agit dès qu'un acteur passe sous +10 ; le « soigneur » vise +45 et choisit l'action la plus chère quand la caisse le permet.

| Stratégie (56 nuits) | Voisins | Mairie | Presse | Police | Événements du quartier par partie, mois 2 (total sur les parties) | Actions de relations par partie, mois 2 | Avoir, nuit 56 | Décisions par soirée, mois 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | -16 | 18 | 12 | 14 | 0,5 (petition 5) | 0,0 | 5 547 € | 8,2 |
| Classique 3, sélection laxiste | -88 | 12 | 17 | 4 | 1,9 (petition 19) | 0,0 | 5 019 € | 8,0 |
| Classique 3, sélection stricte | 30 | 23 | 15 | 11 | 0,0 | 0,0 | -694 € | 5,4 |
| Feutrée, 4 | 20 | 22 | 23 | 13 | 0,3 (portrait 3) | 0,0 | 5 681 € | 7,0 |
| Classique 3, relations entretenues (cible 10) | 8 | 23 | 22 | 16 | 0,0 | 3,0 | 4 650 € | 8,2 |
| Laxiste, relations entretenues (cible 10) | -56 | 18 | 18 | 15 | 1,2 (petition 11, portrait 1) | 7,4 | 4 389 € | 8,9 |
| Classique 3, relations soignées (cible 45) | 30 | 45 | 29 | 34 | 1,8 (feteVoisins 5, conseilEchevin 11, agentQuartier 1, portrait 1) | 14,1 | 2 914 € | 8,5 |

- **Le style de la maison se lit dans le quartier** : porte laxiste, voisins à −88 et une pétition presque à chaque partie ; porte stricte, voisins à +30 et aucune plainte ; soirée feutrée, une presse plus chaleureuse (+23) et quelques portraits.
- **Soigner ses relations coûte** : environ 2 600 € sur le deuxième mois pour le soigneur, qui obtient la mairie en bons termes et près de deux opportunités par mois (le conseil de l'échevin surtout). L'entretien léger (3 actions par mois) coûte peu et évite les ennuis.
- **Le premier mois ne change pas** : les tableaux sur 28 nuits sont identiques à ceux de la partie 1.
- **La porte stricte s'appauvrit au deuxième mois** (−694 € à la nuit 56, le portier coûte 80 € par soir) : ce n'est pas un effet des relations, à reprendre au rééquilibrage final.

### Gardes (`equilibrage-quartier.test.ts`, joueur attentif, 10 graines, 56 nuits)

- Porte laxiste : voisins en mauvais termes dans au moins 5 parties sur 10 (6 mesurées), une pétition dans au moins 4 (9 mesurées). Le joueur attentif fait rentrer les groupes bruyants dès l'alerte : il finit à −44 en moyenne, un joueur distrait à −88.
- Porte stricte : voisins à +20 au moins en moyenne (+24), jamais de pétition.
- Classique : entre les deux (−25), à plus de 15 points de la porte laxiste.
- Soigneur : mairie en bons termes dans au moins 5 parties sur 10, au moins une opportunité par partie, pour un coût de 500 à 5 000 € (4 000 € mesurés avec un joueur qui dit oui à tout).
- Sans rien faire, mairie et police restent dans la zone neutre. La presse, elle, suit les choix : le joueur simulé qui accepte toujours les journalistes finit adoré (+67).

### Dans le navigateur (vite preview, 844 × 390 et 667 × 375)

- Une partie à la nuit 27 : bilan de la semaine, fin du mois 1, puis la carte « Palier 3 : Tenir la maison » présentée par Josée ; l'onglet Relations montre les quatre jauges (lignes de 59 px) ; la fiche des voisins montre services, ennuis et actions (boutons de 45 px au moins) ; une action se paie, se note au journal et se verrouille jusqu'à la semaine suivante.
- Une sauvegarde de la v0.4 (version 20) au jour 30, mensualité payée : au chargement, fin du mois, bilan de la semaine, puis la carte du palier 3 ; les voisins se souviennent de l'intrigue du voisin.
- La pétition s'affiche avec l'étiquette « Le quartier », trois choix lisibles en 667 × 375.
- Aucune erreur dans la console.

### À surveiller

- **Les événements du quartier restent rares sans action du joueur** (0,5 par partie au deuxième mois en classique) : les cartes du quartier de la partie 5, hors seuils, doivent nourrir les soirées.
- **Le prix des actions** : 4 000 à 5 000 € pour tout porter au-dessus de +40, pour des services modestes. À juger en jouant, et à revoir quand la rivale et la visibilité arriveront.
- **La presse** monte vite chez un joueur qui accepte tous les journalistes.


## La rivale : le Chat Noir (v0.5, partie 3)

Le Chat Noir s'ouvre avec le palier 3 (drapeau `rivale`), se présente au premier lundi par une carte de visite, puis agit chaque lundi. Valeurs dans `RIVALE` et `RIVALE_ARGENT` (`balance.ts`), textes et cartes dans `src/content/rivale.ts`, moteur dans `src/engine/rivale.ts` (générateur à part, `hasardRivale`).

### Son humeur

- **Cible d'agressivité** : (réputation − 30) × 2 + part des habitués et des clients d'affaires reçus ces 7 dernières nuits × 60, bornée entre 0 et 100. Chaque lundi, l'agressivité fait la moitié du chemin.
- **Chance d'agir un lundi** : agressivité / 100 × 1,2. À 0,9 (premier essai), le joueur classique ne voyait que 1,5 coup au deuxième mois.
- **Coups possibles** (poids, agressivité minimale) : prix cassés (3, dès 0), rumeur (3, dès 20), faux client (2, dès 50), débauchage (2, dès 40, un par mois au plus, s'il reste une place d'intrigue et une cible). En trêve, rien ; en bons rapports (+40), une main tendue une fois sur deux.

### Mesures (10 graines, 56 nuits, cartes tranchées au hasard)

| Stratégie (56 nuits) | Agressivité, nuit 56 | Rapports | Coups par partie, mois 2 (total sur les parties) | Faux clients par partie | Débauchages (dénouements) | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 58 | 4 | 2,1 (rumeur 10, debauchage 1, sabotage 8, prix 2) | 0,8 | 1 (fidele 1) | 4 383 € |
| Classique 3, sélection laxiste | 54 | 4 | 1,6 (rumeur 9, debauchage 2, sabotage 3, prix 2) | 0,3 | 2 (reste 1, fidele 1) | 5 449 € |
| Classique 3, sélection stricte | 72 | -7 | 2,1 (rumeur 12, debauchage 2, sabotage 6, prix 1) | 0,6 | 2 (reste 2) | -138 € |
| Feutrée, 4 | 87 | 1 | 2,7 (rumeur 8, prix 7, debauchage 3, sabotage 9) | 0,9 | 3 (reste 3) | 4 022 € |
| Classique 3, trêve dès que possible | 47 | 15 | 1,1 (rumeur 6, sabotage 3, prix 2) | 0,3 | 0 | 3 930 € |
| Classique 3, riposte par rumeur | 75 | -29 | 2,3 (rumeur 10, prix 3, sabotage 7, debauchage 3) | 0,7 | 3 (reste 1, fidele 2) | 4 901 € |

- **Elle frappe là où on lui prend quelque chose** : la soirée feutrée, qui vit de ses habitués, la met en guerre (87), la porte laxiste (touristes et groupes) la laisse sur ses gardes (54). Coups au deuxième mois : 2,7 en soirée feutrée, 1,6 en porte laxiste.
- **Elle coûte** : environ 1 100 € sur le deuxième mois en classique (avoir de 5 547 € en partie 2, 4 383 € aujourd'hui), 1 650 € en soirée feutrée.
- **Répondre change la suite** : la trêve la calme (47) et divise ses coups par deux, pour environ 450 € de dîners ; la riposte par rumeur la met en colère (75, rapports −29).
- **Le débauchage échoue souvent** : un joueur qui soigne son équipe voit sa personne décliner d'elle-même (« reste »). Le départ au Chat Noir n'arrive que si le moral ou la loyauté ont flanché (sous 45 ou 50).

### Gardes (`equilibrage-quartier.test.ts`, joueur attentif, 10 graines, 56 nuits)

- Elle se présente dans chaque partie, puis frappe de 1,5 à 4 fois au deuxième mois (2,3 mesurés en classique).
- Soirée feutrée : au moins 15 points d'agressivité de plus que la porte laxiste (90 contre 70).
- Trêve : au moins 5 points d'agressivité de moins que sans réponse, et moins de coups (0,9 contre 2,3).

### Dans le navigateur (vite preview, 844 × 390 et 667 × 375)

Une partie de la nuit 27 (sauvegarde v21, migrée) : fin du mois, palier 3 (qui annonce le Chat Noir), puis au lundi 29 le bilan de la semaine (« Le Chat Noir · Une carte de visite ») et, à 11 h, la carte « Une carte de visite noire ». L'enseigne du Chat Noir s'allume sur la façade voisine. L'onglet Relations montre « La concurrence » sous les acteurs ; la fiche présente Colette Vos, son humeur, vos rapports, et les trois réponses (63 % de chances de trêve au départ). Un faux client apparaît en soirée : bulle au chat noir devant la porte, carte à deux actions. Aucune erreur dans la console.

### À surveiller

- **La soirée feutrée n'est pas plus animée le soir** : la rivale joue surtout le lundi, en journée, et son seul coup du soir (le faux client) sort moins d'une fois par mois. Les cartes du quartier de la partie 5 doivent porter le soir.
- **La porte stricte s'appauvrit toujours** au deuxième mois (−138 € à la nuit 56) : à reprendre au rééquilibrage final.
- **Le débauchage** : rare et souvent sans suite pour un joueur attentif. À juger en jouant ; on peut abaisser les seuils de fragilité si l'histoire manque.


## Équipes Accueil et Sécurité, et assurance (v0.5, partie 4)

Les équipes s'ouvrent au palier 3 (drapeaux `accueil` et `securite`), l'assurance au premier lundi suivant (drapeau `assurance`, présentée au bilan du lundi). Valeurs dans `EQUIPES` et `ASSURANCES` (`balance.ts`), moteur dans `src/engine/equipes.ts`.

### Réglages

- **Accueil** (100 € par jour et par personne, 2 au plus) : 12 minutes de patience sur le quai par personne ; règle seule 30 % des clients pressés et des groupes bruyants par personne.
- **Sécurité** (130 €, 2 au plus) : −20 % de disputes par personne, +0,02 de qualité ressentie pour les clients d'affaires ; règle seule 30 % des clients éméchés, photographes, faux clients et disputes par personne ; la porte stricte n'a plus besoin de portier.
- Une alerte réglée seule ne coûte rien et ne donne pas de bulle ; le journal le raconte. Sans équipe, rien n'est tiré au hasard : les parties sans équipe ne bifurquent pas.
- Premier essai : l'Accueil ajoutait aussi 0,02 de qualité aux touristes. Retiré : la réputation gagnée par une équipe (+6 à +7 points au deuxième mois) venait surtout des alertes réglées et des clients moins souvent perdus, et le bonus brouillait la lecture.
- **Assurance** : casse (80 € par semaine, 70 % de la casse remboursée) ; casse et amendes (200 €, tout remboursé). Casse : dispute qui dégénère, tireuse en panne. Amendes : inspection sanitaire, inspecteur, inspection surprise, condamnation dans l'affaire du voisin.

### Mesures (10 graines, 56 nuits, cartes tranchées au hasard)

| Stratégie (56 nuits) | Alertes par soirée, nuits 36 à 56 | Décisions par soirée | Clients perdus, semaine 6 | Réputation, nuit 56 | Primes / remboursements d’assurance | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 7,1 | 8,5 | 18,0 | 47 | — | 4 383 € |
| Classique 3, accueil 1 | 6,4 | 7,8 | 12,3 | 54 | — | 1 451 € |
| Classique 3, sécurité 1 | 6,1 | 7,5 | 13,9 | 54 | — | 1 686 € |
| Classique 3, accueil 1 et sécurité 1 | 6,8 | 8,2 | 21,6 | 53 | — | -662 € |
| Classique 3, accueil 2 et sécurité 2 | 5,6 | 7,0 | 22,5 | 56 | — | -6 628 € |
| Classique 3, sélection stricte | 4,5 | 6,0 | 10,6 | 51 | — | -138 € |
| Classique 3, sélection stricte, sécurité 1 | 3,9 | 5,4 | 7,9 | 51 | — | -503 € |
| Classique 3, assurance casse | 7,1 | 8,5 | 18,0 | 47 | 160 € / 21 € | 4 172 € |
| Classique 3, assurance casse et amendes | 7,1 | 8,5 | 18,0 | 47 | 400 € / 185 € | 3 977 € |

- **Une équipe règle une alerte sur dix de la soirée** (7,1 → 6,1 à 6,4 alertes) et fait perdre bien moins de clients, pour environ 2 700 à 2 900 € sur le deuxième mois : l'essentiel de la marge d'un joueur distrait.
- **Deux équipes à deux personnes** mettent la maison dans le rouge (−6 600 € à la nuit 56) : c'est le mur.
- **La sécurité ne sauve pas la porte stricte** : elle économise le portier (80 € par soir) mais coûte 130 € par jour.
- **L'assurance coûte plus qu'elle ne rapporte** en moyenne (400 € de primes pour 185 € remboursés sur les deux semaines bouclées, casse et amendes) : c'est une protection contre le mauvais sort (une condamnation à 800 €), pas un placement.

### Gardes (`equilibrage-quartier.test.ts`, joueur attentif)

- Une équipe Accueil et une équipe Sécurité : au moins 0,5 alerte de moins par soirée, et plus de 60 % des alertes restent (7,5 contre 8,7).
- Une équipe coûte 1 500 à 4 000 € sur le deuxième mois (2 100 € mesurés), deux davantage (5 200 €).
- Assurance casse et amendes : des remboursements, mais moins que les primes (2 700 € pour 4 000 € sur 10 parties).

### Dans le navigateur (vite preview, 844 × 390)

Une partie de la nuit 27 : au lundi 29, le bilan de la semaine annonce l'assurance avec l'avis de Josée ; l'onglet Personnel montre « Équipes de la maison » (boutons de 40 px) ; une personne à l'Accueil et une à la Sécurité apparaissent de part et d'autre de la porte le soir ; l'onglet Finances propose les trois crans d'assurance, avec l'effet et l'avis de Josée. Aucune erreur dans la console.

### À surveiller

- **Le prix des équipes** : 100 et 130 € par jour, c'est lourd face à une marge de 4 000 à 8 000 € au deuxième mois. À juger au téléphone : est-ce que le calme acheté vaut son prix ?
- **La réputation** monte de 6 à 7 points avec une équipe : le palier 4 (réputation 50) pourrait arriver plus tôt en v0.6.
- **L'assurance** : utile surtout avec une porte laxiste, la rivale en guerre ou une mairie fâchée ; les imprévus du quartier (partie 5) lui donneront plus d'occasions de servir.


## Visibilité et cartes du quartier (v0.5, partie 5)

Objectif : deux imprévus par soirée (1,3 à 1,5 en v0.4), et des soirées feutrées ou à porte stricte qui ne soient plus creuses (4,6 décisions et 40 % de soirées calmes en v0.4).

### Ce qui a été ajouté

- **Quinze imprévus** (`src/content/imprevusQuartier.ts`), dont quatre sans palier 3 (panne de courant, pianiste, départ à la retraite d'un habitué, célébrité refoulée par le portier) et onze liés au quartier, à la rivale ou à la visibilité. Dix préfèrent la soirée feutrée (nouveau bonus `offre`), deux la porte stricte. Neuf sur quinze sont des opportunités.
- **Deux alertes** (`ALERTES_QUARTIER`) : une journaliste sur le quai (0,06 par heure, trois fois plus chez une maison chic) et un voisin à sa fenêtre (tapage d'au moins 35, voisins à −10 ou moins, 0,2 par heure). L'Accueil en règle une part.
- **La visibilité** (`VISIBILITES`), au deuxième lundi après le palier 3.

### Réglages en cours de route

- **Le voisin à sa fenêtre** tombait 1,7 fois par soirée avec la porte laxiste (seuil de tapage 30, voisins sous 0, 0,5 par heure). Ramené à 0,5.
- **La journaliste** ne venait pas assez chez les maisons chic (0,15 par soirée feutrée) : elle n'exige plus de clients sur le quai (1,3 par soirée feutrée, 0,5 en classique). Ses gains de presse sont réduits (+1 et +2 au lieu de +3 et +5) : le joueur qui répondait à chaque fois finissait adoré (+90).
- **Les premières réponses étaient trop généreuses** : le joueur simulé prudent, qui prend toujours le premier choix, gagnait 7 points de réputation au premier mois (48 → 56 à la nuit 28) et la rivale saturait à 100 d'agressivité pour toutes les stratégies. Bougies, pianiste, retraite, fleuriste et chroniqueur rapportent moins et coûtent quelque chose ailleurs.
- **Les gardes du quartier** (`equilibrage-quartier.test.ts`) jouent désormais au hasard, comme le rapport : un joueur qui dit toujours oui n'est pas le bon étalon d'un quartier qui réagit aux choix.

### Mesures (10 graines, cartes tranchées au hasard)

Premier mois (28 nuits) :

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 6,8 | 21 % | 5,1 | 1,6 | 19,8 | 3,8 | 0 % | 13,0 | 4 sur 10, nuit 21 | 11 sur 20 | 6 sur 10 |
| Feutrée, 4 | 5,2 | 33 % | 3,4 | 1,6 | 20,0 | 4,0 | 0 % | 14,1 | 1 sur 10, nuit 26 | 16 sur 20 | 10 sur 10 |
| Adaptatif (suit les tendances), 3 | 6,0 | 21 % | 4,2 | 1,7 | 24,0 | 3,7 | 0 % | 13,1 | 2 sur 10, nuit 16 | 11 sur 20 | 5 sur 10 |
| Classique 3, sélection laxiste | 8,4 | 14 % | 6,5 | 1,7 | 21,3 | 3,8 | 0 % | 15,6 | 10 sur 10, nuit 11 | 10 sur 20 | 3 sur 10 |
| Classique 3, sélection stricte | 5,3 | 31 % | 3,4 | 1,8 | 21,6 | 3,9 | 0 % | 13,1 | 0 sur 10 | 11 sur 20 | 5 sur 10 |

Deuxième mois :

| Stratégie (nuits 36 à 56) | Imprévus par soirée | Alertes par soirée | Décisions par soirée | Soirées sous 4 décisions | Imprévus différents (mois 2) | Presse / voisins, nuit 56 | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 2,13 | 7,4 | 9,6 | 8 % | 22,1 | 25 / 1 | 4 704 € |
| Feutrée, 4 | 2,04 | 6,5 | 8,6 | 8 % | 21,9 | 40 / 21 | 5 043 € |
| Classique 3, sélection stricte | 2,03 | 5,6 | 7,7 | 11 % | 23,6 | 30 / 38 | -548 € |
| Classique 3, sélection laxiste | 1,97 | 7,6 | 9,7 | 8 % | 22,3 | 21 / -61 | 5 536 € |
| Classique 3, site discret | 2,12 | 8,8 | 11,0 | 4 % | 22,1 | 17 / -6 | 5 260 € |
| Classique 3, concierges d’hôtel | 2,10 | 9,1 | 11,3 | 4 % | 23,4 | 18 / 7 | 3 994 € |
| Classique 3, influenceurs | 2,09 | 10,1 | 12,3 | 1 % | 22,8 | 28 / -37 | 3 808 € |

- **Deux imprévus par soirée au deuxième mois** (2,0 à 2,1 selon les stratégies), 1,6 à 1,8 au premier mois ; 22 imprévus différents au deuxième mois.
- **La soirée feutrée passe de 6,0 à 8,6 décisions** au deuxième mois (8 % de soirées calmes), la porte stricte de 6,0 à 7,7 (11 %). Au premier mois, elles restent les plus calmes (5,2 et 5,3 décisions, un tiers de soirées calmes) : c'est leur caractère tant que le quartier ne s'est pas ouvert.
- **La visibilité** : le site discret rapporte (+550 € sur le mois, un peu plus d'alertes), les concierges et les influenceurs coûtent (−700 et −900 €) et remplissent le quai (9 et 10 alertes par soirée) ; les influenceurs fâchent les voisins (−37).

### Gardes

- `equilibrage-quartier.test.ts` : au moins 1,8 imprévu par soirée aux nuits 36 à 56 (classique, feutrée, stricte) ; au moins 5,5 décisions et au plus 30 % de soirées calmes pour la soirée feutrée et la porte stricte ; au plus 10 alertes par soirée avec la porte laxiste.
- `equilibrage-renouvellement.test.ts` (joueur prudent, premier mois) tient toujours : moins de 8 alertes par soirée en classique, au moins 5 décisions.

### Dans le navigateur (vite preview, 844 × 390 et 667 × 375)

Une partie du jour 35 au palier 3 : le bilan du lundi 36 annonce la visibilité avec l'avis de Josée ; les règles de la maison proposent les quatre crans (boutons de 40 px) ; les soirs suivants, « Un déçu du Chat Noir », « Panne de courant », « Un pianiste de passage », « Un compteur de clients », et la bulle de la journaliste devant la vitrine. Aucune erreur dans la console.

### À surveiller

- **Le deuxième mois est chargé** : 7 à 10 alertes par soirée selon la maison (5 au premier mois). Intense à ×1 en 3 minutes : c'est la question du rééquilibrage final.
- **La porte stricte s'appauvrit toujours** (−550 € à la nuit 56).
- **Le site discret** est presque toujours rentable : à surveiller s'il devient le choix évident.


## Rééquilibrage final (v0.5, partie 6)

### Ce qui a été réglé

| Valeur | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| `ALERTES.ivre.chance` | 0,7 | 0,55 | Le deuxième mois montait à 7,4 alertes par soirée en classique (joueur au hasard), 8,4 porte laxiste. Cible : 5 à 6. |
| `ALERTES.bouteille.chance` | 0,3 | 0,22 | Idem : 1,2 bouteille à servir par soirée au deuxième mois. |
| `ALERTES.photographe.chance` | 0,5 | 0,4 | Idem. |
| Portier de la porte stricte (`SELECTIONS.stricte.cout`) | 80 € | 50 € | La porte stricte finissait le deuxième mois dans le rouge (−790 € à la nuit 56). |
| Salaire de l'Accueil | 100 € | 70 € | Une équipe coûtait tout le résultat du deuxième mois (2 700 à 3 600 €) pour un peu de calme. |
| Salaire de la Sécurité | 130 € | 90 € | Idem ; avec la porte stricte, elle se paie désormais (le portier est inclus). |
| Visibilité : site / concierges / influenceurs | 35 / 70 / 55 € | 30 / 50 / 40 € | Aucune ne rapportait ; elles rapportent maintenant quand la maison a de la place (soirée feutrée : +400 € avec le site discret), et coûtent quand elle est déjà pleine. |

### Mesures finales (10 graines, joueur au hasard sauf le premier tableau)

Premier mois (joueur prudent) :

| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 4 à 4 | 32 / 41 / 52 | 94 € | 763 € | 2 510 € | 17 % | 95 | 0,0 | 26 / 30 / 14 / 30 | 69 / 54 / 32 / 48 |
| Classique, 4 | 3 à 4 | 32 / 42 / 54 | 379 € | 1 040 € | 4 859 € | 8 % | 89 | 0,0 | 29 / 27 / 15 / 29 | 71 / 57 / 33 / 51 |
| Happy hour, 4 | 3 à 3 | 36 / 45 / 55 | 136 € | 767 € | 2 063 € | 22 % | 89 | 0,4 | 38 / 25 / 13 / 24 | 76 / 57 / 35 / 49 |
| Feutrée, 4 | 3 à 4 | 34 / 45 / 57 | 113 € | 745 € | 2 261 € | 1 % | 92 | 0,0 | 19 / 42 / 12 / 27 | 69 / 64 / 36 / 56 |
| Adaptatif (suit les tendances), 3 | 4 à 4 | 32 / 43 / 53 | 94 € | 758 € | 4 180 € | 10 % | 95 | 0,0 | 23 / 37 / 15 / 25 | 61 / 58 / 40 / 48 |
| Classique 3, sans bar | 4 à 4 | 32 / 41 / 51 | 201 € | 664 € | 2 707 € | 19 % | 94 | 0,0 | 26 / 31 / 14 / 29 | 67 / 54 / 30 / 47 |
| Classique 3, bar à 2, sans avance | 4 à 4 | 32 / 42 / 52 | 13 € | 766 € | 914 € | 17 % | 95 | 0,0 | 26 / 30 / 14 / 30 | 68 / 54 / 33 / 48 |
| Classique 3, champagne | 4 à 4 | 32 / 40 / 46 | 174 € | 841 € | 3 933 € | 17 % | 96 | 0,0 | 24 / 30 / 16 / 30 | 55 / 49 / 32 / 45 |
| Classique 3, tarif −20 % | 4 à 4 | 33 / 42 / 53 | 0 € | 499 € | 113 € | 30 % | 92 | 0,0 | 30 / 28 / 12 / 30 | 73 / 57 / 30 / 49 |
| Classique 3, tarif +20 % | 4 à 4 | 30 / 37 / 44 | 294 € | 948 € | 4 416 € | 13 % | 94 | 0,0 | 22 / 29 / 14 / 34 | 50 / 50 / 34 / 40 |
| Classique 3, formule courte | 4 à 4 | 32 / 42 / 53 | 94 € | 600 € | 1 073 € | 14 % | 92 | 0,0 | 27 / 24 / 19 / 29 | 68 / 51 / 39 / 51 |
| Classique 3, soirée complète | 4 à 4 | 31 / 39 / 47 | 356 € | 981 € | 5 267 € | 22 % | 92 | 0,0 | 26 / 34 / 7 / 33 | 64 / 52 / 23 / 43 |
| Classique 3, sélection laxiste | 4 à 4 | 31 / 41 / 51 | 164 € | 802 € | 2 660 € | 13 % | 91 | 0,0 | 27 / 26 / 15 / 32 | 71 / 51 / 32 / 49 |
| Classique 3, sélection stricte | 4 à 4 | 31 / 41 / 51 | 31 € | 591 € | 1 780 € | 8 % | 94 | 0,0 | 27 / 38 / 19 / 16 | 63 / 60 / 37 / 38 |
| Classique 3, habitués d’abord | 4 à 4 | 32 / 42 / 53 | 119 € | 768 € | 3 517 € | 21 % | 92 | 0,0 | 27 / 31 / 14 / 28 | 70 / 56 / 32 / 48 |
| Classique 3, pressés d’abord | 4 à 4 | 32 / 42 / 51 | 99 € | 748 € | 2 210 € | 17 % | 94 | 0,0 | 25 / 31 / 15 / 29 | 67 / 53 / 33 / 48 |
| Passif (classique, sans recruter ni rénover) | 11 à 27 | 23 / 24 / 26 | -132 € | 190 € | -1 405 € | 62 % | 51 | 0,0 | 44 / 49 / 4 / 3 | 29 / 29 / 19 / 24 |

Renouvellement du premier mois :

| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 6,3 | 21 % | 4,5 | 1,6 | 20,0 | 3,9 | 0 % | 13,3 | 5 sur 10, nuit 18 | 9 sur 20 | 7 sur 10 |
| Feutrée, 4 | 4,8 | 39 % | 3,1 | 1,6 | 19,7 | 3,9 | 0 % | 14,2 | 0 sur 10 | 16 sur 20 | 10 sur 10 |
| Adaptatif (suit les tendances), 3 | 5,3 | 29 % | 3,5 | 1,7 | 22,5 | 3,9 | 0 % | 12,9 | 0 sur 10 | 13 sur 20 | 10 sur 10 |
| Classique 3, sélection laxiste | 7,1 | 20 % | 5,2 | 1,7 | 21,5 | 3,8 | 0 % | 15,7 | 10 sur 10, nuit 10 | 11 sur 20 | 5 sur 10 |
| Classique 3, sélection stricte | 5,8 | 26 % | 3,8 | 1,8 | 21,8 | 4,0 | 0 % | 12,8 | 0 sur 10 | 14 sur 20 | 4 sur 10 |

Le deuxième mois, soirée par soirée :

| Stratégie (nuits 36 à 56) | Imprévus par soirée | Alertes par soirée | Décisions par soirée | Soirées sous 4 décisions | Imprévus différents (mois 2) | Presse / voisins, nuit 56 | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 2,14 | 6,5 | 8,8 | 10 % | 22,0 | 27 / 17 | 4 416 € |
| Feutrée, 4 | 2,04 | 5,8 | 7,9 | 9 % | 22,2 | 41 / 22 | 4 976 € |
| Classique 3, sélection stricte | 2,07 | 5,4 | 7,5 | 9 % | 23,5 | 28 / 36 | 1 076 € |
| Classique 3, sélection laxiste | 2,04 | 7,6 | 9,7 | 12 % | 22,6 | 16 / -33 | 4 321 € |
| Classique 3, site discret | 2,13 | 7,7 | 9,9 | 7 % | 22,1 | 21 / 4 | 3 830 € |
| Classique 3, concierges d’hôtel | 2,08 | 7,6 | 9,7 | 9 % | 23,0 | 22 / 10 | 3 564 € |
| Classique 3, influenceurs | 2,09 | 9,7 | 11,9 | 8 % | 22,7 | 27 / -24 | 3 327 € |

Équipes et assurance :

| Stratégie (56 nuits) | Alertes par soirée, nuits 36 à 56 | Décisions par soirée | Clients perdus, semaine 6 | Réputation, nuit 56 | Primes / remboursements d’assurance | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 6,5 | 8,8 | 15,8 | 53 | — | 4 416 € |
| Classique 3, accueil 1 | 6,7 | 8,9 | 22,1 | 52 | — | 2 597 € |
| Classique 3, sécurité 1 | 5,7 | 7,9 | 17,7 | 54 | — | 1 801 € |
| Classique 3, accueil 1 et sécurité 1 | 5,1 | 7,2 | 12,2 | 56 | — | -119 € |
| Classique 3, accueil 2 et sécurité 2 | 5,1 | 7,3 | 11,3 | 56 | — | -3 465 € |
| Classique 3, sélection stricte | 5,4 | 7,5 | 8,4 | 51 | — | 1 076 € |
| Classique 3, sélection stricte, sécurité 1 | 5,6 | 7,8 | 12,9 | 50 | — | 1 785 € |
| Classique 3, assurance casse | 6,5 | 8,8 | 15,8 | 53 | 160 € / 67 € | 4 273 € |
| Classique 3, assurance casse et amendes | 6,5 | 8,8 | 15,8 | 53 | 400 € / 171 € | 4 059 € |

La rivale :

| Stratégie (56 nuits) | Agressivité, nuit 56 | Rapports | Coups par partie, mois 2 (total sur les parties) | Faux clients par partie | Débauchages (dénouements) | Avoir, nuit 56 |
| --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 73 | -1 | 2,4 (rumeur 15, debauchage 2, sabotage 6, prix 1) | 0,6 | 2 (reste 1, riposte 1) | 4 416 € |
| Classique 3, sélection laxiste | 61 | -2 | 2,1 (rumeur 10, debauchage 2, sabotage 7, prix 2) | 0,7 | 2 (riposte 1, reste 1) | 4 321 € |
| Classique 3, sélection stricte | 70 | 9 | 2,1 (rumeur 10, debauchage 3, sabotage 6, prix 2) | 0,6 | 3 (reste 2, fidele 1) | 1 076 € |
| Feutrée, 4 | 93 | -2 | 2,9 (rumeur 13, debauchage 4, sabotage 7, prix 5) | 0,7 | 4 (reste 4) | 4 976 € |
| Classique 3, trêve dès que possible | 51 | 16 | 1,5 (debauchage 1, rumeur 7, sabotage 4, prix 3) | 0,4 | 1 (reste 1) | 3 867 € |
| Classique 3, riposte par rumeur | 84 | -26 | 2,6 (rumeur 10, prix 5, debauchage 4, sabotage 7) | 0,7 | 4 (reste 2, fidele 1, partie 1) | 4 250 € |

Les relations :

| Stratégie (56 nuits) | Voisins | Mairie | Presse | Police | Événements du quartier par partie, mois 2 (total sur les parties) | Actions de relations par partie, mois 2 | Avoir, nuit 56 | Décisions par soirée, mois 2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classique, 3 | 17 | 28 | 27 | 20 | 0,5 (feteVoisins 1, portrait 4) | 0,0 | 4 416 € | 8,5 |
| Classique 3, sélection laxiste | -33 | 19 | 16 | 1 | 0,9 (petition 7, feteVoisins 2) | 0,0 | 4 321 € | 9,1 |
| Classique 3, sélection stricte | 36 | 26 | 28 | 14 | 0,5 (portrait 3, feteVoisins 2) | 0,0 | 1 076 € | 7,3 |
| Feutrée, 4 | 22 | 26 | 41 | 14 | 1,1 (portrait 10, feteVoisins 1) | 0,0 | 4 976 € | 7,7 |
| Classique 3, relations entretenues (cible 10) | 20 | 28 | 23 | 22 | 0,6 (portrait 2, conseilEchevin 1, feteVoisins 3) | 1,9 | 4 188 € | 9,1 |
| Laxiste, relations entretenues (cible 10) | -2 | 28 | 25 | 18 | 0,6 (petition 3, portrait 3) | 4,4 | 3 400 € | 8,1 |
| Classique 3, relations soignées (cible 45) | 29 | 45 | 37 | 31 | 3,4 (conseilEchevin 17, agentQuartier 3, feteVoisins 8, portrait 6) | 12,0 | 2 491 € | 9,3 |

### La question de la v0.5 : le quartier vit-il ?

Oui. Mesures au deuxième mois (nuits 29 à 56), 10 parties par stratégie, cartes tranchées au hasard :

| Stratégie (nuits 29 à 56) | Événements venus de dehors par semaine | Semaines sans | Voisins / mairie / presse / police, nuit 56 | Rivale : agressivité, coups au mois 2 | Décisions par soirée |
| --- | --- | --- | --- | --- | --- |
| Classique, 3 | 10,8 | 0 % | 17 / 28 / 27 / 20 | 73, 2,4 | 8,5 |
| Feutrée, 4 | 16,2 | 0 % | 22 / 26 / 41 / 14 | 93, 2,9 | 7,7 |
| Classique 3, sélection stricte | 14,9 | 0 % | 36 / 26 / 28 / 14 | 70, 2,1 | 7,3 |
| Classique 3, sélection laxiste | 12,5 | 0 % | -33 / 19 / 16 / 1 | 61, 2,1 | 9,1 |
| Classique 3, influenceurs | 11,5 | 0 % | -24 / 27 / 27 / 13 | 60, 2,1 | 10,8 |
| Classique 3, relations soignées et trêve | 10,8 | 0 % | 31 / 50 / 33 / 39 | 47, 1,3 | 9,5 |

- **Il se passe quelque chose chaque semaine** : 11 à 16 événements venus de dehors par semaine (cartes du quartier, cartes et coups du Chat Noir, imprévus du quartier, journaliste, voisin à sa fenêtre, faux client), et aucune semaine sans, pour toutes les stratégies.
- **Le quartier répond au style de la maison** : les voisins vont de −33 (porte laxiste, une pétition dans 7 parties sur 10) à +36 (porte stricte) ; la presse monte à +41 avec la soirée feutrée ; la police tombe à +1 avec la porte laxiste. Le joueur qui soigne ses relations met la mairie en bons termes (+50) et reçoit trois fois plus d'opportunités (conseil de l'échevin, fête des voisins, portrait).
- **La rivale frappe là où on la gêne** : en guerre contre la soirée feutrée (93), sur ses gardes face à la porte laxiste (61) ; deux à trois coups par mois ; une trêve la calme (47) et divise ses coups par deux ; la riposte l'enrage (84).
- **Les soirées calmes ne le sont plus** : au deuxième mois, la soirée feutrée passe de 4,6 décisions (v0.4) à 7,9, avec 9 % de soirées sous 4 décisions (42 % en v0.4) ; la porte stricte de 4,6 à 7,5 (9 %). Deux imprévus par soirée (1,3 à 1,5 en v0.4).
- **Le premier mois est préservé** : 4,5 alertes et 6,3 décisions par soirée en classique, palier 2 à la nuit 4, 2 500 € après la première mensualité (cible 0 à 4 000 €).

### Gardes à la fin de la v0.5

- `equilibrage-quartier.test.ts` (joueur au hasard, 56 nuits) : pétition et mauvais termes avec la porte laxiste ; voisins contents avec la porte stricte ; la rivale frappe 1,5 à 4 fois au deuxième mois, plus fort contre la soirée feutrée, moins en trêve ; les équipes règlent des alertes sans vider la soirée et coûtent 1 500 à 4 000 € par mois ; l'assurance rembourse moins qu'elle ne coûte ; au moins 1,8 imprévu et 5,5 décisions par soirée au deuxième mois ; au moins 5 événements venus de dehors par semaine, et aucune semaine sans.
- Les gardes du premier mois (renouvellement, mois, règles, semaine) tiennent toujours.

### Ce qui reste à surveiller (v0.6)

- **La densité du deuxième mois** : 6 à 10 alertes et 8 à 12 décisions par soirée de 3 minutes. À juger en main.
- **Le découvert** : le jour de la première mensualité, plusieurs stratégies passent sous −2 000 € (−900 € en moyenne au plus bas pour le joueur classique, −2 200 € avec la porte stricte). Les conséquences arrivent avec les finances complètes.
- **La réputation** dépasse 50 au deuxième mois (53 à la nuit 56 en classique, 64 en soirée feutrée) : le palier 4 (réputation 50 et 4 personnes) arrivera au deuxième mois.
- **Le débauchage** aboutit rarement à un départ (3 sur 18 tentatives en 70 nuits, 30 parties au hasard) : l'histoire existe, mais un joueur attentif la verra peu.
- **La journaliste** est fréquente en soirée feutrée (environ une par soirée) : si elle lasse, baisser `ALERTES_QUARTIER.journaliste.chic`.

### Partie jouée dans le navigateur (vite preview, 844 × 390)

Une partie du jour 20 au jour 46, à ×4 : cartes tranchées au hasard, une bulle touchée de temps en temps, ni équipe ni visibilité ni action de relation. Construite juste avant la baisse des salaires des équipes et du prix de la visibilité, que ce joueur n'utilise pas.

- Argent aux jours 20, 28, 36, 46 : 636 €, 2 011 €, 982 €, 1 941 € ; réputation 35, 37, 40, 39.
- Enchaînement attendu : fin du mois 1, palier 3, carte de visite du Chat Noir au lundi 29, bilans du lundi.
- 70 cartes différentes en 26 soirées : rumeur et prix cassés du Chat Noir, compteur de clients, colis noir, ronde de l'agent Visser, voisine en peignoir, échevin en goguette, chroniqueur au bar, fleuriste, panne de courant, pianiste, voisin à sa fenêtre…
- Au jour 46, sans rien soigner : voisins −14 (en froid), mairie +33, presse −18.
- Aucune erreur dans la console.

## Finances et aménagement (v0.6)

### Le linge en parures (partie 1b)

Le linge se compte en parures, une par rendez-vous, au lieu de 10 draps par rendez-vous. Les montants ne changent pas : l'ancien stock de 40 draps vaut 4 parures, l'ancienne commande (50 draps, 60 €) devient le pack de 5 parures, soit 12 € la parure.

| Achat | Parures | Prix | Par parure |
| --- | --- | --- | --- |
| Pack au briefing | 5 | 60 € | 12 € |
| Pack au briefing | 10 | 110 € | 11 € |
| Pack au briefing | 20 | 200 € | 10 € |
| Commande automatique | ce qui manque | au tarif du plus gros pack atteint | 10 à 12 € |
| Livraison express en soirée | 5 | 90 € | 18 € |

- Une parure coûte 4 à 5 % de la recette d'un rendez-vous (environ 240 € en moyenne au premier mois) : le linge reste un poste mineur, que le gros pack allège d'environ 2 € par rendez-vous.
- Une maison à 4 personnes et 4 rendez-vous chacune use 16 parures par nuit : la commande automatique à 20 revient à environ 160 à 180 € par soir, contre environ 190 € au tarif du pack de 5 et près de 290 € en express.
- Le joueur simulé commande toujours un pack de 5 quand il lui reste moins de 4 parures, comme avant : toutes les mesures des versions précédentes restent valables.
