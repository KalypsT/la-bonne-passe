// Palier 5, « S'agrandir » (v0.6, partie 7) : le permis de la mairie, le bâtiment voisin, la gérante,
// et le projet d'une deuxième maison. Voir « Montée en puissance » dans les spécifications ; valeurs dans balance.ts.

import * as B from '../content/balance';
import { LIEUX, type IdAgrandissement } from '../content/agrandir';
import { trouverChambre } from '../content/maison';
import { depenser, recetteMaison } from './comptes';
import type { EtatChambre, EtatJeu } from './etat';
import { creerTirage, tirer } from './hasard';
import { instant } from './temps';
import { maisonPrete } from './maison2';

export interface Permis {
  statut: 'aucun' | 'depose' | 'refuse' | 'accorde';
  /** Jour du dépôt ou de la réponse. */
  jour: number;
}

export interface Agrandissement {
  /** Parts du bâtiment voisin rachetées, dans l'ordre. */
  achete: IdAgrandissement[];
  /** Travaux en cours : la part rachetée et l'instant de fin (minutes absolues). */
  enCours: { option: IdAgrandissement; fin: number } | null;
}

export interface OffreLieu {
  id: string;
  achat: number;
  travaux: number;
  jours: number;
}

export interface Etablissement {
  offres: OffreLieu[];
  /** Lieu acheté, ou null. */
  lieu: string | null;
  statut: 'offres' | 'signe' | 'travaux' | 'pret' | 'ouvert';
  /** Jour de fin des travaux. */
  fin: number;
}

export type EvenementAgrandir =
  | { type: 'permisDepose'; montant: number }
  | { type: 'permis'; accorde: boolean }
  | { type: 'agrandissement'; option: IdAgrandissement; montant: number; fin: number }
  | { type: 'agrandissementFini'; option: IdAgrandissement; chambres: string[] }
  | { type: 'gerance'; employeId: string; accepte: boolean; ambition: boolean }
  | { type: 'geranceFinie'; employeId: string }
  | { type: 'geranteRepos'; employeId: string }
  | { type: 'caisse'; montant: number }
  | { type: 'achatLieu'; lieu: string; montant: number }
  | { type: 'travauxEtablissement'; lieu: string; montant: number; fin: number }
  | { type: 'etablissementPret'; lieu: string };

export type OrdreAgrandir =
  | { type: 'demanderPermis' }
  | { type: 'agrandir'; option: IdAgrandissement }
  | { type: 'promouvoir'; employeId: string }
  | { type: 'retrograder' }
  | { type: 'signerLieu'; lieu: string }
  | { type: 'lancerTravauxEtablissement' };

interface Sortie {
  push(e: EvenementAgrandir): unknown;
}

export function permisDeDepart(): Permis {
  return { statut: 'aucun', jour: 0 };
}

export function agrandissementDeDepart(): Agrandissement {
  return { achete: [], enCours: null };
}

export function etablissementDeDepart(): Etablissement {
  return { offres: [], lieu: null, statut: 'offres', fin: 0 };
}

/** Le hasard des lieux proposés, à part pour ne décaler aucun autre tirage. */
export function hasardEtablissementDeDepart(graine: number): number {
  return tirer(graine * 31 + 11).etat;
}

// ——— Le permis ———

export function peutDemanderPermis(etat: EtatJeu): boolean {
  return (
    etat.palier === 4 &&
    etat.systemes.relations &&
    etat.reputation >= B.PALIER_5.reputation &&
    (etat.permis.statut === 'aucun' || etat.permis.statut === 'refuse') &&
    etat.tresorerie >= B.PALIER_5.fraisDossier
  );
}

/** Le lundi, la mairie répond au dossier déposé : en bons termes et avec la réputation, le permis est accordé. */
export function reponseDuPermis(etat: EtatJeu, evenements: Sortie): void {
  if (etat.permis.statut !== 'depose') return;
  const accorde = etat.relations.jauges.mairie >= B.PALIER_5.mairie && etat.reputation >= B.PALIER_5.reputation;
  etat.permis = { statut: accorde ? 'accorde' : 'refuse', jour: etat.jour };
  evenements.push({ type: 'permis', accorde });
}

// ——— Le bâtiment voisin ———

/** Ce qui peut encore se racheter chez le voisin. */
export function optionsAgrandissement(etat: EtatJeu): IdAgrandissement[] {
  if (!etat.systemes.agrandissement || etat.agrandissement.enCours) return [];
  const a = etat.agrandissement.achete;
  if (a.length === 0) return ['etages', 'batiment'];
  if (a.includes('etages') && !a.includes('rez')) return ['rez'];
  return [];
}

