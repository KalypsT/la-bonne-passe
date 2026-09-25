// Clients types, offres du soir et avis. Suggestif, jamais explicite.

import type { Silhouette, Talent } from './personnel';

export type Segment = 'touriste' | 'habitue';

export const SEGMENTS: Record<Segment, string> = {
  touriste: 'Touristes',
  habitue: 'Habitués',
};

export interface ModeleClient {
  id: string;
  nom: string;
  segment: Segment;
  replique: string;
  /** Budget de base d'un rendez-vous, en euros. */
  budget: number;
  /** Le talent qui compte le plus pour ce client. */
  attend: Talent;
  silhouette: Silhouette;
}

export const CLIENTS: ModeleClient[] = [
  {
    id: 'touriste-egare',
    nom: 'Le touriste égaré',
    segment: 'touriste',
    replique: 'C’est bien ici, le musée Van Gogh ?',
    budget: 120,
    attend: 'conversation',
    silhouette: { teint: '#F4CFB0', cheveux: '#D8B25A', coiffure: 'casquette', haut: '#E0703A', bas: '#C9B48A', accent: '#2D6FB0' },
  },
  {
    id: 'touriste-curieuse',
    nom: 'La touriste curieuse',
    segment: 'touriste',
    replique: 'On m’a dit que c’était typique.',
    budget: 140,
    attend: 'conversation',
    silhouette: { teint: '#F1C7A5', cheveux: '#D8B25A', coiffure: 'longue', haut: '#5FA3A8', bas: '#2E3F55' },
  },
  {
    id: 'etudiant',
    nom: 'L’étudiant qui a économisé',
    segment: 'touriste',
    replique: 'Trois mois de pâtes pour ce soir.',
    budget: 90,
    attend: 'charme',
    silhouette: { teint: '#8D5A3B', cheveux: '#111111', coiffure: 'courte', haut: '#3A7A4A', bas: '#2A3A5A' },
  },
  {
    id: 'influenceur',
    nom: 'L’influenceur',
    segment: 'touriste',
    replique: 'Je peux filmer le couloir ? Non ? Même pas le lustre ?',
    budget: 180,
    attend: 'audace',
    silhouette: { teint: '#E8B894', cheveux: '#111111', coiffure: 'casquette', haut: '#EDEDED', bas: '#222222', accent: '#111111' },
  },
  {
    id: 'habitue-timide',
    nom: 'L’habitué timide',
    segment: 'habitue',
    replique: 'Comme d’habitude… mais en mieux ?',
    budget: 150,
    attend: 'charme',
    silhouette: { teint: '#C68A62', cheveux: '#3A2618', coiffure: 'courte', haut: '#6B5A45', bas: '#4A3E30', lunettes: true },
  },
  {
    id: 'retraite',
    nom: 'Le retraité fidèle',
    segment: 'habitue',
    replique: 'Toujours le mardi. Enfin, presque.',
    budget: 140,
    attend: 'conversation',
    silhouette: { teint: '#F1C7A5', cheveux: '#E6E6E6', coiffure: 'chapeau', haut: '#7A5A3A', bas: '#4A3A2A', accent: '#5A4632' },
  },
  {
    id: 'poete',
    nom: 'Le poète fauché',
    segment: 'habitue',
    replique: 'J’accepte de payer en alexandrins.',
    budget: 70,
    attend: 'charme',
    silhouette: { teint: '#F1C7A5', cheveux: '#5A3A22', coiffure: 'longue', haut: '#3A2A3F', bas: '#2A2030', accent: '#C8913E' },
  },
];

export type Offre = 'classique' | 'happy' | 'feutree';

export interface DefinitionOffre {
  id: Offre;
  nom: string;
  description: string;
  affluence: number;
  prix: number;
  qualite: number;
  /** Multiplicateur de fréquence par segment. */
  attire: Partial<Record<Segment, number>>;
}

export const OFFRES: DefinitionOffre[] = [
  { id: 'classique', nom: 'Soirée classique', description: 'Rien de spécial, tout le monde connaît.', affluence: 1, prix: 1, qualite: 0, attire: {} },
  {
    id: 'happy',
    nom: 'Happy hour',
    description: 'Prix −20 %, affluence +40 %. Idéal pour se faire connaître.',
    affluence: 1.4,
    prix: 0.8,
    qualite: -0.03,
    attire: { touriste: 1.6 },
  },
  {
    id: 'feutree',
    nom: 'Soirée feutrée',
    description: 'Affluence −30 %, satisfaction en hausse.',
    affluence: 0.7,
    prix: 1,
    qualite: 0.1,
    attire: { habitue: 1.5 },
  },
];

export function trouverOffre(id: Offre): DefinitionOffre {
  return OFFRES.find((o) => o.id === id) ?? OFFRES[0]!;
}

export const AVIS = {
  excellents: [
    'Parfait. Je laisse cinq étoiles et mon parapluie.',
    'Je reviendrai. Avec un meilleur prétexte.',
    'Service impeccable. La déco aussi.',
    'Je n’ai pas vu le temps passer. Mon taxi non plus.',
  ],
  corrects: [
    'Correct. L’ambiance était meilleure que le café.',
    'Agréable, mais la chambre sentait le renfermé.',
    'Bien. J’aurais aimé un peu plus de conversation.',
  ],
  decevants: [
    'Mitigé. Tout le monde avait l’air épuisé, moi compris.',
    'La chambre avait connu des jours meilleurs.',
    'Bof. Au fond, j’étais venu pour Van Gogh.',
  ],
};
