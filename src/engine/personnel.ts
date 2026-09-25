// Le personnel suivi : traits, moral, loyauté, menaces de départ, affinités, entretien individuel et primes.
// Voir « Personnel » dans les spécifications.

import * as B from '../content/balance';
import { CHAMBRES } from '../content/maison';
import type { Employe, EtatJeu } from './etat';
import { creerTirage, type Tirage } from './hasard';

export type EvenementPersonnel =
  | { type: 'menaceDepart'; employeId: string; prenom: string; jour: number }
  | { type: 'menaceLevee'; employeId: string; prenom: string }
  | { type: 'depart'; prenom: string }
  | { type: 'promesseRompue'; employeId: string; prenom: string }
  | { type: 'entretienIndividuel'; employeId: string; prenom: string; reponse: ReponseEntretien }
  | { type: 'prime'; employeId: string; prenom: string; montant: number }
  | { type: 'amitie'; prenom: string; prenom2: string }
  | { type: 'rivalite'; prenom: string; prenom2: string };

export type ReponseEntretien = 'ecouter' | 'promettre' | 'recadrer';

export type OrdrePersonnel =
  | { type: 'entretienIndividuel'; employeId: string; reponse: ReponseEntretien }
  | { type: 'prime'; employeId: string; niveau: number }
  | { type: 'adieuVu' };

interface Sortie {
  push(e: EvenementPersonnel): unknown;
}

const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Les traits agissent qu'ils soient connus du joueur ou non. */
export function aTrait(e: Employe, trait: string): boolean {
  return e.traits.includes(trait);
}

export function changerMoral(e: Employe, delta: number): void {
  e.moral = borner(e.moral + delta);
}

/** Une personne Fidèle perd moins de loyauté. */
export function changerLoyaute(e: Employe, delta: number): void {
  const facteur = delta < 0 && aTrait(e, 'Fidèle') ? B.TRAITS_EFFETS.fideleLoyaute : 1;
  e.loyaute = borner(e.loyaute + delta * facteur);
}

// ——— Affinités ———

