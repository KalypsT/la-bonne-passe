// Le bar (palier 2) : rénovation, équipe Bar, stock, ventes, avance du grossiste.
// Voir « Équipes » et « Économie et finances » dans les spécifications.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import type { EtatJeu } from './etat';
import { instant, MINUTES_PAR_JOUR } from './temps';

export type OrdreBar =
  | { type: 'renoverBar' }
  | { type: 'equipeBar'; effectif: number }
  | { type: 'livraisonBar' }
  | { type: 'avanceFournisseur'; accepter: boolean };

export type EvenementBar =
  | { type: 'debutTravauxBar'; montant: number; fin: number }
  | { type: 'finTravauxBar' }
  | { type: 'equipeBar'; effectif: number }
  | { type: 'livraisonBar'; montant: number }
  | { type: 'barVide' }
  | { type: 'grossiste' }
  | { type: 'avanceFournisseur'; accepter: boolean; montant: number; echeance: number | null }
  | { type: 'remboursementAvance'; montant: number };

interface Sortie {
  push(e: EvenementBar): unknown;
}

/** Dépense : trésorerie et comptes de la nuit en cours (même règle que soiree.depenser, sans dépendance circulaire). */
function depenser(etat: EtatJeu, montant: number): void {
  etat.tresorerie -= montant;
  if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses += montant;
}

/** Le bar sert : rouvert, avec au moins une personne derrière le comptoir et du stock. */
export function barSert(etat: EtatJeu): boolean {
  return etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock > 0;
}

/** Le bar est ouvert et tenu, mais les étagères sont vides. */
export function barVide(etat: EtatJeu): boolean {
  return etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock <= 0;
}

/** Ce que le bar ajoute (ou retire, s'il est vide) à la qualité ressentie par un segment. */
export function qualiteBar(etat: EtatJeu, segment: Segment): number {
  if (barSert(etat)) return B.BAR_QUALITE[segment] + (etat.equipes.bar >= 2 ? B.BAR_DEUXIEME : 0);
  if (barVide(etat)) return B.BAR_VIDE_QUALITE[segment] ?? 0;
  return 0;
}

/** Minutes de patience en plus sur le quai quand le bar sert. */
export function patienceBar(etat: EtatJeu): number {
  return barSert(etat) ? B.BAR_PATIENCE : 0;
}

function retirerStock(etat: EtatJeu, bouteilles: number, evenements: Sortie): void {
  const avant = etat.bar.stock;
  etat.bar.stock = Math.max(0, Math.round((avant - bouteilles) * 100) / 100);
  if (avant > 0 && etat.bar.stock <= 0) evenements.push({ type: 'barVide' });
}

/**
 * Un client reçu passe au bar : la recette va entière à la maison (l'équipe Bar est salariée).
 * Renvoie le montant encaissé.
 */
export function venteBar(etat: EtatJeu, segment: Segment, evenements: Sortie): number {
  if (!barSert(etat)) return 0;
  const montant = B.BAR_RECETTE[segment];
  retirerStock(etat, B.BAR_CONSO[segment], evenements);
  etat.tresorerie += montant;
  if (etat.nuit) {
    etat.nuit.recettes += montant;
    etat.nuit.bar += montant;
  }
  return montant;
}

/** Formule champagne : la bouteille sort du bar. */
export function servirChampagne(etat: EtatJeu, evenements: Sortie): void {
  retirerStock(etat, B.CHAMPAGNE_BOUTEILLES, evenements);
}

/** À l'ouverture : la commande du briefing est livrée. */
export function livrerCommandeBar(etat: EtatJeu): void {
  etat.bar.stock += etat.bar.commande;
  etat.bar.commande = 0;
}

/** Fin des travaux du bar ; le grossiste passera le lendemain. */
export function avancerTravauxBar(etat: EtatJeu, evenements: Sortie): void {
  if (etat.bar.travaux === null || instant(etat) < etat.bar.travaux) return;
  etat.bar.travaux = null;
  etat.bar.ouvert = true;
  etat.bar.stock += B.BAR_STOCK_REOUVERTURE;
  if (etat.avance.statut === 'aVenir' && etat.avance.jourOffre === null) etat.avance.jourOffre = etat.jour + 1;
  evenements.push({ type: 'finTravauxBar' });
}

/** Le grossiste passe à l'heure dite : carte en pause. */
export function visiteGrossiste(etat: EtatJeu, evenements: Sortie): void {
  const a = etat.avance;
  if (a.statut !== 'aVenir' || a.jourOffre === null || etat.jour < a.jourOffre) return;
  if (etat.minuteDuJour !== B.AVANCE_FOURNISSEUR.heure) return;
  a.statut = 'proposee';
  evenements.push({ type: 'grossiste' });
}

/** Le matin de l'échéance, l'avance est remboursée, intérêts compris. */
export function rembourserAvance(etat: EtatJeu, evenements: Sortie): void {
  const a = etat.avance;
  if (a.statut !== 'acceptee' || a.echeance === null || etat.jour < a.echeance) return;
  depenser(etat, a.montant);
  a.statut = 'remboursee';
  evenements.push({ type: 'remboursementAvance', montant: a.montant });
}

export function appliquerBar(etat: EtatJeu, ordre: OrdreBar, evenements: Sortie): void {
  switch (ordre.type) {
    case 'renoverBar': {
      const bar = etat.bar;
      if (!etat.systemes.bar || bar.ouvert || bar.travaux !== null || etat.tresorerie < B.RENOVATION_BAR.prix) return;
      depenser(etat, B.RENOVATION_BAR.prix);
      bar.travaux = instant(etat) + B.RENOVATION_BAR.heures * 60;
      const fin = (etat.minuteDuJour + B.RENOVATION_BAR.heures * 60) % MINUTES_PAR_JOUR;
      evenements.push({ type: 'debutTravauxBar', montant: B.RENOVATION_BAR.prix, fin });
      return;
    }
    case 'equipeBar': {
      const effectif = Math.round(ordre.effectif);
      if (!etat.bar.ouvert || effectif < 0 || effectif > B.BAR_MAX || effectif === etat.equipes.bar) return;
      etat.equipes.bar = effectif;
      evenements.push({ type: 'equipeBar', effectif });
      return;
    }
    case 'livraisonBar':
      if (!etat.bar.ouvert) return;
      depenser(etat, B.LIVRAISON_EXPRESS_BAR.prix);
      etat.bar.stock += B.LIVRAISON_EXPRESS_BAR.bouteilles;
      evenements.push({ type: 'livraisonBar', montant: B.LIVRAISON_EXPRESS_BAR.prix });
      return;
    case 'avanceFournisseur': {
      const a = etat.avance;
      if (a.statut !== 'proposee') return;
      const A = B.AVANCE_FOURNISSEUR;
      if (ordre.accepter) {
        a.statut = 'acceptee';
        a.echeance = etat.jour + A.jours;
        a.montant = Math.round(A.valeur * (1 + A.taux));
        etat.bar.stock += A.bouteilles;
      } else {
        a.statut = 'refusee';
      }
      evenements.push({ type: 'avanceFournisseur', accepter: ordre.accepter, montant: a.montant, echeance: a.echeance });
      return;
    }
  }
}
