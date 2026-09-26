// Effets d'un choix sur une carte (imprévu, étape d'intrigue), communs à toutes les cartes.

import type { EffetCarte } from '../content/effets';
import type { Segment } from '../content/clientele';
import type { EtatJeu } from './etat';
import { changerReputationGlobale, changerSatisfaction, segmentOuvert } from './clientele';
import { depenser, encaisser, noterDepense } from './comptes';
import * as B from '../content/balance';
import type { Talent } from '../content/personnel';
import { aTrait, changerLoyaute, changerMoral, ajusterAffinite, depart, type EvenementPersonnel } from './personnel';
import { changerTapage } from './quartier';
import { changerRelations, type EvenementRelation } from './relations';
import { changerAgressivite, changerRapports, type EvenementRivale } from './rivale';
import { indemniser, type EvenementEquipe } from './equipes';

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

/** Ce dont un effet a besoin hors de l'état : le hasard de la soirée, les suites, la sortie des événements. */
export interface OutilsEffet {
  /** Fait entrer un client sur le quai, d'un segment donné ou au hasard. */
  ajouterClient: (segment?: Segment) => void;
  /** Programme une suite différée avec la même personne. */
  demarrerSuite: (id: string, delai: number, employeId: string | null) => void;
  /** Fait entrer une candidate ou un candidat remarquable au salon. */
  candidatVedette?: () => void;
  /** Fait entrer une recrue débauchée au Chat Noir au salon (v0.5). */
  candidatRival?: () => void;
  evenements?: { push(e: EvenementPersonnel | EvenementRelation | EvenementRivale | EvenementEquipe): unknown };
  /** Multiplie les effets de réputation et de satisfaction (les imprévus, nombreux, pèsent moins lourd). */
  forceSatisfaction?: number;
}

/** Applique l'effet d'un choix. */
export function appliquerEffet(etat: EtatJeu, effet: EffetCarte, qui: Concernes, outils: OutilsEffet): void {
  const evenements = outils.evenements ?? [];
  const e = etat.personnel.find((x) => x.id === qui.employeId);
  const e2 = etat.personnel.find((x) => x.id === qui.employe2Id);
  if (e) {
    if (effet.moral) changerMoral(e, effet.moral);
    if (effet.loyaute) changerLoyaute(e, effet.loyaute);
    if (effet.fatigue) e.fatigue = borner(e.fatigue + effet.fatigue);
    if (effet.part) e.part = Math.min(0.65, Math.round((e.part + effet.part) * 100) / 100);
    if (effet.repos && !etat.rendezVous.some((r) => r.employeId === e.id)) e.repos = true;
    if (effet.partMin) e.part = Math.min(0.65, Math.max(e.part, effet.partMin));
    for (const [talent, delta] of Object.entries(effet.talent ?? {}) as [Talent, number][]) {
      e.talents[talent] = borner(e.talents[talent] + delta, 1, 5);
    }
    if (effet.retirerTrait) {
      e.traits = e.traits.filter((t) => t !== effet.retirerTrait);
      e.traitsConnus = e.traitsConnus.filter((t) => t !== effet.retirerTrait);
    }
    if (effet.ajouterTrait && !e.traits.includes(effet.ajouterTrait)) {
      e.traits.push(effet.ajouterTrait);
      e.traitsConnus.push(effet.ajouterTrait);
    }
    if (effet.promesseRepos) e.promesseRepos = etat.jour + B.ENTRETIEN.delaiPromesse;
  }
  if (e2 && effet.moral2) changerMoral(e2, effet.moral2);
  if (e && e2 && effet.affinite) ajusterAffinite(etat, e.id, e2.id, effet.affinite);
  if (effet.moralEquipe) for (const x of etat.personnel) changerMoral(x, effet.moralEquipe);
  if (effet.fatigueEquipe) for (const x of etat.personnel) if (x.enServiceCeSoir) x.fatigue = borner(x.fatigue + effet.fatigueEquipe);
  if (effet.stockBar && etat.bar.ouvert) etat.bar.stock = Math.max(0, etat.bar.stock + effet.stockBar);
  const force = outils.forceSatisfaction ?? 1;
  if (effet.reputation) changerReputationGlobale(etat, effet.reputation * force);
  for (const [segment, delta] of Object.entries(effet.satisfaction ?? {}) as [Segment, number][]) {
    if (segmentOuvert(etat, segment)) changerSatisfaction(etat, segment, delta * force);
  }
  const juriste = effet.juridique && etat.personnel.some((x) => aTrait(x, 'Juriste'));
  const argent = Math.round((effet.argent ?? 0) * (juriste ? B.TRAITS_EFFETS.juristeRemise : 1));
  if (argent > 0) {
    encaisser(etat, argent, 'autres');
    if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.recettes += argent;
  } else if (argent < 0) {
    etat.tresorerie += argent;
    noterDepense(etat, -argent, 'incidents');
    if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses -= argent;
    if (effet.sinistre) indemniser(etat, -argent, effet.sinistre, evenements);
  }
  if (effet.travaux) depenser(etat, effet.travaux, 'travaux');
  if (effet.tapage) changerTapage(etat, effet.tapage);
  if (effet.insonoriser) etat.quartier.insonorise = true;
  if (effet.relations) changerRelations(etat, effet.relations, evenements);
  if (effet.affluenceSoir) etat.relations.affluenceSoir = Math.min(etat.relations.affluenceSoir, effet.affluenceSoir);
  if (effet.rivale?.agressivite) changerAgressivite(etat, effet.rivale.agressivite, evenements);
  if (effet.rivale?.relation) changerRapports(etat, effet.rivale.relation);
  if (effet.concurrence) etat.rivale.concurrence = effet.concurrence;
  if (effet.candidatRival) outils.candidatRival?.();
  for (let i = 0; i < (effet.clients ?? 0); i++) outils.ajouterClient(effet.clientsSegment);
  if (effet.candidatVedette) outils.candidatVedette?.();
  if (effet.suite) outils.demarrerSuite(effet.suite.id, effet.suite.delai, qui.employeId);
  // Le départ en dernier : la personne a reçu ce que le choix lui réservait.
  if (e && effet.depart && etat.personnel.includes(e)) {
    if (effet.transfuge) etat.rivale.transfuges.push(e.prenom);
    depart(etat, e, evenements);
  }
}
