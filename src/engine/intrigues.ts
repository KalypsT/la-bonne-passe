// Intrigues : chaînes de cartes sur plusieurs jours, conditions de déclenchement, conséquences différées.
// Les définitions vivent dans src/content/intrigues.ts ; ce fichier les fait avancer.

import * as B from '../content/balance';
import { INTRIGUES, trouverIntrigue, type ConditionIntrigue, type EtapeIntrigue, type Issue } from '../content/intrigues';
import type { Segment } from '../content/clientele';
import type { IdActeur } from '../content/relations';
import type { EvenementRelation } from './relations';
import type { EvenementRivale } from './rivale';
import { candidatRival, type EvenementRecrutement } from './recrutement';
import type { EtatJeu } from './etat';
import { appliquerEffet, effetPossible } from './effets';
import type { Tirage } from './hasard';
import { encaisser, depenser } from './comptes';
import type { EvenementPersonnel } from './personnel';
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
  /** Argent avancé à la personne concernée, qu'elle rembourse peut-être plus tard. */
  avance?: number;
  /** Points accumulés par les choix : les étapes suivantes peuvent les exiger. */
  points?: number;
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
  | { type: 'intrigueFinie'; id: string; fin: string; prenom?: string }
  | { type: 'remboursement'; prenom: string; montant: number };

export type OrdreIntrigue = { type: 'choixIntrigue'; choix: number };

interface Sortie {
  push(e: EvenementIntrigue | EvenementPersonnel | EvenementRelation | EvenementRivale | EvenementRecrutement): unknown;
}

/** Instant absolu d'une heure de l'horloge, un jour donné (le jour commence à 5 h). */
export function instantDe(jour: number, heure: number): number {
  return (jour - 1) * MINUTES_PAR_JOUR + ecart(B.HEURE_DEBUT_JOURNEE, heure);
}

function heureDeSoiree(heure: number): boolean {
  return dansPlage(heure, B.HEURE_OUVERTURE, B.HEURE_FERMETURE);
}

/** Une condition, lue pour la personne concernée par l'intrigue s'il y en a une. */
export function conditionRemplie(etat: EtatJeu, c: ConditionIntrigue | undefined, employeId: string | null = null, points = 0): boolean {
  if (!c) return true;
  if (c.pointsMin !== undefined && points < c.pointsMin) return false;
  if (c.pointsMax !== undefined && points > c.pointsMax) return false;
  const e = etat.personnel.find((x) => x.id === (employeId ?? c.employe));
  const personnelle = c.moralMin !== undefined || c.moralMax !== undefined || c.nuitsMin !== undefined || c.confirme || c.fragile;
  if (personnelle && !e) return false;
  if (e) {
    if (c.moralMin !== undefined && e.moral < c.moralMin) return false;
    if (c.moralMax !== undefined && e.moral > c.moralMax) return false;
    if (c.nuitsMin !== undefined && e.nuitsTravaillees < c.nuitsMin) return false;
    if (c.confirme && e.finEssai !== null) return false;
    if (c.fragile && e.moral >= B.RIVALE.moralFragile && e.loyaute >= B.RIVALE.loyauteFragile) return false;
  }
  if (c.fragile && !e) return false;
  if (c.rivaleRelationMin !== undefined && etat.rivale.relation < c.rivaleRelationMin) return false;
  return (
    (c.palierMin === undefined || etat.palier >= c.palierMin) &&
    (c.tapageMin === undefined || etat.quartier.tapage >= c.tapageMin) &&
    (c.tapageMax === undefined || etat.quartier.tapage <= c.tapageMax) &&
    (c.employe === undefined || etat.personnel.some((e) => e.id === c.employe)) &&
    (c.jourMin === undefined || etat.jour >= c.jourMin) &&
    Object.entries(c.relationMin ?? {}).every(([a, v]) => etat.relations.jauges[a as IdActeur] >= (v ?? 0)) &&
    Object.entries(c.relationMax ?? {}).every(([a, v]) => etat.relations.jauges[a as IdActeur] <= (v ?? 0))
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

function demarrer(etat: EtatJeu, id: string, delai: number, employeId: string | null, premiere?: string): void {
  const def = trouverIntrigue(id);
  if (!def || etat.intrigues.actives.some((a) => a.id === id)) return;
  const etape = premiere && def.etapes[premiere] ? premiere : def.premiere;
  const active: IntrigueActive = { id, etape, echeance: 0, employeId, debut: etat.jour };
  programmer(etat, active, etape, delai);
  etat.intrigues.actives.push(active);
}

/** Une intrigue démarrée de l'extérieur (la rivale qui débauche), avec sa cible et parfois une autre première carte. */
export function demarrerIntrigue(etat: EtatJeu, id: string, delai: number, employeId: string | null, premiere?: string): void {
  if (trouverIntrigue(id)?.genre !== 'intrigue') return;
  demarrer(etat, id, delai, employeId, premiere);
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
    if (!conditionRemplie(etat, etape.condition, active.employeId, active.points ?? 0)) {
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

export function trancherIntrigue(
  etat: EtatJeu,
  choix: number,
  tirage: Tirage,
  ajouterClient: (segment?: Segment) => void,
  evenements: Sortie,
): void {
  const active = etat.intrigues.actives.find((a) => a.id === etat.intrigues.carte);
  const etape = active && etapeDe(active);
  const option = etape?.choix[choix];
  if (!active || !option || !effetPossible(etat, option.effet)) return;
  const reussite = option.chance === undefined || tirage.chance(option.chance);
  const effet = reussite ? option.effet : (option.echec ?? {});
  const issue = reussite ? option.suite : (option.suiteEchec ?? option.suite);
  const prenom = prenomDe(etat, active.employeId);
  etat.intrigues.carte = null;
  if (effet.points) active.points = (active.points ?? 0) + effet.points;
  // L'avance et son remboursement passent par la mémoire de l'intrigue.
  if (effet.avance) {
    depenser(etat, effet.avance, 'personnel');
    active.avance = (active.avance ?? 0) + effet.avance;
  }
  if (effet.rembourser && active.avance) {
    encaisser(etat, active.avance, 'autres');
    evenements.push({ type: 'remboursement', prenom: prenom ?? '', montant: active.avance });
    active.avance = 0;
  }
  appliquerEffet(etat, effet, { employeId: active.employeId }, {
    ajouterClient,
    demarrerSuite: (id, delai, employeId) => demarrerSuite(etat, id, delai, employeId),
    candidatRival: () => candidatRival(etat, tirage, evenements),
    evenements,
  });
  evenements.push({ type: 'intrigueTranchee', id: active.id, etape: active.etape, choix, reussite, prenom });
  suivre(etat, active, issue, evenements);
}
