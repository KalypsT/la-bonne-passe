import { GRAINE_PAR_DEFAUT, MINUTE_DE_DEPART } from '../content/balance';

/** Drapeaux d'ouverture des systèmes (paliers). L'interface masque ce qui est fermé. */
export interface Paliers {
  personnel: boolean;
  clientele: boolean;
  finances: boolean;
  relations: boolean;
}

export interface EtatJeu {
  version: number;
  /** Jour de jeu, à partir de 1. */
  jour: number;
  /** Minutes écoulées depuis minuit, de 0 à 1435. */
  minuteDuJour: number;
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
  paliers: Paliers;
}

export const VERSION_ETAT = 1;

export function creerEtatInitial(graine: number = GRAINE_PAR_DEFAUT): EtatJeu {
  return {
    version: VERSION_ETAT,
    jour: 1,
    minuteDuJour: MINUTE_DE_DEPART,
    hasard: graine | 0,
    paliers: { personnel: false, clientele: false, finances: false, relations: false },
  };
}
