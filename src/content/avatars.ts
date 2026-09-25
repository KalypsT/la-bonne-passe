// Les 6 avatars du joueur, décrits comme des pièces combinables (coiffure, teint, tenue, accessoires).
// Le dessin de chaque pièce est dans src/scene/Avatar.tsx.

import type { Genre } from './partie';

export type FormeCoiffure = 'longue' | 'carre' | 'boucles' | 'plaquee' | 'courte' | 'degarnie';
export type FormeTenue = 'robe' | 'cuir' | 'tailleur' | 'costume' | 'col-roule' | 'chemise';
export type Accessoire = 'perles' | 'pendants' | 'creoles' | 'noeud' | 'lunettes' | 'rouge-levres';
export type Pilosite = 'moustache' | 'barbe';

export interface Tenue {
  forme: FormeTenue;
  /** Couleur principale (robe, veste). */
  couleur: string;
  /** Couleur d'accent (haut, chemise, nœud). */
  accent: string;
}

export interface DefinitionAvatar {
  id: string;
  genre: Genre;
  nom: string;
  teint: string;
  coiffure: FormeCoiffure;
  cheveux: string;
  pilosite?: Pilosite;
  accessoires: Accessoire[];
  /** Deux variantes de tenue. */
  tenues: [Tenue, Tenue];
}

export const AVATARS: DefinitionAvatar[] = [
  {
    id: 'patronne-1',
    genre: 'patronne',
    nom: 'La diva',
    teint: '#E9B99A',
    coiffure: 'longue',
    cheveux: '#2A1520',
    accessoires: ['rouge-levres', 'perles'],
    tenues: [
      { forme: 'robe', couleur: '#8E1F46', accent: '#D4A64A' },
      { forme: 'robe', couleur: '#15161C', accent: '#FF4F8B' },
    ],
  },
  {
    id: 'patronne-2',
    genre: 'patronne',
    nom: 'La rockeuse',
    teint: '#F2CDB4',
    coiffure: 'carre',
    cheveux: '#EFE3C2',
    accessoires: ['rouge-levres', 'pendants'],
    tenues: [
      { forme: 'cuir', couleur: '#1B1B20', accent: '#FF4F8B' },
      { forme: 'cuir', couleur: '#7A1A2C', accent: '#15161C' },
    ],
  },
  {
    id: 'patronne-3',
    genre: 'patronne',
    nom: 'La femme d’affaires',
    teint: '#7A4B32',
    coiffure: 'boucles',
    cheveux: '#1E1412',
    accessoires: ['creoles'],
    tenues: [
      { forme: 'tailleur', couleur: '#F4DCC8', accent: '#5C1530' },
      { forme: 'tailleur', couleur: '#1F5E4B', accent: '#F4DCC8' },
    ],
  },
  {
    id: 'patron-1',
    genre: 'patron',
    nom: 'Le dandy',
    teint: '#EDC3A6',
    coiffure: 'plaquee',
    cheveux: '#3B2A22',
    pilosite: 'moustache',
    accessoires: ['noeud'],
    tenues: [
      { forme: 'costume', couleur: '#1C2740', accent: '#FF4F8B' },
      { forme: 'costume', couleur: '#5C1530', accent: '#D4A64A' },
    ],
  },
  {
    id: 'patron-2',
    genre: 'patron',
    nom: 'Le barbu',
    teint: '#C98E66',
    coiffure: 'courte',
    cheveux: '#2B1D16',
    pilosite: 'barbe',
    accessoires: [],
    tenues: [
      { forme: 'col-roule', couleur: '#17181D', accent: '#6B4A33' },
      { forme: 'col-roule', couleur: '#C79A62', accent: '#2A2F3A' },
    ],
  },
  {
    id: 'patron-3',
    genre: 'patron',
    nom: 'Le vieux renard',
    teint: '#9A6445',
    coiffure: 'degarnie',
    cheveux: '#C9C4BD',
    pilosite: 'moustache',
    accessoires: ['lunettes'],
    tenues: [
      { forme: 'chemise', couleur: '#23262E', accent: '#F4F0EA' },
      { forme: 'chemise', couleur: '#D4A64A', accent: '#F2B8C6' },
    ],
  },
];

export function trouverAvatar(id: string): DefinitionAvatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
}
