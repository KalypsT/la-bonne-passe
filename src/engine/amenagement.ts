// L'aménagement (v0.6, partie 5) : rafraîchir, changer le décor, fermer une chambre ; les loges du personnel ;
// la buanderie, où le linge tourne. Voir « Aménagement et décor » dans les spécifications ; valeurs dans balance.ts.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import { DECORS, trouverChambre, type IdDecor } from '../content/maison';
import { depenser } from './comptes';
import type { EtatChambre, EtatJeu } from './etat';
import { instant } from './temps';

export type IdAnnexe = 'loges' | 'buanderie';

export interface EtatAnnexe {
  ouverte: boolean;
  /** Travaux en cours : instant (en minutes absolues) où ils se terminent. */
  travaux: number | null;
}

export interface EtatBuanderie extends EtatAnnexe {
  /** Parures sales, qui attendent d'être relavées. */
  sale: number;
  /** Lavage en cours (fraction de parure) et usure cumulée : sans hasard, pour ne pas décaler les tirages. */
  lavage: number;
  usure: number;
}

export interface Annexes {
  loges: EtatAnnexe;
  buanderie: EtatBuanderie;
}

export type EvenementAmenagement =
  | { type: 'rafraichir'; chambreId: string; montant: number }
  | { type: 'changerDecor'; chambreId: string; decor: IdDecor; montant: number }
  | { type: 'fermerChambre'; chambreId: string; fermee: boolean }
  | { type: 'travauxAnnexe'; annexe: IdAnnexe; montant: number }
  | { type: 'finTravauxAnnexe'; annexe: IdAnnexe }
  | { type: 'parureUsee' };

export type OrdreAmenagement =
  | { type: 'rafraichir'; chambreId: string }
  | { type: 'changerDecor'; chambreId: string; decor: IdDecor }
  | { type: 'fermerChambre'; chambreId: string; fermee: boolean }
  | { type: 'renoverAnnexe'; annexe: IdAnnexe };

interface Sortie {
  push(e: EvenementAmenagement): unknown;
}

export function annexesDeDepart(): Annexes {
  return {
    loges: { ouverte: false, travaux: null },
    buanderie: { ouverte: false, travaux: null, sale: 0, lavage: 0, usure: 0 },
  };
}

/** La chambre reçoit-elle ce soir ? Ouverte, sans travaux, pas fermée temporairement. */
export function chambreEnService(c: EtatChambre): boolean {
  return c.ouverte && c.travaux === null && !c.fermee;
}

function libre(etat: EtatJeu, c: EtatChambre): boolean {
  return !etat.rendezVous.some((r) => r.chambreId === c.id);
}

/** Peut-on lancer des travaux dans cette chambre ouverte ? Libre, sans travaux en cours, et pas en pleine soirée pour rien. */
export function travauxPossibles(etat: EtatJeu, c: EtatChambre | undefined, prix: number): c is EtatChambre {
  return !!c && etat.systemes.renovation && c.ouverte && c.travaux === null && libre(etat, c) && etat.tresorerie >= prix;
}

// ——— Ce que le décor change ———

/** Le segment qu'un décor charme. */
export function segmentDuDecor(decor: IdDecor): Segment {
  return DECORS[decor].segment;
}

/** Qualité en plus quand le client se trouve dans un décor refait à son goût. */
export function qualiteDecor(etat: EtatJeu, chambreId: string, segment: Segment): number {
  const c = etat.chambres.find((x) => x.id === chambreId);
  return c && c.decorRefait && segmentDuDecor(c.decor) === segment ? B.DECORS_EFFETS.qualite : 0;
}

// ——— Les loges ———

/** Récupération multipliée : entre deux clients, et au repos. */
export function facteurRecuperation(etat: EtatJeu, enService: boolean): number {
  if (!etat.annexes.loges.ouverte) return 1;
  return enService ? B.LOGES.recuperationEnService : B.LOGES.recuperationAuRepos;
}

/** Le moral remonte de lui-même jusqu'à ce plafond. */
export function plafondMoralNaturel(etat: EtatJeu): number {
  return B.MORAL_PLAFOND_NATUREL + (etat.annexes.loges.ouverte ? B.LOGES.moralPlafond : 0);
}

// ——— La buanderie ———

