// Effets d'un choix sur une carte (imprévu, étape d'intrigue) : ce qui change dans la maison.
// Les valeurs sont écrites dans les contenus ; le moteur les applique (src/engine/effets.ts).

import type { Segment } from './clientele';
import type { Talent } from './personnel';
import type { IdActeur } from './relations';

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
  /** Clients qui arrivent aussitôt sur le quai (d'un segment donné, sinon au hasard). */
  clients?: number;
  clientsSegment?: Segment;
  /** Fatigue de toute l'équipe en service ce soir. */
  fatigueEquipe?: number;
  /** Bouteilles ajoutées au stock du bar (ou retirées), s'il est ouvert. */
  stockBar?: number;
  /** Une candidate ou un candidat remarquable attend au salon (onglet Personnel). */
  candidatVedette?: boolean;
  /** Tapage du quartier (voir src/engine/quartier.ts). */
  tapage?: number;
  /** La maison est insonorisée : le tapage monte moins vite, pour de bon. */
  insonoriser?: boolean;
  /** La personne concernée garde au moins cette part (0,55 = 55 %). */
  partMin?: number;
  /** Talents de la personne concernée (+1 = un point), entre 1 et 5. */
  talent?: Partial<Record<Talent, number>>;
  /** Traits gagnés ou perdus par la personne concernée (un trait gagné est connu du joueur). */
  ajouterTrait?: string;
  retirerTrait?: string;
  /** Promesse d'un soir de repos, à placer au planning sous quelques jours (comme en entretien). */
  promesseRepos?: boolean;
  /** La personne concernée quitte la maison. */
  depart?: boolean;
  /** Avance d'argent à la personne concernée : sortie de la trésorerie, gardée en mémoire par l'intrigue. */
  avance?: number;
  /** La personne rembourse l'avance que l'intrigue garde en mémoire. */
  rembourser?: boolean;
  /** Sinistre couvert par l'assurance (v0.5) : l'argent perdu est une casse ou une amende. */
  sinistre?: 'casse' | 'amende';
  /** Frais de justice (amende, arrangement) : une personne Juriste dans l'équipe les réduit. */
  juridique?: boolean;
  /** Points gardés en mémoire par l'intrigue : ses étapes suivantes peuvent les exiger (dénouement selon les choix). */
  points?: number;
  /** Parures de linge propre en plus (ou en moins) dans le stock (v0.6). */
  linge?: number;
  /** Relations avec le quartier (v0.5) : points gagnés ou perdus auprès de chaque acteur. */
  relations?: Partial<Record<IdActeur, number>>;
  /** Les arrivées de la soirée en cours sont multipliées par ce facteur (un contrôle devant la porte). */
  affluenceSoir?: number;
  /** La rivale (v0.5) : son agressivité et vos rapports. */
  rivale?: { agressivite?: number; relation?: number };
  /** Demande des habitués et des clients d'affaires multipliée jusqu'au lundi suivant (la rivale casse ses prix). */
  concurrence?: number;
  /** Une recrue débauchée au Chat Noir attend au salon. */
  candidatRival?: boolean;
  /** La personne concernée part au Chat Noir (avec `depart`) : la rivale s'en souvient. */
  transfuge?: boolean;
  /** Démarre une suite différée (une intrigue courte), dans tant de jours, avec la même personne. */
  suite?: { id: string; delai: number };
}
