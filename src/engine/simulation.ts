// Simulation d'un joueur actif, pour l'équilibrage (utilisée par les tests, jamais par l'interface).

import * as B from '../content/balance';
import type { Offre, Segment } from '../content/clientele';
import type { ParSegment } from './clientele';
import { creerEtatInitial, type EtatJeu, type Regles } from './etat';
import type { BilanSemaine } from './semaine';
import type { BilanMois } from './bilans';
import { appliquerOrdresSurPlace, tickSurPlace, type Ordre } from './tick';
import { alertes } from './alertes';
import { creerTirage } from './hasard';
import { trouverImprevu } from '../content/imprevus';
import { INTRIGUES } from '../content/intrigues';
import { choixPossibles, etapeCourante, type IntrigueFinie } from './intrigues';
import { estOuvert } from './temps';
import { TEXTES_ALERTES } from '../content/alertes';
import { ACTEURS_ORDRE, type IdActeur } from '../content/relations';
import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { CARTES_RIVALE, INTRIGUE_CHAT_NOIR } from '../content/rivale';
import { IMPREVUS_QUARTIER } from '../content/imprevusQuartier';
import { actionPossible } from './relations';
import { reponsePossible } from './rivale';
import { gagneNuit } from './comptes';
import { valeurNette } from './banque';

const moyenne = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

