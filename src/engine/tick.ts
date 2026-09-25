import * as B from '../content/balance';
import type { Offre } from '../content/clientele';
import type { EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { trancherImprevu, type EvenementImprevu, type OrdreImprevu } from './imprevus';
import { appliquerPersonnel, matinDuPersonnel, type EvenementPersonnel, type OrdrePersonnel } from './personnel';
import { arrivee, depenser, fermerNuit, ouvrirNuit, prelevementsDuMatin, vivre, type EvenementSoiree } from './soiree';
import {
  appliquerRecrutement,
  arriveeVisites,
  matinRecrutement,
  type EvenementRecrutement,
  type OrdreRecrutement,
} from './recrutement';
import { attendBriefing, estOuvert, instant, MINUTES_PAR_JOUR } from './temps';

/** Ordres envoyés par l'interface au moteur. */
export type Ordre =
  | {
      type: 'validerBriefing';
      offre?: Offre;
      commanderLinge?: boolean;
      /** Planning (palier 1) : qui se repose ce soir, et le maximum de rendez-vous par personne. */
      repos?: string[];
      rdvMax?: number;
    }
  | { type: 'nettoyageExpress'; chambreId: string }
  | { type: 'livraisonLinge' }
  | { type: 'repos'; employeId: string }
  | { type: 'regleDispute'; choix: 'verre' | 'calmer' }
  | { type: 'renover'; chambreId: string }
  | { type: 'tauxReserve'; taux: number }
  | { type: 'retirerReserve' }
  | { type: 'equipeMenage'; effectif: number }
  | { type: 'annonceVue' }
  /** Le didacticiel avance (l'interface décide des étapes, le moteur les garde). */
  | { type: 'didacticiel'; etape: number | null }
  | OrdreRecrutement
  | OrdrePersonnel
  | OrdreImprevu;

export type EvenementMoteur =
  | { type: 'nouveauJour'; jour: number }
  | { type: 'briefing'; jour: number }
  | { type: 'ouverture'; jour: number }
  | { type: 'fermeture'; jour: number }
  | { type: 'nettoyage'; chambreId: string; montant: number }
  | { type: 'livraisonLinge'; montant: number }
  | { type: 'repos'; employeId: string; prenom?: string }
  | { type: 'disputeReglee'; choix: 'verre' | 'calmer'; reussite: boolean }
  | { type: 'debutTravaux'; chambreId: string; montant: number; fin: number }
  | { type: 'finTravaux'; chambreId: string }
  | { type: 'tauxReserve'; taux: number }
  | { type: 'retraitReserve'; montant: number; urgence: boolean }
  | { type: 'equipeMenage'; effectif: number }
  | EvenementSoiree
  | EvenementRecrutement
  | EvenementPersonnel
  | EvenementImprevu;

/** Taille du journal gardé dans la sauvegarde. */
export const TAILLE_JOURNAL = 50;

/** Range les événements dans le journal de la partie, du plus récent au plus ancien. */
function journaliser(etat: EtatJeu, evenements: readonly EvenementMoteur[]): void {
  const entrees = evenements
    .filter((e) => e.type !== 'bilan')
    .map((evenement) => ({ jour: etat.jour, minuteDuJour: etat.minuteDuJour, evenement }));
  if (entrees.length === 0) return;
  etat.journal = [...entrees.reverse(), ...etat.journal].slice(0, TAILLE_JOURNAL);
}

/** Termine les travaux arrivés à échéance : la chambre sort des draps. */
function avancerTravaux(etat: EtatJeu, evenements: EvenementMoteur[]): void {
  const maintenant = instant(etat);
  for (const chambre of etat.chambres) {
    if (chambre.travaux === null || maintenant < chambre.travaux) continue;
    chambre.travaux = null;
    chambre.ouverte = true;
    chambre.proprete = B.PROPRETE_APRES_TRAVAUX;
    chambre.etat = B.ETAT_APRES_TRAVAUX;
    evenements.push({ type: 'finTravaux', chambreId: chambre.id });
  }
}

export interface ResultatTick {
  etat: EtatJeu;
  evenements: EvenementMoteur[];
}

function appliquer(etat: EtatJeu, ordre: Ordre, evenements: EvenementMoteur[]): void {
  switch (ordre.type) {
    case 'validerBriefing': {
      if (!attendBriefing(etat)) return;
      etat.briefingJour = etat.jour;
      if (ordre.offre) etat.offre = ordre.offre;
      if (ordre.commanderLinge) {
        depenser(etat, B.COMMANDE_LINGE.prix);
        etat.lingeCommande += B.COMMANDE_LINGE.draps;
      }
      if (etat.systemes.planning) {
        if (ordre.rdvMax !== undefined && (B.RDV_MAX_CRANS as readonly number[]).includes(ordre.rdvMax)) etat.rdvMax = ordre.rdvMax;
        // Au moins une personne travaille ce soir.
        const repos = new Set(ordre.repos ?? []);
        const tousAuRepos = etat.personnel.every((e) => repos.has(e.id));
        for (const e of etat.personnel) e.reposPrevu = !tousAuRepos && repos.has(e.id);
      }
      return;
    }
    case 'nettoyageExpress': {
      const chambre = etat.chambres.find((c) => c.id === ordre.chambreId);
      const occupee = etat.rendezVous.some((r) => r.chambreId === ordre.chambreId);
      if (!chambre || !chambre.ouverte || occupee || chambre.proprete >= 100) return;
      depenser(etat, B.NETTOYAGE_EXPRESS);
      chambre.proprete = 100;
      evenements.push({ type: 'nettoyage', chambreId: chambre.id, montant: B.NETTOYAGE_EXPRESS });
      return;
    }
    case 'livraisonLinge':
      depenser(etat, B.LIVRAISON_EXPRESS_LINGE.prix);
      etat.linge += B.LIVRAISON_EXPRESS_LINGE.draps;
      evenements.push({ type: 'livraisonLinge', montant: B.LIVRAISON_EXPRESS_LINGE.prix });
      return;
    case 'repos': {
      const employe = etat.personnel.find((e) => e.id === ordre.employeId);
      if (!employe || employe.repos) return;
      employe.repos = true;
      evenements.push({ type: 'repos', employeId: employe.id, prenom: employe.prenom });
      return;
    }
    case 'regleDispute': {
      if (!etat.dispute) return;
      etat.dispute = null;
      let reussite = true;
      if (ordre.choix === 'verre') {
        depenser(etat, B.DISPUTE_VERRE_OFFERT);
      } else {
        const tirage = creerTirage(etat.hasard);
        reussite = tirage.chance(B.DISPUTE_CALMER_REUSSITE);
        etat.hasard = tirage.etat();
        if (!reussite) etat.reputation = Math.max(0, etat.reputation - 1);
      }
      evenements.push({ type: 'disputeReglee', choix: ordre.choix, reussite });
      return;
    }
    case 'renover': {
      const chambre = etat.chambres.find((c) => c.id === ordre.chambreId);
      if (!etat.systemes.renovation || !chambre || chambre.ouverte || chambre.travaux !== null) return;
      if (etat.tresorerie < B.RENOVATION.prix) return;
      depenser(etat, B.RENOVATION.prix);
      chambre.travaux = instant(etat) + B.RENOVATION.heures * 60;
      const fin = (etat.minuteDuJour + B.RENOVATION.heures * 60) % MINUTES_PAR_JOUR;
      evenements.push({ type: 'debutTravaux', chambreId: chambre.id, montant: B.RENOVATION.prix, fin });
      return;
    }
    case 'tauxReserve': {
      if (!etat.systemes.reserve || !(B.TAUX_RESERVE as readonly number[]).includes(ordre.taux)) return;
      if (etat.tauxReserve === ordre.taux) return;
      etat.tauxReserve = ordre.taux;
      evenements.push({ type: 'tauxReserve', taux: ordre.taux });
      return;
    }
    case 'retirerReserve': {
      if (etat.reserve <= 0) return;
      const montant = etat.reserve;
      // Toucher à la réserve alors que la trésorerie est positive n'a rien d'une urgence.
      const urgence = etat.tresorerie < 0;
      etat.tresorerie += montant;
      etat.reserve = 0;
      evenements.push({ type: 'retraitReserve', montant, urgence });
      return;
    }
    case 'equipeMenage': {
      const effectif = Math.round(ordre.effectif);
      if (!etat.systemes.recrutement || effectif < 1 || effectif > B.MENAGE_MAX) return;
      if (effectif === etat.equipes.menage) return;
      etat.equipes.menage = effectif;
      evenements.push({ type: 'equipeMenage', effectif });
      return;
    }
    case 'annonceVue':
      etat.annonces.shift();
      return;
    case 'didacticiel':
      etat.didacticiel = ordre.etape;
      return;
    case 'entretienIndividuel':
    case 'prime':
    case 'adieuVu':
      appliquerPersonnel(etat, ordre, evenements);
      return;
    case 'choixImprevu': {
      const tirage = creerTirage(etat.hasard);
      trancherImprevu(etat, ordre.choix, tirage, () => arrivee(etat, tirage, evenements), evenements);
      etat.hasard = tirage.etat();
      return;
    }
    default:
      appliquerRecrutement(etat, ordre, evenements);
  }
}

/** Applique les ordres du joueur, sans faire avancer le temps. */
export function appliquerOrdres(etat: EtatJeu, ordres: readonly Ordre[]): ResultatTick {
  if (ordres.length === 0) return { etat, evenements: [] };
  const copie = structuredClone(etat);
  const evenements: EvenementMoteur[] = [];
  for (const ordre of ordres) appliquer(copie, ordre, evenements);
  journaliser(copie, evenements);
  return { etat: copie, evenements };
}

/**
 * Avance la simulation d'un pas fixe de 5 minutes de jeu. Fonction pure.
 * À 19 h, le temps reste bloqué tant que le briefing n'est pas validé.
 */
export function tick(etatInitial: EtatJeu, ordres: readonly Ordre[] = []): ResultatTick {
  const apresOrdres = appliquerOrdres(etatInitial, ordres);
  const evenements: EvenementMoteur[] = [...apresOrdres.evenements];
  if (attendBriefing(apresOrdres.etat)) {
    // Rappel du briefing en attente : déjà inscrit au journal quand 19 h a sonné.
    evenements.push({ type: 'briefing', jour: apresOrdres.etat.jour });
    return { etat: apresOrdres.etat, evenements };
  }
  const dejaJournalises = evenements.length;

  const etat = apresOrdres.etat === etatInitial ? structuredClone(etatInitial) : apresOrdres.etat;
  const tirage = creerTirage(etat.hasard);
  const etaitOuvert = estOuvert(etat);

  etat.minuteDuJour = (etat.minuteDuJour + B.MINUTES_PAR_TICK) % MINUTES_PAR_JOUR;
  if (etat.minuteDuJour === B.HEURE_DEBUT_JOURNEE) {
    etat.jour += 1;
    evenements.push({ type: 'nouveauJour', jour: etat.jour });
    prelevementsDuMatin(etat, evenements);
    matinRecrutement(etat, tirage, evenements);
    matinDuPersonnel(etat, evenements);
  }
  avancerTravaux(etat, evenements);
  arriveeVisites(etat, evenements);

  const ouvert = estOuvert(etat);
  if (!etaitOuvert && ouvert) {
    ouvrirNuit(etat);
    evenements.push({ type: 'ouverture', jour: etat.jour });
  }

  vivre(etat, ouvert, tirage, evenements);

  if (etaitOuvert && !ouvert) {
    evenements.push({ type: 'fermeture', jour: etat.jour });
    fermerNuit(etat, tirage, evenements);
  }
  if (attendBriefing(etat)) evenements.push({ type: 'briefing', jour: etat.jour });

  journaliser(etat, evenements.slice(dejaJournalises));
  etat.hasard = tirage.etat();
  return { etat, evenements };
}

