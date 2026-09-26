// Équipes Accueil et Sécurité, et assurance (v0.5, palier 3).
// Voir « Équipes » et « Outils » dans les spécifications ; valeurs dans balance.ts (EQUIPES, ASSURANCES).

import * as B from '../content/balance';
import type { IdAlerte } from '../content/alertes';
import type { Segment } from '../content/clientele';
import { encaisser } from './comptes';
import type { EtatJeu } from './etat';

export type EquipeQuartier = 'accueil' | 'securite';

export type EvenementEquipe =
  | { type: 'equipeQuartier'; equipe: EquipeQuartier; effectif: number }
  | { type: 'alerteReglee'; id: IdAlerte; equipe: EquipeQuartier }
  | { type: 'disputeEvitee' }
  | { type: 'assurance'; niveau: number }
  | { type: 'primeAssurance'; montant: number }
  | { type: 'indemnisation'; montant: number; sinistre: 'casse' | 'amende' };

export type OrdreEquipe = { type: 'equipeQuartier'; equipe: EquipeQuartier; effectif: number } | { type: 'assurance'; niveau: number };

interface Sortie {
  push(e: EvenementEquipe): unknown;
}

/** Quelle équipe règle seule quelle alerte. */
const DOMAINES: Partial<Record<IdAlerte, EquipeQuartier>> = {
  presse: 'accueil',
  bruit: 'accueil',
  ivre: 'securite',
  photographe: 'securite',
  sabotage: 'securite',
  journaliste: 'accueil',
  fenetre: 'accueil',
};

export function equipeDe(id: IdAlerte): EquipeQuartier | undefined {
  return DOMAINES[id];
}

/** Part des alertes de son domaine qu'une équipe règle seule, selon son effectif. */
export function partReglee(etat: EtatJeu, equipe: EquipeQuartier): number {
  return Math.min(1, etat.equipes[equipe] * B.EQUIPES[equipe].regle);
}

/** L'équipe change d'effectif (palier 3) ; l'interface le propose de 0 au maximum. */
export function changerEquipe(etat: EtatJeu, equipe: EquipeQuartier, effectif: number, evenements: Sortie): void {
  const n = Math.round(effectif);
  if (!etat.systemes[equipe] || n < 0 || n > B.EQUIPES[equipe].max || n === etat.equipes[equipe]) return;
  etat.equipes[equipe] = n;
  evenements.push({ type: 'equipeQuartier', equipe, effectif: n });
}

/** Salaires des équipes Accueil et Sécurité, à ajouter à ceux du midi. */
export function salairesEquipesQuartier(etat: EtatJeu): number {
  return etat.equipes.accueil * B.EQUIPES.accueil.salaire + etat.equipes.securite * B.EQUIPES.securite.salaire;
}

/** Minutes de patience en plus sur le quai. */
export function patienceAccueil(etat: EtatJeu): number {
  return etat.equipes.accueil * B.EQUIPES.accueil.patience;
}

/** Qualité ressentie : la sécurité, discrète, rassure les clients d'affaires. */
export function qualiteEquipes(etat: EtatJeu, segment: Segment): number {
  return segment === 'affaires' ? etat.equipes.securite * B.EQUIPES.securite.qualiteAffaires : 0;
}

/** Chance de dispute multipliée : la sécurité fait baisser le ton. */
export function disputeSecurite(etat: EtatJeu): number {
  return Math.max(0, 1 - etat.equipes.securite * B.EQUIPES.securite.dispute);
}

/** Avec la sécurité, la porte stricte n'a plus besoin d'un portier payé à la soirée. */
export function portierInclus(etat: EtatJeu): boolean {
  return B.EQUIPES.securite.portierInclus && etat.equipes.securite > 0;
}

// ——— Assurance ———

export function changerAssurance(etat: EtatJeu, niveau: number, evenements: Sortie): void {
  if (!etat.systemes.assurance || !Number.isInteger(niveau) || niveau < 0 || niveau >= B.ASSURANCES.length || niveau === etat.assurance) return;
  etat.assurance = niveau;
  evenements.push({ type: 'assurance', niveau });
}

/** Un sinistre (casse, amende) payé par la maison : l'assurance en rembourse une part. */
export function indemniser(etat: EtatJeu, montant: number, sinistre: 'casse' | 'amende', evenements?: Sortie): void {
  if (!etat.systemes.assurance || montant <= 0) return;
  const niveau = B.ASSURANCES[etat.assurance];
  const part = sinistre === 'casse' ? (niveau?.casse ?? 0) : (niveau?.amendes ?? 0);
  const rembourse = Math.round(montant * part);
  if (rembourse <= 0) return;
  encaisser(etat, rembourse, 'assurance');
  evenements?.push({ type: 'indemnisation', montant: rembourse, sinistre });
}

/** La prime de la semaine, prélevée le lundi avec les charges fixes. */
export function primeAssurance(etat: EtatJeu): number {
  return etat.systemes.assurance ? (B.ASSURANCES[etat.assurance]?.prime ?? 0) : 0;
}