/** Un rendez-vous prend une parure propre ; avec la buanderie, elle part au lavage, et s'use un peu. */
export function utiliserParure(etat: EtatJeu, evenements: Sortie): void {
  if (etat.linge <= 0) return;
  etat.linge -= B.LINGE_PAR_RDV;
  const b = etat.annexes.buanderie;
  if (!b.ouverte) return;
  b.usure += B.BUANDERIE.usure;
  if (b.usure >= 1) {
    b.usure -= 1;
    evenements.push({ type: 'parureUsee' });
    return;
  }
  b.sale += B.LINGE_PAR_RDV;
}

/** Le ménage relave le linge sale, plus vite maison fermée ; la lessive se paie à chaque parure propre rendue. */
export function laver(etat: EtatJeu, heures: number, ouvert: boolean): void {
  const b = etat.annexes.buanderie;
  if (!b.ouverte || b.sale <= 0) return;
  b.lavage += etat.equipes.menage * (ouvert ? B.BUANDERIE.lavageOuvert : B.BUANDERIE.lavageFerme) * heures;
  const propres = Math.min(b.sale, Math.floor(b.lavage + 1e-9));
  if (propres <= 0) return;
  b.lavage -= propres;
  if (b.sale - propres <= 0) b.lavage = 0;
  b.sale -= propres;
  etat.linge += propres;
  depenser(etat, propres * B.BUANDERIE.lessive, 'linge');
}

// ——— Les ordres ———

export function appliquerAmenagement(etat: EtatJeu, ordre: OrdreAmenagement, evenements: Sortie): void {
  switch (ordre.type) {
    case 'rafraichir': {
      const c = etat.chambres.find((x) => x.id === ordre.chambreId);
      if (!travauxPossibles(etat, c, B.RAFRAICHIR.prix) || c.etat >= 100) return;
      depenser(etat, B.RAFRAICHIR.prix, 'travaux');
      c.travaux = instant(etat) + B.RAFRAICHIR.heures * 60;
      evenements.push({ type: 'rafraichir', chambreId: c.id, montant: B.RAFRAICHIR.prix });
      return;
    }
    case 'changerDecor': {
      const c = etat.chambres.find((x) => x.id === ordre.chambreId);
      // Refaire le même décor à neuf est possible, tant qu'il n'a pas déjà été refait.
      if (!(ordre.decor in DECORS) || !travauxPossibles(etat, c, B.CHANGER_DECOR.prix) || (c.decor === ordre.decor && c.decorRefait)) return;
      depenser(etat, B.CHANGER_DECOR.prix, 'travaux');
      c.travaux = instant(etat) + B.CHANGER_DECOR.heures * 60;
      c.decorAVenir = ordre.decor;
      evenements.push({ type: 'changerDecor', chambreId: c.id, decor: ordre.decor, montant: B.CHANGER_DECOR.prix });
      return;
    }
    case 'fermerChambre': {
      const c = etat.chambres.find((x) => x.id === ordre.chambreId);
      if (!c || !c.ouverte || c.fermee === ordre.fermee || (ordre.fermee && !libre(etat, c))) return;
      c.fermee = ordre.fermee;
      evenements.push({ type: 'fermerChambre', chambreId: c.id, fermee: ordre.fermee });
      return;
    }
    case 'renoverAnnexe': {
      const a = etat.annexes[ordre.annexe];
      const def = ordre.annexe === 'loges' ? B.LOGES : B.BUANDERIE;
      if (!etat.systemes[ordre.annexe] || a.ouverte || a.travaux !== null || etat.tresorerie < def.prix) return;
      depenser(etat, def.prix, 'travaux');
      a.travaux = instant(etat) + def.heures * 60;
      evenements.push({ type: 'travauxAnnexe', annexe: ordre.annexe, montant: def.prix });
      return;
    }
  }
}

/** Les travaux des loges et de la buanderie arrivés à échéance. */
export function avancerTravauxAnnexes(etat: EtatJeu, evenements: Sortie): void {
  const maintenant = instant(etat);
  for (const id of ['loges', 'buanderie'] as const) {
    const a = etat.annexes[id];
    if (a.travaux === null || maintenant < a.travaux) continue;
    a.travaux = null;
    a.ouverte = true;
    evenements.push({ type: 'finTravauxAnnexe', annexe: id });
  }
}

/** Le décor d'origine d'une chambre. */
export function decorDOrigine(chambreId: string): IdDecor {
  return trouverChambre(chambreId)?.decor ?? 'rose';
}
