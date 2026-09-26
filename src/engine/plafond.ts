// Le plafond de rendez-vous par nuit (v0.6) : crans de 2 à 6, fatigue attendue au briefing,
// refus ou négociation au cran 6. Voir « Actions du joueur » dans les spécifications.
// Le personnel travaille librement : au cran 6, une personne fatiguée ou au moral bas peut dire non.

import * as B from '../content/balance';
import { depenser } from './comptes';
import type { Employe, EtatJeu } from './etat';
import { creerTirage, tirer } from './hasard';
import { aTrait } from './personnel';

/** Réponse d'une personne au cran 6. */
export type ReponsePlafond = 'accepte' | 'refuse' | 'negociePrime' | 'negocieRepos';

/** Ce que le joueur répond à une négociation : accepter (prime ou repos promis) ou la laisser à 5. */
export type AccordPlafond = 'accepter' | 'refuser';

export type EvenementPlafond =
  | { type: 'plafondRefuse'; employeId: string; prenom: string }
  | { type: 'plafondAccord'; employeId: string; prenom: string; contrepartie: 'prime' | 'repos'; montant: number };

interface Sortie {
  push(e: EvenementPlafond): unknown;
}

/** Plafond de la personne ce soir : celui du planning, ou le sien si elle a refusé le 6. */
export function plafondDe(etat: EtatJeu, e: Employe): number {
  return Math.min(etat.rdvMax, e.plafondCeSoir ?? Infinity);
}

/** Rendez-vous qu'une charge de planning permet dans une formule (un court compte moins, une soirée complète plus). */
export function rendezVousPourCharge(charge: number, formule: B.IdFormule = 'standard'): number {
  return Math.floor(charge / B.FORMULES[formule].charge + 1e-9);
}

/** Fatigue moyenne d'un rendez-vous pour cette personne, ce soir. */
function fatigueParRdv(e: Employe, formule: B.IdFormule, theme: string | null): number {
  const moyenne = (B.FATIGUE_PAR_RDV_MIN + B.FATIGUE_PAR_RDV_MAX) / 2;
  const fetarde = aTrait(e, 'Fêtarde') ? B.TRAITS_EFFETS.fetardeFatigue : 1;
  const themeFatigue = theme ? (B.THEMES[theme]?.fatigue ?? 1) : 1;
  return moyenne * B.FORMULES[formule].fatigue * themeFatigue * fetarde;
}

/** Durée de la soirée, en heures. */
const HEURES_SOIREE = (B.HEURE_FERMETURE + 24 * 60 - B.HEURE_OUVERTURE) / 60;

/**
 * Fatigue attendue en fin de nuit si la personne fait tous ses rendez-vous au cran donné :
 * la fatigue déjà là, plus chaque rendez-vous (Fêtarde, formule et thème compris), moins le peu
 * qu'elle récupère entre deux clients.
 */
export function fatigueFinDeNuit(e: Employe, cran: number, formule: B.IdFormule = 'standard', theme: string | null = null): number {
  const rdv = rendezVousPourCharge(cran, formule);
  const heuresLibres = Math.max(0, HEURES_SOIREE - (rdv * (B.DUREE_RDV_MIN + B.DUREE_RDV_MAX)) / 2 / 60 * B.FORMULES[formule].duree);
  const fin = e.fatigue + rdv * fatigueParRdv(e, formule, theme) - heuresLibres * B.RECUPERATION_EN_SERVICE;
  return Math.min(100, Math.max(0, fin));
}

/** Fatigue attendue au briefing du lendemain, après une journée de repos. */
export function fatigueLendemain(finDeNuit: number, e: Employe): number {
  const recup = B.RECUPERATION_AU_REPOS * (aTrait(e, 'Solitaire') ? B.TRAITS_EFFETS.solitaireRepos : 1);
  return Math.max(0, finDeNuit - recup * B.HEURES_ENTRE_DEUX_NUITS);
}

/** Une graine par personne, pour que sa réponse ne dépende ni de l'ordre ni des autres. */
function graine(etat: EtatJeu, id: string): number {
  let h = etat.hasardPlafond ^ Math.imul(etat.jour, 0x9e3779b1);
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return h | 0;
}

/** La personne peut-elle discuter le cran 6 ? Seulement fatiguée ou au moral bas. */
export function peutDiscuter(e: Employe): boolean {
  return e.fatigue >= B.PLAFOND.seuilFatigue || e.moral < B.PLAFOND.seuilMoral;
}

/** Chance que la personne n'accepte pas le 6 d'emblée. */
export function chanceReticence(e: Employe): number {
  if (!peutDiscuter(e)) return 0;
  const P = B.PLAFOND;
  const deux = e.fatigue >= P.seuilFatigue && e.moral < P.seuilMoral;
  const traits = e.traits.reduce((m, t) => m * (P.traits[t] ?? 1), 1);
  return Math.min(P.chanceMax, P.chance * (deux ? 2 : 1) * traits);
}

/**
 * Réponse de la personne au cran 6, tirée avec son propre hasard : le briefing la montre avant
 * de valider, et la validation retrouve la même.
 */
export function reponsePlafond(etat: EtatJeu, e: Employe, cran: number): ReponsePlafond {
  if (cran < B.PLAFOND.cranNegocie || !peutDiscuter(e)) return 'accepte';
  const tirage = creerTirage(graine(etat, e.id));
  if (!tirage.chance(chanceReticence(e))) return 'accepte';
  const negocier = Math.min(1, B.PLAFOND.negocier + (e.loyaute / 100 - 0.5) * B.PLAFOND.negocierLoyaute);
  if (!tirage.chance(negocier)) return 'refuse';
  // Une promesse de repos déjà en cours : elle demande une prime.
  if (e.promesseRepos !== null) return 'negociePrime';
  if (aTrait(e, 'Ambitieuse')) return 'negociePrime';
  if (aTrait(e, 'Mère poule') || aTrait(e, 'Solitaire')) return 'negocieRepos';
  return tirage.chance(0.5) ? 'negociePrime' : 'negocieRepos';
}

/**
 * Au briefing validé : chaque personne en service répond au cran choisi. Un refus, ou une négociation
 * que tu ne prends pas, la laisse à 5 ; un accord se paie (prime) ou se promet (soir de repos).
 */
export function appliquerPlafond(etat: EtatJeu, accords: Record<string, AccordPlafond>, evenements: Sortie): void {
  for (const e of etat.personnel) {
    e.plafondCeSoir = undefined;
    if (e.reposPrevu) continue;
    const reponse = reponsePlafond(etat, e, etat.rdvMax);
    if (reponse === 'accepte') continue;
    if (reponse !== 'refuse' && accords[e.id] === 'accepter') {
      if (reponse === 'negociePrime') {
        depenser(etat, B.PLAFOND.prime, 'personnel');
        evenements.push({ type: 'plafondAccord', employeId: e.id, prenom: e.prenom, contrepartie: 'prime', montant: B.PLAFOND.prime });
      } else {
        e.promesseRepos = etat.jour + B.ENTRETIEN.delaiPromesse;
        evenements.push({ type: 'plafondAccord', employeId: e.id, prenom: e.prenom, contrepartie: 'repos', montant: 0 });
      }
      continue;
    }
    e.plafondCeSoir = B.PLAFOND.repli;
    evenements.push({ type: 'plafondRefuse', employeId: e.id, prenom: e.prenom });
  }
  // Le hasard du plafond avance une fois par briefing : demain, d'autres humeurs.
  etat.hasardPlafond = tirer(etat.hasardPlafond).etat;
}
