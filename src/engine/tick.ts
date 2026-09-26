import * as B from '../content/balance';
import type { Offre } from '../content/clientele';
import type { EtatJeu } from './etat';
import { changerReputationGlobale } from './clientele';
import { creerTirage } from './hasard';
import { appliquerRegle, type OrdreRegle } from './regles';
import { appliquerBar, avancerTravauxBar, visiteGrossiste, type OrdreBar } from './bar';
import { trancherImprevu, type EvenementImprevu, type OrdreImprevu } from './imprevus';
import { appliquerPersonnel, matinDuPersonnel, type EvenementPersonnel, type OrdrePersonnel } from './personnel';
import {
  arrivee,
  depenser,
  fermerNuit,
  ouvrirNuit,
  prelevementsDuMatin,
  prochainesMensualites,
  vivre,
  type EvenementSoiree,
} from './soiree';
import {
  appliquerRecrutement,
  arriveeVisites,
  matinRecrutement,
  type EvenementRecrutement,
  type OrdreRecrutement,
} from './recrutement';
import { attendBriefing, estOuvert, instant, jourDeLaSemaine, MINUTES_PAR_JOUR } from './temps';
import { cloreSemaine, type EvenementSemaine } from './semaine';
import { avancerIntrigues, matinDesIntrigues, trancherIntrigue, type EvenementIntrigue, type OrdreIntrigue } from './intrigues';
import { matinDuQuartier } from './quartier';
import { agirRelation, matinDesRelations, type EvenementRelation, type OrdreRelation } from './relations';
import { lundiDeLaRivale, repondreRivale, type EvenementRivale, type OrdreRivale } from './rivale';
import { changerAssurance, changerEquipe, type EvenementEquipe, type OrdreEquipe } from './equipes';
import { traiterAlerte, type OrdreMinuterie } from './minuteries';
import { appliquerPlafond, type AccordPlafond, type EvenementPlafond } from './plafond';
import { changerCibleAuto, commanderAuto, commanderPack, livraisonExpress, type EvenementLinge } from './linge';

