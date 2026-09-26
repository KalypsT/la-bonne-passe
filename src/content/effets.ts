// Effets d'un choix sur une carte (imprévu, étape d'intrigue) : ce qui change dans la maison.
// Les valeurs sont écrites dans les contenus ; le moteur les applique (src/engine/effets.ts).

import type { Segment } from './clientele';

export interface EffetCarte {
  /** Moral, loyauté, fatigue de la personne concernée ({prenom}). */
  moral?: number;
  loyaute?: number;
  fatigue?: number;
  /** Moral de la seconde personne ({prenom2}). */
  moral2?: number;
  /** Moral de toute l'équipe. */
  moralEquipe?: number;
  /** Affinité entre les deux personnes. */
  affinite?: number;
  /** La personne concernée se repose pour le reste de la nuit. */
  repos?: boolean;
  /** Points de part gardée en plus (0,05 = 5 points), plafonnée à 65 %. */
  part?: number;
  /** Réputation : tous les segments ouverts bougent d'autant. */
  reputation?: number;
  /** Satisfaction de certains segments seulement. */
  satisfaction?: Partial<Record<Segment, number>>;
  /** Argent gagné (positif) ou dépensé (négatif, compté en incidents). */
  argent?: number;
  /** Travaux payés (comptés en travaux) : le choix n'est possible que si la trésorerie les couvre. */
  travaux?: number;
  /** Clients qui arrivent aussitôt sur le quai. */
  clients?: number;
  /** Tapage du quartier (voir src/engine/quartier.ts). */
  tapage?: number;
  /** La maison est insonorisée : le tapage monte moins vite, pour de bon. */
  insonoriser?: boolean;
  /** Démarre une suite différée (une intrigue courte), dans tant de jours, avec la même personne. */
  suite?: { id: string; delai: number };
}
