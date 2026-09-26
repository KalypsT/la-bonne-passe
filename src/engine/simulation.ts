// Simulation d'un joueur actif, pour l'équilibrage (utilisée par les tests, jamais par l'interface).

import * as B from '../content/balance';
import type { Offre, Segment } from '../content/clientele';
import type { ParSegment } from './clientele';
import { creerEtatInitial, type EtatJeu, type Regles } from './etat';
import type { BilanSemaine } from './semaine';
import { appliquerOrdresSurPlace, tickSurPlace, type Ordre } from './tick';
import { alertes } from './alertes';
import { creerTirage } from './hasard';
import { trouverImprevu } from '../content/imprevus';
import { INTRIGUES } from '../content/intrigues';
import { choixPossibles, etapeCourante, type IntrigueFinie } from './intrigues';
import { estOuvert } from './temps';

export interface ResumeNuit {
  numero: number;
  reputation: number;
  tresorerie: number;
  /** Recette de la maison moins les dépenses de la nuit. */
  net: number;
  /** Résultat réel depuis le bilan précédent : trésorerie et réserve, frais fixes et investissements compris. */
  resultat: number;
  /** Satisfaction de chaque segment à la fermeture. */
  satisfaction: ParSegment;
  /** Recette du bar cette nuit. */
  bar: number;
  /** Clients servis cette nuit, par segment. */
  servisParSegment: ParSegment;
  servis: number;
  perdus: number;
  personnel: number;
  chambres: number;
  palier: number;
  /** Tapage du quartier à la fermeture. */
  tapage: number;
  /** Imprévus tirés ce soir, dans l'ordre. */
  imprevus: string[];
  /** Cartes d'intrigue sorties depuis la nuit précédente (journée et soirée). */
  intrigues: string[];
  /** Cartes d'intrigue sorties pendant la soirée. */
  intriguesSoiree: number;
  /** Alertes apparues pendant la soirée (une par apparition), par type. */
  alertes: Record<string, number>;
  /** Décisions significatives de la soirée : imprévus, cartes d'intrigue et alertes apparues. */
  decisions: number;
}

/** Comment le joueur simulé tranche les cartes : le premier choix possible, ou au hasard (graine à part). */
export type Politique = 'prudente' | 'hasard';

export interface OptionsSimulation {
  graine: number;
  offre: Offre | ((etat: EtatJeu) => Offre);
  nuits: number;
  /** Embaucher les candidats qui se présentent. */
  recruter?: boolean;
  /** Rénover les chambres dès que la trésorerie le permet. */
  renover?: boolean;
  rdvMax?: number;
  /** Règles de la maison appliquées dès leur ouverture (palier 2), fixes ou choisies selon la partie. */
  regles?: Partial<Regles> | ((etat: EtatJeu) => Partial<Regles>);
  /** Rouvrir le bar une fois les chambres rénovées, avec cet effectif (0 : ne pas rouvrir). */
  equipeBar?: number;
  /** Accepter l'avance du grossiste. */
  avance?: boolean;
  /** Soirée à thème programmée au briefing, dès qu'elles sont ouvertes (fixe, ou choisie selon la partie). */
  theme?: string | null | ((etat: EtatJeu) => string | null);
  /** Pour les mesures : ces tendances toutes les semaines, dès qu'elles sont ouvertes. */
  tendances?: string[];
  /** Façon de trancher les imprévus et les intrigues (prudente par défaut). */
  politique?: Politique;
  /** Faux : aucune intrigue ne démarre (pour mesurer une mécanique seule, comme sans tendance). */
  intrigues?: boolean;
  /** Faux : ni imprévu ni intrigue (pour mesurer une mécanique seule, sans le bruit des cartes). */
  cartes?: boolean;
}

const ORDRE_RENOVATION = ['orientale', 'velours', 'miroirs'];