/** Ordres envoyés par l'interface au moteur. */
export type Ordre =
  | {
      type: 'validerBriefing';
      offre?: Offre;
      /** Pack de linge commandé (5, 10 ou 20 parures), livré à l'ouverture. */
      packLinge?: number;
      /** Commande automatique : cible du stock de linge, complété chaque soir (0 : aucune). */
      lingeAuto?: number;
      /** Commande de bouteilles pour le bar, livrée à l'ouverture. */
      commanderBar?: boolean;
      /** Soirée à thème, payée tout de suite (null ou absent : pas de thème). */
      theme?: string | null;
      /** Planning (palier 1) : qui se repose ce soir, et le maximum de rendez-vous par personne. */
      repos?: string[];
      rdvMax?: number;
      /** Au cran 6, ta réponse à ceux qui négocient (par défaut : ils s'arrêtent à 5). */
      accords?: Record<string, AccordPlafond>;
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
  /** Josée a présenté les nouveautés d'une mise à jour. */
  | { type: 'nouveautesVues' }
  /** Le bilan du lundi a été lu. */
  | { type: 'bilanSemaineVu' }
  /** Le bilan de fin de mois a été lu. */
  | { type: 'bilanMoisVu' }
  /** Le didacticiel avance (l'interface décide des étapes, le moteur les garde). */
  | { type: 'didacticiel'; etape: number | null }
  | OrdreRecrutement
  | OrdrePersonnel
  | OrdreImprevu
  | OrdreIntrigue
  | OrdreMinuterie
  | OrdreRegle
  | OrdreBar
  | OrdreRelation
  | OrdreRivale
  | OrdreEquipe;

export type EvenementMoteur =
  | { type: 'nouveauJour'; jour: number }
  | { type: 'briefing'; jour: number }
  | { type: 'ouverture'; jour: number }
  | { type: 'fermeture'; jour: number }
  | { type: 'nettoyage'; chambreId: string; montant: number }
  | EvenementLinge
  | EvenementPlafond
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
  | EvenementImprevu
  | EvenementIntrigue
  | EvenementSemaine
  | EvenementRelation
  | EvenementRivale
  | EvenementEquipe;

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
      if (ordre.packLinge) commanderPack(etat, ordre.packLinge);
      if (ordre.lingeAuto !== undefined) changerCibleAuto(etat, ordre.lingeAuto);
      commanderAuto(etat, evenements);
      etat.themeDuSoir = null;
      const theme = ordre.theme ? B.THEMES[ordre.theme] : undefined;
      if (ordre.theme && theme && etat.systemes.themes && etat.tresorerie >= theme.cout) {
        depenser(etat, theme.cout, 'themes');
        etat.themeDuSoir = ordre.theme;
        etat.semaine.themes.push(ordre.theme);
      }
      if (ordre.commanderBar && etat.bar.ouvert) {
        depenser(etat, B.COMMANDE_BAR.prix, 'bar');
        etat.bar.commande += B.COMMANDE_BAR.bouteilles;
      }
      if (etat.systemes.planning) {
        if (ordre.rdvMax !== undefined && (B.RDV_MAX_CRANS as readonly number[]).includes(ordre.rdvMax)) etat.rdvMax = ordre.rdvMax;
        // Au moins une personne travaille ce soir.
        const repos = new Set(ordre.repos ?? []);
        const tousAuRepos = etat.personnel.every((e) => repos.has(e.id));
        for (const e of etat.personnel) e.reposPrevu = !tousAuRepos && repos.has(e.id);
        // Au cran 6, chacun répond : oui, non (il s'arrête à 5), ou à négocier.
        appliquerPlafond(etat, ordre.accords ?? {}, evenements);
      }
      return;
    }
    case 'nettoyageExpress': {
      const chambre = etat.chambres.find((c) => c.id === ordre.chambreId);
      const occupee = etat.rendezVous.some((r) => r.chambreId === ordre.chambreId);
      if (!chambre || !chambre.ouverte || occupee || chambre.proprete >= 100) return;
      depenser(etat, B.NETTOYAGE_EXPRESS, 'menage');
      chambre.proprete = 100;
      evenements.push({ type: 'nettoyage', chambreId: chambre.id, montant: B.NETTOYAGE_EXPRESS });
      return;
    }
    case 'livraisonLinge':
      livraisonExpress(etat, evenements);
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
        depenser(etat, B.DISPUTE_VERRE_OFFERT, 'incidents');
      } else {
        const tirage = creerTirage(etat.hasard);
        reussite = tirage.chance(B.DISPUTE_CALMER_REUSSITE);
        etat.hasard = tirage.etat();
        if (!reussite) changerReputationGlobale(etat, -1);
      }
      evenements.push({ type: 'disputeReglee', choix: ordre.choix, reussite });
      return;
    }
    case 'renover': {
      const chambre = etat.chambres.find((c) => c.id === ordre.chambreId);
      if (!etat.systemes.renovation || !chambre || chambre.ouverte || chambre.travaux !== null) return;
      if (etat.tresorerie < B.RENOVATION.prix) return;
      depenser(etat, B.RENOVATION.prix, 'travaux');
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
      etat.journee.retraitReserve += montant;
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
    case 'regle':
      appliquerRegle(etat, ordre, evenements);
      return;
    case 'renoverBar':
    case 'equipeBar':
    case 'livraisonBar':
    case 'avanceFournisseur':
      appliquerBar(etat, ordre, evenements);
      return;
    case 'bilanSemaineVu':
      etat.bilanAVoir = false;
      return;
    case 'bilanMoisVu':
      etat.bilanMoisAVoir = false;
      return;
    case 'nouveautesVues':
      etat.nouveautes = [];
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
      trancherImprevu(etat, ordre.choix, tirage, (segment) => arrivee(etat, tirage, evenements, segment), evenements);
      etat.hasard = tirage.etat();
      return;
    }
    case 'traiterAlerte': {
      const tirage = creerTirage(etat.hasard);
      traiterAlerte(etat, ordre.cle, ordre.action, tirage, evenements);
      etat.hasard = tirage.etat();
      return;
    }
    case 'actionRelation':
      agirRelation(etat, ordre.action, evenements);
      return;
    case 'equipeQuartier':
      changerEquipe(etat, ordre.equipe, ordre.effectif, evenements);
      return;
    case 'assurance':
      changerAssurance(etat, ordre.niveau, evenements);
      return;
    case 'reponseRivale':
      repondreRivale(etat, ordre.reponse, evenements);
      return;
    case 'choixIntrigue': {
      const tirage = creerTirage(etat.hasard);
      trancherIntrigue(etat, ordre.choix, tirage, (segment) => arrivee(etat, tirage, evenements, segment), evenements);
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
  return { etat: copie, evenements: appliquerOrdresSurPlace(copie, ordres) };
}

