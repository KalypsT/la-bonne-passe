// Nouveautés arrivées avec une mise à jour du jeu, pour un palier déjà atteint.
// Une partie qui a déjà passé le palier les découvre au chargement, présentées par Josée.

export interface Nouveaute {
  id: string;
  palier: number;
  texte: string;
}

export const NOUVEAUTES: Nouveaute[] = [
  {
    id: 'clientele',
    palier: 2,
    texte: 'Onglet Clientèle : chaque segment a sa satisfaction, et ta réputation en est la moyenne.',
  },
  {
    id: 'regles',
    palier: 2,
    texte: 'Règles de la maison, dans l’onglet Clientèle : tarif, formule, sélection à l’entrée et priorité d’accueil.',
  },
  {
    id: 'bar',
    palier: 2,
    texte: 'Le bar peut rouvrir : 1 200 € et 8 h de travaux. Puis une équipe Bar, du stock, et la formule champagne.',
  },
  {
    id: 'themes',
    palier: 2,
    texte: 'Soirées à thème, au briefing : masquée, burlesque, jazz ou années folles. Chacune attire son monde.',
  },
];

export function trouverNouveaute(id: string): Nouveaute | undefined {
  return NOUVEAUTES.find((n) => n.id === id);
}

export const JOSEE_NOUVEAUTES =
  'Pendant ton absence, j’ai mis de l’ordre dans le carnet des clients. Une page par segment, et chacun ses caprices.';
