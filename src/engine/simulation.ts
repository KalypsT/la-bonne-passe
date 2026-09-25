// Simulation d'un joueur actif, pour l'équilibrage (utilisée par les tests, jamais par l'interface).

import * as B from '../content/balance';
import type { Offre, Segment } from '../content/clientele';
import type { ParSegment } from './clientele';
import { creerEtatInitial, type EtatJeu, type Regles } from './etat';
import { appliquerOrdresSurPlace, tickSurPlace, type Ordre } from './tick';

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
}

export interface OptionsSimulation {
  graine: number;
  offre: Offre | ((etat: EtatJeu) => Offre);
  nuits: number;
  /** Embaucher les candidats qui se présentent. */
  recruter?: boolean;
  /** Rénover les chambres dès que la trésorerie le permet. */
  renover?: boolean;
  rdvMax?: number;
  /** Règles de la maison appliquées dès leur ouverture (palier 2). */
  regles?: Partial<Regles>;
  /** Rouvrir le bar une fois les chambres rénovées, avec cet effectif (0 : ne pas rouvrir). */
  equipeBar?: number;
  /** Accepter l'avance du grossiste. */
  avance?: boolean;
}

const ORDRE_RENOVATION = ['orientale', 'velours', 'miroirs'];

/** Joue une partie avec des décisions simples et raisonnables, et résume chaque nuit. */
export function simuler(options: OptionsSimulation): { nuits: ResumeNuit[]; etat: EtatJeu; departs: number } {
  const { graine, nuits, recruter = true, renover = true, rdvMax = 3, equipeBar = 1, avance = true } = options;
  const etat = creerEtatInitial({ graine });
  const resumes: ResumeNuit[] = [];
  let departs = 0;
  let avoirPrecedent = etat.tresorerie + etat.reserve;
  // La simulation travaille sur sa propre copie de l'état, modifiée sur place : bien plus rapide.
  const jouer = (ordres: Ordre[]) => {
    appliquerOrdresSurPlace(etat, ordres);
  };

  for (let pas = 0; pas < nuits * 300 && resumes.length < nuits; pas++) {
    const ordres: Ordre[] = [];
    for (const c of etat.chambres) {
      if (c.ouverte && c.proprete < B.SEUIL_CHAMBRE_SALE && etat.tresorerie > 300 && !etat.rendezVous.some((r) => r.chambreId === c.id)) {
        ordres.push({ type: 'nettoyageExpress', chambreId: c.id });
      }
    }
    const r = { evenements: tickSurPlace(etat, ordres) };
    for (const e of r.evenements) {
      if (e.type === 'depart') departs += 1;
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
        });
        avoirPrecedent = etat.tresorerie + etat.reserve;
      }
    }

    // Règles de la maison, dès qu'elles s'ouvrent.
    if (options.regles && etat.systemes.tarifs) {
      const r = options.regles;
      const ordresRegles: Ordre[] = [];
      if (r.tarif !== undefined && r.tarif !== etat.regles.tarif) ordresRegles.push({ type: 'regle', regle: 'tarif', valeur: r.tarif });
      if (r.formule && r.formule !== etat.regles.formule) ordresRegles.push({ type: 'regle', regle: 'formule', valeur: r.formule });
      if (r.selection && r.selection !== etat.regles.selection) ordresRegles.push({ type: 'regle', regle: 'selection', valeur: r.selection });
      if (r.priorite && r.priorite !== etat.regles.priorite) ordresRegles.push({ type: 'regle', regle: 'priorite', valeur: r.priorite });
      if (ordresRegles.length) jouer(ordresRegles);
    }

    // Cartes en attente, tranchées comme le ferait un joueur prudent.
    if (etat.imprevu) jouer([{ type: 'choixImprevu', choix: 0 }]);
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
      jouer([{ type: 'validerBriefing', offre, commanderLinge: etat.linge < 40, commanderBar, repos, rdvMax }]);
    }
  }
  return { nuits: resumes, etat, departs };
}

/** Part de chaque segment parmi les clients servis sur un ensemble de nuits, en %. */
export function partsDeClientele(nuits: ResumeNuit[]): Record<Segment, number> {
  const total: Record<Segment, number> = { touriste: 0, habitue: 0, affaires: 0, groupe: 0 };
  for (const n of nuits) for (const s of Object.keys(total) as Segment[]) total[s] += n.servisParSegment[s];
  const somme = Object.values(total).reduce((a, b) => a + b, 0) || 1;
  for (const s of Object.keys(total) as Segment[]) total[s] = (total[s] * 100) / somme;
  return total;
}
