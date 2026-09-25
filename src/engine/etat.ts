import { GRAINE_PAR_DEFAUT, MINUTE_DE_DEPART, TRESORERIE_INITIALE } from '../content/balance';
import { PARTIE_PAR_DEFAUT, type Genre } from '../content/partie';

/** Drapeaux d'ouverture des systèmes (paliers). L'interface masque ce qui est fermé. */
export interface Paliers {
  personnel: boolean;
  clientele: boolean;
  finances: boolean;
  relations: boolean;
}

export interface Joueur {
  prenom: string;
  /** Identifiant de l'avatar choisi. */
  avatar: string;
  /** Sert à accorder les textes : « la patronne » ou « le patron ». */
  genre: Genre;
}

export interface EtatJeu {
  version: number;
  joueur: Joueur;
  maison: { nom: string; ville: string };
  /** Chapitre de la campagne, à partir de 1. */
  chapitre: number;
  /** Trésorerie en euros. */
  tresorerie: number;
  /** Jour de jeu, à partir de 1. */
  jour: number;
  /** Minutes écoulées depuis minuit, de 0 à 1435. */
  minuteDuJour: number;
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
  paliers: Paliers;
}

/** À augmenter à chaque changement de structure, avec une migration dans src/save/migrations.ts. */
export const VERSION_ETAT = 2;

export interface OptionsNouvellePartie {
  graine?: number;
  joueur?: Joueur;
  nomMaison?: string;
}

export function creerEtatInitial(options: OptionsNouvellePartie = {}): EtatJeu {
  const { prenom, avatar, genre, nomMaison, ville } = PARTIE_PAR_DEFAUT;
  return {
    version: VERSION_ETAT,
    joueur: options.joueur ?? { prenom, avatar, genre },
    maison: { nom: options.nomMaison ?? nomMaison, ville },
    chapitre: 1,
    tresorerie: TRESORERIE_INITIALE,
    jour: 1,
    minuteDuJour: MINUTE_DE_DEPART,
    hasard: (options.graine ?? GRAINE_PAR_DEFAUT) | 0,
    paliers: { personnel: false, clientele: false, finances: false, relations: false },
  };
}