/** Une maison agrandie peut accueillir jusqu'à 8 personnes (spécifications, « Personnel »). */
export function personnelMax(etat: EtatJeu): number {
  return etat.chambres.some((c) => B.AGRANDISSEMENT.batiment.chambres.includes(c.id as 'atelier')) ? B.PERSONNEL_MAX_AGRANDI : B.PERSONNEL_MAX;
}

function chambreNeuve(id: string): EtatChambre {
  const def = trouverChambre(id)!;
  return {
    id,
    ouverte: true,
    proprete: B.PROPRETE_APRES_TRAVAUX,
    etat: B.ETAT_APRES_TRAVAUX,
    travaux: null,
    decor: def.decor,
    decorAVenir: null,
    decorRefait: true,
    fermee: false,
    confort: 1,
    confortAVenir: null,
  };
}

/** Fin des travaux chez le voisin : les chambres rejoignent la maison, meublées. */
export function avancerAgrandissement(etat: EtatJeu, evenements: Sortie): void {
  const e = etat.agrandissement.enCours;
  if (e && instant(etat) >= e.fin) {
    const nouvelles = B.AGRANDISSEMENT[e.option].chambres.filter((id) => !etat.chambres.some((c) => c.id === id));
    for (const id of nouvelles) etat.chambres.push(chambreNeuve(id));
    etat.agrandissement.enCours = null;
    evenements.push({ type: 'agrandissementFini', option: e.option, chambres: [...nouvelles] });
  }
  const m = etat.etablissement;
  if (m.statut === 'travaux' && etat.jour >= m.fin && m.lieu) {
    m.statut = 'pret';
    evenements.push({ type: 'etablissementPret', lieu: m.lieu });
    // v1.0 : la maison attend sa gérante, et Josée le dit.
    maisonPrete(etat);
  }
}

// ——— La gérante ———

export function gerante(etat: EtatJeu) {
  return etat.gerante ? (etat.personnel.find((e) => e.id === etat.gerante) ?? null) : null;
}

export function peutPromouvoir(etat: EtatJeu, employeId: string): boolean {
  const e = etat.personnel.find((x) => x.id === employeId);
  return !!e && etat.systemes.gerante && gerante(etat) === null && e.finEssai === null && e.nuitsTravaillees >= B.GERANTE.nuitsMin;
}

/** Accepte si c'est son ambition, ou si sa loyauté ou son moral le permettent : le personnel peut refuser. */
export function accepteGerance(e: { ambition: string; loyaute: number; moral: number }): boolean {
  return e.ambition === 'gerante' || e.loyaute >= B.GERANTE.loyauteAccord || e.moral >= B.GERANTE.moralAccord;
}

/** À l'ouverture : la gérante prend son poste (sans recevoir), et met au repos qui est trop fatigué. */
export function ouvertureGerante(etat: EtatJeu, evenements: Sortie): void {
  const g = gerante(etat);
  if (!g) {
    etat.gerante = null;
    return;
  }
  g.repos = false;
  g.enServiceCeSoir = true;
  for (const e of etat.personnel) {
    if (e === g || e.repos || e.fatigue < B.GERANTE.reposFatigue) continue;
    e.repos = true;
    e.enServiceCeSoir = false;
    e.promesseRepos = null;
    evenements.push({ type: 'geranteRepos', employeId: e.id });
  }
}

/** À la fermeture : le moral de l'équipe remonte, et une gérante peu loyale se sert dans la caisse. */
export function nuitDeLaGerante(etat: EtatJeu, evenements: Sortie): void {
  const g = gerante(etat);
  if (!g) {
    etat.gerante = null;
    return;
  }
  for (const e of etat.personnel) {
    if (e !== g && e.enServiceCeSoir && e.moral < B.GERANTE.moralMax) e.moral = Math.min(B.GERANTE.moralMax, e.moral + B.GERANTE.moral);
  }
  if (g.loyaute < B.GERANTE.loyauteHonnete) {
    const montant = Math.round(Math.max(0, recetteMaison(etat.journee.comptes)) * B.GERANTE.caisse);
    if (montant > 0) {
      depenser(etat, montant, 'caisse');
      evenements.push({ type: 'caisse', montant });
    }
  }
}

/** Salaire fixe de la gérante, avec ceux de midi. */
export function salaireGerante(etat: EtatJeu): number {
  return gerante(etat) ? B.GERANTE.salaire : 0;
}

