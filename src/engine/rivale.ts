// La maison rivale (v0.5, palier 3) : le Chat Noir réagit à la maison chaque lundi, et le joueur peut lui répondre.
// Voir « Maisons rivales » dans les spécifications ; valeurs dans balance.ts (RIVALE), textes dans src/content/rivale.ts.

import * as B from '../content/balance';
import { trouverIntrigue } from '../content/intrigues';
import { humeurRivale, type IdReponseRivale } from '../content/rivale';
import type { Segment } from '../content/clientele';
import { frequentation } from './clientele';
import { depenser } from './comptes';
import type { Employe, EtatJeu } from './etat';
import { creerTirage, type Tirage } from './hasard';
import { demarrerIntrigue, demarrerSuite } from './intrigues';
import { candidatRival, type EvenementRecrutement } from './recrutement';
import { changerRelation, type EvenementRelation } from './relations';

export interface Rivale {
  /** De 0 à 100 : combien la maison lui fait de l'ombre, et combien elle le fait payer. */
  agressivite: number;
  /** Vos rapports, de −100 à +100. */
  relation: number;
  /** Demande des habitués et des clients d'affaires multipliée jusqu'au prochain lundi (prix cassés, ou rumeur réussie). */
  concurrence: number;
  /** Trêve jusqu'à ce jour (exclu), ou 0. */
  treve: number;
  /** Un faux client viendra faire un scandale une des prochaines soirées. */
  sabotage: boolean;
  /** Sa dernière action (identifiant de ACTIONS_RIVALE) et son jour. */
  derniereAction: { id: string; jour: number } | null;
  /** Jour de la dernière réponse du joueur (très négatif : jamais). */
  derniereReponse: number;
  /** Jour de la dernière tentative de débauchage. */
  dernierDebauchage: number;
  /** Prénoms des personnes parties chez elle. */
  transfuges: string[];
}

export type EvenementRivale =
  | { type: 'rivaleAgit'; action: string }
  | { type: 'rivaleHumeur'; humeur: number }
  | { type: 'reponseRivale'; reponse: IdReponseRivale; reussite: boolean; montant: number }
  | { type: 'treveFinie' };

export type OrdreRivale = { type: 'reponseRivale'; reponse: IdReponseRivale };

interface Sortie {
  push(e: EvenementRivale | EvenementRelation | EvenementRecrutement): unknown;
}

const JAMAIS = -99;
const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function rivaleDeDepart(): Rivale {
  return {
    agressivite: B.RIVALE.agressiviteDepart,
    relation: B.RIVALE.relationDepart,
    concurrence: 1,
    treve: 0,
    sabotage: false,
    derniereAction: null,
    derniereReponse: JAMAIS,
    dernierDebauchage: JAMAIS,
    transfuges: [],
  };
}

export function rivaleOuverte(etat: EtatJeu): boolean {
  return etat.systemes.rivale;
}

export function enTreve(etat: EtatJeu): boolean {
  return etat.jour < etat.rivale.treve;
}

/** Fait bouger l'agressivité ; le journal note quand son humeur change. */
export function changerAgressivite(etat: EtatJeu, delta: number, evenements?: { push(e: EvenementRivale): unknown }): void {
  const avant = humeurRivale(etat.rivale.agressivite);
  etat.rivale.agressivite = Math.round(borner(etat.rivale.agressivite + delta) * 10) / 10;
  const apres = humeurRivale(etat.rivale.agressivite);
  if (evenements && rivaleOuverte(etat) && apres !== avant) evenements.push({ type: 'rivaleHumeur', humeur: apres });
}

export function changerRapports(etat: EtatJeu, delta: number): void {
  etat.rivale.relation = Math.round(borner(etat.rivale.relation + delta, -100, 100) * 10) / 10;
}

/** Combien la maison fait de l'ombre au Chat Noir : sa réputation, et sa part d'habitués et de clients d'affaires. */
export function cibleAgressivite(etat: EtatJeu): number {
  const R = B.RIVALE;
  const f = frequentation(etat).servis;
  const total = Object.values(f).reduce((a, b) => a + b, 0);
  const part = total > 0 ? (f.habitue + f.affaires) / total : 0;
  return borner((etat.reputation - R.reputationNeutre) * R.parReputation + part * R.parClientele);
}

/** La personne que le Chat Noir voudrait débaucher : la plus douée, surtout si elle est peu attachée à la maison. */
export function cibleDebauchage(etat: EtatJeu): Employe | null {
  const prises = new Set(etat.intrigues.actives.map((a) => a.employeId));
  const milaEnArc = etat.intrigues.actives.some((a) => a.id === 'mila') || !etat.intrigues.finies.some((f) => f.id === 'mila');
  const candidats = etat.personnel.filter(
    (e) => e.finEssai === null && !prises.has(e.id) && e.menaceDepart === null && !(e.id === 'mila' && milaEnArc),
  );
  const valeur = (e: Employe) => Object.values(e.talents).reduce((a, b) => a + b, 0) * (1 + (60 - e.loyaute) / 100);
  return candidats.sort((a, b) => valeur(b) - valeur(a))[0] ?? null;
}

function intriguesEnCours(etat: EtatJeu): number {
  return etat.intrigues.actives.filter((a) => trouverIntrigue(a.id)?.genre === 'intrigue').length;
}

/** Les actions possibles ce lundi, avec leur poids. */
function actionsPossibles(etat: EtatJeu): { id: string; poids: number }[] {
  const R = B.RIVALE;
  return Object.entries(R.actions)
    .filter(([id, a]) => {
      if (etat.rivale.agressivite < a.min) return false;
      if (id === 'debauchage') {
        return (
          etat.jour - etat.rivale.dernierDebauchage >= R.debauchageRepit &&
          intriguesEnCours(etat) < B.INTRIGUES_MAX_ACTIVES &&
          !etat.intrigues.actives.some((x) => x.id === 'offreChatNoir') &&
          cibleDebauchage(etat) !== null
        );
      }
      return true;
    })
    .map(([id, a]) => ({ id, poids: a.poids }));
}

