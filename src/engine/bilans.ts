// Les bilans de la v0.4 : le défi de la semaine, l'objectif du mois et le bilan de fin de mois.
// Voir « Les objectifs » dans les spécifications. Textes dans src/content/defis.ts, cibles dans balance.ts.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import { DEFIS_SEMAINE, ROTATION_OBJECTIFS, trouverDefi, type DefinitionDefi, type IdObjectif } from '../content/defis';
import type { EtatJeu } from './etat';
import { changerReputationGlobale, frequentation, parSegment, segmentOuvert, segmentsOuverts, type ParSegment } from './clientele';
import { appliquerEffet } from './effets';
import { creerTirage } from './hasard';
import { changerMoral } from './personnel';

/** Ce que la semaine retient pour les défis, en plus de ses comptes. */
export interface StatsSemaine {
  servis: ParSegment;
  /** Disputes déclenchées sur le quai. */
  disputes: number;
  /** Alertes minutées laissées filer. */
  alertesManquees: number;
}

export function statsDeDepart(): StatsSemaine {
  return { servis: parSegment(0), disputes: 0, alertesManquees: 0 };
}

/** Résultat d'un défi, au bilan du lundi. */
export interface ResultatDefi {
  id: string;
  valeur: number;
  cible: number;
  reussi: boolean;
}

/** L'objectif du mois en cours. */
export interface Mois {
  numero: number;
  objectif: IdObjectif;
  cible: number;
  /** Pour « fidéliser » : le segment visé. */
  segment: Segment | null;
  /** Départs du personnel depuis le début du mois (objectif « garder l'équipe »). */
  departs: number;
}

/** Bilan de fin de mois, le jour de la mensualité. */
export interface BilanMois {
  numero: number;
  mensualite: number;
  depuisReserve: number;
  /** Trésorerie et réserve après la mensualité. */
  avoir: number;
  /** La mensualité est passée à découvert : la banque écrit. */
  decouvert: boolean;
  objectif: IdObjectif;
  cible: number;
  segment: Segment | null;
  valeur: number;
  reussi: boolean;
  /** L'objectif du mois qui commence, ou null si l'emprunt est remboursé. */
  prochain: Mois | null;
}

export type EvenementBilan =
  | { type: 'defi'; id: string }
  | { type: 'defiConclu'; id: string; reussi: boolean }
  | { type: 'bilanMois'; numero: number; reussi: boolean };

interface Sortie {
  push(e: EvenementBilan): unknown;
}

export function moisDeDepart(): Mois {
  return { numero: 1, objectif: 'reputation', cible: B.OBJECTIFS.reputationMois1, segment: null, departs: 0 };
}

// ——— Défis ———

/** Où en est le défi, sur la semaine en cours. */
export function valeurDefi(etat: EtatJeu, def: DefinitionDefi): number {
  const s = etat.semaine;
  const m = def.mesure;
  switch (m.type) {
    case 'servis':
      return s.stats.servis[m.segment];
    case 'clients':
      return s.servis;
    case 'bar':
      return s.comptes.recettes.bar;
    case 'disputes':
      return s.stats.disputes;
    case 'alertes':
      return s.stats.alertesManquees;
    case 'satisfaction':
      return Math.round(etat.clientele.satisfaction[m.segment] - s.satisfactionDebut[m.segment]);
    case 'perdus':
      return Math.round((100 * s.perdus) / Math.max(1, s.perdus + s.servis));
  }
}

export function defiReussi(def: DefinitionDefi, valeur: number): boolean {
  return def.auPlus ? valeur <= def.cible : valeur >= def.cible;
}

function defiPossible(etat: EtatJeu, def: DefinitionDefi): boolean {
  const c = def.condition;
  if (!c) return true;
  return (
    (c.tendance === undefined || c.tendance.some((t) => etat.semaine.tendances.includes(t))) &&
    (c.bar === undefined || (etat.bar.ouvert && etat.equipes.bar > 0) === c.bar) &&
    (c.segment === undefined || segmentOuvert(etat, c.segment))
  );
}

/**
 * Le défi de la semaine qui commence : un défi lié à une tendance en cours pèse plus lourd qu'un défi ordinaire,
 * et jamais deux fois le même d'affilée.
 * Tiré sans toucher au hasard de la partie (graine : numéro de la semaine), pour ne rien décaler.
 */
