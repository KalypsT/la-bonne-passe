// Monter en gamme (v0.6, partie 6, palier 4) : VIP et couples, confort et jacuzzi, formations des équipes,
// placement de l'excédent, nouveau nom. Voir « Montée en puissance » et « Économie et finances » dans les
// spécifications ; valeurs dans balance.ts (GAMME, CONFORT, FORMATIONS, PLACEMENT).

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import { changerSatisfaction, segmentOuvert } from './clientele';
import { depenser, encaisser } from './comptes';
import type { EtatChambre, EtatJeu } from './etat';
import { creerTirage, tirer } from './hasard';
import { validerNomMaison, nettoyerNom } from './identite';
import { tendanceCreuse } from './semaine';
import { instant } from './temps';

export type EquipeFormable = 'menage' | 'bar' | 'accueil' | 'securite';
export type NiveauxEquipes = Record<EquipeFormable, number>;

export interface Placement {
  montant: number;
  profil: 'prudent' | 'risque';
  /** Jour où l'argent revient. */
  echeance: number;
}

export type EvenementGamme =
  | { type: 'travauxConfort'; chambreId: string; niveau: number; montant: number }
  | { type: 'formation'; equipe: EquipeFormable; niveau: number; montant: number }
  | { type: 'placement'; montant: number; profil: 'prudent' | 'risque'; echeance: number }
  | { type: 'finPlacement'; montant: number; gain: number; profil: 'prudent' | 'risque' }
  | { type: 'renommerMaison'; ancien: string; nom: string; montant: number };

export type OrdreGamme =
  | { type: 'ameliorerConfort'; chambreId: string }
  | { type: 'former'; equipe: EquipeFormable }
  | { type: 'placer'; montant: number; profil: 'prudent' | 'risque' }
  | { type: 'renommerMaison'; nom: string };

interface Sortie {
  push(e: EvenementGamme): unknown;
}

export function niveauxDeDepart(): NiveauxEquipes {
  return { menage: 1, bar: 1, accueil: 1, securite: 1 };
}

// ——— Ce que VIP et couples attendent ———

/** Qualité propre aux VIP et aux couples : prestige, décor, confort, propreté. */
export function qualiteGamme(chambre: EtatChambre, segment: Segment): number {
  const G = B.GAMME;
  let q = confortQualite(chambre.confort);
  if (segment === 'vip') {
    q += trouverChambre(chambre.id)?.premium ? G.vip.premium : G.vip.pasPremium;
    if (chambre.decorRefait) q += G.vip.decorRefait;
    if (chambre.confort >= 3) q += B.CONFORT.jacuzzi.vip;
  }
  if (segment === 'couple') {
    if (chambre.decorRefait) q += G.couple.decorRefait;
    if (chambre.proprete < G.couple.propreteMin) q -= G.couple.malusProprete;
    if (chambre.confort >= 3) q += B.CONFORT.jacuzzi.couple;
  }
  return q;
}

/** Un incident sur le quai : les VIP l'apprennent toujours. */
export function incidentVip(etat: EtatJeu): void {
  if (segmentOuvert(etat, 'vip')) changerSatisfaction(etat, 'vip', B.GAMME.incidentVip);
}

// ——— Confort ———

export function confortQualite(niveau: number): number {
  return (niveau - 1) * B.CONFORT.qualiteParNiveau;
}

/** Le confort se paie sur le prix du rendez-vous. */
export function prixConfort(chambre: EtatChambre | undefined): number {
  return 1 + ((chambre?.confort ?? 1) - 1) * B.CONFORT.prixParNiveau;
}

/** Le prochain niveau de confort, et ce qu'il coûte ; null au maximum, ou si le jacuzzi ne rentre pas (chambre non premium). */
export function prochainConfort(chambre: EtatChambre): { niveau: number; prix: number; heures: number } | null {
  const def = B.CONFORT.niveaux[chambre.confort - 1];
  if (!def) return null;
  if (chambre.confort + 1 === 3 && !trouverChambre(chambre.id)?.premium) return null;
  return { niveau: chambre.confort + 1, ...def };
}

// ——— Formations ———

export function prixFormation(etat: EtatJeu, equipe: EquipeFormable): number | null {
  return B.FORMATIONS.prix[etat.niveauxEquipes[equipe] - 1] ?? null;
}

/** Les niveaux au-dessus de 1, pour les effets. */
export function niveauEnPlus(etat: EtatJeu, equipe: EquipeFormable): number {
  return etat.niveauxEquipes[equipe] - 1;
}

/** Le ménage nettoie et relave plus vite. */
export function facteurMenage(etat: EtatJeu): number {
  return 1 + niveauEnPlus(etat, 'menage') * B.FORMATIONS.menage;
}

// ——— Placement ———