/**
 * Le lundi matin : la concurrence de la semaine passée s'efface, l'agressivité se rapproche de sa cible,
 * puis la rivale agit peut-être. Le tout premier lundi, elle se présente. Son propre générateur : pas de bifurcation.
 */
export function lundiDeLaRivale(etat: EtatJeu, evenements: Sortie): void {
  if (!rivaleOuverte(etat)) return;
  const r = etat.rivale;
  const R = B.RIVALE;
  r.concurrence = 1;
  if (r.treve > 0 && etat.jour >= r.treve) {
    r.treve = 0;
    evenements.push({ type: 'treveFinie' });
  }
  changerAgressivite(etat, (cibleAgressivite(etat) - r.agressivite) * R.rapprochement, evenements);

  const tirage = creerTirage(etat.hasardRivale);
  const action = choisirAction(etat, tirage);
  etat.hasardRivale = tirage.etat();
  if (!action) return;
  r.derniereAction = { id: action, jour: etat.jour };
  evenements.push({ type: 'rivaleAgit', action });
  switch (action) {
    case 'visite':
      demarrerSuite(etat, 'chatNoirVisite', 0, null);
      break;
    case 'prix':
      demarrerSuite(etat, 'chatNoirPrix', 0, null);
      break;
    case 'rumeur':
      demarrerSuite(etat, 'chatNoirRumeur', 0, null);
      break;
    case 'alliance':
      demarrerSuite(etat, 'chatNoirAlliance', 0, null);
      break;
    case 'sabotage':
      r.sabotage = true;
      break;
    case 'debauchage': {
      const cible = cibleDebauchage(etat);
      if (!cible) break;
      r.dernierDebauchage = etat.jour;
      demarrerIntrigue(etat, 'offreChatNoir', 0, cible.id, cible.id === 'mila' ? 'verreMila' : undefined);
      break;
    }
  }
}

function choisirAction(etat: EtatJeu, tirage: Tirage): string | null {
  const r = etat.rivale;
  const R = B.RIVALE;
  if (r.derniereAction === null) return 'visite';
  if (enTreve(etat)) return null;
  if (r.relation >= R.allianceRelation && tirage.chance(R.allianceChance)) return 'alliance';
  if (!tirage.chance((r.agressivite / 100) * R.chanceAction)) return null;
  const possibles = actionsPossibles(etat);
  if (possibles.length === 0) return null;
  return tirage.choisir(
    possibles.map((p) => p.id),
    possibles.map((p) => p.poids),
  );
}

/** Demande d'un segment multipliée par la concurrence de la semaine (habitués et clients d'affaires). */
export function demandeRivale(etat: EtatJeu, segment: Segment): number {
  return segment === 'habitue' || segment === 'affaires' ? etat.rivale.concurrence : 1;
}

/** Jour à partir duquel le joueur peut de nouveau répondre à la rivale. */
export function prochaineReponse(etat: EtatJeu): number {
  return etat.rivale.derniereReponse + B.RIVALE.reponseRepit;
}

export function reponsePossible(etat: EtatJeu, reponse: IdReponseRivale): boolean {
  if (!rivaleOuverte(etat) || etat.jour < prochaineReponse(etat)) return false;
  const R = B.RIVALE;
  switch (reponse) {
    case 'debaucher':
      return etat.systemes.recrutement;
    case 'rumeur':
      return etat.tresorerie >= R.rumeur.cout;
    case 'treve':
      return etat.tresorerie >= R.treve.cout && !enTreve(etat);
  }
}

/** Chance que Colette Vos accepte une trêve : meilleure quand vos rapports sont bons. */
export function chanceTreve(etat: EtatJeu): number {
  const T = B.RIVALE.treve;
  return Math.min(0.95, T.chanceBase + ((etat.rivale.relation + 100) / 200) * T.chanceRelation);
}

/** Le joueur répond à la rivale, depuis sa fiche : une réponse par semaine. */
export function repondreRivale(etat: EtatJeu, reponse: IdReponseRivale, evenements: Sortie): void {
  if (!reponsePossible(etat, reponse)) return;
  const R = B.RIVALE;
  const r = etat.rivale;
  const tirage = creerTirage(etat.hasardRivale);
  r.derniereReponse = etat.jour;
  let reussite = true;
  let montant = 0;
  switch (reponse) {
    case 'debaucher':
      candidatRival(etat, tirage, evenements);
      changerRapports(etat, R.debaucher.relation);
      changerAgressivite(etat, R.debaucher.agressivite, evenements);
      break;
    case 'rumeur':
      montant = R.rumeur.cout;
      depenser(etat, montant, 'relations');
      reussite = tirage.chance(R.rumeur.reussite);
      changerRapports(etat, -10);
      changerAgressivite(etat, reussite ? 10 : 15, evenements);
      if (reussite) r.concurrence = Math.max(r.concurrence, R.rumeur.concurrence);
      else changerRelation(etat, 'presse', -8, evenements);
      break;
    case 'treve':
      montant = R.treve.cout;
      depenser(etat, montant, 'relations');
      reussite = tirage.chance(chanceTreve(etat));
      if (reussite) {
        r.treve = etat.jour + R.treve.jours;
        r.sabotage = false;
        changerRapports(etat, 15);
        changerAgressivite(etat, -30, evenements);
      } else changerRapports(etat, -5);
      break;
  }
  etat.hasardRivale = tirage.etat();
  evenements.push({ type: 'reponseRivale', reponse, reussite, montant });
}
