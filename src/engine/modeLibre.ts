// Le mode libre (v1.0, partie 3) : après la fin du chapitre, la même partie continue, sans nouveau palier.
// Chaque lundi, un objectif simple tiré au sort remplace le défi : une recette à atteindre, une semaine sans incident,
// un segment à reconquérir, un record à battre. Les intrigues continuent. Valeurs dans balance.ts (MODE_LIBRE).

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import type { TypeObjectifLibre } from '../content/modeLibre';
import { segmentsOuverts } from './clientele';
import type { Comptes } from './comptes';
import { appliquerEffet } from './effets';
import type { EtatJeu } from './etat';
import { creerTirage, tirer } from './hasard';

export interface ObjectifLibre {
  type: TypeObjectifLibre;
  cible: number;
  /** Le segment à reconquérir, ou null. */
  segment: Segment | null;
  /** Incidents de la partie au début de la semaine (objectif « calme »). */
  incidentsDebut: number;
}

export interface ResultatLibre {
  type: TypeObjectifLibre;
  cible: number;
  segment: Segment | null;
  valeur: number;
  reussi: boolean;
}

export interface ModeLibre {
  objectif: ObjectifLibre | null;
  /** Objectifs réussis et manqués, série en cours et meilleure série. */
  reussis: number;
  rates: number;
  serie: number;
  meilleureSerie: number;
  /** Les dernières semaines, de la plus ancienne à la plus récente : recette d'activité et clients reçus. */
  historique: { recette: number; servis: number }[];
  /** Josée a présenté le mode libre. */
  presente: boolean;
}

export type EvenementModeLibre =
  | { type: 'objectifLibre'; objectif: TypeObjectifLibre }
  | { type: 'objectifLibreConclu'; objectif: TypeObjectifLibre; reussi: boolean };

interface Sortie {
  push(e: EvenementModeLibre): unknown;
}

export function modeLibreDeDepart(): ModeLibre {
  return { objectif: null, reussis: 0, rates: 0, serie: 0, meilleureSerie: 0, historique: [], presente: false };
}

/** Le hasard du mode libre, à part pour ne décaler aucune partie existante. */
export function hasardModeLibreDeDepart(graine: number): number {
  return tirer(graine * 41 + 23).etat;
}

/** La recette d'activité d'une semaine : rendez-vous, bar et divers (sans la deuxième maison, l'assurance ni les placements). */
export function recetteActivite(c: Comptes): number {
  return c.recettes.rendezVous + c.recettes.bar + c.recettes.autres;
}

const arrondirCent = (x: number) => Math.round(x / 100) * 100;

/** Le segment ouvert le moins content, s'il a de quoi être reconquis. */
function segmentAReconquerir(etat: EtatJeu): Segment | null {
  const s = [...segmentsOuverts(etat)].sort((a, b) => etat.clientele.satisfaction[a] - etat.clientele.satisfaction[b])[0];
  return s && etat.clientele.satisfaction[s] < B.MODE_LIBRE.segmentSous ? s : null;
}

/** Les objectifs possibles cette semaine, avec leur cible. */
export function objectifsPossibles(etat: EtatJeu): ObjectifLibre[] {
  const M = B.MODE_LIBRE;
  const h = etat.modeLibre.historique;
  const base = { segment: null, incidentsDebut: etat.chronique.incidents };
  const possibles: ObjectifLibre[] = [{ ...base, type: 'calme', cible: 0 }];
  const recentes = h.slice(-M.recetteSemaines);
  if (recentes.length >= 2) {
    const moyenne = recentes.reduce((t, x) => t + x.recette, 0) / recentes.length;
    if (moyenne > 0) possibles.push({ ...base, type: 'recette', cible: arrondirCent(moyenne * M.recetteHausse) });
  }
  const segment = segmentAReconquerir(etat);
  if (segment) possibles.push({ ...base, type: 'segment', cible: M.segmentGain, segment });
  const record = h.slice(-M.recordSemaines);
  if (record.length >= 4) possibles.push({ ...base, type: 'record', cible: arrondirCent(Math.max(...record.map((x) => x.recette))) + 100 });
  return possibles;
}

/** Tire l'objectif de la semaine qui commence : jamais deux fois le même d'affilée, quand il y a le choix. */
export function tirerObjectifLibre(etat: EtatJeu, precedent: TypeObjectifLibre | null): ObjectifLibre {
  const tous = objectifsPossibles(etat);
  const autres = tous.filter((o) => o.type !== precedent);
  const tirage = creerTirage(etat.hasardModeLibre);
  const choisi = tirage.choisir(autres.length ? autres : tous);
  etat.hasardModeLibre = tirage.etat();
  return choisi;
}

/** Où en est l'objectif, sur la semaine en cours (ou sur la semaine close, au lundi). */
export function valeurLibre(
  etat: EtatJeu,
  o: ObjectifLibre,
  semaine: { comptes: Comptes; servis: number; satisfactionDebut: Record<Segment, number> } = etat.semaine,
  satisfaction: Record<Segment, number> = etat.clientele.satisfaction,
): number {
  switch (o.type) {
    case 'recette':
    case 'record':
      return recetteActivite(semaine.comptes);
    case 'calme':
      return etat.chronique.incidents - o.incidentsDebut;
    case 'segment':
      return o.segment ? Math.round(satisfaction[o.segment] - semaine.satisfactionDebut[o.segment]) : 0;
  }
}

export function libreReussi(o: { type: TypeObjectifLibre; cible: number }, valeur: number): boolean {
  return o.type === 'calme' ? valeur <= o.cible : valeur >= o.cible;
}

/**
 * Le lundi, une fois la semaine close : l'objectif de la semaine écoulée est jugé (sa récompense tombe),
 * la semaine rejoint l'historique, puis, en mode libre, l'objectif de la nouvelle semaine est tiré.
 */
export function lundiModeLibre(etat: EtatJeu, evenements: Sortie): void {
  const b = etat.bilanSemaine;
  const m = etat.modeLibre;
  if (!b) return;
  let resultat: ResultatLibre | null = null;
  if (m.objectif) {
    const o = m.objectif;
    const valeur = valeurLibre(etat, o, b, b.satisfactionFin);
    const reussi = libreReussi(o, valeur);
    resultat = { type: o.type, cible: o.cible, segment: o.segment, valeur, reussi };
    if (reussi) {
      m.reussis += 1;
      m.serie += 1;
      m.meilleureSerie = Math.max(m.meilleureSerie, m.serie);
      const r = B.MODE_LIBRE.recompenses[o.type];
      const effet = 'satisfaction' in r ? { satisfaction: o.segment ? { [o.segment]: r.satisfaction } : {} } : r;
      appliquerEffet(etat, effet, { employeId: null }, { ajouterClient: () => {}, demarrerSuite: () => {} });
    } else {
      m.rates += 1;
      m.serie = 0;
    }
    evenements.push({ type: 'objectifLibreConclu', objectif: o.type, reussi });
  }
  m.historique = [...m.historique, { recette: recetteActivite(b.comptes), servis: b.servis }].slice(-B.MODE_LIBRE.historique);
  m.objectif = null;
  if (etat.systemes.modeLibre) {
    m.objectif = tirerObjectifLibre(etat, resultat?.type ?? null);
    evenements.push({ type: 'objectifLibre', objectif: m.objectif.type });
    if (!m.presente) {
      m.presente = true;
      b.ouvertures = [...(b.ouvertures ?? []), 'modeLibre'];
    }
  }
  b.modeLibre = { resultat, nouveau: m.objectif };
}
