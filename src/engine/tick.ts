import { MINUTES_PAR_TICK } from '../content/balance';
import type { EtatJeu } from './etat';

const MINUTES_PAR_JOUR = 24 * 60;

/** Ordres envoyés par l'interface au moteur. Aucun pour l'instant. */
export type Ordre = never;

export type EvenementMoteur = { type: 'nouveauJour'; jour: number };

export interface ResultatTick {
  etat: EtatJeu;
  evenements: EvenementMoteur[];
}

/** Avance la simulation d'un pas fixe de 5 minutes de jeu. Fonction pure. */
export function tick(etat: EtatJeu, _ordres: readonly Ordre[] = []): ResultatTick {
  const evenements: EvenementMoteur[] = [];
  let minuteDuJour = etat.minuteDuJour + MINUTES_PAR_TICK;
  let jour = etat.jour;

  if (minuteDuJour >= MINUTES_PAR_JOUR) {
    minuteDuJour -= MINUTES_PAR_JOUR;
    jour += 1;
    evenements.push({ type: 'nouveauJour', jour });
  }

  return { etat: { ...etat, jour, minuteDuJour }, evenements };
}
