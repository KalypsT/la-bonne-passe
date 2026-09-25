# Notes d'équilibrage

Mesures faites avec le moteur (simulation, graines 1 à 5, nettoyage express dès l'alerte, linge commandé chaque soir).
Toutes les valeurs sont dans `src/content/balance.ts`.

## Réputation (v0.2, partie 1)

En v0.1, la réputation atteignait 25 dès la première nuit en soirée feutrée, et 50 à 60 en 4 nuits.

Réglage v0.2 :

- `REPUTATION_PAR_RDV` : 8 → 3,5 ;
- `REPUTATION_FREIN` = 2 : les gains sont multipliés par (1 − réputation / 100)², les pertes tombent en entier ;
- `REPUTATION_CLIENT_PERDU` : 0,2 → 0,15 (avec une seule hôtesse, les clients perdus sont structurels).

Réputation en fin de nuit, Sanne seule, départ à 15 :

| Offre | Nuit 1 | Nuit 3 | Nuit 7 |
| --- | --- | --- | --- |
| Soirée feutrée | 17 à 19 | 22 à 23 | 27 à 32 |
| Soirée classique | 14 à 17 | 15 à 21 | 18 à 24 |
| Happy hour | 14 à 17 | 12 à 17 | 11 à 18 |

Deux tests de `src/engine/paliers.test.ts` gardent la cible : pas de réputation 25 avant la nuit 4 avec Sanne seule, et une maison bien tenue qui progresse sur la semaine.

À revoir en partie 4, une fois l'équipe complète : plus de personnes et de chambres, donc plus de rendez-vous et moins de clients perdus. Le happy hour reste dominé tant que la maison manque de capacité.

## Personnel (v0.2, partie 3)

Valeurs dans `balance.ts`, sections « Personnel complet » :

- menace de départ sous 20 de moral, levée au-dessus de 30 ; 3 jours pour réagir (+2 pour une personne Fidèle, +1 si loyauté ≥ 70) ;
- un soir de repos : +8 de moral (+4 de plus pour un Solitaire) ;
- entretien : écouter +8, promettre +14 (−15 et −10 de loyauté si la promesse n'est pas tenue sous 3 jours), recadrer −8 mais +0,06 de qualité le soir même ;
- primes : 50 € (+8) ou 120 € (+18), une par semaine ;
- imprévus : 0,35 par heure, 75 minutes d'écart au moins, 3 par nuit au plus. Un test vérifie la moyenne, entre 1,2 et 3 par soirée.

À surveiller : une Diva sans chambre premium perd 4 de moral par nuit, et arrive à la menace de départ en une dizaine de nuits sans entretien ni prime.
