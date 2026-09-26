// Textes du palier 4, « Monter en gamme » (v0.6, partie 6) : confort, formations, placement, nouveau nom.

import type { EquipeFormable } from '../engine/gamme';

const NOMS_EQUIPES: Record<EquipeFormable, string> = { menage: 'le ménage', bar: 'le bar', accueil: 'l’accueil', securite: 'la sécurité' };

export const TEXTES_GAMME = {
  confort: {
    titre: 'Confort',
    niveaux: ['Simple', 'Confortable', 'De luxe, avec jacuzzi'],
    niveau: (n: number) => `Niveau ${n} sur 3`,
    effet: 'Chaque niveau ajoute de la qualité et se paie sur le prix du rendez-vous (+10 %). Le jacuzzi ravit VIP et couples.',
    ameliorer: (nom: string, prix: string, heures: number) => `Passer en « ${nom} » (${prix}, ${heures} h)`,
    jacuzziPremium: 'Le jacuzzi n’entre que dans une chambre premium (Velours, Miroirs).',
    maximum: 'Le confort est au maximum.',
    enCours: (nom: string) => `Travaux : passage en « ${nom} ».`,
    verrou: 'Le confort des chambres s’ouvre au palier 4, « Monter en gamme ».',
  },
  formation: {
    niveau: (n: number) => `Niveau ${n} sur 3`,
    former: (n: number, prix: string) => `Former au niveau ${n} (${prix})`,
    maximum: 'Équipe au niveau maximum.',
    effets: {
      menage: 'Chaque niveau : nettoyage et lavage 25 % plus rapides.',
      bar: 'Chaque niveau : un service plus soigné (+0,02 de qualité) et 10 % de recette en plus.',
      accueil: 'Chaque niveau : 10 points d’alertes réglées seules en plus, et 25 % de patience en plus sur le quai.',
      securite: 'Chaque niveau : 10 points d’alertes réglées seules en plus.',
    } as Record<EquipeFormable, string>,
  },
  placement: {
    titre: 'Placement de l’excédent',
    detail: 'Une somme bloquée 4 semaines. Prudent : +2 % assurés. Risqué : de −5 à +8 %, selon ce qui se passe en ville.',
    montant: 'Montant',
    prudent: 'Prudent',
    risque: 'Risqué',
    apercuPrudent: (gain: string, jour: number) => `Au jour ${jour}, tu récupères ta mise et ${gain}.`,
    apercuRisque: (min: string, max: string, jour: number) => `Au jour ${jour}, ta mise revient avec entre ${min} et ${max}.`,
    placer: (montant: string) => `Placer ${montant}`,
    enCours: (montant: string, profil: string, jour: number) => `${montant} placés (${profil.toLowerCase()}), de retour au jour ${jour}.`,
    josee: 'C’est Josée qui tient les comptes : pas de placement.',
    joseePrudent: 'De l’argent qui dort gagne un peu. C’est toujours mieux que de l’argent qui sort.',
    joseeRisque: 'Risqué ? La bourse, c’est comme le quai : il y a des soirs où tout le monde passe, et d’autres où il pleut.',
    joseeTrop: 'Ne place pas ce dont tu auras besoin pour la mensualité. Le banquier ne connaît pas le mot « bloqué ».',
    tropCher: 'Pas assez en caisse.',
  },
  renommer: {
    titre: 'Le nom de la maison',
    detail: (prix: string) => `Une nouvelle enseigne au néon : ${prix}. Une seule fois : le quartier s’y fera, pas deux.`,
    placeholder: 'Nouveau nom',
    valider: (prix: string) => `Changer l’enseigne (${prix})`,
    josee: 'Un nouveau nom, c’est une nouvelle histoire. Choisis-le comme un parfum : il doit tenir toute la nuit.',
  },
  journal: {
    travauxConfort: (deChambre: string, nom: string, montant: string) => `Travaux ${deChambre} : passage en « ${nom} » (${montant}).`,
    formation: (equipe: EquipeFormable, niveau: number, montant: string) => `Journée de formation pour ${NOMS_EQUIPES[equipe]} : niveau ${niveau} (${montant}).`,
    placement: (montant: string, profil: string, jour: number) => `${montant} placés (${profil.toLowerCase()}), jusqu’au jour ${jour}.`,
    finPlacementGain: (montant: string, gain: string) => `Le placement revient : ${montant}, et ${gain} de gain.`,
    finPlacementPerte: (montant: string, perte: string) => `Le placement revient : ${montant}, moins ${perte} de perte.`,
    renommer: (ancien: string, nom: string, montant: string) => `« ${ancien} » devient « ${nom} » : la nouvelle enseigne s’allume (${montant}).`,
  },
  ouvertures: {
    formations: {
      titre: 'Nouveau ce lundi : les formations des équipes, dans l’onglet Personnel.',
      josee: 'Une équipe qui sait ce qu’elle fait coûte le même salaire et rapporte davantage. Une journée de stage, et on n’en parle plus.',
    },
    placement: {
      titre: 'Nouveau ce lundi : le placement de l’excédent, dans l’onglet Finances.',
      josee: 'Quand la caisse déborde, on peut faire travailler l’argent quatre semaines. Prudemment, de préférence.',
    },
  },
};