/** Joue une partie avec des décisions simples et raisonnables, et résume chaque nuit. */
export function simuler(options: OptionsSimulation): {
  nuits: ResumeNuit[];
  etat: EtatJeu;
  departs: number;
  bilans: BilanSemaine[];
  /** Point le plus bas de la trésorerie pendant la partie. */
  tresorerieMin: number;
  /** Intrigues et suites terminées, avec leur dénouement. */
  intrigues: IntrigueFinie[];
} {
  const { graine, nuits, recruter = true, renover = true, rdvMax = 3, equipeBar = 1, avance = true } = options;
  const etat = creerEtatInitial({ graine });
  const sansCartes = options.cartes === false;
  if (options.intrigues === false || sansCartes) {
    etat.intrigues.finies = INTRIGUES.filter((d) => d.genre === 'intrigue').map((d) => ({ id: d.id, fin: 'ecartee', jour: 0 }));
  }
  const resumes: ResumeNuit[] = [];
  let departs = 0;
  const bilans: BilanSemaine[] = [];
  let tresorerieMin = etat.tresorerie;
  let avoirPrecedent = etat.tresorerie + etat.reserve;
  // Compteurs de la nuit en cours, pour mesurer le renouvellement des soirées.
  let imprevusNuit: string[] = [];
  let intriguesNuit: string[] = [];
  let intriguesSoiree = 0;
  let alertesNuit: Record<string, number> = {};
  let alertesAvant = new Set<string>();
  const hasard = creerTirage((graine * 7919) | 0);
  const trancher = (possibles: boolean[]): number => {
    const indices = possibles.flatMap((ok, i) => (ok ? [i] : []));
    if (indices.length === 0) return 0;
    return options.politique === 'hasard' ? hasard.choisir(indices) : indices[0]!;
  };
  // La simulation travaille sur sa propre copie de l'état, modifiée sur place : bien plus rapide.
  const jouer = (ordres: Ordre[]) => {
    // Une carte peut faire partir quelqu'un : on compte aussi ces départs.
    departs += appliquerOrdresSurPlace(etat, ordres).filter((e) => e.type === 'depart').length;
  };

  for (let pas = 0; pas < nuits * 300 && resumes.length < nuits; pas++) {
    const ordres: Ordre[] = [];
    for (const c of etat.chambres) {
      if (c.ouverte && c.proprete < B.SEUIL_CHAMBRE_SALE && etat.tresorerie > 300 && !etat.rendezVous.some((r) => r.chambreId === c.id)) {
        ordres.push({ type: 'nettoyageExpress', chambreId: c.id });
      }
    }
    // Sans cartes : l'imprévu suivant est repoussé indéfiniment.
    if (sansCartes) etat.prochainImprevu = Number.MAX_SAFE_INTEGER;
    const r = { evenements: tickSurPlace(etat, ordres) };
    tresorerieMin = Math.min(tresorerieMin, etat.tresorerie);
    const ouvert = estOuvert(etat);
    const alertesMaintenant = new Set(ouvert ? alertes(etat).map((a) => `${a.type}|${'chambreId' in a ? a.chambreId : 'employeId' in a ? a.employeId : ''}`) : []);
    for (const cle of alertesMaintenant) {
      if (alertesAvant.has(cle)) continue;
      const type = cle.split('|')[0]!;
      alertesNuit[type] = (alertesNuit[type] ?? 0) + 1;
    }
    alertesAvant = alertesMaintenant;
    for (const e of r.evenements) {
      if (e.type === 'imprevu') imprevusNuit.push(e.id);
      if (e.type === 'intrigue') {
        intriguesNuit.push(`${e.id}:${e.etape}`);
        if (ouvert) intriguesSoiree += 1;
      }
      if (e.type === 'depart') departs += 1;
      if (e.type === 'bilanSemaine' && etat.bilanSemaine) bilans.push(structuredClone(etat.bilanSemaine));
      if (e.type === 'bilan') {
        resumes.push({
          numero: e.nuit.numero,
          reputation: etat.reputation,
          tresorerie: etat.tresorerie,
          net: e.nuit.recettes - e.nuit.depenses,
          resultat: etat.tresorerie + etat.reserve - avoirPrecedent,
          bar: e.nuit.bar,
          satisfaction: { ...etat.clientele.satisfaction },
          servisParSegment: { ...(etat.clientele.historique[0]?.servis ?? { touriste: 0, habitue: 0, affaires: 0, groupe: 0 }) },
          servis: e.nuit.servis,
          perdus: e.nuit.perdus,
          personnel: etat.personnel.length,
          chambres: etat.chambres.filter((c) => c.ouverte).length,
          palier: etat.palier,
          tapage: etat.quartier.tapage,
          imprevus: imprevusNuit,
          intrigues: intriguesNuit,
          intriguesSoiree,
          alertes: alertesNuit,
          decisions: imprevusNuit.length + intriguesSoiree + Object.values(alertesNuit).reduce((a, b) => a + b, 0),
        });
        avoirPrecedent = etat.tresorerie + etat.reserve;
        imprevusNuit = [];
        intriguesNuit = [];
        intriguesSoiree = 0;
        alertesNuit = {};
      }
    }

    if (options.tendances && etat.systemes.tendances) etat.semaine.tendances = options.tendances;

    // Règles de la maison, dès qu'elles s'ouvrent.
    if (options.regles && etat.systemes.tarifs) {
      const r = typeof options.regles === 'function' ? options.regles(etat) : options.regles;
      const ordresRegles: Ordre[] = [];
      if (r.tarif !== undefined && r.tarif !== etat.regles.tarif) ordresRegles.push({ type: 'regle', regle: 'tarif', valeur: r.tarif });
      if (r.formule && r.formule !== etat.regles.formule) ordresRegles.push({ type: 'regle', regle: 'formule', valeur: r.formule });
      if (r.selection && r.selection !== etat.regles.selection) ordresRegles.push({ type: 'regle', regle: 'selection', valeur: r.selection });
      if (r.priorite && r.priorite !== etat.regles.priorite) ordresRegles.push({ type: 'regle', regle: 'priorite', valeur: r.priorite });
      if (ordresRegles.length) jouer(ordresRegles);
    }

    // Cartes en attente, tranchées comme le ferait un joueur prudent.
    if (etat.imprevu) {
      const n = trouverImprevu(etat.imprevu.id)?.choix.length ?? 1;
      jouer([{ type: 'choixImprevu', choix: trancher(Array.from({ length: n }, () => true)) }]);
    }
    if (etat.intrigues.carte && etapeCourante(etat, etat.intrigues.carte)) jouer([{ type: 'choixIntrigue', choix: trancher(choixPossibles(etat)) }]);
    if (etat.avance.statut === 'proposee') jouer([{ type: 'avanceFournisseur', accepter: avance }]);
    while (etat.annonces.length) jouer([{ type: 'annonceVue' }]);
    while (etat.adieux.length) jouer([{ type: 'adieuVu' }]);
    for (const id of [...etat.essaisATrancher]) jouer([{ type: 'trancherEssai', employeId: id, garder: true }]);
    if (recruter) {
      for (const c of [...etat.candidats]) {
        if (c.source !== 'visite') continue;
        jouer([{ type: 'questionCandidat', candidatId: c.id, question: 0 }]);
        jouer([{ type: 'proposer', candidatId: c.id, part: 0.5 }]);
        const encore = etat.candidats.find((x) => x.id === c.id);
        if (encore?.contreOffre) jouer([{ type: 'proposer', candidatId: c.id, part: encore.contreOffre }]);
      }
    }

    // Le matin : rénovations, ménage, réserve, moral de l'équipe.
    if (etat.minuteDuJour === 10 * 60) {
      if (renover && etat.systemes.renovation && etat.tresorerie > B.RENOVATION.prix + 700) {
        const fermee = ORDRE_RENOVATION.find((id) => {
          const c = etat.chambres.find((x) => x.id === id);
          return c && !c.ouverte && c.travaux === null;
        });
        if (fermee) jouer([{ type: 'renover', chambreId: fermee }]);
        // Les chambres d'abord, puis le bar.
        else if (equipeBar > 0 && etat.systemes.bar && !etat.bar.ouvert && etat.bar.travaux === null && etat.tresorerie > B.RENOVATION_BAR.prix + 700) {
          jouer([{ type: 'renoverBar' }]);
        }
      }
      if (etat.bar.ouvert && etat.equipes.bar !== equipeBar) jouer([{ type: 'equipeBar', effectif: equipeBar }]);
      const ouvertes = etat.chambres.filter((c) => c.ouverte).length;
      if (etat.systemes.recrutement && ouvertes >= 3 && etat.equipes.menage < 2) jouer([{ type: 'equipeMenage', effectif: 2 }]);
      if (etat.systemes.reserve && etat.tauxReserve === 0) jouer([{ type: 'tauxReserve', taux: 0.1 }]);
      for (const e of etat.personnel) {
        if (e.moral < 45) jouer([{ type: 'entretienIndividuel', employeId: e.id, reponse: 'ecouter' }]);
        if (e.menaceDepart !== null && etat.tresorerie > 400) jouer([{ type: 'prime', employeId: e.id, niveau: 1 }]);
      }
    }

    if (r.evenements.some((e) => e.type === 'briefing')) {
      const offre = typeof options.offre === 'function' ? options.offre(etat) : options.offre;
      const repos = etat.personnel.filter((e) => e.fatigue > 55 || e.promesseRepos !== null).map((e) => e.id);
      const commanderBar = etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock < (etat.regles.formule === 'champagne' ? 50 : 30);
      const theme = typeof options.theme === 'function' ? options.theme(etat) : (options.theme ?? null);
      jouer([{ type: 'validerBriefing', offre, commanderLinge: etat.linge < 40, commanderBar, repos, rdvMax, theme }]);
    }
  }
  return { nuits: resumes, etat, departs, bilans, tresorerieMin, intrigues: etat.intrigues.finies };
}