/** Elle organise les rotations : chaque rendez-vous fatigue moins l'équipe. */
export function fatigueGerante(etat: EtatJeu): number {
  return gerante(etat) ? 1 - B.GERANTE.fatigue : 1;
}

/** Part des alertes du quartier que la gérante règle seule, en plus des équipes. */
export function partGerante(etat: EtatJeu): number {
  return gerante(etat) ? B.GERANTE.regle : 0;
}

// ——— La deuxième maison ———

/** Trois lieux tirés parmi ceux du contenu, prix à ±10 % arrondis à 500 €. */
export function tirerOffres(etat: EtatJeu): void {
  const tirage = creerTirage(etat.hasardEtablissement);
  const restants = [...LIEUX];
  const offres: OffreLieu[] = [];
  const v = B.ETABLISSEMENT.variation;
  const arrondi = (x: number) => Math.round(x / 500) * 500;
  while (offres.length < B.ETABLISSEMENT.offres && restants.length) {
    const lieu = restants.splice(Math.floor(tirage.suivant() * restants.length), 1)[0]!;
    const k = 1 + (tirage.suivant() * 2 - 1) * v;
    offres.push({ id: lieu.id, achat: arrondi(lieu.achat * k), travaux: arrondi(lieu.travaux * k), jours: lieu.jours });
  }
  etat.etablissement = { ...etablissementDeDepart(), offres };
  etat.hasardEtablissement = tirage.etat();
}

// ——— Les ordres ———

export function appliquerAgrandir(etat: EtatJeu, ordre: OrdreAgrandir, evenements: Sortie): void {
  if (etat.finDePartie) return;
  switch (ordre.type) {
    case 'demanderPermis': {
      if (!peutDemanderPermis(etat)) return;
      depenser(etat, B.PALIER_5.fraisDossier, 'relations');
      etat.permis = { statut: 'depose', jour: etat.jour };
      evenements.push({ type: 'permisDepose', montant: B.PALIER_5.fraisDossier });
      return;
    }
    case 'agrandir': {
      const def = B.AGRANDISSEMENT[ordre.option];
      if (!def || !optionsAgrandissement(etat).includes(ordre.option) || etat.tresorerie < def.prix) return;
      depenser(etat, def.prix, 'travaux');
      const fin = instant(etat) + def.heures * 60;
      etat.agrandissement.achete.push(ordre.option);
      etat.agrandissement.enCours = { option: ordre.option, fin };
      evenements.push({ type: 'agrandissement', option: ordre.option, montant: def.prix, fin });
      return;
    }
    case 'promouvoir': {
      if (!peutPromouvoir(etat, ordre.employeId)) return;
      const e = etat.personnel.find((x) => x.id === ordre.employeId)!;
      const accepte = accepteGerance(e);
      const ambition = e.ambition === 'gerante';
      if (accepte) {
        etat.gerante = e.id;
        if (ambition) e.moral = Math.min(100, e.moral + B.GERANTE.moralAmbition);
        e.reposPrevu = false;
      }
      evenements.push({ type: 'gerance', employeId: e.id, accepte, ambition });
      return;
    }
    case 'retrograder': {
      const g = gerante(etat);
      if (!g) return;
      etat.gerante = null;
      g.moral = Math.max(0, g.moral + B.GERANTE.moralRetour);
      evenements.push({ type: 'geranceFinie', employeId: g.id });
      return;
    }
    case 'signerLieu': {
      const m = etat.etablissement;
      const offre = m.offres.find((o) => o.id === ordre.lieu);
      if (!etat.systemes.etablissement || m.statut !== 'offres' || !offre || etat.tresorerie < offre.achat) return;
      depenser(etat, offre.achat, 'etablissement');
      m.lieu = offre.id;
      m.statut = 'signe';
      evenements.push({ type: 'achatLieu', lieu: offre.id, montant: offre.achat });
      return;
    }
    case 'lancerTravauxEtablissement': {
      const m = etat.etablissement;
      const offre = m.offres.find((o) => o.id === m.lieu);
      if (m.statut !== 'signe' || !offre || etat.tresorerie < offre.travaux) return;
      depenser(etat, offre.travaux, 'etablissement');
      m.statut = 'travaux';
      m.fin = etat.jour + offre.jours;
      evenements.push({ type: 'travauxEtablissement', lieu: offre.id, montant: offre.travaux, fin: m.fin });
      return;
    }
  }
}
