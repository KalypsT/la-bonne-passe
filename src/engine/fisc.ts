// L'impôt trimestriel (v0.6) : 20 % du bénéfice du trimestre, prélevé seul le lundi qui suit, annoncé deux semaines avant.
// Voir « Règles automatiques » dans les spécifications ; valeurs dans balance.ts (IMPOT).

import * as B from '../content/balance';
import { depenser, totalDepenses, totalRecettes, type Comptes } from './comptes';
import type { EtatJeu } from './etat';

export interface Fisc {
  /** Bénéfice cumulé des semaines closes du trimestre en cours. */
  benefice: number;
  /** Semaines closes dans ce trimestre. */
  semaines: number;
  /** Impôt annoncé à la clôture du dernier trimestre, et son jour de prélèvement (0 : rien à payer). */
  du: number;
  jourDu: number;
}

export type EvenementFisc =
  | { type: 'impotAnnonce'; jour: number; estimation: number }
  | { type: 'impot'; montant: number; benefice: number };

interface Sortie {
  push(e: EvenementFisc): unknown;
}

export function fiscDeDepart(): Fisc {
  return { benefice: 0, semaines: 0, du: 0, jourDu: 0 };
}

/** Le bénéfice d'une semaine, au sens de l'impôt : sans mensualités, échéances d'emprunts ni l'impôt lui-même. */
export function beneficeImposable(c: Comptes): number {
  const d = c.depenses;
  return totalRecettes(c) - (totalDepenses(c) - d.mensualite - d.emprunts - d.impots);
}

/** Jour de clôture du trimestre en cours : le lundi qui suit ses 84 jours (85, 169…). */
export function jourClotureTrimestre(jour: number): number {
  const T = B.IMPOT.trimestre;
  return (Math.max(0, Math.floor((jour - 2) / T)) + 1) * T + 1;
}

/** Jour du prochain prélèvement : celui déjà annoncé, sinon deux semaines après la prochaine clôture. */
export function jourProchainImpot(etat: Pick<EtatJeu, 'fisc' | 'jour'>): number {
  if (etat.fisc.du > 0 && etat.fisc.jourDu >= etat.jour) return etat.fisc.jourDu;
  return jourClotureTrimestre(etat.jour) + B.IMPOT.preavis;
}

/** L'impôt à venir : celui annoncé, sinon ce que laisse prévoir le trimestre au rythme des semaines closes. */
export function impotEstime(etat: Pick<EtatJeu, 'fisc' | 'jour'>): number {
  const f = etat.fisc;
  if (f.du > 0 && f.jourDu >= etat.jour) return f.du;
  if (f.semaines === 0) return 0;
  const semainesParTrimestre = B.IMPOT.trimestre / 7;
  return Math.round(Math.max(0, (f.benefice / f.semaines) * semainesParTrimestre) * B.IMPOT.taux);
}

/** À la clôture de chaque semaine, son bénéfice rejoint celui du trimestre. */
export function noterSemaineFiscale(etat: EtatJeu, comptes: Comptes): void {
  etat.fisc.benefice += beneficeImposable(comptes);
  etat.fisc.semaines += 1;
}

/**
 * Le lundi matin, après la clôture de la semaine : à la clôture du trimestre, Josée annonce l'impôt exact ;
 * deux semaines plus tard, il est prélevé, seul, même à découvert. Une perte ne se reporte pas.
 */
export function lundiFiscal(etat: EtatJeu, evenements: Sortie): void {
  const f = etat.fisc;
  if (f.du > 0 && etat.jour === f.jourDu) {
    depenser(etat, f.du, 'impots');
    evenements.push({ type: 'impot', montant: f.du, benefice: Math.round(f.du / B.IMPOT.taux) });
    if (etat.bilanSemaine) etat.bilanSemaine.impot = { jour: etat.jour, montant: f.du, paye: true };
    f.du = 0;
    f.jourDu = 0;
  }
  if (etat.jour === jourClotureTrimestre(etat.jour - 1)) {
    const benefice = Math.round(f.benefice);
    const montant = Math.round(Math.max(0, benefice) * B.IMPOT.taux);
    const jour = etat.jour + B.IMPOT.preavis;
    etat.fisc = { benefice: 0, semaines: 0, du: montant, jourDu: montant > 0 ? jour : 0 };
    evenements.push({ type: 'impotAnnonce', jour, estimation: montant });
    if (etat.bilanSemaine) etat.bilanSemaine.impot = { jour, montant, paye: false };
  }
}
