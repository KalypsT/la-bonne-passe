// Paliers de montée en puissance : déclencheurs et systèmes ouverts.
// Voir « Montée en puissance » dans les spécifications.

import type { EtatJeu, Systemes } from './etat';
import { planifierVisitesScenarisees } from './recrutement';

export type EvenementPalier = { type: 'palier'; numero: number };

/** Systèmes ouverts par chaque palier. */
export const SYSTEMES_PAR_PALIER: Record<number, (keyof Systemes)[]> = {
  1: ['recrutement', 'renovation', 'planning', 'reserve'],
};

/** Condition pour atteindre chaque palier. Le palier 2 arrive plus tard dans la v0.2. */
const DECLENCHEURS: Record<number, (etat: EtatJeu) => boolean> = {
  1: (etat) => etat.nuitsBouclees >= 1,
};

/** Monte d'un palier : ouvre ses systèmes et prépare sa carte d'annonce. */
export function accorderPalier(etat: EtatJeu, numero: number): void {
  etat.palier = numero;
  for (const systeme of SYSTEMES_PAR_PALIER[numero] ?? []) etat.systemes[systeme] = true;
  // Le recrutement ouvre avec les trois premiers candidats, attendus dans la semaine.
  if (numero === 1) planifierVisitesScenarisees(etat);
  if (!etat.annonces.includes(numero)) etat.annonces.push(numero);
}

/** Accorde tous les paliers dont le déclencheur est rempli, dans l'ordre. */
export function verifierPaliers(etat: EtatJeu, evenements: { push(e: EvenementPalier): unknown }): void {
  for (;;) {
    const suivant = etat.palier + 1;
    const declencheur = DECLENCHEURS[suivant];
    if (!declencheur || !declencheur(etat)) return;
    accorderPalier(etat, suivant);
    evenements.push({ type: 'palier', numero: suivant });
  }
}