export interface ResumeNuit {
  numero: number;
  reputation: number;
  tresorerie: number;
  /** Recette de la maison moins les dépenses de la nuit, hors salaires de midi et travaux (la cible des spécifications). */
  net: number;
  /** Gagné cette nuit, comme au bilan de fermeture : recettes moins toutes les dépenses de la journée. */
  gagne: number;
  /**
   * Ce que le bilan de fermeture ne sait pas expliquer : trésorerie après, moins trésorerie avant, gagné,
   * réserve mise de côté et retirée. Toujours zéro si les comptes de la nuit sont justes.
   */
  ecartCaisse: number;
  /** Personnel à la fermeture : fatigue moyenne et la plus haute, moral moyen (v0.6). */
  fatigueMoyenne: number;
  fatigueMax: number;
  moralMoyen: number;
  /** Résultat réel depuis le bilan précédent : trésorerie et réserve, nettes des dettes et du capital encore dû sur les nouveaux emprunts. */
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
  /** Alertes apparues pendant la soirée (une par apparition), par type ; les alertes minutées sous leur identifiant (presse, bruit…). */
  alertes: Record<string, number>;
  /** Décisions significatives de la soirée : imprévus, cartes d'intrigue et alertes apparues. */
  decisions: number;
  /** Relations avec le quartier à la fermeture (v0.5). */
  relations: Record<IdActeur, number>;
  /** Actions de relations menées depuis la nuit précédente. */
  actionsRelations: number;
  /** La rivale à la fermeture (v0.5) : agressivité et vos rapports ; ses actions depuis la nuit précédente. */
  rivale: { agressivite: number; relation: number; actions: string[] };
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
  /** Signer ce nouvel emprunt dès qu'il s'ouvre (v0.6). */
  emprunt?: { montant: number; duree: number };
  /** Mettre au repos quiconque dépasse cette fatigue au briefing (55 par défaut ; 101 : jamais). */
  reposFatigue?: number;
  /** Au cran 6, accepter ce que demandent ceux qui négocient (prime ou repos promis). */
  accepterNegociations?: boolean;
  /** Soirée à thème programmée au briefing, dès qu'elles sont ouvertes (fixe, ou choisie selon la partie). */
  theme?: string | null | ((etat: EtatJeu) => string | null);
  /** Pour les mesures : ces tendances toutes les semaines, dès qu'elles sont ouvertes. */
  tendances?: string[];
  /** Façon de trancher les imprévus et les intrigues (prudente par défaut). */
  politique?: Politique;
  /** Faux : aucune intrigue ne démarre (pour mesurer une mécanique seule, comme sans tendance). */
  intrigues?: boolean;
  /**
   * Faux : ni imprévu, ni intrigue, ni alerte minutée, ni défi ni récompense du mois, et les disputes laissées à
   * elles-mêmes, comme le joueur simulé de la v0.3 (pour mesurer une mécanique seule, sans le bruit des cartes).
   */
  cartes?: boolean;
  /**
   * Relations avec le quartier (v0.5) : « aucune » (par défaut, le joueur les ignore) ou « entretien » (chaque matin,
   * une action auprès d'un acteur qui passe sous la cible : la plus chère si la caisse le permet largement).
   */
  relations?: 'aucune' | 'entretien';
  /** Cible du joueur qui entretient ses relations (10 par défaut). */
  cibleRelations?: number;
  /**
   * Réponse à la rivale (v0.5) : « aucune » (par défaut), « treve » (propose une trêve dès que possible),
   * « riposte » (lance une rumeur chaque semaine où elle a agi).
   */
  rivale?: 'aucune' | 'treve' | 'riposte';
  /** Équipes Accueil et Sécurité engagées dès le palier 3 (v0.5), et niveau d'assurance dès qu'elle s'ouvre. */
  accueil?: number;
  securite?: number;
  assurance?: number;
  /** Visibilité choisie dès qu'elle s'ouvre (v0.5). */
  visibilite?: B.IdVisibilite;
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
  /** Bilans de fin de mois. */
  bilansMois: BilanMois[];
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
  const bilansMois: BilanMois[] = [];
  let tresorerieMin = etat.tresorerie;
  let avoirPrecedent = valeurNette(etat);
  let empruntSigne = false;
  // Compteurs de la nuit en cours, pour mesurer le renouvellement des soirées.
  let imprevusNuit: string[] = [];
  let intriguesNuit: string[] = [];
  let intriguesSoiree = 0;
  let alertesNuit: Record<string, number> = {};
  let alertesAvant = new Set<string>();
  let actionsRelations = 0;
  let actionsRivale: string[] = [];
  const bullesVues = new Set<string>();
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
    if (sansCartes) {
      // Ni alerte minutée, ni défi, ni objectif du mois à récompenser, ni événement du quartier : la mécanique seule.
      etat.minuteries = [];
      etat.intrigues.actives = [];
      etat.defi = null;
      etat.mois = { ...etat.mois, objectif: 'reputation', cible: 999 };
    }
    tresorerieMin = Math.min(tresorerieMin, etat.tresorerie);
    const ouvert = estOuvert(etat);
    // Une alerte minutée compte sous son propre type (client pressé, bruit…), et chacune à part, même simultanées.
    const cleAlerte = (a: ReturnType<typeof alertes>[number]) =>
      a.type === 'minuterie' ? `${a.id}|${a.cle}` : `${a.type}|${'chambreId' in a ? a.chambreId : 'employeId' in a ? a.employeId : ''}`;
    const alertesMaintenant = new Set(ouvert ? alertes(etat).map(cleAlerte) : []);
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
      if (e.type === 'rivaleAgit') actionsRivale.push(e.action);
      if (e.type === 'bilanSemaine' && etat.bilanSemaine) bilans.push(structuredClone(etat.bilanSemaine));
      if (e.type === 'bilanMois' && etat.bilanMois) bilansMois.push(structuredClone(etat.bilanMois));
      if (e.type === 'bilan') {
        resumes.push({
          numero: e.nuit.numero,
          reputation: etat.reputation,
          tresorerie: etat.tresorerie,
          net: gagneNuit(e.nuit.comptes) + e.nuit.comptes.depenses.salaires + e.nuit.comptes.depenses.travaux,
          gagne: gagneNuit(e.nuit.comptes),
          fatigueMoyenne: moyenne(etat.personnel.map((x) => x.fatigue)),
          fatigueMax: Math.max(0, ...etat.personnel.map((x) => x.fatigue)),
          moralMoyen: moyenne(etat.personnel.map((x) => x.moral)),
          ecartCaisse: e.nuit.tresorerieApres - e.nuit.tresorerieAvant - gagneNuit(e.nuit.comptes) + e.nuit.reserve - e.nuit.retraitReserve - e.nuit.empruntRecu,
          resultat: valeurNette(etat) - avoirPrecedent,
          bar: e.nuit.comptes.recettes.bar,
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
          relations: { ...etat.relations.jauges },
          actionsRelations,
          rivale: { agressivite: etat.rivale.agressivite, relation: etat.rivale.relation, actions: actionsRivale },
        });
        actionsRelations = 0;
        actionsRivale = [];
        avoirPrecedent = valeurNette(etat);
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
    // Une dispute sur le quai : le joueur prudent offre un verre, l'autre tente de calmer.
    if (etat.dispute && !sansCartes) jouer([{ type: 'regleDispute', choix: options.politique === 'hasard' && hasard.chance(0.5) ? 'calmer' : 'verre' }]);
    // Alertes minutées : le joueur prudent répond aussitôt par la première action ; au hasard, il en laisse filer une sur quatre.
    for (const a of [...etat.minuteries]) {
      // Chaque bulle une seule fois, dès qu'elle apparaît (le photographe qui revient est une nouvelle bulle).
      const bulle = `${a.cle}@${a.debut}@${a.expire}`;
      if (bullesVues.has(bulle)) continue;
      bullesVues.add(bulle);
      const n = TEXTES_ALERTES[a.id].actions.length;
      if (options.politique === 'hasard') {
        if (hasard.chance(0.25)) continue;
        jouer([{ type: 'traiterAlerte', cle: a.cle, action: hasard.choisir(Array.from({ length: n }, (_, i) => i)) }]);
      } else jouer([{ type: 'traiterAlerte', cle: a.cle, action: 0 }]);
    }
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
      if (options.relations === 'entretien' && etat.systemes.relations) {
        const cible = options.cibleRelations ?? 10;
        for (const acteur of ACTEURS_ORDRE) {
          if (etat.relations.jauges[acteur] >= cible) continue;
          // La plus chère si la caisse le permet largement, sinon la moins chère.
          const actions = Object.entries(B.ACTIONS_RELATIONS)
            .filter(([, a]) => a.acteur === acteur)
            .sort(([, a], [, b]) => b.cout - a.cout);
          const choisie = actions.find(([id, a]) => actionPossible(etat, id) && etat.tresorerie > a.cout + (a === actions[0]![1] ? 2500 : 800));
          if (choisie) {
            jouer([{ type: 'actionRelation', action: choisie[0] }]);
            actionsRelations += 1;
          }
        }
      }
      if (etat.systemes.accueil && options.accueil !== undefined && etat.equipes.accueil !== options.accueil) {
        jouer([{ type: 'equipeQuartier', equipe: 'accueil', effectif: options.accueil }]);
      }
      if (etat.systemes.securite && options.securite !== undefined && etat.equipes.securite !== options.securite) {
        jouer([{ type: 'equipeQuartier', equipe: 'securite', effectif: options.securite }]);
      }
      if (etat.systemes.assurance && options.assurance !== undefined && etat.assurance !== options.assurance) {
        jouer([{ type: 'assurance', niveau: options.assurance }]);
      }
      if (etat.systemes.visibilite && options.visibilite && etat.regles.visibilite !== options.visibilite) {
        jouer([{ type: 'regle', regle: 'visibilite', valeur: options.visibilite }]);
      }
      if (options.emprunt && etat.systemes.emprunt && etat.banque.emprunts.length === 0 && !empruntSigne) {
        empruntSigne = true;
        jouer([{ type: 'emprunter', montant: options.emprunt.montant, duree: options.emprunt.duree }]);
      }
      if (options.rivale === 'treve' && etat.systemes.rivale && etat.rivale.agressivite >= 40 && reponsePossible(etat, 'treve') && etat.tresorerie > 1500) {
        jouer([{ type: 'reponseRivale', reponse: 'treve' }]);
      }
      const aAgi = etat.rivale.derniereAction && etat.jour - etat.rivale.derniereAction.jour < 7;
      if (options.rivale === 'riposte' && aAgi && reponsePossible(etat, 'rumeur') && etat.tresorerie > 1000) {
        jouer([{ type: 'reponseRivale', reponse: 'rumeur' }]);
      }
      for (const e of etat.personnel) {
        if (e.moral < 45) jouer([{ type: 'entretienIndividuel', employeId: e.id, reponse: 'ecouter' }]);
        if (e.menaceDepart !== null && etat.tresorerie > 400) jouer([{ type: 'prime', employeId: e.id, niveau: 1 }]);
      }
    }

