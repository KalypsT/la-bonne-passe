// Effets d'un choix sur une carte (imprévu, étape d'intrigue), communs à toutes les cartes.

import type { EffetCarte } from '../content/effets';
import type { Segment } from '../content/clientele';
import type { EtatJeu } from './etat';
import { changerReputationGlobale, changerSatisfaction, segmentOuvert } from './clientele';
import { depenser, encaisser, noterDepense } from './comptes';
import { changerLoyaute, changerMoral, ajusterAffinite } from './personnel';
import { changerTapage } from './quartier';

const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Qui est concerné par la carte. */
export interface Concernes {
  employeId: string | null;
  employe2Id?: string | null;
}

/** Un choix n'est possible que si la trésorerie couvre ses travaux. */
export function effetPossible(etat: EtatJeu, effet: EffetCarte | undefined): boolean {
  return !effet?.travaux || etat.tresorerie >= effet.travaux;
}

/**
 * Applique l'effet d'un choix. `ajouterClient` fait entrer un client sur le quai ;
 * `demarrerSuite` programme une suite différée avec la même personne.
 */
export function appliquerEffet(
  etat: EtatJeu,
  effet: EffetCarte,
  qui: Concernes,
  ajouterClient: () => void,
  demarrerSuite: (id: string, delai: number, employeId: string | null) => void,
): void {
  const e = etat.personnel.find((x) => x.id === qui.employeId);
  const e2 = etat.personnel.find((x) => x.id === qui.employe2Id);
  if (e) {
    if (effet.moral) changerMoral(e, effet.moral);
    if (effet.loyaute) changerLoyaute(e, effet.loyaute);
    if (effet.fatigue) e.fatigue = borner(e.fatigue + effet.fatigue);
    if (effet.part) e.part = Math.min(0.65, Math.round((e.part + effet.part) * 100) / 100);
    if (effet.repos && !etat.rendezVous.some((r) => r.employeId === e.id)) e.repos = true;
  }
  if (e2 && effet.moral2) changerMoral(e2, effet.moral2);
  if (e && e2 && effet.affinite) ajusterAffinite(etat, e.id, e2.id, effet.affinite);
  if (effet.moralEquipe) for (const x of etat.personnel) changerMoral(x, effet.moralEquipe);
  if (effet.reputation) changerReputationGlobale(etat, effet.reputation);
  for (const [segment, delta] of Object.entries(effet.satisfaction ?? {}) as [Segment, number][]) {
    if (segmentOuvert(etat, segment)) changerSatisfaction(etat, segment, delta);
  }
  const argent = effet.argent ?? 0;
  if (argent > 0) {
    encaisser(etat, argent, 'autres');
    if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.recettes += argent;
  } else if (argent < 0) {
    etat.tresorerie += argent;
    noterDepense(etat, -argent, 'incidents');
    if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses -= argent;
  }
  if (effet.travaux) depenser(etat, effet.travaux, 'travaux');
  if (effet.tapage) changerTapage(etat, effet.tapage);
  if (effet.insonoriser) etat.quartier.insonorise = true;
  for (let i = 0; i < (effet.clients ?? 0); i++) ajouterClient();
  if (effet.suite) demarrerSuite(effet.suite.id, effet.suite.delai, qui.employeId);
}
