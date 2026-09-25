// Simulation d'un joueur actif, pour l'équilibrage (utilisée par les tests, jamais par l'interface).

import * as B from '../content/balance';
import type { Offre } from '../content/clientele';
import { creerEtatInitial, type EtatJeu } from './etat';
import { appliquerOrdres, tick, type Ordre } from './tick';

export interface ResumeNuit {
  numero: number;
  reputation: number;
  tresorerie: number;
  /** Recette de la maison moins les dépenses de la nuit. */
  net: number;
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
}

const ORDRE_RENOVATION = ['orientale', 'velours', 'miroirs'];

/** Joue une partie avec des décisions simples et raisonnables, et résume chaque nuit. */
export function simuler(options: OptionsSimulation): { nuits: ResumeNuit[]; etat: EtatJeu; departs: number } {
  const { graine, nuits, recruter = true, renover = true, rdvMax = 3 } = options;
  let etat = creerEtatInitial({ graine });
  const resumes: ResumeNuit[] = [];
  let departs = 0;
  const jouer = (ordres: Ordre[]) => {
    etat = appliquerOrdres(etat, ordres).etat;
  };

  for (let pas = 0; pas < nuits * 300 && resumes.length < nuits; pas++) {
    const ordres: Ordre[] = [];
    for (const c of etat.chambres) {
      if (c.ouverte && c.proprete < B.SEUIL_CHAMBRE_SALE && etat.tresorerie > 300 && !etat.rendezVous.some((r) => r.chambreId === c.id)) {
        ordres.push({ type: 'nettoyageExpress', chambreId: c.id });
      }
    }
    const r = tick(etat, ordres);
    etat = r.etat;
    for (const e of r.evenements) {
      if (e.type === 'depart') departs += 1;
      if (e.type === 'bilan') {
        resumes.push({
          numero: e.nuit.numero,
          reputation: etat.reputation,
          tresorerie: etat.tresorerie,
          net: e.nuit.recettes - e.nuit.depenses,
          servis: e.nuit.servis,
          perdus: e.nuit.perdus,
          personnel: etat.personnel.length,
          chambres: etat.chambres.filter((c) => c.ouverte).length,
          palier: etat.palier,
        });
      }
    }

    // Cartes en attente, tranchées comme le ferait un joueur prudent.
    if (etat.imprevu) jouer([{ type: 'choixImprevu', choix: 0 }]);
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
      }
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
      jouer([{ type: 'validerBriefing', offre, commanderLinge: etat.linge < 40, repos, rdvMax }]);
    }
  }
  return { nuits: resumes, etat, departs };
}