/** Part de chaque segment parmi les clients servis sur un ensemble de nuits, en %. */
export function partsDeClientele(nuits: ResumeNuit[]): Record<Segment, number> {
  const total: Record<Segment, number> = { touriste: 0, habitue: 0, affaires: 0, groupe: 0 };
  for (const n of nuits) for (const s of Object.keys(total) as Segment[]) total[s] += n.servisParSegment[s];
  const somme = Object.values(total).reduce((a, b) => a + b, 0) || 1;
  for (const s of Object.keys(total) as Segment[]) total[s] = (total[s] * 100) / somme;
  return total;
}

/**
 * Le joueur qui lit les tendances du lundi et adapte son offre et ses règles.
 * Sert à vérifier que l'offre change vraiment la partie (voir equilibrage-semaine.test.ts).
 */
export function choixAdaptatif(etat: EtatJeu): { offre: Offre; regles: Partial<Regles>; theme: string | null } {
  const t = new Set(etat.semaine.tendances);
  const barPlein = etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock > 20;
  const base: Partial<Regles> = { tarif: 1, formule: 'standard', selection: 'normale', priorite: 'arrivee' };
  // Deux soirs à thème par semaine (vendredi et samedi), pour ne pas lasser.
  const soirDeFete = [4, 5].includes((etat.jour - 1) % 7);
  const theme = (id: string) => (soirDeFete ? id : null);
  // Les notes de frais en ville : les prix montent, les pressés passent devant, les masques tombent.
  if (t.has('congres') || t.has('salon')) {
    return { offre: 'classique', regles: { ...base, tarif: 2, priorite: 'presses' }, theme: theme('masquee') };
  }
  // Les bandes de copains ou la foule : un portier garde la maison vivable.
  if (t.has('match') || t.has('evg') || t.has('hauteSaison')) {
    return { offre: 'classique', regles: { ...base, selection: 'stricte' }, theme: theme('burlesque') };
  }
  // Semaine creuse : un tarif doux, qui ne coûte presque rien et fait des heureux.
  if (t.has('greve') || t.has('controles')) {
    return { offre: 'classique', regles: { ...base, tarif: 0 }, theme: theme(barPlein ? 'anneesFolles' : 'masquee') };
  }
  // Les habitués reviennent : on les choie.
  if (t.has('pluie') || t.has('paie')) return { offre: 'feutree', regles: { ...base, priorite: 'habitues' }, theme: null };
  return { offre: 'classique', regles: base, theme: theme('jazz') };
}

