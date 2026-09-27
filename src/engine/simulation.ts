// Simulation d'un joueur actif, pour l'équilibrage (utilisée par les tests, jamais par l'interface).

import * as B from '../content/balance';
import type { Offre, Segment } from '../content/clientele';
import { parSegment, type ParSegment } from './clientele';
import { creerEtatInitial, type EtatJeu, type Regles } from './etat';
import type { BilanSemaine } from './semaine';
import type { BilanMois } from './bilans';
import { appliquerOrdresSurPlace, tickSurPlace, type Ordre } from './tick';
import { alertes } from './alertes';
import { creerTirage } from './hasard';
import { trouverImprevu } from '../content/imprevus';
import { INTRIGUES, INTRIGUES_PRINCIPALES } from '../content/intrigues';
import { choixPossibles, etapeCourante, type IntrigueFinie } from './intrigues';
import { estOuvert } from './temps';

/** La maison est-elle ouverte (on ne lance pas de travaux en pleine soirée) ? */
const ouvertMaintenant = (etat: EtatJeu) => estOuvert(etat) || etat.minuteDuJour >= B.HEURE_BRIEFING - 6 * 60;
import { TEXTES_ALERTES } from '../content/alertes';
import { ACTEURS_ORDRE, type IdActeur } from '../content/relations';
import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { CARTES_RIVALE, INTRIGUE_CHAT_NOIR } from '../content/rivale';
import { IMPREVUS_QUARTIER } from '../content/imprevusQuartier';
import { actionPossible } from './relations';
import { reponsePossible } from './rivale';
import { gagneNuit } from './comptes';
import { detteTotale, valeurNette } from './banque';
import { prixFormation, prochainConfort } from './gamme';
import { accepteGerance, optionsAgrandissement, peutDemanderPermis, peutPromouvoir, peutReunirQuartier } from './agrandir';
import { peutConfier, peutEngagerExterne } from './maison2';

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
  /** Systèmes ouverts à la fermeture (v0.6, partie 8), toute la dette (rachat, emprunts, retard) et la valeur nette. */
  systemesOuverts: number;
  /**
   * v1.0, partie 4 : les nouveautés vécues jusque-là, au sens large : systèmes ouverts, arcs et intrigues principales
   * commencés, et étapes du permis franchies (dépôt, enquête, commission, accord).
   */
  nouveautes: number;
  dette: number;
  valeurNette: number;
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
  /** Alertes réglées seules par les équipes Accueil et Sécurité depuis la nuit précédente (v0.6). */
  alertesReglees: number;
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
  /** v1.0, partie 5 : fait ce que Josée conseille, et seulement cela (le joueur passif qui a suivi le didacticiel). */
  suitJosee?: boolean;
  /** Rénover les chambres dès que la trésorerie le permet. */
  renover?: boolean;
  rdvMax?: number;
  /** Règles de la maison appliquées dès leur ouverture (palier 2), fixes ou choisies selon la partie. */
  regles?: Partial<Regles> | ((etat: EtatJeu) => Partial<Regles>);
  /** Rouvrir le bar une fois les chambres rénovées, avec cet effectif (0 : ne pas rouvrir). */
  equipeBar?: number;
  /** Accepter l'avance du grossiste. */
  avance?: boolean;
  /**
   * Commande automatique du linge réglée à cette cible (v0.6). Par défaut, pour le joueur qui rénove, la plus petite cible qui
   * couvre la soirée prévue (partie 8 : le joueur de référence manquait de linge) ; 0, ou le joueur passif : un pack de 5 sous 4.
   */
  lingeAuto?: number;
  /** Aménager la buanderie et les loges dès qu'elles s'ouvrent et que la caisse le permet (v0.6). */
  buanderie?: boolean;
  loges?: boolean;
  /** Rafraîchir une chambre dont l'état passe sous ce seuil (v0.6 ; par défaut 30 pour le joueur qui rénove, 0 : jamais). */
  rafraichirSous?: number;
  /** Confier la gestion à Josée dès qu'elle s'ouvre, avec la réserve (v0.6). */
  gestionJosee?: boolean;
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
  /** Palier 4 (v0.6) : améliorer le confort des chambres, former les équipes, placer l'excédent (prudent), si la caisse le permet largement. */
  confort?: boolean;
  former?: boolean;
  placer?: boolean;
  /** Palier 5 (v0.6) : déposer le permis dès que possible, racheter chez le voisin, promouvoir une gérante, acheter la deuxième maison. */
  permis?: boolean;
  agrandir?: 'etages' | 'batiment';
  gerante?: boolean;
  etablissement?: boolean;
  /** v1.0 : ouvrir la deuxième maison une fois prête, confiée à une personne de l'équipe (la plus loyale qui accepte) ou à la gérante venue d'ailleurs, avec cette consigne. */
  maison2?: 'equipe' | 'externe';
  consigneMaison?: B.IdConsigne;
  /** Pour racheter chez le voisin, signer ce nouvel emprunt si la caisse ne suffit pas (v0.6). */
  empruntAgrandir?: { montant: number; duree: number };
  /** Embaucher aussi les candidats du marché tant que l'équipe compte moins de personnes (v0.6 ; 4 par défaut, pour remplacer qui part). */
  recruterJusqua?: number;
}

