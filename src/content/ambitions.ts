// Ambitions : chaque personne a un rêve, affiché sur sa fiche. Il nourrit les arcs personnels.
// Voir « Personnages suivis » et « Histoires personnelles » dans les spécifications.
// Les textes acceptent l'accord {e} (« e » si la personne est une femme).

export interface Ambition {
  id: string;
  nom: string;
  /** Une phrase, dite par la personne. */
  texte: string;
}

export const AMBITIONS: Ambition[] = [
  { id: 'gerante', nom: 'Devenir gérant{e}', texte: '« Un jour, c’est moi qui ferai le planning. »' },
  { id: 'etudes', nom: 'Financer ses études', texte: '« Le droit, à distance. Les partiels ne se paient pas tout seuls. »' },
  { id: 'affiche', nom: 'Être la tête d’affiche', texte: '« Je veux qu’on vienne pour moi. Pas pour la maison. »' },
  { id: 'ibiza', nom: 'Partir une saison à Ibiza', texte: '« Le soleil, la mer, et des nuits qui finissent à midi. »' },
  { id: 'tatouage', nom: 'Ouvrir un salon de tatouage', texte: '« J’ai déjà le nom. Il me manque le reste. »' },
  { id: 'appartement', nom: 'Acheter un appartement sur le canal', texte: '« Avec une fenêtre sur l’eau. Et un verrou à moi. »' },
  { id: 'jazz', nom: 'Enregistrer un disque de jazz', texte: '« Je chante faux, paraît-il. Le jazz pardonne. »' },
];

/** Ambitions possibles pour les candidats du marché. */
export const AMBITIONS_DU_MARCHE = ['gerante', 'etudes', 'affiche', 'ibiza', 'tatouage', 'appartement', 'jazz'];

export function trouverAmbition(id: string): Ambition | undefined {
  return AMBITIONS.find((a) => a.id === id);
}
