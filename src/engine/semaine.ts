// La semaine : comptes par poste, bilan du lundi, trésorerie projetée, tendances.
// Voir « Tendances » et « Économie et finances » dans les spécifications.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import { parSegment, segmentOuvert, type ParSegment } from './clientele';
import { comptesVides, totalDepenses, totalRecettes, type Comptes } from './comptes';
import type { EtatJeu } from './etat';
import type { Tirage } from './hasard';

export interface Semaine {
  /** Numéro de la semaine : 1 pour les jours 1 à 7. */
  numero: number;
  comptes: Comptes;
  /** Tendances en cours (identifiants de src/content/tendances.ts). */
  tendances: string[];
  /** Thèmes programmés cette semaine, dans l'ordre (pour la lassitude). */
  themes: string[];
  reputationDebut: number;
  satisfactionDebut: ParSegment;
  servis: number;
  perdus: number;
}

/** Bilan d'une semaine écoulée, lu le lundi matin. */
export interface BilanSemaine {
  numero: number;
  comptes: Comptes;
  resultat: number;
  /** Résultat sans les dépenses exceptionnelles (travaux, mensualité, avance) : la base de la projection. */
  resultatCourant: number;
  reputationDebut: number;
  reputationFin: number;
  satisfactionDebut: ParSegment;
  satisfactionFin: ParSegment;
  servis: number;
  perdus: number;
  /** Trésorerie et réserve au moment du bilan. */
  avoir: number;
  /** Avoir projeté à la fin de chacune des semaines à venir. */
  projection: number[];
  /** Tendances de la semaine qui commence. */
  tendances: string[];
  /** Première semaine avec des tendances : Josée les présente. */
  premieresTendances: boolean;
}

export type EvenementSemaine = { type: 'bilanSemaine'; numero: number } | { type: 'tendance'; id: string };

interface Sortie {
  push(e: EvenementSemaine): unknown;
}

export function nouvelleSemaine(etat: Pick<EtatJeu, 'reputation' | 'clientele'>, numero: number, tendances: string[] = []): Semaine {
  return {
    numero,
    comptes: comptesVides(),
    tendances,
    themes: [],
    reputationDebut: etat.reputation,
    satisfactionDebut: { ...etat.clientele.satisfaction },
    servis: 0,
    perdus: 0,
  };
}

export function semaineDeDepart(reputation: number = B.REPUTATION_INITIALE): Semaine {
  return {
    numero: 1,
    comptes: comptesVides(),
    tendances: [],
    themes: [],
    reputationDebut: reputation,
    satisfactionDebut: parSegment(reputation),
    servis: 0,
    perdus: 0,
  };
}

/** Numéro de la semaine d'un jour (le jour 1 est un lundi). */
export function numeroSemaine(jour: number): number {
  return Math.floor((jour - 1) / 7) + 1;
}

/** Demande d'un segment multipliée par les tendances en cours. */
export function demandeTendance(etat: EtatJeu, segment: Segment): number {
  return etat.semaine.tendances.reduce((m, id) => m * (B.TENDANCES_EFFETS[id]?.demande[segment] ?? 1), 1);
}

/** Chance de dispute multipliée par les tendances en cours. */
export function disputeTendance(etat: EtatJeu): number {
  return etat.semaine.tendances.reduce((m, id) => m * (B.TENDANCES_EFFETS[id]?.dispute ?? 1), 1);
}

/** Tire 1 ou 2 tendances parmi celles dont les segments sont ouverts. */
export function tirerTendances(etat: EtatJeu, tirage: Tirage): string[] {
  const possibles = Object.entries(B.TENDANCES_EFFETS)
    .filter(([, e]) => e.segments.every((s) => segmentOuvert(etat, s)))
    .map(([id]) => id);
  const choisies: string[] = [];
  const nombre = tirage.chance(B.TENDANCE_DEUXIEME_CHANCE) ? 2 : 1;
  for (let i = 0; i < nombre && possibles.length > 0; i++) {
    const id = tirage.choisir(possibles);
    choisies.push(id);
    possibles.splice(possibles.indexOf(id), 1);
  }
  return choisies;
}

/**
 * Projection de l'avoir sur les semaines à venir : le résultat courant de la semaine écoulée,
 * moins les mensualités et le remboursement de l'avance qui tombent dans l'intervalle.
 */
export function projeter(etat: EtatJeu, avoir: number, resultatCourant: number, prochainesMensualites: number[]): number[] {
  const projection: number[] = [];
  let courant = avoir;
  for (let k = 1; k <= B.SEMAINES_PROJETEES; k++) {
    const debut = etat.jour + (k - 1) * 7;
    const fin = debut + 7;
    courant += resultatCourant;
    for (const j of prochainesMensualites) if (j >= debut && j < fin) courant -= B.MENSUALITE;
    const a = etat.avance;
    if (a.statut === 'acceptee' && a.echeance !== null && a.echeance >= debut && a.echeance < fin) courant -= a.montant;
    projection.push(Math.round(courant));
  }
  return projection;
}

/**
 * Le lundi à 5 h : la semaine écoulée se referme en bilan, la suivante commence avec ses tendances.
 * Les tendances s'ouvrent au premier lundi après le palier 2.
 */
export function cloreSemaine(etat: EtatJeu, prochainesMensualites: number[], tirage: Tirage, evenements: Sortie): void {
  const s = etat.semaine;
  const recettes = totalRecettes(s.comptes);
  const depenses = totalDepenses(s.comptes);
  const d = s.comptes.depenses;
  const exceptionnel = d.travaux + d.mensualite + d.avance;
  const avoir = etat.tresorerie + etat.reserve;
  const resultatCourant = recettes - (depenses - exceptionnel);

  let premieresTendances = false;
  // Au premier lundi après le palier 2 : les tendances, et les soirées à thème pour y répondre.
  if (etat.palier >= 2 && !etat.systemes.tendances) {
    etat.systemes.tendances = true;
    etat.systemes.themes = true;
    premieresTendances = true;
  }
  const tendances = etat.systemes.tendances ? tirerTendances(etat, tirage) : [];

  etat.bilanSemaine = {
    numero: s.numero,
    comptes: structuredClone(s.comptes),
    resultat: recettes - depenses,
    resultatCourant,
    reputationDebut: s.reputationDebut,
    reputationFin: etat.reputation,
    satisfactionDebut: s.satisfactionDebut,
    satisfactionFin: { ...etat.clientele.satisfaction },
    servis: s.servis,
    perdus: s.perdus,
    avoir,
    projection: projeter(etat, avoir, resultatCourant, prochainesMensualites),
    tendances,
    premieresTendances,
  };
  etat.bilanAVoir = true;
  etat.semaine = nouvelleSemaine(etat, s.numero + 1, tendances);
  evenements.push({ type: 'bilanSemaine', numero: s.numero });
  for (const id of tendances) evenements.push({ type: 'tendance', id });
}

/** Un client compte aussi dans la fréquentation de la semaine. */
export function noterClientSemaine(etat: EtatJeu, issue: 'servis' | 'perdus'): void {
  etat.semaine[issue] += 1;
}
