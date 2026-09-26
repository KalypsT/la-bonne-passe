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
      'Aménagement des chambres ouvertes : rafraîchir la déco, changer de décor, fermer pour un soir.',
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
      'La buanderie peut ouvrir (1 200 €, 8 h de travaux) : le linge se relave au lieu de s’acheter.',
      'Dès lundi : les tendances de la semaine en ville, et les soirées à thème au briefing.',
    ],
  },
  {
    numero: 3,
    nom: 'Tenir la maison',
    objectif: 'Payer la première mensualité.',
    ouvre: 'Onglet Relations et maison rivale, équipes Accueil et Sécurité, assurance.',
    details: [
      'Onglet Relations : les voisins, la mairie, la presse et la police, chacun avec sa jauge, de −100 à +100.',
      'En bons termes (au-dessus de +40), ils rendent service ; en mauvais termes (sous −40), les ennuis commencent.',
      'Une action par semaine et par acteur pour soigner la relation : une bouteille, un don, un déjeuner, un tournoi.',
      'Le quartier se manifeste : fête des voisins, pétition, inspection, portrait, fuite, contrôle.',
      'Le Chat Noir, la maison chic d’en face : dès lundi, Colette Vos réagit à ce que tu lui prends. Tu peux lui répondre.',
      'Équipes Accueil et Sécurité, dans l’onglet Personnel : elles règlent seules une partie des alertes du quai.',
      'Les loges du personnel peuvent ouvrir sous les combles (1 500 €, 10 h de travaux) : on s’y repose mieux.',
      'Dès lundi, l’assurance, dans l’onglet Finances.',
    ],
  },
  {
    numero: 4,
    nom: 'Monter en gamme',
    objectif: 'Réputation 60 et 4 personnes.',
    ouvre: 'VIP et couples curieux, confort des chambres et jacuzzi, formations, placement, nouveau nom.',
    details: [
      'VIP : gros budgets, peu nombreux. Ils veulent de la discrétion, une chambre premium, du confort, et fuient les incidents.',
      'Couples curieux : ils veulent de la conversation, un décor refait, une chambre impeccable.',
      'Règles de la maison : nouvelle priorité d’accueil, « VIP d’abord ».',
      'Confort des chambres, dans leur fiche : trois niveaux, et le jacuzzi dans les chambres premium.',
      'Le nom de la maison peut changer, dans la fiche du bureau : une nouvelle enseigne.',
      'Dès lundi : les formations des équipes ; le lundi suivant : le placement de l’excédent.',
    ],
  },
  {
    numero: 5,
    nom: 'S’agrandir',
    objectif: 'Réputation 80 et accord de la mairie : le dossier se dépose dans sa fiche (onglet Relations).',
    ouvre: 'Le bâtiment voisin et jusqu’à 8 personnes, la gérance, une deuxième maison.',
    details: [
      'Le bâtiment voisin, à droite de la maison : ses deux étages (2 chambres) ou tout le bâtiment (3 chambres), meublés. Touche-le dans la scène.',
      'Une fois agrandie, la maison peut accueillir jusqu’à 8 personnes.',
      'Dès lundi : la gérance, dans la fiche de chaque personne. Le lundi suivant : le projet d’une deuxième maison, dans la fiche du bureau.',
    ],
  },
];
