import * as B from '../content/balance';
import type { Offre } from '../content/clientele';
import type { EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { depenser, fermerNuit, ouvrirNuit, prelevementsDuMatin, vivre, type EvenementSoiree } from './soiree';
import { attendBriefing, estOuvert, MINUTES_PAR_JOUR } from './temps';

/** Ordres envoyés par l'interface au moteur. */
export type Ordre =
  | { type: 'validerBriefing'; offre?: Offre; commanderLinge?: boolean }
  | { type: 'nettoyageExpress'; chambreId: string }
  | { type: 'livraisonLinge' }
  | { type: 'repos'; employeId: string }
  | { type: 'regleDispute'; choix: 'verre' | 'calmer' };

export type EvenementMoteur =
  | { type: 'nouveauJour'; jour: number }
  | { type: 'briefing'; jour: number }
  | { type: 'ouverture'; jour: number }
  | { type: 'fermeture'; jour: number }
  | { type: 'nettoyage'; chambreId: string; montant: number }
  | { type: 'livraisonLinge'; montant: number }
  | { type: 'repos'; employeId: string }
  | { type: 'disputeReglee'; choix: 'verre' | 'calmer'; reussite: boolean }
  | EvenementSoiree;

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
      evenements.push({ type: 'repos', employeId: employe.id });
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
  }
}

/** Applique les ordres du joueur, sans faire avancer le temps. */
export function appliquerOrdres(etat: EtatJeu, ordres: readonly Ordre[]): ResultatTick {
  if (ordres.length === 0) return { etat, evenements: [] };
  const copie = structuredClone(etat);
  const evenements: EvenementMoteur[] = [];
  for (const ordre of ordres) appliquer(copie, ordre, evenements);
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
    evenements.push({ type: 'briefing', jour: apresOrdres.etat.jour });
    return { etat: apresOrdres.etat, evenements };
  }

  const etat = apresOrdres.etat === etatInitial ? structuredClone(etatInitial) : apresOrdres.etat;
  const tirage = creerTirage(etat.hasard);
  const etaitOuvert = estOuvert(etat);

  etat.minuteDuJour = (etat.minuteDuJour + B.MINUTES_PAR_TICK) % MINUTES_PAR_JOUR;
  if (etat.minuteDuJour === B.HEURE_DEBUT_JOURNEE) {
    etat.jour += 1;
    evenements.push({ type: 'nouveauJour', jour: etat.jour });
    prelevementsDuMatin(etat, evenements);
  }

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

  etat.hasard = tirage.etat();
  return { etat, evenements };
}