const ORDRE_RENOVATION = ['orientale', 'velours', 'miroirs'];

/** Les intrigues qui comptent comme une nouveauté : celles des personnages et du Chat Noir. */
const HISTOIRES_PRINCIPALES = new Set([...INTRIGUES_PRINCIPALES, INTRIGUE_CHAT_NOIR].map((d) => d.id));
/** Étapes du permis franchies : dépôt, enquête, commission, accord (un refus repart de zéro). */
function etapesPermis(etat: EtatJeu): number {
  const rang = { aucun: 0, refuse: 0, depose: 1, enquete: 2, commission: 3, accorde: 4 } as const;
  return etat.palier >= 5 ? 4 : rang[etat.permis.statut];
}

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
  /** Ordres donnés par le joueur simulé, avec leur jour (v0.6, partie 8 : décisions par semaine). */
  ordres: { jour: number; type: string }[];
} {
  const { graine, nuits, renover = true, rdvMax = 3, equipeBar = 1, avance = true } = options;
  // v1.0, partie 5 : le joueur qui suit Josée se met à recruter quand elle le lui dit, et prend la commande automatique.
  let recruter = options.recruter ?? true;
  let lingeJosee: number | undefined;
  // Le joueur actif (partie 8) : commande automatique du linge et chambres rafraîchies avant d'être défraîchies.
  // La cible de linge couvre la soirée prévue (5, 10 ou 20 parures), comme le ferait un joueur attentif.
  const cibleLinge = () =>
    lingeJosee ?? options.lingeAuto ?? (renover ? (B.CIBLES_LINGE_AUTO.find((c) => c >= etat.personnel.length * rdvMax) ?? 20) : 0);
  const rafraichirSous = options.rafraichirSous ?? (renover ? B.CHAMBRE_DEFRAICHIE.seuil : 0);
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
  let alertesReglees = 0;
  const bullesVues = new Set<string>();
  const hasard = creerTirage((graine * 7919) | 0);
  const trancher = (possibles: boolean[]): number => {
    const indices = possibles.flatMap((ok, i) => (ok ? [i] : []));
    if (indices.length === 0) return 0;
    return options.politique === 'hasard' ? hasard.choisir(indices) : indices[0]!;
  };
  // La simulation travaille sur sa propre copie de l'état, modifiée sur place : bien plus rapide.
  const ordresJoues: { jour: number; type: string }[] = [];
  const jouer = (ordres: Ordre[]) => {
    for (const o of ordres) ordresJoues.push({ jour: etat.jour, type: o.type });
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
      if (e.type === 'alerteReglee') alertesReglees += 1;
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
          ecartCaisse: e.nuit.tresorerieApres - e.nuit.tresorerieAvant - gagneNuit(e.nuit.comptes) + e.nuit.reserve - e.nuit.retraitReserve - e.nuit.empruntRecu - e.nuit.placement,
          resultat: valeurNette(etat) - avoirPrecedent,
          bar: e.nuit.comptes.recettes.bar,
          satisfaction: { ...etat.clientele.satisfaction },
          servisParSegment: { ...(etat.clientele.historique[0]?.servis ?? parSegment(0)) },
          servis: e.nuit.servis,
          perdus: e.nuit.perdus,
          personnel: etat.personnel.length,
          chambres: etat.chambres.filter((c) => c.ouverte).length,
          palier: etat.palier,
          systemesOuverts: Object.values(etat.systemes).filter(Boolean).length,
          nouveautes:
            Object.values(etat.systemes).filter(Boolean).length +
            new Set([...etat.intrigues.actives, ...etat.intrigues.finies.filter((f) => f.fin !== 'ecartee')].map((i) => i.id).filter((id) => HISTOIRES_PRINCIPALES.has(id))).size +
            etapesPermis(etat),
          dette: detteTotale(etat),
          valeurNette: valeurNette(etat),
          tapage: etat.quartier.tapage,
          imprevus: imprevusNuit,
          intrigues: intriguesNuit,
          intriguesSoiree,
          alertes: alertesNuit,
          decisions: imprevusNuit.length + intriguesSoiree + Object.values(alertesNuit).reduce((a, b) => a + b, 0),
          relations: { ...etat.relations.jauges },
          actionsRelations,
          alertesReglees,
          rivale: { agressivite: etat.rivale.agressivite, relation: etat.rivale.relation, actions: actionsRivale },
        });
        actionsRelations = 0;
        actionsRivale = [];
        alertesReglees = 0;
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

    // v1.0, partie 5 : le joueur qui suit Josée fait ce qu'elle conseille, puis referme la carte.
    const conseil = etat.conseils.enCours;
    if (options.suitJosee && conseil) {
      if ((conseil.id === 'renover' || conseil.id === 'renoverEncore') && conseil.chambreId) jouer([{ type: 'renover', chambreId: conseil.chambreId }]);
      if (conseil.id === 'rafraichir' && conseil.chambreId) jouer([{ type: 'rafraichir', chambreId: conseil.chambreId }]);
      if (conseil.id === 'recruter' || conseil.id === 'recruterEncore') recruter = true;
      if (conseil.id === 'lingeAuto') lingeJosee = 10;
      if (conseil.id === 'permis' && peutDemanderPermis(etat)) jouer([{ type: 'demanderPermis' }]);
      jouer([{ type: 'conseilVu' }]);
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
        // Le joueur actif remplace aussi qui est parti, jusqu'à 4 personnes (v0.6, partie 8), ou davantage si on le lui demande.
        const jusqua = options.recruterJusqua ?? B.PERSONNEL_MAX;
        if (c.source !== 'visite' && etat.personnel.length >= jusqua) continue;
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
      for (const annexe of ['buanderie', 'loges'] as const) {
        const prix = annexe === 'loges' ? B.LOGES.prix : B.BUANDERIE.prix;
        const a = etat.annexes[annexe];
        if (options[annexe] && etat.systemes[annexe] && !a.ouverte && a.travaux === null && etat.tresorerie > prix + 1500) {
          jouer([{ type: 'renoverAnnexe', annexe }]);
        }
      }
      if (rafraichirSous > 0 && etat.systemes.renovation && !ouvertMaintenant(etat)) {
        for (const c of etat.chambres) {
          if (c.ouverte && c.travaux === null && c.etat < rafraichirSous && etat.tresorerie > B.RAFRAICHIR.prix + 1500) {
            jouer([{ type: 'rafraichir', chambreId: c.id }]);
          }
        }
      }
      if (options.permis && peutDemanderPermis(etat)) jouer([{ type: 'demanderPermis' }]);
      // Pendant l'enquête de voisinage (v1.0), une réunion de quartier si les voisins ne sont pas franchement acquis.
      if (options.permis && peutReunirQuartier(etat) && etat.relations.jauges.voisins < B.PALIER_5.voisins + 15) jouer([{ type: 'reunionQuartier' }]);
      if (options.confort && etat.systemes.confort && !ouvertMaintenant(etat)) {
        for (const c of etat.chambres) {
          const suivant = prochainConfort(c);
          if (c.ouverte && c.travaux === null && suivant && etat.tresorerie > suivant.prix + 5000) jouer([{ type: 'ameliorerConfort', chambreId: c.id }]);
        }
      }
      if (options.former && etat.systemes.formations) {
        for (const equipe of ['menage', 'bar', 'accueil', 'securite'] as const) {
          const prix = prixFormation(etat, equipe);
          if (prix !== null && etat.equipes[equipe] > 0 && etat.tresorerie > prix + 5000) jouer([{ type: 'former', equipe }]);
        }
      }
      if (options.placer && etat.systemes.placement && !etat.placement && etat.tresorerie > 15000) jouer([{ type: 'placer', montant: 5000, profil: 'prudent' }]);
      // Pour un gros achat, le joueur puise dans la réserve (Josée le lui fait remarquer).
      const payer = (prix: number) => {
        if (etat.tresorerie > prix + 3000) return true;
        if (etat.tresorerie + etat.reserve <= prix + 3000) return false;
        jouer([{ type: 'retirerReserve' }]);
        return etat.tresorerie > prix;
      };
      if (options.agrandir && options.empruntAgrandir && optionsAgrandissement(etat).includes(options.agrandir) && etat.systemes.emprunt && !empruntSigne) {
        if (etat.tresorerie + etat.reserve < B.AGRANDISSEMENT[options.agrandir].prix + 3000) {
          empruntSigne = true;
          jouer([{ type: 'emprunter', montant: options.empruntAgrandir.montant, duree: options.empruntAgrandir.duree }]);
        }
      }
      if (options.agrandir && optionsAgrandissement(etat).includes(options.agrandir) && payer(B.AGRANDISSEMENT[options.agrandir].prix)) {
        jouer([{ type: 'agrandir', option: options.agrandir }]);
      }
      // La gérante, une fois l'équipe assez nombreuse pour se passer d'une personne au salon.
      if (options.gerante && etat.systemes.gerante && !etat.gerante && etat.personnel.length >= 6) {
        // v1.0, partie 4 : parmi ceux qui acceptent, celle ou celui aux talents les plus modestes (la vedette reste au
        // salon), puis le plus loyal. Choisir le plus loyal désignait toujours Sanne après son arc : la meilleure hôtesse
        // quittait le salon, et la gérante coûtait 237 € par nuit de poste au lieu de 182 €.
        const talents = (e: (typeof etat.personnel)[number]) => Object.values(e.talents).reduce((a, b) => a + b, 0);
        const choix = [...etat.personnel]
          .filter((e) => peutPromouvoir(etat, e.id) && accepteGerance(e))
          .sort((a, b) => talents(a) - talents(b) || b.loyaute - a.loyaute)[0];
        if (choix) jouer([{ type: 'promouvoir', employeId: choix.id }]);
      }
      if (options.etablissement && etat.systemes.etablissement) {
        const m = etat.etablissement;
        const moinsCher = [...m.offres].sort((a, b) => a.achat + a.travaux - (b.achat + b.travaux))[0];
        if (m.statut === 'offres' && moinsCher && payer(moinsCher.achat + moinsCher.travaux)) jouer([{ type: 'signerLieu', lieu: moinsCher.id }]);
        if (m.statut === 'signe' && payer(m.offres.find((o) => o.id === m.lieu)?.travaux ?? 0)) jouer([{ type: 'lancerTravauxEtablissement' }]);
      }
      if (options.maison2 && etat.systemes.maison2 && etat.etablissement.statut === 'pret') {
        if (!etat.maison2.gerante) {
          // Margot partie ne revient pas : on se tourne alors vers l'équipe.
          const externe = options.maison2 === 'externe' && peutEngagerExterne(etat);
          const choix = externe
            ? undefined
            : [...etat.personnel].filter((e) => peutConfier(etat, e.id) && accepteGerance(e)).sort((a, b) => b.loyaute - a.loyaute)[0];
          if (externe || choix) jouer([{ type: 'confierMaison', employeId: choix?.id ?? 'externe' }]);
        }
        if (etat.maison2.gerante && (etat.maison2.inauguration !== null || payer(B.MAISON2.inauguration))) jouer([{ type: 'inaugurer' }]);
        if (options.consigneMaison && etat.maison2.consigne !== options.consigneMaison) jouer([{ type: 'consigneMaison', consigne: options.consigneMaison }]);
      }
      if (options.gestionJosee && etat.systemes.reserve && !etat.gestionJosee) jouer([{ type: 'gestionJosee', active: true }]);
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
      jouer([
        {
          type: 'validerBriefing',
          offre,
          packLinge: cibleLinge() ? 0 : etat.linge < 4 ? 5 : 0,
          lingeAuto: cibleLinge(),
          commanderBar,
          repos,
          rdvMax,
          theme,
          accords,
        },
      ]);
    }
  }
  return { nuits: resumes, etat, departs, bilans, tresorerieMin, intrigues: etat.intrigues.finies, bilansMois, ordres: ordresJoues };
}