    if (r.evenements.some((e) => e.type === 'briefing')) {
      const offre = typeof options.offre === 'function' ? options.offre(etat) : options.offre;
      const seuilRepos = options.reposFatigue ?? 55;
      const repos = etat.personnel.filter((e) => e.fatigue > seuilRepos || (seuilRepos <= 100 && e.promesseRepos !== null)).map((e) => e.id);
      const accords = Object.fromEntries(etat.personnel.map((e) => [e.id, options.accepterNegociations ? 'accepter' : 'refuser'] as const));
      const commanderBar = etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock < (etat.regles.formule === 'champagne' ? 50 : 30);
      const theme = typeof options.theme === 'function' ? options.theme(etat) : (options.theme ?? null);
      jouer([{ type: 'validerBriefing', offre, packLinge: etat.linge < 4 ? 5 : 0, commanderBar, repos, rdvMax, theme, accords }]);
    }
  }
  return { nuits: resumes, etat, departs, bilans, tresorerieMin, intrigues: etat.intrigues.finies, bilansMois };
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

/** Ce qui vient de dehors (v0.5) : cartes du quartier, cartes de la rivale, imprévus du quartier, alertes du quartier. */
export function evenementsExterieurs(nuit: ResumeNuit): number {
  const cartes = nuit.intrigues.map((x) => x.split(':')[0]!).filter((id) => CARTES_EXTERIEURES.has(id)).length;
  const imprevus = nuit.imprevus.filter((id) => IMPREVUS_EXTERIEURS.has(id)).length;
  const alertes = (nuit.alertes.journaliste ?? 0) + (nuit.alertes.fenetre ?? 0) + (nuit.alertes.sabotage ?? 0);
  return cartes + imprevus + alertes;
}

const CARTES_EXTERIEURES = new Set([...EVENEMENTS_QUARTIER, ...CARTES_RIVALE, INTRIGUE_CHAT_NOIR].map((d) => d.id));
/** Les imprévus du quartier qui viennent de dehors (la panne, le pianiste ou la retraite d'un habitué n'en sont pas). */
const IMPREVUS_EXTERIEURS = new Set(
  IMPREVUS_QUARTIER.filter((d) => d.condition?.systeme || d.condition?.relationMin || d.condition?.visibilite).map((d) => d.id),
);
