// Nouveautés arrivées avec une mise à jour du jeu, pour un palier déjà atteint.
// Une partie qui a déjà passé le palier les découvre au chargement, présentées par Josée.

import { TEXTES_BANQUE } from './banque';

export interface Nouveaute {
  id: string;
  palier: number;
  texte: string;
}

export const NOUVEAUTES: Nouveaute[] = [
  { id: 'impot', palier: 0, texte: TEXTES_BANQUE.nouveautes.impot },
  { id: 'gestionJosee', palier: 1, texte: TEXTES_BANQUE.nouveautes.gestionJosee },
  { id: 'fournisseurs', palier: 3, texte: TEXTES_BANQUE.nouveautes.fournisseurs },
  {
    id: 'emprunt',
    palier: 3,
    texte: TEXTES_BANQUE.nouveauteEmprunt,
  },
  {
    id: 'banque',
    palier: 0,
    texte: TEXTES_BANQUE.nouveaute,
  },
  {
    id: 'crans',
    palier: 1,
    texte:
      'Au briefing, jusqu’à 6 rendez-vous par personne. Je t’affiche la fatigue de fin de nuit de chacun. Au-delà de 4, le moral trinque ; et au 6, une personne fatiguée peut refuser ou négocier.',
  },
  {
    id: 'parures',
    palier: 0,
    texte:
      'Le linge se compte en parures : une par rendez-vous. Au briefing, des packs de 5, 10 ou 20, moins chers en gros, et une commande automatique qui complète le stock chaque soir. J’ai arrondi ton stock au-dessus.',
  },
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
  {
    id: 'ambitions',
    palier: 1,
    texte: 'Chaque personne a désormais une ambition, sur sa fiche. Certains rêves font des histoires.',
  },
  {
    id: 'voisinage',
    palier: 2,
    texte: 'L’humeur du voisinage, dans l’onglet Maison : les soirs de fête s’entendent jusqu’au dernier étage.',
  },
  {
    id: 'objectifs',
    palier: 1,
    texte: 'Un objectif chaque mois, jugé le jour de la mensualité, avec un bilan de fin de mois. Il s’affiche dans l’onglet Maison.',
  },
  {
    id: 'defis',
    palier: 2,
    texte: 'Un défi chaque semaine, annoncé au bilan du lundi et lié à ce qui se passe en ville. Réussi, il rapporte.',
  },
  {
    id: 'rivale',
    palier: 3,
    texte: 'Le Chat Noir, de l’autre côté du canal : Colette Vos réagit chaque lundi à ce que tu lui prends. Sa fiche est dans l’onglet Relations, avec tes réponses.',
  },
  {
    id: 'equipes',
    palier: 3,
    texte: 'Équipes Accueil et Sécurité, dans l’onglet Personnel : elles règlent seules une partie des alertes du quai, contre un salaire.',
  },
  {
    id: 'assurance',
    palier: 3,
    texte: 'L’assurance, dans l’onglet Finances : la casse, et même les amendes, remboursées contre une prime chaque lundi.',
  },
  {
    id: 'visibilite',
    palier: 3,
    texte: 'La visibilité, dans les règles de la maison : site discret, concierges d’hôtel ou influenceurs. Plus de monde, pas toujours celui qu’on voudrait.',
  },
];

export function trouverNouveaute(id: string): Nouveaute | undefined {
  return NOUVEAUTES.find((n) => n.id === id);
}

export const JOSEE_NOUVEAUTES =
  'Pendant ton absence, la maison a continué de vivre. Je t’ai noté l’essentiel ; le reste, tu le découvriras en ouvrant les yeux.';
