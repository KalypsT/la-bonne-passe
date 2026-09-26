// Paliers de montée en puissance : déclencheurs et systèmes ouverts.
// Voir « Montée en puissance » dans les spécifications.

import { REPUTATION_PALIER_2 } from '../content/balance';
import { accueillirSegments } from './clientele';
import type { EtatJeu, Systemes } from './etat';
import { planifierVisitesScenarisees } from './recrutement';

export type EvenementPalier = { type: 'palier'; numero: number };

/** Systèmes ouverts par chaque palier. */
export const SYSTEMES_PAR_PALIER: Record<number, (keyof Systemes)[]> = {
  1: ['recrutement', 'renovation', 'planning', 'reserve'],
  2: ['affaires', 'groupes', 'clientele', 'tarifs', 'porte', 'bar'],
  3: ['relations', 'rivale'],
};

/** Condition pour atteindre chaque palier, vérifiée à chaque fermeture (et le jour de la mensualité). Le palier 4 viendra en v0.6. */
const DECLENCHEURS: Record<number, (etat: EtatJeu) => boolean> = {
  1: (etat) => etat.nuitsBouclees >= 1,
  2: (etat) => etat.reputation >= REPUTATION_PALIER_2,
  3: (etat) => etat.mensualitesPayees >= 1,
};

/** Monte d'un palier : ouvre ses systèmes et prépare sa carte d'annonce. */
export function accorderPalier(etat: EtatJeu, numero: number): void {
  etat.palier = numero;
  // Les nouveaux segments partent de la réputation acquise : la moyenne ne chute pas.
  if (numero === 2) accueillirSegments(etat, ['affaires', 'groupe']);
  for (const systeme of SYSTEMES_PAR_PALIER[numero] ?? []) etat.systemes[systeme] = true;
  // Le recrutement ouvre avec les trois premiers candidats, attendus dans la semaine.
  if (numero === 1) planifierVisitesScenarisees(etat);
  // Le quartier se remet à compter : la semaine des relations commence aujourd'hui.
  if (numero === 3) etat.relations.lundi = { ...etat.relations.jauges };
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
