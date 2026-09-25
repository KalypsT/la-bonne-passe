// Règles de la maison (palier 2) : tarif général, formule, sélection à l'entrée, priorité d'accueil.
// Voir « Leviers d'offre » dans les spécifications.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import { barSert } from './bar';
import type { ClientEnFile, Employe, EtatJeu, Regles } from './etat';

export type OrdreRegle =
  | { type: 'regle'; regle: 'tarif'; valeur: number }
  | { type: 'regle'; regle: 'formule'; valeur: B.IdFormule }
  | { type: 'regle'; regle: 'selection'; valeur: B.IdSelection }
  | { type: 'regle'; regle: 'priorite'; valeur: B.IdPriorite };

export type EvenementRegle =
  | { type: 'regle'; regle: keyof Regles; valeur: number | string }
  | { type: 'refuse'; client: string };

const PRIORITES: B.IdPriorite[] = ['arrivee', 'habitues', 'presses'];

/** Écart du tarif en vigueur au prix normal (0 tant que les tarifs sont fermés). */
export function ecartTarif(etat: EtatJeu): number {
  return etat.systemes.tarifs ? (B.TARIFS[etat.regles.tarif] ?? 0) : 0;
}

/** La formule en vigueur ; le champagne redevient un rendez-vous classique si le bar ne sert pas. */
export function formuleActive(etat: EtatJeu): B.IdFormule {
  if (!etat.systemes.tarifs) return 'standard';
  if (etat.regles.formule === 'champagne' && !barSert(etat)) return 'standard';
  return etat.regles.formule;
}

export function selectionActive(etat: EtatJeu): B.ReglageSelection {
  return B.SELECTIONS[etat.systemes.porte ? etat.regles.selection : 'normale'];
}

export function prioriteActive(etat: EtatJeu): B.IdPriorite {
  return etat.systemes.porte ? etat.regles.priorite : 'arrivee';
}

/** Demande d'un segment au tarif en vigueur : effet inverse du prix, plus ou moins fort selon le segment. */
export function demandePrix(etat: EtatJeu, segment: Segment): number {
  return Math.max(B.DEMANDE_PRIX_MIN, 1 - B.ELASTICITE_PRIX[segment] * ecartTarif(etat));
}

/** Ce que la formule et la sélection ajoutent à la qualité ressentie par un segment. */
export function qualiteDesRegles(etat: EtatJeu, segment: Segment, formule: B.IdFormule): number {
  return (
    (B.FORMULES[formule].qualite[segment] ?? 0) +
    (selectionActive(etat).qualite[segment] ?? 0) +
    (B.PRIORITE_QUALITE[prioriteActive(etat)][segment] ?? 0)
  );
}

/** Le tarif se sent dans l'avis : cher pour un touriste, indifférent pour un banquier. */
export function prixRessenti(etat: EtatJeu, segment: Segment): number {
  return -B.ELASTICITE_PRIX[segment] * ecartTarif(etat) * B.PRIX_RESSENTI;
}

/** Patience sur le quai multipliée par le tarif : on attend plus volontiers une maison bon marché. */
export function patienceTarif(etat: EtatJeu): number {
  return 1 - ecartTarif(etat) * B.PATIENCE_TARIF;
}

/** Charge qu'ajoute un rendez-vous de la formule en vigueur. */
export function chargeFormule(formule: B.IdFormule): number {
  return B.FORMULES[formule].charge;
}

/** La personne a atteint son maximum du soir pour un rendez-vous de plus dans la formule en vigueur. */
export function quotaAtteint(etat: EtatJeu, e: Employe): boolean {
  return e.chargeCeSoir + chargeFormule(formuleActive(etat)) > etat.rdvMax + 1e-9;
}

/**
 * Le prochain client reçu selon la priorité d'accueil : le premier arrivé, le premier habitué,
 * ou celui dont la patience est la plus courte.
 */
export function prochainClient(etat: EtatJeu, segmentDe: (c: ClientEnFile) => Segment): ClientEnFile | undefined {
  const file = etat.file;
  switch (prioriteActive(etat)) {
    case 'habitues':
      return file.find((c) => segmentDe(c) === 'habitue') ?? file[0];
    case 'presses':
      return file.reduce<ClientEnFile | undefined>((choix, c) => (!choix || c.patience < choix.patience ? c : choix), undefined);
    default:
      return file[0];
  }
}

/** Le joueur change une règle de la maison. Effet immédiat, même en pleine soirée. */
export function appliquerRegle(etat: EtatJeu, ordre: OrdreRegle, evenements: { push(e: EvenementRegle): unknown }): void {
  const r = etat.regles;
  switch (ordre.regle) {
    case 'tarif':
      if (!etat.systemes.tarifs || B.TARIFS[ordre.valeur] === undefined || r.tarif === ordre.valeur) return;
      r.tarif = ordre.valeur;
      break;
    case 'formule':
      if (!etat.systemes.tarifs || !(ordre.valeur in B.FORMULES) || r.formule === ordre.valeur) return;
      if (ordre.valeur === 'champagne' && !etat.bar.ouvert) return;
      r.formule = ordre.valeur;
      break;
    case 'selection':
      if (!etat.systemes.porte || !(ordre.valeur in B.SELECTIONS) || r.selection === ordre.valeur) return;
      r.selection = ordre.valeur;
      break;
    case 'priorite':
      if (!etat.systemes.porte || !PRIORITES.includes(ordre.valeur) || r.priorite === ordre.valeur) return;
      r.priorite = ordre.valeur;
      break;
  }
  evenements.push({ type: 'regle', regle: ordre.regle, valeur: ordre.valeur });
}
