// Le linge, compté en parures : une par rendez-vous. Packs au briefing, commande automatique, livraison express.
// Voir « Aménagement et décor » dans les spécifications.

import * as B from '../content/balance';
import { depenser } from './comptes';
import type { EtatJeu } from './etat';
import { commandeFournisseurs, expressRatee, facteurFournisseurs, prixFournisseur } from './relations';

export type EvenementLinge =
  | { type: 'livraisonLinge'; montant: number }
  | { type: 'expressRatee'; quoi: 'linge' | 'bar' }
  | { type: 'commandeLingeAuto'; parures: number; montant: number };

interface Sortie {
  push(e: EvenementLinge): unknown;
}

/**
 * Prix de n parures : au tarif du plus gros pack que la quantité atteint (celui du petit pack en dessous),
 * multiplié par le facteur des fournisseurs (v0.6 : prix d'ami ou prix gonflés).
 */
export function prixLinge(parures: number, facteur = 1): number {
  if (parures <= 0) return 0;
  const pack = [...B.PACKS_LINGE].reverse().find((p) => parures >= p.parures) ?? B.PACKS_LINGE[0];
  return Math.round(((parures * pack.prix) / pack.parures) * facteur);
}

/** Ce que la commande automatique ajoutera ce soir, au vu du stock et de ce qui est déjà commandé. */
export function manqueAuto(etat: Pick<EtatJeu, 'linge' | 'lingeCommande' | 'lingeAuto'> & { annexes?: EtatJeu['annexes'] }, dejaCommande = 0): number {
  // Avec la buanderie, le linge sale compte : il sera propre pour la soirée.
  const sale = etat.annexes?.buanderie.ouverte ? etat.annexes.buanderie.sale : 0;
  return Math.max(0, etat.lingeAuto - (etat.linge + sale + etat.lingeCommande + dejaCommande));
}

/** Commande au briefing : un pack, livré à l'ouverture. */
export function commanderPack(etat: EtatJeu, parures: number): void {
  const pack = B.PACKS_LINGE.find((p) => p.parures === parures);
  if (!pack) return;
  depenser(etat, prixLinge(pack.parures, facteurFournisseurs(etat)), 'linge');
  etat.lingeCommande += pack.parures;
  commandeFournisseurs(etat);
}

/** Commande automatique, passée au briefing : le stock est complété jusqu'à la cible. */
export function commanderAuto(etat: EtatJeu, evenements: Sortie): void {
  const parures = manqueAuto(etat);
  if (parures <= 0) return;
  const montant = prixLinge(parures, facteurFournisseurs(etat));
  depenser(etat, montant, 'linge');
  etat.lingeCommande += parures;
  commandeFournisseurs(etat);
  evenements.push({ type: 'commandeLingeAuto', parures, montant });
}

export function changerCibleAuto(etat: EtatJeu, cible: number): void {
  if ((B.CIBLES_LINGE_AUTO as readonly number[]).includes(cible)) etat.lingeAuto = cible;
}

/** Livraison express en soirée : plus chère, livrée tout de suite. */
export function livraisonExpress(etat: EtatJeu, evenements: Sortie): void {
  if (expressRatee(etat)) {
    evenements.push({ type: 'expressRatee', quoi: 'linge' });
    return;
  }
  const prix = prixFournisseur(etat, B.LIVRAISON_EXPRESS_LINGE.prix);
  depenser(etat, prix, 'express');
  etat.linge += B.LIVRAISON_EXPRESS_LINGE.parures;
  evenements.push({ type: 'livraisonLinge', montant: prix });
}
