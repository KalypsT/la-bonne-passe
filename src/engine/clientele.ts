// Clientèle : satisfaction par segment, réputation en moyenne pondérée, fréquentation.
// Voir « Segments » dans les spécifications.

import * as B from '../content/balance';
import { SEGMENTS, type Segment } from '../content/clientele';
import type { EtatJeu } from './etat';

export const LISTE_SEGMENTS = Object.keys(SEGMENTS) as Segment[];

/** Nombre de clients par segment. */
export type ParSegment = Record<Segment, number>;

export interface FrequentationNuit {
  servis: ParSegment;
  perdus: ParSegment;
}

export interface Clientele {
  /** Satisfaction de chaque segment, de 0 à 100 : la réputation auprès de lui. */
  satisfaction: ParSegment;
  /** Satisfaction à l'ouverture de la dernière nuit, pour montrer ce qui a bougé. */
  satisfactionOuverture: ParSegment;
  /** Fréquentation des dernières nuits, la plus récente en premier. */
  historique: FrequentationNuit[];
}

const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function parSegment(valeur: number): ParSegment {
  return { touriste: valeur, habitue: valeur, affaires: valeur, groupe: valeur };
}

export function clienteleDeDepart(reputation: number = B.REPUTATION_INITIALE): Clientele {
  return { satisfaction: parSegment(reputation), satisfactionOuverture: parSegment(reputation), historique: [] };
}

/** Segments de clientèle ouverts : Touristes et Habitués d'emblée, Affaires et Groupes au palier 2. */
export function segmentOuvert(etat: EtatJeu, segment: Segment): boolean {
  if (segment === 'affaires') return etat.systemes.affaires;
  if (segment === 'groupe') return etat.systemes.groupes;
  return true;
}

export function segmentsOuverts(etat: EtatJeu): Segment[] {
  return LISTE_SEGMENTS.filter((s) => segmentOuvert(etat, s));
}

/** Réputation globale : moyenne des satisfactions des segments ouverts, pondérée. */
export function reputationPonderee(etat: EtatJeu): number {
  let somme = 0;
  let poids = 0;
  for (const s of segmentsOuverts(etat)) {
    somme += etat.clientele.satisfaction[s] * B.POIDS_REPUTATION[s];
    poids += B.POIDS_REPUTATION[s];
  }
  return poids > 0 ? somme / poids : etat.reputation;
}

export function recalculerReputation(etat: EtatJeu): void {
  etat.reputation = borner(reputationPonderee(etat));
}

/** Met tous les segments à la même satisfaction (nouvelle partie, tests, migrations). */
export function fixerReputation(etat: EtatJeu, reputation: number): void {
  etat.clientele.satisfaction = parSegment(reputation);
  recalculerReputation(etat);
}

/** Change la satisfaction d'un segment, et la réputation globale avec elle. */
export function changerSatisfaction(etat: EtatJeu, segment: Segment, delta: number): void {
  etat.clientele.satisfaction[segment] = borner(etat.clientele.satisfaction[segment] + delta);
  recalculerReputation(etat);
}

/** Un événement qui touche tout le monde (dispute, imprévu) : chaque segment bouge d'autant. */
export function changerReputationGlobale(etat: EtatJeu, delta: number): void {
  for (const s of LISTE_SEGMENTS) etat.clientele.satisfaction[s] = borner(etat.clientele.satisfaction[s] + delta);
  recalculerReputation(etat);
}

/**
 * Variation de satisfaction après un rendez-vous, avant le facteur par client et l'offre du soir.
 * Les gains ralentissent quand la satisfaction monte ; les pertes tombent en entier.
 */
export function gainReputation(satisfaction: number, qualite: number): number {
  const brut = (qualite - 0.4) * B.REPUTATION_PAR_RDV;
  return brut > 0 ? brut * Math.pow(1 - satisfaction / 100, B.REPUTATION_FREIN) : brut;
}

/** Attrait d'un segment dans les arrivées : un segment content revient plus souvent. */
export function attraitSegment(etat: EtatJeu, segment: Segment): number {
  return B.ATTRAIT_BASE + etat.clientele.satisfaction[segment] * B.ATTRAIT_PENTE[segment];
}

/**
 * Des segments s'ouvrent : ils partent de la réputation acquise, pour que la moyenne ne chute pas.
 * À appeler avant d'ouvrir leurs drapeaux.
 */
export function accueillirSegments(etat: EtatJeu, segments: Segment[]): void {
  for (const s of segments) if (!segmentOuvert(etat, s)) etat.clientele.satisfaction[s] = etat.reputation;
}

/** Une nouvelle nuit commence : on note la satisfaction de départ et une ligne de fréquentation vierge. */
export function ouvrirNuitClientele(etat: EtatJeu): void {
  etat.clientele.satisfactionOuverture = { ...etat.clientele.satisfaction };
  etat.clientele.historique = [{ servis: parSegment(0), perdus: parSegment(0) }, ...etat.clientele.historique].slice(
    0,
    B.NUITS_HISTORIQUE_CLIENTELE,
  );
}

export function noterClient(etat: EtatJeu, segment: Segment, issue: 'servis' | 'perdus'): void {
  // Une partie reprise en pleine soirée (sauvegarde d'avant la v0.3) n'a pas encore sa ligne.
  if (etat.clientele.historique.length === 0) etat.clientele.historique.push({ servis: parSegment(0), perdus: parSegment(0) });
  etat.clientele.historique[0]![issue][segment] += 1;
  etat.semaine[issue] += 1;
  if (issue === 'servis') etat.semaine.stats.servis[segment] += 1;
}

/** Fréquentation cumulée des dernières nuits. */
export function frequentation(etat: EtatJeu): FrequentationNuit {
  const total = { servis: parSegment(0), perdus: parSegment(0) };
  for (const nuit of etat.clientele.historique) {
    for (const s of LISTE_SEGMENTS) {
      total.servis[s] += nuit.servis[s];
      total.perdus[s] += nuit.perdus[s];
    }
  }
  return total;
}
