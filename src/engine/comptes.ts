// Comptes de la maison : chaque recette et chaque dépense rangée par poste, pour le bilan du lundi.
// Voir « Économie et finances » dans les spécifications.

import type { EtatJeu } from './etat';

export type PosteRecette = 'rendezVous' | 'bar' | 'autres';
export type PosteDepense =
  | 'salaires'
  | 'charges'
  | 'linge'
  | 'bar'
  | 'travaux'
  | 'menage'
  | 'personnel'
  | 'portier'
  | 'themes'
  | 'relations'
  | 'incidents'
  | 'mensualite'
  | 'avance';

export const POSTES_RECETTES: PosteRecette[] = ['rendezVous', 'bar', 'autres'];
export const POSTES_DEPENSES: PosteDepense[] = [
  'salaires',
  'charges',
  'linge',
  'bar',
  'travaux',
  'menage',
  'personnel',
  'portier',
  'themes',
  'relations',
  'incidents',
  'mensualite',
  'avance',
];

export interface Comptes {
  recettes: Record<PosteRecette, number>;
  depenses: Record<PosteDepense, number>;
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

/** Dépense payée par la trésorerie : comptes de la semaine, et de la nuit en cours s'il y en a une. */
export function depenser(etat: EtatJeu, montant: number, poste: PosteDepense): void {
  etat.tresorerie -= montant;
  if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses += montant;
  noterDepense(etat, montant, poste);
}

/** Dépense payée autrement (par la réserve) : elle compte quand même dans le résultat de la semaine. */
export function noterDepense(etat: EtatJeu, montant: number, poste: PosteDepense): void {
  etat.semaine.comptes.depenses[poste] += montant;
}

/** Recette encaissée dans la trésorerie. La nuit en cours, elle, se tient à part (recettes de la maison). */
export function encaisser(etat: EtatJeu, montant: number, poste: PosteRecette): void {
  etat.tresorerie += montant;
  etat.semaine.comptes.recettes[poste] += montant;
}
