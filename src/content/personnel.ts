// Le personnel suivi. Au départ, Sanne seule.

export type Talent = 'charme' | 'conversation' | 'audace' | 'discretion';

export interface Silhouette {
  teint: string;
  cheveux: string;
  coiffure: 'longue' | 'courte' | 'chignon' | 'casquette' | 'chapeau' | 'degarnie';
  haut: string;
  bas: string;
  accent?: string;
  lunettes?: boolean;
  robe?: boolean;
  perles?: boolean;
}

export interface DefinitionEmploye {
  id: string;
  prenom: string;
  age: number;
  accroche: string;
  genre: 'f' | 'm';
  talents: Record<Talent, number>;
  traits: string[];
  /** Part gardée sur chaque rendez-vous (0,4 à 0,65). */
  part: number;
  moral: number;
  loyaute: number;
  fatigue: number;
  silhouette: Silhouette;
}

export const TALENTS: Record<Talent, string> = {
  charme: 'Charme',
  conversation: 'Conversation',
  audace: 'Audace',
  discretion: 'Discrétion',
};

export const TRAITS: Record<string, string> = {
  'Mère poule': 'Remonte le moral de l’équipe chaque nuit.',
  Fidèle: 'Loyauté élevée, résiste aux offres des rivales.',
  Diva: 'Perd du moral tant qu’aucune chambre premium n’est ouverte.',
  Ambitieuse: 'Gagne du moral quand la réputation monte.',
  Solitaire: 'Récupère mieux les soirs de repos.',
  'Tête brûlée': 'Ose tout, mais déclenche parfois des disputes.',
  Fêtarde: 'Met l’ambiance, mais se fatigue plus vite.',
};

/** Traits possibles pour les candidats du marché. */
export const TRAITS_DU_MARCHE = Object.keys(TRAITS);

export const SANNE: DefinitionEmploye = {
  id: 'sanne',
  prenom: 'Sanne',
  age: 29,
  accroche: 'Fait rire n’importe qui, même les banquiers.',
  genre: 'f',
  talents: { charme: 3, conversation: 5, audace: 2, discretion: 3 },
  traits: ['Mère poule', 'Fidèle'],
  part: 0.5,
  moral: 72,
  loyaute: 80,
  fatigue: 10,
  silhouette: { teint: '#F1C7A5', cheveux: '#C8913E', coiffure: 'longue', haut: '#1F7A5C', bas: '#1F7A5C', accent: '#D4A64A', robe: true },
};

/** La personne de ménage, qui apparaît quand elle nettoie. */
/** L'équipe Bar : deux silhouettes, en gilet et nœud papillon. */
export const SILHOUETTES_BAR: Silhouette[] = [
  { teint: '#C68A62', cheveux: '#1A100C', coiffure: 'courte', haut: '#EDEDED', bas: '#1C1C22', accent: '#8C2640' },
  { teint: '#F1C7A5', cheveux: '#B5482A', coiffure: 'chignon', haut: '#EDEDED', bas: '#1C1C22', accent: '#8C2640' },
];

export const SILHOUETTE_MENAGE: Silhouette = {
  teint: '#D9A07A',
  cheveux: '#5A3A22',
  coiffure: 'chignon',
  haut: '#5FA3A8',
  bas: '#3E6E72',
};