/** Part de chaque segment parmi les clients servis sur un ensemble de nuits, en %. */
export function partsDeClientele(nuits: ResumeNuit[]): Record<Segment, number> {
  const total: Record<Segment, number> = parSegment(0);
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

// ——— Progression sur plusieurs mois (v0.6, partie 8) ———

/** Ordres de gestion de l'argent : ce que le joueur décide dans l'onglet Finances et au bilan du lundi. */
const ORDRES_FINANCES = new Set(['tauxReserve', 'retirerReserve', 'emprunter', 'placer', 'gestionJosee', 'assurance', 'avanceFournisseur']);
/** Ordres d'investissement : travaux, confort, formations, agrandissement, deuxième maison. */
const ORDRES_INVESTISSEMENT = new Set([
  'renover',
  'renoverBar',
  'renoverAnnexe',
  'rafraichir',
  'changerDecor',
  'ameliorerConfort',
  'former',
  'demanderPermis',
  'agrandir',
  'signerLieu',
  'lancerTravauxEtablissement',
  'inaugurer',
]);

export interface Progression {
  /** Jour où chaque palier (1 à 5) est atteint, par partie (0 : jamais). */
  paliers: number[][];
  /** Systèmes ouverts à la fin de chaque semaine, en moyenne. */
  systemesParSemaine: number[];
  /** v1.0, partie 4 : nouveautés au sens large (systèmes, arcs, étapes du permis) à la fin de chaque semaine, en moyenne. */
  nouveautesParSemaine: number[];
  /** À la fin de chaque mois (28 nuits) : trésorerie, toute la dette, valeur nette (avoir moins les nouveaux emprunts), en moyenne. */
  mois: { tresorerie: number; dette: number; valeur: number; reputation: number; personnel: number; chambres: number }[];
  /** Décisions d'argent et d'investissement par semaine, en moyenne, à partir de la semaine donnée. */
  financesParSemaine: number;
  investissementsParSemaine: number;
  faillites: number;
  /** v1.0 : jour de l'inauguration de la deuxième maison, par partie (0 : jamais). */
  inaugurations: number[];
  /** v1.0, partie 2 : jour de la fin du chapitre 1 (0 : jamais), et le titre obtenu, par partie. */
  finsChapitre: number[];
  titres: string[];
  /** Résultat moyen par semaine pleine de la deuxième maison, par partie ouverte, et ce qu'elle a coûté (achat, travaux, inauguration). */
  maison2: { resultatSemaine: number; cout: number; total: number }[];
}

/** Joue une stratégie sur plusieurs mois et en tire la progression : paliers, systèmes ouverts, argent et dette, décisions. */
export function mesurerProgression(graines: number[], options: Omit<OptionsSimulation, 'graine'>, depuisSemaine = 5): Progression {
  const parties = graines.map((graine) => simuler({ ...options, graine }));
  const n = parties.length;
  const semaines = Math.floor(options.nuits / 7);
  const moisN = Math.floor(options.nuits / 28);
  const moyenne = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / n;
  const nuit = (p: (typeof parties)[number], i: number) => p.nuits[Math.min(i, p.nuits.length - 1)];
  const compter = (types: Set<string>) =>
    moyenne((p) => p.ordres.filter((o) => types.has(o.type) && o.jour > (depuisSemaine - 1) * 7).length) / Math.max(1, semaines - depuisSemaine + 1);
  return {
    paliers: parties.map((p) => [1, 2, 3, 4, 5].map((k) => p.nuits.find((x) => x.palier >= k)?.numero ?? 0)),
    systemesParSemaine: Array.from({ length: semaines }, (_, s) => moyenne((p) => nuit(p, s * 7 + 6)?.systemesOuverts ?? 0)),
    nouveautesParSemaine: Array.from({ length: semaines }, (_, s) => moyenne((p) => nuit(p, s * 7 + 6)?.nouveautes ?? 0)),
    mois: Array.from({ length: moisN }, (_, m) => ({
      tresorerie: moyenne((p) => nuit(p, m * 28 + 27)?.tresorerie ?? 0),
      dette: moyenne((p) => nuit(p, m * 28 + 27)?.dette ?? 0),
      valeur: moyenne((p) => nuit(p, m * 28 + 27)?.valeurNette ?? 0),
      reputation: moyenne((p) => nuit(p, m * 28 + 27)?.reputation ?? 0),
      personnel: moyenne((p) => nuit(p, m * 28 + 27)?.personnel ?? 0),
      chambres: moyenne((p) => nuit(p, m * 28 + 27)?.chambres ?? 0),
    })),
    financesParSemaine: compter(ORDRES_FINANCES),
    investissementsParSemaine: compter(ORDRES_INVESTISSEMENT),
    faillites: parties.filter((p) => p.etat.finDePartie).length,
    inaugurations: parties.map((p) => p.etat.maison2.inauguration ?? 0),
    finsChapitre: parties.map((p) => p.etat.finChapitre?.jour ?? 0),
    titres: parties.flatMap((p) => (p.etat.finChapitre ? [p.etat.finChapitre.titre] : [])),
    maison2: parties
      .filter((p) => p.etat.maison2.bilans.length > 0)
      .map((p) => {
        const pleines = p.etat.maison2.bilans.filter((b) => b.nuits === 7);
        const offre = p.etat.etablissement.offres.find((o) => o.id === p.etat.etablissement.lieu);
        return {
          resultatSemaine: pleines.reduce((t, b) => t + b.resultat, 0) / Math.max(1, pleines.length),
          cout: (offre?.achat ?? 0) + (offre?.travaux ?? 0) + B.MAISON2.inauguration,
          total: p.etat.maison2.total,
        };
      }),
  };
}
