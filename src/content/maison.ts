// Les pièces de la maison d'origine, à Amsterdam.

import type { Segment } from './clientele';

/** Les décors d'une chambre (v0.6) : chacun plaît davantage à un segment. */
export type IdDecor = 'rose' | 'orientale' | 'velours' | 'miroirs';

export const DECORS: Record<IdDecor, { nom: string; theme: string; segment: Segment; plait: string }> = {
  rose: { nom: 'Rose poudré', theme: 'Rose poudré et guirlandes', segment: 'touriste', plait: 'Les touristes s’y sentent en carte postale.' },
  orientale: { nom: 'Orientale', theme: 'Coussins, lanternes et thé à la menthe', segment: 'groupe', plait: 'Les groupes adorent s’y vautrer.' },
  velours: { nom: 'Velours', theme: 'Damas bordeaux et lustre', segment: 'habitue', plait: 'Les habitués y retrouvent leurs aises.' },
  miroirs: { nom: 'Miroirs', theme: 'Miroirs biseautés, satin rose', segment: 'affaires', plait: 'Les clients d’affaires s’y admirent.' },
};

export const ORDRE_DECORS: IdDecor[] = ['rose', 'orientale', 'velours', 'miroirs'];

export interface DefinitionChambre {
  id: string;
  nom: string;
  theme: string;
  premium: boolean;
  /** Décor d'origine (v0.6 : il peut changer). */
  decor: IdDecor;
  /** En service dès le départ ; les autres dorment sous des draps. */
  ouverteAuDepart: boolean;
  /** Formes avec article, pour les phrases : « au Boudoir », « du Boudoir ». */
  dans: string;
  de: string;
}

export const CHAMBRES: DefinitionChambre[] = [
  { id: 'boudoir', nom: 'Boudoir', theme: 'Rose poudré et guirlandes', premium: false, decor: 'rose', ouverteAuDepart: true, dans: 'au Boudoir', de: 'du Boudoir' },
  { id: 'orientale', nom: 'Chambre orientale', theme: 'Coussins, lanternes et thé à la menthe', premium: false, decor: 'orientale', ouverteAuDepart: false, dans: 'dans la chambre orientale', de: 'de la chambre orientale' },
  { id: 'velours', nom: 'Suite velours', theme: 'Damas bordeaux et lustre', premium: true, decor: 'velours', ouverteAuDepart: false, dans: 'dans la suite velours', de: 'de la suite velours' },
  { id: 'miroirs', nom: 'Chambre miroirs', theme: 'Miroirs biseautés, satin rose', premium: true, decor: 'miroirs', ouverteAuDepart: false, dans: 'dans la chambre miroirs', de: 'de la chambre miroirs' },
];

export interface DefinitionPiece {
  id: 'salon' | 'bar' | 'bureau';
  nom: string;
  description: string;
  /** Description une fois la pièce rouverte, si elle change. */
  descriptionOuverte?: string;
}

export const PIECES_COMMUNES: DefinitionPiece[] = [
  { id: 'salon', nom: 'Salon', description: 'Là où le personnel attend et où les clients patientent.' },
  {
    id: 'bar',
    nom: 'Bar',
    description: 'Fermé depuis des années. Les bouteilles aussi.',
    descriptionOuverte: 'Comptoir en laiton, tabourets de velours et une tireuse qui a retrouvé la foi.',
  },
  { id: 'bureau', nom: 'Bureau', description: 'Ton bureau : un coffre, une lampe et des factures.' },
];

/** Les pièces annexes (v0.6) : à ouvrir par des travaux. */
export const ANNEXES: Record<'loges' | 'buanderie', { nom: string; description: string; descriptionOuverte: string; effet: string; ou: string }> = {
  loges: {
    nom: 'Loges',
    description: 'Sous les combles, derrière l’œil-de-bœuf : des malles, des miroirs sans tain et vingt ans de poussière.',
    descriptionOuverte: 'Miroirs à ampoules, fauteuils capitonnés et une bouilloire qui ne s’arrête jamais.',
    effet: 'Le personnel s’y repose entre deux clients (récupération doublée) et les soirs de repos ; le moral remonte de lui-même jusqu’à 70 au lieu de 60.',
    ou: 'Sous les combles',
  },
  buanderie: {
    nom: 'Buanderie',
    description: 'Derrière la fenêtre de droite du rez-de-chaussée, une vieille lessiveuse et des fils à linge vides.',
    descriptionOuverte: 'Deux machines qui ronronnent, des fils chargés de draps, et l’odeur du savon de Marseille.',
    effet: 'Le linge tourne : une parure utilisée part au sale, le ménage la relave (plus vite maison fermée) contre 3 € de lessive. Une parure sur vingt-cinq finit en chiffon.',
    ou: 'Au rez-de-chaussée',
  },
};

export function trouverChambre(id: string): DefinitionChambre | undefined {
  return CHAMBRES.find((c) => c.id === id);
}

export function trouverPiece(id: DefinitionPiece['id']): DefinitionPiece {
  return PIECES_COMMUNES.find((p) => p.id === id)!;
}