/** Comme appliquerOrdres, mais modifie l'état reçu. Réservé à la simulation, qui travaille sur sa propre copie. */
export function appliquerOrdresSurPlace(etat: EtatJeu, ordres: readonly Ordre[]): EvenementMoteur[] {
  const evenements: EvenementMoteur[] = [];
  for (const ordre of ordres) appliquer(etat, ordre, evenements);
  journaliser(etat, evenements);
  return evenements;
}

/**
 * Avance la simulation d'un pas fixe de 5 minutes de jeu. Fonction pure.
 * À 19 h, le temps reste bloqué tant que le briefing n'est pas validé.
 */
export function tick(etatInitial: EtatJeu, ordres: readonly Ordre[] = []): ResultatTick {
  const etat = structuredClone(etatInitial);
  return { etat, evenements: tickSurPlace(etat, ordres) };
}

/** Comme tick, mais modifie l'état reçu. Réservé à la simulation, qui travaille sur sa propre copie. */
export function tickSurPlace(etat: EtatJeu, ordres: readonly Ordre[] = []): EvenementMoteur[] {
  const evenements = appliquerOrdresSurPlace(etat, ordres);
  if (attendBriefing(etat)) {
    // Rappel du briefing en attente : déjà inscrit au journal quand 19 h a sonné.
    evenements.push({ type: 'briefing', jour: etat.jour });
    return evenements;
  }
  const dejaJournalises = evenements.length;

  const tirage = creerTirage(etat.hasard);
  const etaitOuvert = estOuvert(etat);

  etat.minuteDuJour = (etat.minuteDuJour + B.MINUTES_PAR_TICK) % MINUTES_PAR_JOUR;
  if (etat.minuteDuJour === B.HEURE_DEBUT_JOURNEE) {
    etat.jour += 1;
    evenements.push({ type: 'nouveauJour', jour: etat.jour });
    // Le lundi, la semaine écoulée se referme en bilan avant les charges de la nouvelle.
    if (jourDeLaSemaine(etat.jour) === 0) {
      cloreSemaine(etat, prochainesMensualites(etat, 2), tirage, evenements);
      // Le deuxième lundi après le palier 3 : la visibilité ; le premier : l'assurance. Présentées au bilan du lundi.
      if (etat.systemes.assurance && !etat.systemes.visibilite) {
        etat.systemes.visibilite = true;
        if (etat.bilanSemaine) etat.bilanSemaine.ouvertures = [...(etat.bilanSemaine.ouvertures ?? []), 'visibilite'];
      }
      if (etat.palier >= 3 && !etat.systemes.assurance) {
        etat.systemes.assurance = true;
        if (etat.bilanSemaine) etat.bilanSemaine.ouvertures = [...(etat.bilanSemaine.ouvertures ?? []), 'assurance'];
      }
      // Le Chat Noir fait ses comptes, lui aussi, et décide de sa semaine.
      lundiDeLaRivale(etat, evenements);
    }
    prelevementsDuMatin(etat, evenements);
    matinRecrutement(etat, tirage, evenements);
    matinDuPersonnel(etat, evenements);
    // Le voisin se plaint de la nuit passée : les intrigues regardent le tapage avant que le quartier oublie.
    matinDesIntrigues(etat);
    // Les voisins jugent aussi la nuit passée ; puis le quartier oublie un peu.
    matinDesRelations(etat, evenements);
    matinDuQuartier(etat);
  }
  avancerTravaux(etat, evenements);
  avancerTravauxBar(etat, evenements);
  arriveeVisites(etat, evenements);
  visiteGrossiste(etat, evenements);

  const ouvert = estOuvert(etat);
  if (!etaitOuvert && ouvert) {
    ouvrirNuit(etat, evenements);
    evenements.push({ type: 'ouverture', jour: etat.jour });
  }
  avancerIntrigues(etat, evenements);

  vivre(etat, ouvert, tirage, evenements);

  if (etaitOuvert && !ouvert) {
    evenements.push({ type: 'fermeture', jour: etat.jour });
    fermerNuit(etat, tirage, evenements);
  }
  if (attendBriefing(etat)) evenements.push({ type: 'briefing', jour: etat.jour });

  journaliser(etat, evenements.slice(dejaJournalises));
  etat.hasard = tirage.etat();
  return evenements;
}