/** Mesures du renouvellement des soirées sur une partie (v0.4) : décisions, variété et répétitions des cartes. */
export interface Renouvellement {
  /** Décisions significatives par soirée, en moyenne. */
  decisions: number;
  /** Part des soirées avec moins de 4 décisions. */
  soireesCalmes: number;
  alertes: number;
  imprevus: number;
  /** Imprévus différents vus dans la partie. */
  imprevusDifferents: number;
  /** Apparitions de l'imprévu le plus fréquent. */
  repetitionMax: number;
  /** Part des imprévus déjà vus dans les 7 nuits précédentes. */
  dejaVus7: number;
  /** Cartes d'intrigue (journée et soirée). */
  cartesIntrigue: number;
}

export function mesurerRenouvellement(nuits: ResumeNuit[]): Renouvellement {
  const n = Math.max(1, nuits.length);
  const somme = (f: (x: ResumeNuit) => number) => nuits.reduce((t, x) => t + f(x), 0);
  const compte = new Map<string, number>();
  let dejaVus = 0;
  let total = 0;
  nuits.forEach((nuit, i) => {
    const recents = new Set(nuits.slice(Math.max(0, i - 7), i).flatMap((x) => x.imprevus));
    for (const id of nuit.imprevus) {
      total += 1;
      if (recents.has(id)) dejaVus += 1;
      compte.set(id, (compte.get(id) ?? 0) + 1);
    }
  });
  return {
    decisions: somme((x) => x.decisions) / n,
    soireesCalmes: nuits.filter((x) => x.decisions < 4).length / n,
    alertes: somme((x) => Object.values(x.alertes).reduce((a, b) => a + b, 0)) / n,
    imprevus: total / n,
    imprevusDifferents: compte.size,
    repetitionMax: Math.max(0, ...compte.values()),
    dejaVus7: total > 0 ? dejaVus / total : 0,
    cartesIntrigue: somme((x) => x.intrigues.length),
  };
}