/** L'argent placé : ni en caisse, ni perdu. */
export function argentPlace(etat: Pick<EtatJeu, 'placement'>): number {
  return etat.placement?.montant ?? 0;
}

/** Ce que le placement risqué peut rapporter, au pire et au mieux (tendances de la semaine comprises). */
export function fourchettePlacement(etat: EtatJeu, montant: number): { min: number; max: number; prudent: number } {
  const P = B.PLACEMENT;
  const bonus = bonusTendances(etat);
  return {
    min: Math.round(montant * (P.risqueMin + bonus)),
    max: Math.round(montant * (P.risqueMax + bonus)),
    prudent: Math.round(montant * P.prudent),
  };
}

/** Les contextes de la semaine : une tendance porteuse pousse le placement risqué, une tendance creuse le tire. */
function bonusTendances(etat: EtatJeu): number {
  return etat.semaine.tendances.reduce((t, id) => t + (tendanceCreuse(id) ? -B.PLACEMENT.tendance : B.PLACEMENT.tendance), 0);
}

/** Le lundi : un placement arrivé à échéance revient, avec son gain ou sa perte. */
export function echeancePlacement(etat: EtatJeu, evenements: Sortie): void {
  const p = etat.placement;
  if (!p || etat.jour < p.echeance) return;
  let taux = B.PLACEMENT.prudent;
  if (p.profil === 'risque') {
    const tirage = creerTirage(etat.hasardPlacement);
    taux = B.PLACEMENT.risqueMin + tirage.suivant() * (B.PLACEMENT.risqueMax - B.PLACEMENT.risqueMin) + bonusTendances(etat);
    etat.hasardPlacement = tirage.etat();
  }
  const gain = Math.round(p.montant * taux);
  etat.tresorerie += p.montant;
  etat.journee.placement += p.montant;
  if (gain > 0) encaisser(etat, gain, 'placement');
  else if (gain < 0) depenser(etat, -gain, 'placement');
  etat.placement = null;
  evenements.push({ type: 'finPlacement', montant: p.montant, gain, profil: p.profil });
}

// ——— Les ordres ———

export function appliquerGamme(etat: EtatJeu, ordre: OrdreGamme, evenements: Sortie): void {
  switch (ordre.type) {
    case 'ameliorerConfort': {
      const c = etat.chambres.find((x) => x.id === ordre.chambreId);
      if (!etat.systemes.confort || !c || !c.ouverte || c.travaux !== null || etat.rendezVous.some((r) => r.chambreId === c.id)) return;
      const suivant = prochainConfort(c);
      if (!suivant || etat.tresorerie < suivant.prix) return;
      depenser(etat, suivant.prix, 'travaux');
      c.travaux = instant(etat) + suivant.heures * 60;
      c.confortAVenir = suivant.niveau;
      evenements.push({ type: 'travauxConfort', chambreId: c.id, niveau: suivant.niveau, montant: suivant.prix });
      return;
    }
    case 'former': {
      const prix = prixFormation(etat, ordre.equipe);
      if (!etat.systemes.formations || prix === null || etat.tresorerie < prix) return;
      depenser(etat, prix, 'formations');
      etat.niveauxEquipes[ordre.equipe] += 1;
      evenements.push({ type: 'formation', equipe: ordre.equipe, niveau: etat.niveauxEquipes[ordre.equipe], montant: prix });
      return;
    }
    case 'placer': {
      if (!etat.systemes.placement || etat.gestionJosee || etat.placement || etat.finDePartie) return;
      if (!(B.PLACEMENT.montants as readonly number[]).includes(ordre.montant) || etat.tresorerie < ordre.montant) return;
      etat.tresorerie -= ordre.montant;
      etat.journee.placement -= ordre.montant;
      etat.placement = { montant: ordre.montant, profil: ordre.profil, echeance: etat.jour + B.PLACEMENT.jours };
      evenements.push({ type: 'placement', montant: ordre.montant, profil: ordre.profil, echeance: etat.placement.echeance });
      return;
    }
    case 'renommerMaison': {
      const nom = nettoyerNom(ordre.nom);
      if (!etat.systemes.renommer || validerNomMaison(nom) !== null || nom === etat.maison.nom || etat.tresorerie < B.NOUVELLE_ENSEIGNE) return;
      depenser(etat, B.NOUVELLE_ENSEIGNE, 'travaux');
      const ancien = etat.maison.nom;
      etat.maison.nom = nom;
      // Une seule fois dans la partie (spécifications) : l'option se referme.
      etat.systemes.renommer = false;
      evenements.push({ type: 'renommerMaison', ancien, nom, montant: B.NOUVELLE_ENSEIGNE });
      return;
    }
  }
}

/** Le hasard du placement avance à chaque échéance : garder la graine d'origine pour les nouvelles parties. */
export function hasardPlacementDeDepart(graine: number): number {
  return tirer(graine * 29 + 5).etat;
}