export function cleAffinite(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function affinite(etat: EtatJeu, a: string, b: string): number {
  return etat.affinites[cleAffinite(a, b)] ?? 0;
}

export function ajusterAffinite(etat: EtatJeu, a: string, b: string, delta: number): void {
  const cle = cleAffinite(a, b);
  etat.affinites[cle] = borner((etat.affinites[cle] ?? 0) + delta, -100, 100);
}

/** Affinités d'une recrue avec le reste de l'équipe : un peu de hasard, et la Mère poule qui arrondit les angles. */
export function initialiserAffinites(etat: EtatJeu, id: string): void {
  const tirage = creerTirage(etat.hasard);
  const recrue = etat.personnel.find((e) => e.id === id);
  if (!recrue) return;
  for (const autre of etat.personnel) {
    if (autre.id === id) continue;
    let valeur = Math.round(tirage.entre(-B.AFFINITE.initialeEcart, B.AFFINITE.initialeEcart));
    if (aTrait(autre, 'Mère poule') || aTrait(recrue, 'Mère poule')) valeur += B.AFFINITE.initialeMerePoule;
    etat.affinites[cleAffinite(id, autre.id)] = valeur;
  }
  etat.hasard = tirage.etat();
}

/** Variation d'affinité d'une paire après une nuit partagée. */
function evolutionAffinite(a: Employe, b: Employe, tirage: Tirage): number {
  const A = B.AFFINITE;
  let delta = A.parNuitPartagee + tirage.entre(-A.hasard, A.hasard);
  for (const e of [a, b]) {
    if (aTrait(e, 'Solitaire')) delta += A.solitaire;
    if (aTrait(e, 'Tête brûlée')) delta += A.teteBrulee;
    if (aTrait(e, 'Mère poule')) delta += A.merePoule;
  }
  // Deux fortes personnalités se marchent dessus.
  const fortes = [a, b].filter((e) => aTrait(e, 'Diva') || aTrait(e, 'Ambitieuse')).length;
  if (fortes === 2) delta += A.diva;
  return delta;
}

// ——— Nuit et matin ———

export function premiumOuverte(etat: EtatJeu): boolean {
  return etat.chambres.some((c) => c.ouverte && CHAMBRES.find((d) => d.id === c.id)?.premium);
}

/** À la fermeture : effets des traits, repos, affinités. */
export function nuitDuPersonnel(etat: EtatJeu, reputationDebut: number, tirage: Tirage, evenements: Sortie): void {
  const T = B.TRAITS_EFFETS;
  const gainReputation = Math.max(0, etat.reputation - reputationDebut);
  const premium = premiumOuverte(etat);

  for (const e of etat.personnel) {
    // Une Mère poule remonte le moral des autres.
    if (aTrait(e, 'Mère poule')) for (const autre of etat.personnel) if (autre !== e) changerMoral(autre, T.merePoule);
    if (!e.enServiceCeSoir) {
      changerMoral(e, B.MORAL_SOIR_DE_REPOS + (aTrait(e, 'Solitaire') ? T.solitaireMoralRepos : 0));
    }
    if (aTrait(e, 'Diva') && !premium) changerMoral(e, -T.divaSansPremium);
    if (aTrait(e, 'Ambitieuse')) changerMoral(e, gainReputation * T.ambitieuseParPoint);
  }

  // Affinités des paires qui ont travaillé ensemble.
  const enService = etat.personnel.filter((e) => e.enServiceCeSoir);
  for (let i = 0; i < enService.length; i++) {
    for (let j = i + 1; j < enService.length; j++) {
      const a = enService[i]!;
      const b = enService[j]!;
      const avant = affinite(etat, a.id, b.id);
      ajusterAffinite(etat, a.id, b.id, evolutionAffinite(a, b, tirage));
      const apres = affinite(etat, a.id, b.id);
      if (apres >= B.AFFINITE.seuilAmitie) {
        changerMoral(a, B.AFFINITE.moralAmitie);
        changerMoral(b, B.AFFINITE.moralAmitie);
      }
      if (avant < B.AFFINITE.seuilAmitie && apres >= B.AFFINITE.seuilAmitie) {
        evenements.push({ type: 'amitie', prenom: a.prenom, prenom2: b.prenom });
      }
      if (avant > B.AFFINITE.seuilRivalite && apres <= B.AFFINITE.seuilRivalite) {
        evenements.push({ type: 'rivalite', prenom: a.prenom, prenom2: b.prenom });
      }
    }
  }
}

/** Une personne quitte la maison : le reste de l'équipe et les habitués le sentent passer. */
export function depart(etat: EtatJeu, e: Employe, evenements: Sortie): void {
  etat.personnel = etat.personnel.filter((x) => x !== e);
  etat.essaisATrancher = etat.essaisATrancher.filter((id) => id !== e.id);
  for (const cle of Object.keys(etat.affinites)) if (cle.split('|').includes(e.id)) delete etat.affinites[cle];
  for (const autre of etat.personnel) changerMoral(autre, -B.DEPART_MORAL_AUTRES);
  etat.reputation = borner(etat.reputation - B.DEPART_REPUTATION);
  etat.adieux.push(e.prenom);
  evenements.push({ type: 'depart', prenom: e.prenom });
}

/** Délai pour retenir une personne qui menace de partir. */
export function delaiMenace(e: Employe): number {
  return (
    B.DELAI_MENACE + (aTrait(e, 'Fidèle') ? B.DELAI_MENACE_FIDELE : 0) + (e.loyaute >= B.LOYAUTE_DELAI_BONUS ? 1 : 0)
  );
}

/** Le matin : promesses non tenues, menaces de départ, départs. */
export function matinDuPersonnel(etat: EtatJeu, evenements: Sortie): void {
  for (const e of [...etat.personnel]) {
    if (e.promesseRepos !== null && etat.jour > e.promesseRepos) {
      e.promesseRepos = null;
      changerMoral(e, B.ENTRETIEN.promesseRompue.moral);
      changerLoyaute(e, B.ENTRETIEN.promesseRompue.loyaute);
      evenements.push({ type: 'promesseRompue', employeId: e.id, prenom: e.prenom });
    }
    if (e.menaceDepart !== null) {
      if (e.moral >= B.SEUIL_MENACE_LEVEE) {
        e.menaceDepart = null;
        evenements.push({ type: 'menaceLevee', employeId: e.id, prenom: e.prenom });
      } else if (etat.jour >= e.menaceDepart) {
        depart(etat, e, evenements);
      }
    } else if (e.moral < B.SEUIL_MENACE_DEPART) {
      e.menaceDepart = etat.jour + delaiMenace(e);
      evenements.push({ type: 'menaceDepart', employeId: e.id, prenom: e.prenom, jour: e.menaceDepart });
    }
  }
}

// ——— Ordres ———

export function peutRecevoirEnEntretien(etat: EtatJeu, e: Employe): boolean {
  return e.dernierEntretien !== etat.jour && !etat.rendezVous.some((r) => r.employeId === e.id);
}

export function peutRecevoirPrime(etat: EtatJeu, e: Employe): boolean {
  return etat.jour - e.dernierePrime >= B.JOURS_ENTRE_PRIMES;
}

export function appliquerPersonnel(etat: EtatJeu, ordre: OrdrePersonnel, evenements: Sortie): void {
  switch (ordre.type) {
    case 'entretienIndividuel': {
      const e = etat.personnel.find((x) => x.id === ordre.employeId);
      if (!e || !etat.systemes.planning || !peutRecevoirEnEntretien(etat, e)) return;
      e.dernierEntretien = etat.jour;
      const E = B.ENTRETIEN;
      if (ordre.reponse === 'ecouter') {
        changerMoral(e, E.ecouter.moral);
        changerLoyaute(e, E.ecouter.loyaute);
      } else if (ordre.reponse === 'promettre') {
        changerMoral(e, E.promettre.moral);
        changerLoyaute(e, E.promettre.loyaute);
        e.promesseRepos = etat.jour + E.delaiPromesse;
      } else {
        changerMoral(e, E.recadrer.moral);
        changerLoyaute(e, E.recadrer.loyaute);
        e.recadre = etat.jour;
      }
      evenements.push({ type: 'entretienIndividuel', employeId: e.id, prenom: e.prenom, reponse: ordre.reponse });
      return;
    }
    case 'prime': {
      const e = etat.personnel.find((x) => x.id === ordre.employeId);
      const prime = B.PRIMES[ordre.niveau];
      if (!e || !prime || !etat.systemes.planning || !peutRecevoirPrime(etat, e)) return;
      etat.tresorerie -= prime.montant;
      if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses += prime.montant;
      e.dernierePrime = etat.jour;
      changerMoral(e, prime.moral);
      changerLoyaute(e, prime.loyaute);
      evenements.push({ type: 'prime', employeId: e.id, prenom: e.prenom, montant: prime.montant });
      return;
    }
    case 'adieuVu':
      etat.adieux.shift();
      return;
  }
}
