// Intrigues : chaînes de cartes sur plusieurs jours, conditions de déclenchement, conséquences différées.
// Les définitions vivent dans src/content/intrigues.ts ; ce fichier les fait avancer.

import * as B from '../content/balance';
import { INTRIGUES, trouverIntrigue, type ConditionIntrigue, type EtapeIntrigue, type Issue } from '../content/intrigues';
import type { EtatJeu } from './etat';
import { appliquerEffet, effetPossible } from './effets';
import type { Tirage } from './hasard';
import { dansPlage, ecart, estOuvert, instant, MINUTES_PAR_JOUR } from './temps';

export interface IntrigueActive {
  id: string;
  /** Étape attendue. */
  etape: string;
  /** Instant (minutes absolues) à partir duquel sa carte peut sortir. */
  echeance: number;
  /** Personne concernée, ou null. */
  employeId: string | null;
  /** Jour de départ. */
  debut: number;
}

export interface IntrigueFinie {
  id: string;
  fin: string;
  jour: number;
}

export interface Intrigues {
  actives: IntrigueActive[];
  finies: IntrigueFinie[];
  /** Intrigue dont la carte attend ta décision (en pause), ou null. */
  carte: string | null;
}

export function intriguesDeDepart(): Intrigues {
  return { actives: [], finies: [], carte: null };
}

export type EvenementIntrigue =
  | { type: 'intrigue'; id: string; etape: string; employeId: string | null }
  | { type: 'intrigueTranchee'; id: string; etape: string; choix: number; reussite: boolean; prenom?: string }
  | { type: 'intrigueFinie'; id: string; fin: string; prenom?: string };

export type OrdreIntrigue = { type: 'choixIntrigue'; choix: number };

interface Sortie {
  push(e: EvenementIntrigue): unknown;
}

/** Instant absolu d'une heure de l'horloge, un jour donné (le jour commence à 5 h). */
export function instantDe(jour: number, heure: number): number {
  return (jour - 1) * MINUTES_PAR_JOUR + ecart(B.HEURE_DEBUT_JOURNEE, heure);
}

function heureDeSoiree(heure: number): boolean {
  return dansPlage(heure, B.HEURE_OUVERTURE, B.HEURE_FERMETURE);
}

export function conditionRemplie(etat: EtatJeu, c: ConditionIntrigue | undefined): boolean {
  if (!c) return true;
  return (
    (c.palierMin === undefined || etat.palier >= c.palierMin) &&
    (c.tapageMin === undefined || etat.quartier.tapage >= c.tapageMin) &&
    (c.tapageMax === undefined || etat.quartier.tapage <= c.tapageMax) &&
    (c.employe === undefined || etat.personnel.some((e) => e.id === c.employe)) &&
    (c.jourMin === undefined || etat.jour >= c.jourMin)
  );
}

function etapeDe(active: IntrigueActive): EtapeIntrigue | undefined {
  return trouverIntrigue(active.id)?.etapes[active.etape];
}

/** L'étape courante d'une intrigue active, pour l'affichage. */
export function etapeCourante(etat: EtatJeu, id: string): EtapeIntrigue | undefined {
  const active = etat.intrigues.actives.find((a) => a.id === id);
  return active && etapeDe(active);
}

function prenomDe(etat: EtatJeu, employeId: string | null): string | undefined {
  return etat.personnel.find((e) => e.id === employeId)?.prenom;
}

/** Programme une étape : son heure, dans tant de jours (aujourd'hui si 0). */
function programmer(etat: EtatJeu, active: IntrigueActive, etape: string, delai: number): void {
  const def = trouverIntrigue(active.id);
  const heure = def?.etapes[etape]?.heure ?? B.HEURE_DEBUT_JOURNEE;
  active.etape = etape;
  active.echeance = instantDe(etat.jour + delai, heure);
}

function finir(etat: EtatJeu, active: IntrigueActive, fin: string, evenements: Sortie): void {
  etat.intrigues.actives = etat.intrigues.actives.filter((a) => a !== active);
  if (etat.intrigues.carte === active.id) etat.intrigues.carte = null;
  etat.intrigues.finies.push({ id: active.id, fin, jour: etat.jour });
  evenements.push({ type: 'intrigueFinie', id: active.id, fin, prenom: prenomDe(etat, active.employeId) });
}

function suivre(etat: EtatJeu, active: IntrigueActive, issue: Issue, evenements: Sortie): void {
  if ('fin' in issue) finir(etat, active, issue.fin, evenements);
  else programmer(etat, active, issue.etape, issue.delai);
}

