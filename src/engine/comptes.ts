// Comptes de la maison : chaque recette et chaque dépense rangée par poste,
// pour le bilan du lundi et pour celui de chaque nuit. Voir « Économie et finances » dans les spécifications.

import type { EtatJeu } from './etat';

export type PosteRecette = 'rendezVous' | 'bar' | 'autres' | 'assurance';
export type PosteDepense =
  | 'partPersonnel'
  | 'salaires'
  | 'charges'
  | 'linge'
  | 'bar'
  | 'express'
  | 'travaux'
  | 'menage'
  | 'personnel'
  | 'portier'
  | 'visibilite'
  | 'themes'
  | 'relations'
  | 'assurance'
  | 'incidents'
  | 'mensualite'
  | 'emprunts'
  | 'impots'
  | 'gestion'
  | 'agios'
  | 'avance';

export const POSTES_RECETTES: PosteRecette[] = ['rendezVous', 'bar', 'autres', 'assurance'];
export const POSTES_DEPENSES: PosteDepense[] = [
  'partPersonnel',
  'salaires',
  'charges',
  'linge',
  'bar',
  'express',
  'travaux',
  'menage',
  'personnel',
  'portier',
  'visibilite',
  'themes',
  'relations',
  'assurance',
  'incidents',
  'mensualite',
  'emprunts',
  'impots',
  'gestion',
  'agios',
  'avance',
];

export interface Comptes {
  recettes: Record<PosteRecette, number>;
  depenses: Record<PosteDepense, number>;
}

/**
 * Comptes de la journée en cours, ouverts à 5 h après les prélèvements du matin (charges du lundi,
 * mensualité, remboursements) : ce qui se paie et s'encaisse jusqu'à la fermeture revient à la nuit.
 */
export interface Journee {
  comptes: Comptes;
  /** Trésorerie à l'ouverture des comptes. */
  tresorerieAvant: number;
  /** Retiré de la réserve dans la journée : ce n'est pas une recette, mais la trésorerie le reçoit. */
  retraitReserve: number;
  /** Emprunt reçu dans la journée : pas une recette non plus (v0.6). */
  empruntRecu: number;
}

export function comptesVides(): Comptes {
  return {
    recettes: Object.fromEntries(POSTES_RECETTES.map((p) => [p, 0])) as Record<PosteRecette, number>,
    depenses: Object.fromEntries(POSTES_DEPENSES.map((p) => [p, 0])) as Record<PosteDepense, number>,
  };
}

export function totalRecettes(c: Comptes): number {
  return POSTES_RECETTES.reduce((s, p) => s + c.recettes[p], 0);
}

export function totalDepenses(c: Comptes): number {
  return POSTES_DEPENSES.reduce((s, p) => s + c.depenses[p], 0);
}

export function journeeVide(tresorerie: number): Journee {
  return { comptes: comptesVides(), tresorerieAvant: tresorerie, retraitReserve: 0, empruntRecu: 0 };
}

/** Dépense payée par la trésorerie : comptes de la semaine et de la journée. */
export function depenser(etat: EtatJeu, montant: number, poste: PosteDepense): void {
  etat.tresorerie -= montant;
  noterDepense(etat, montant, poste);
}

/** Dépense payée autrement (par la réserve) : elle compte quand même dans le résultat. */
export function noterDepense(etat: EtatJeu, montant: number, poste: PosteDepense): void {
  etat.semaine.comptes.depenses[poste] += montant;
  etat.journee.comptes.depenses[poste] += montant;
}

/** Recette encaissée dans la trésorerie. */
export function encaisser(etat: EtatJeu, montant: number, poste: PosteRecette): void {
  etat.tresorerie += montant;
  etat.semaine.comptes.recettes[poste] += montant;
  etat.journee.comptes.recettes[poste] += montant;
}

/** Ce que la nuit a rapporté à la maison, avant les dépenses : recettes moins la part du personnel. */
export function recetteMaison(c: Comptes): number {
  return totalRecettes(c) - c.depenses.partPersonnel;
}

/** Ce que la nuit a laissé à la maison : recettes moins dépenses (dont ce qui part en réserve). */
export function gagneNuit(c: Comptes): number {
  return totalRecettes(c) - totalDepenses(c);
}

/** Comptes de la nuit : ceux de la journée tant qu'elle n'est pas bouclée, puis ceux recopiés à la fermeture. */
export function comptesDeLaNuit(etat: EtatJeu): Comptes | null {
  if (!etat.nuit) return null;
  return etat.nuitsBouclees < etat.nuit.numero ? etat.journee.comptes : etat.nuit.comptes;
}