export function choisirDefi(etat: EtatJeu): string | null {
  const precedent = etat.defi;
  const possibles = DEFIS_SEMAINE.filter((d) => defiPossible(etat, d) && d.id !== precedent);
  if (possibles.length === 0) return null;
  const tirage = creerTirage((etat.semaine.numero * 7919 + etat.hasardAlertes) | 0);
  return tirage.choisir(
    possibles,
    possibles.map((d) => (d.condition?.tendance ? B.DEFIS.poidsLie : 1)),
  ).id;
}

/** Le lundi : le défi de la semaine écoulée est jugé, et sa récompense tombe. */
export function conclureDefi(etat: EtatJeu, evenements: Sortie): ResultatDefi | null {
  const def = etat.defi ? trouverDefi(etat.defi) : undefined;
  if (!def) return null;
  const valeur = valeurDefi(etat, def);
  const reussi = defiReussi(def, valeur);
  if (reussi) {
    appliquerEffet(etat, def.recompense, { employeId: null }, { ajouterClient: () => {}, demarrerSuite: () => {} });
  }
  evenements.push({ type: 'defiConclu', id: def.id, reussi });
  return { id: def.id, valeur, cible: def.cible, reussi };
}

/** Le lundi, après les tendances : le défi de la nouvelle semaine. */
export function lancerDefi(etat: EtatJeu, evenements: Sortie): void {
  etat.defi = etat.systemes.defis ? choisirDefi(etat) : null;
  if (etat.defi) evenements.push({ type: 'defi', id: etat.defi });
}

// ——— Objectifs du mois ———

/** Où en est l'objectif du mois. */
export function valeurObjectif(etat: EtatJeu, mois: Mois): number {
  switch (mois.objectif) {
    case 'reputation':
      return Math.floor(etat.reputation);
    case 'satisfaction':
      return Math.floor(mois.segment ? etat.clientele.satisfaction[mois.segment] : 0);
    case 'avoir':
      return Math.round(etat.tresorerie + etat.reserve);
    case 'equipe':
      return mois.departs;
  }
}

export function objectifReussi(mois: Mois, valeur: number): boolean {
  return mois.objectif === 'equipe' ? valeur <= mois.cible : valeur >= mois.cible;
}

/** L'objectif du mois suivant, tiré de la rotation, avec une cible tirée de l'état de la maison. */
export function prochainObjectif(etat: EtatJeu, numero: number): Mois {
  const objectif = ROTATION_OBJECTIFS[(numero - 2 + ROTATION_OBJECTIFS.length) % ROTATION_OBJECTIFS.length]!;
  const O = B.OBJECTIFS;
  switch (objectif) {
    case 'reputation':
      return { numero, objectif, cible: Math.min(90, Math.floor(etat.reputation) + O.reputationEnPlus), segment: null, departs: 0 };
    case 'satisfaction': {
      // La clientèle principale : le segment le plus reçu ces dernières nuits.
      const segments = segmentsOuverts(etat);
      const recus = frequentation(etat).servis;
      const segment = segments.reduce((a, b) => (recus[b] > recus[a] ? b : a), segments[0]!);
      const cible = Math.min(90, Math.floor(etat.clientele.satisfaction[segment]) + O.satisfactionEnPlus);
      return { numero, objectif, cible, segment, departs: 0 };
    }
    case 'avoir':
      return { numero, objectif, cible: O.avoir, segment: null, departs: 0 };
    case 'equipe':
      return { numero, objectif, cible: 0, segment: null, departs: 0 };
  }
}

/** Le jour de la mensualité, une fois qu'elle est payée : l'objectif est jugé, le mois suivant commence. */
export function conclureMois(etat: EtatJeu, depuisReserve: number, reste: boolean, evenements: Sortie): void {
  const mois = etat.mois;
  const valeur = valeurObjectif(etat, mois);
  const reussi = objectifReussi(mois, valeur);
  if (reussi) {
    changerReputationGlobale(etat, B.OBJECTIFS.recompenseReputation);
    for (const e of etat.personnel) changerMoral(e, B.OBJECTIFS.recompenseMoral);
  }
  const prochain = reste ? prochainObjectif(etat, mois.numero + 1) : null;
  etat.bilanMois = {
    numero: mois.numero,
    mensualite: B.MENSUALITE,
    depuisReserve,
    avoir: Math.round(etat.tresorerie + etat.reserve),
    decouvert: etat.tresorerie < 0,
    objectif: mois.objectif,
    cible: mois.cible,
    segment: mois.segment,
    valeur,
    reussi,
    prochain,
  };
  etat.bilanMoisAVoir = true;
  if (prochain) etat.mois = prochain;
  evenements.push({ type: 'bilanMois', numero: mois.numero, reussi });
}