function demarrer(etat: EtatJeu, id: string, delai: number, employeId: string | null): void {
  const def = trouverIntrigue(id);
  if (!def || etat.intrigues.actives.some((a) => a.id === id)) return;
  const active: IntrigueActive = { id, etape: def.premiere, echeance: 0, employeId, debut: etat.jour };
  programmer(etat, active, def.premiere, delai);
  etat.intrigues.actives.push(active);
}

/** Une suite différée, démarrée par un choix : elle ne compte pas parmi les intrigues actives. */
export function demarrerSuite(etat: EtatJeu, id: string, delai: number, employeId: string | null): void {
  if (trouverIntrigue(id)?.genre !== 'suite') return;
  demarrer(etat, id, delai, employeId);
}

/** Nombre d'intrigues (hors suites) en cours. */
function intriguesEnCours(etat: EtatJeu): number {
  return etat.intrigues.actives.filter((a) => trouverIntrigue(a.id)?.genre === 'intrigue').length;
}

/** Le matin : au plus une nouvelle intrigue démarre, si son déclencheur est rempli. */
export function matinDesIntrigues(etat: EtatJeu): void {
  if (intriguesEnCours(etat) >= B.INTRIGUES_MAX_ACTIVES) return;
  const derniereFin = Math.max(-99, ...etat.intrigues.finies.filter((f) => trouverIntrigue(f.id)?.genre === 'intrigue').map((f) => f.jour));
  if (etat.jour - derniereFin < B.INTRIGUES_ECART_JOURS) return;
  const dejaVues = new Set([...etat.intrigues.finies.map((f) => f.id), ...etat.intrigues.actives.map((a) => a.id)]);
  const def = INTRIGUES.find((d) => d.genre === 'intrigue' && !dejaVues.has(d.id) && conditionRemplie(etat, d.declencheur));
  if (def) demarrer(etat, def.id, 0, def.declencheur?.employe ?? null);
}

/**
 * À chaque pas : la première intrigue dont l'étape est due sort sa carte (en pause),
 * ou prend son issue `sinon` si sa condition n'est plus remplie.
 */
export function avancerIntrigues(etat: EtatJeu, evenements: Sortie): void {
  if (etat.intrigues.carte || etat.imprevu) return;
  const maintenant = instant(etat);
  const ouvert = estOuvert(etat);
  const journee = dansPlage(etat.minuteDuJour, B.HEURE_DEBUT_JOURNEE, B.HEURE_BRIEFING);
  for (const active of [...etat.intrigues.actives]) {
    const etape = etapeDe(active);
    if (!etape) {
      finir(etat, active, 'perdue', evenements);
      continue;
    }
    if (maintenant < active.echeance) continue;
    if (heureDeSoiree(etape.heure) ? !ouvert : !journee) continue;
    // La personne concernée est partie : l'histoire s'arrête là.
    if (active.employeId && !etat.personnel.some((e) => e.id === active.employeId)) {
      finir(etat, active, 'depart', evenements);
      continue;
    }
    if (!conditionRemplie(etat, etape.condition)) {
      suivre(etat, active, etape.sinon ?? { fin: 'oubliee' }, evenements);
      continue;
    }
    etat.intrigues.carte = active.id;
    evenements.push({ type: 'intrigue', id: active.id, etape: active.etape, employeId: active.employeId });
    return;
  }
}

/** Les choix possibles de la carte en cours (les travaux doivent être couverts par la trésorerie). */
export function choixPossibles(etat: EtatJeu): boolean[] {
  const active = etat.intrigues.actives.find((a) => a.id === etat.intrigues.carte);
  const etape = active && etapeDe(active);
  return etape?.choix.map((c) => effetPossible(etat, c.effet)) ?? [];
}

export function trancherIntrigue(etat: EtatJeu, choix: number, tirage: Tirage, ajouterClient: () => void, evenements: Sortie): void {
  const active = etat.intrigues.actives.find((a) => a.id === etat.intrigues.carte);
  const etape = active && etapeDe(active);
  const option = etape?.choix[choix];
  if (!active || !option || !effetPossible(etat, option.effet)) return;
  const reussite = option.chance === undefined || tirage.chance(option.chance);
  const effet = reussite ? option.effet : (option.echec ?? {});
  const issue = reussite ? option.suite : (option.suiteEchec ?? option.suite);
  const prenom = prenomDe(etat, active.employeId);
  etat.intrigues.carte = null;
  appliquerEffet(etat, effet, { employeId: active.employeId }, ajouterClient, (id, delai, employeId) =>
    demarrerSuite(etat, id, delai, employeId),
  );
  evenements.push({ type: 'intrigueTranchee', id: active.id, etape: active.etape, choix, reussite, prenom });
  suivre(etat, active, issue, evenements);
}
