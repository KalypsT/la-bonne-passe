// Paliers de montée en puissance (voir « Montée en puissance » dans les spécifications).

export interface DefinitionPalier {
  numero: number;
  nom: string;
  objectif: string;
  ouvre: string;
  /** Détail de ce qui s'ouvre, pour la carte d'annonce. */
  details?: string[];
}

export const PALIERS: DefinitionPalier[] = [
  { numero: 0, nom: 'Départ', objectif: '', ouvre: 'Sanne, le Boudoir, le salon et le bureau.' },
  {
    numero: 1,
    nom: 'Rouvrir',
    objectif: 'Boucler une première soirée.',
    ouvre: 'Recrutement, rénovation des chambres, planning du soir, réserve de sécurité.',
    details: [
      'Recrutement : des candidats vont passer dans la journée.',
      'Rénovation des chambres sous les draps : 900\u00a0€, 8\u00a0h de travaux.',
      'Une deuxième personne au ménage.',
      'Planning du soir, au briefing.',
      'Réserve de sécurité, dans l’onglet Finances.',
    ],
  },
  {
    numero: 2,
    nom: 'Se faire un nom',
    objectif: 'Atteindre 25 de réputation.',
    ouvre: 'Clients d’affaires et groupes, onglet Clientèle, règles de la maison.',
    details: [
      'Clients d’affaires : gros budgets, peu de patience. Ils veulent de l’audace, de la conversation ou de la discrétion.',
      'Groupes : ils arrivent à plusieurs, font la fête… et du bruit sur le quai. Une Fêtarde les attire.',
      'Onglet Clientèle : la satisfaction de chaque segment, et ce qui les fait revenir.',
      'Règles de la maison : tarif, formule, sélection à l’entrée et priorité d’accueil.',
      'Le bar peut rouvrir (1 200 €, 8 h de travaux) : une équipe Bar, du stock, la formule champagne.',
      'Dès lundi : les tendances de la semaine en ville, et les soirées à thème au briefing.',
    ],
  },
  {
    numero: 3,
    nom: 'Tenir la maison',
    objectif: 'Payer la première mensualité.',
    ouvre: 'Onglet Relations : voisins, mairie, presse et police.',
    details: [
      'Onglet Relations : les voisins, la mairie, la presse et la police, chacun avec sa jauge, de −100 à +100.',
      'En bons termes (au-dessus de +40), ils rendent service ; en mauvais termes (sous −40), les ennuis commencent.',
      'Une action par semaine et par acteur pour soigner la relation : une bouteille, un don, un déjeuner, un tournoi.',
      'Le quartier se manifeste : fête des voisins, pétition, inspection, portrait, fuite, contrôle.',
    ],
  },
  {
    numero: 4,
    nom: 'Monter en gamme',
    objectif: 'Réputation 50 et 4 personnes.',
    ouvre: 'VIP, formations, chambres de luxe, changement de nom de la maison (dans une prochaine version du jeu).',
  },
  {
    numero: 5,
    nom: 'S’agrandir',
    objectif: 'Réputation 70 et accord de la mairie.',
    ouvre: 'Agrandissement, gérantes, deuxième établissement.',
  },
];
