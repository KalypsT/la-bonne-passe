// La vie de la maison : clients, rendez-vous, ménage, personnel, dépenses.
// Ces fonctions modifient une copie de travail de l'état, faite par le tick.

import * as B from '../content/balance';
import { AVIS, CLIENTS, trouverOffre, type ModeleClient } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import type { EtatJeu, Nuit } from './etat';
import type { Tirage } from './hasard';
import { verifierPaliers, type EvenementPalier } from './paliers';
import { revelerTraits, type EvenementRecrutement } from './recrutement';
import { ecart, instant } from './temps';

export type EvenementSoiree =
  | { type: 'arrivee'; client: string }
  | { type: 'clientParti'; client: string }
  | { type: 'filePleine' }
  | { type: 'debutRdv'; chambreId: string; employeId: string; prenom?: string; client: string }
  | { type: 'finRdv'; chambreId: string; client: string; montant: number; avis: string }
  | { type: 'salaires'; montant: number }
  | { type: 'charges'; montant: number }
  | { type: 'dispute' }
  | { type: 'disputeDegeneree'; montant: number }
  | { type: 'miseEnReserve'; montant: number }
  | { type: 'mensualite'; montant: number; depuisReserve: number; restantes: number }
  | { type: 'bilan'; nuit: Nuit }
  | EvenementPalier
  | Extract<EvenementRecrutement, { type: 'traitRevele' }>;

/** Là où les fonctions de la soirée déposent leurs événements. */
export interface Sortie {
  push(evenement: EvenementSoiree): unknown;
}

const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

export function modeleClient(id: string): ModeleClient {
  return CLIENTS.find((c) => c.id === id) ?? CLIENTS[0]!;
}


function nouvelleNuit(etat: EtatJeu): Nuit {
  return {
    numero: etat.nuitsBouclees + 1,
    recettes: 0,
    partPersonnel: 0,
    depenses: 0,
    servis: 0,
    perdus: 0,
    reputationDebut: etat.reputation,
    meilleurAvis: null,
    pireAvis: null,
    reserve: 0,
  };
}

/** Dépense : trésorerie et comptes de la nuit en cours. */
export function depenser(etat: EtatJeu, montant: number): void {
  etat.tresorerie -= montant;
  if (etat.nuit && etat.nuitsBouclees < etat.nuit.numero) etat.nuit.depenses += montant;
}

export function ouvrirNuit(etat: EtatJeu): void {
  etat.nuit = nouvelleNuit(etat);
  for (const e of etat.personnel) {
    e.rdvCeSoir = 0;
    e.repos = false;
  }
  etat.linge += etat.lingeCommande;
  etat.lingeCommande = 0;
}

export function fermerNuit(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  // Les rendez-vous en cours se terminent, les clients du quai rentrent chez eux.
  for (const rdv of [...etat.rendezVous]) terminerRdv(etat, rdv.chambreId, tirage, evenements);
  etat.file = [];
  etat.dispute = null;
  // Une Mère poule remonte le moral des autres.
  for (const e of etat.personnel) {
    if (!e.traits.includes('Mère poule')) continue;
    for (const autre of etat.personnel) if (autre !== e) autre.moral = borner(autre.moral + 3);
  }
  revelerTraits(etat, evenements);
  for (const e of etat.personnel) e.repos = false;
  etat.nuitsBouclees += 1;
  mettreEnReserve(etat, evenements);
  if (etat.nuit) evenements.push({ type: 'bilan', nuit: structuredClone(etat.nuit) });
  verifierPaliers(etat, evenements);
}

/** Réserve de sécurité : une part de la recette du soir quitte la trésorerie. */
function mettreEnReserve(etat: EtatJeu, evenements: Sortie): void {
  if (!etat.systemes.reserve || !etat.nuit || etat.tauxReserve <= 0) return;
  const montant = Math.round(Math.max(0, etat.nuit.recettes) * etat.tauxReserve);
  if (montant <= 0) return;
  etat.tresorerie -= montant;
  etat.reserve += montant;
  etat.nuit.reserve = montant;
  evenements.push({ type: 'miseEnReserve', montant });
}

/** Variation de réputation après un rendez-vous : les gains ralentissent quand elle monte. */
export function gainReputation(reputation: number, qualite: number): number {
  const brut = (qualite - 0.4) * B.REPUTATION_PAR_RDV;
  return brut > 0 ? brut * Math.pow(1 - reputation / 100, B.REPUTATION_FREIN) : brut;
}

function occupes(etat: EtatJeu) {
  return {
    chambres: new Set(etat.rendezVous.map((r) => r.chambreId)),
    employes: new Set(etat.rendezVous.map((r) => r.employeId)),
  };
}

export function employeDisponible(etat: EtatJeu, id: string): boolean {
  const e = etat.personnel.find((x) => x.id === id);
  return !!e && !e.repos && e.rdvCeSoir < B.RDV_MAX_PAR_SOIR && !occupes(etat).employes.has(id);
}

export function chambreDisponible(etat: EtatJeu, id: string): boolean {
  const c = etat.chambres.find((x) => x.id === id);
  return !!c && c.ouverte && c.proprete >= B.SEUIL_CHAMBRE_INUTILISABLE && !occupes(etat).chambres.has(id);
}

function arrivee(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  if (etat.file.length >= B.PLACES_FILE) {
    if (etat.nuit) etat.nuit.perdus += 1;
    etat.reputation = borner(etat.reputation - B.REPUTATION_FILE_PLEINE);
    evenements.push({ type: 'filePleine' });
    return;
  }
  const presents = new Set([...etat.file.map((c) => c.modele), ...etat.rendezVous.map((r) => r.modele)]);
  const possibles = CLIENTS.filter((c) => !presents.has(c.id));
  if (possibles.length === 0) return;
  const offre = trouverOffre(etat.offre);
  const poids = possibles.map((c) => {
    let p = offre.attire[c.segment] ?? 1;
    if (c.segment === 'habitue') p *= 0.6 + etat.reputation / 60;
    return p;
  });
  const modele = tirage.choisir(possibles, poids);
  etat.file.push({ id: etat.prochainClient, modele: modele.id, patience: B.PATIENCE_CLIENT });
  etat.prochainClient += 1;
  evenements.push({ type: 'arrivee', client: modele.nom });
}

function repartir(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  while (etat.file.length > 0) {
    const client = etat.file[0]!;
    const modele = modeleClient(client.modele);
    const chambres = etat.chambres
      .filter((c) => chambreDisponible(etat, c.id))
      .sort((a, b) => b.proprete + b.etat - (a.proprete + a.etat));
    const employes = etat.personnel
      .filter((e) => employeDisponible(etat, e.id))
      .sort((a, b) => b.talents[modele.attend] - b.fatigue / 35 - (a.talents[modele.attend] - a.fatigue / 35));
    const chambre = chambres[0];
    const employe = employes[0];
    if (!chambre || !employe) return;
    const duree = Math.round(tirage.entre(B.DUREE_RDV_MIN, B.DUREE_RDV_MAX) / B.MINUTES_PAR_TICK) * B.MINUTES_PAR_TICK;
    etat.file.shift();
    etat.rendezVous.push({
      chambreId: chambre.id,
      employeId: employe.id,
      clientId: client.id,
      modele: client.modele,
      duree,
      restant: duree,
    });
    evenements.push({ type: 'debutRdv', chambreId: chambre.id, employeId: employe.id, prenom: employe.prenom, client: modele.nom });
  }
}

/** Qualité d'un rendez-vous, entre 0 et 1. */
export function qualiteRdv(etat: EtatJeu, chambreId: string, employeId: string, modeleId: string): number {
  const chambre = etat.chambres.find((c) => c.id === chambreId);
  const employe = etat.personnel.find((e) => e.id === employeId);
  if (!chambre || !employe) return 0;
  const q = B.QUALITE;
  const talent = employe.talents[modeleClient(modeleId).attend];
  const valeur =
    (talent / 5) * q.talent +
    (chambre.proprete / 100) * q.proprete +
    (chambre.etat / 100) * q.etat +
    (etat.linge > 0 ? q.linge : 0) +
    (trouverChambre(chambreId)?.premium ? q.premium : 0) +
    trouverOffre(etat.offre).qualite -
    (employe.fatigue > B.SEUIL_FATIGUE ? q.malusFatigue : 0);
  return borner(valeur, 0, 1);
}

function terminerRdv(etat: EtatJeu, chambreId: string, tirage: Tirage, evenements: Sortie): void {
  const rdv = etat.rendezVous.find((r) => r.chambreId === chambreId);
  const chambre = etat.chambres.find((c) => c.id === chambreId);
  const employe = etat.personnel.find((e) => e.id === rdv?.employeId);
  if (!rdv || !chambre || !employe) return;
  const modele = modeleClient(rdv.modele);

  const qualite = qualiteRdv(etat, chambreId, employe.id, rdv.modele);
  const prix =
    Math.round((modele.budget * trouverOffre(etat.offre).prix * (B.PRIX_MIN + B.PRIX_ECART * qualite)) / 5) * 5;
  const maison = Math.round(prix * (1 - employe.part));
  etat.tresorerie += maison;
  etat.reputation = borner(etat.reputation + gainReputation(etat.reputation, qualite));

  employe.fatigue = borner(employe.fatigue + tirage.entre(B.FATIGUE_PAR_RDV_MIN, B.FATIGUE_PAR_RDV_MAX));
  employe.rdvCeSoir += 1;
  etat.linge = Math.max(0, etat.linge - B.LINGE_PAR_RDV);
  chambre.proprete = borner(chambre.proprete - tirage.entre(B.SALISSURE_MIN, B.SALISSURE_MAX));
  chambre.etat = borner(chambre.etat - tirage.entre(B.USURE_MIN, B.USURE_MAX));

  const liste = qualite >= 0.75 ? AVIS.excellents : qualite >= 0.55 ? AVIS.corrects : AVIS.decevants;
  const avis = { client: modele.nom, texte: tirage.choisir(liste), qualite };
  if (etat.nuit) {
    etat.nuit.recettes += maison;
    etat.nuit.partPersonnel += prix - maison;
    etat.nuit.servis += 1;
    if (!etat.nuit.meilleurAvis || qualite > etat.nuit.meilleurAvis.qualite) etat.nuit.meilleurAvis = avis;
    if (!etat.nuit.pireAvis || qualite < etat.nuit.pireAvis.qualite) etat.nuit.pireAvis = avis;
  }
  etat.rendezVous = etat.rendezVous.filter((r) => r !== rdv);
  evenements.push({ type: 'finRdv', chambreId, client: modele.nom, montant: maison, avis: avis.texte });
}

/** Un pas de 5 minutes de la vie de la maison. */
export function vivre(etat: EtatJeu, ouvert: boolean, tirage: Tirage, evenements: Sortie): void {
  const heures = B.MINUTES_PAR_TICK / 60;

  // Rendez-vous en cours
  for (const rdv of [...etat.rendezVous]) {
    rdv.restant -= B.MINUTES_PAR_TICK;
    if (rdv.restant <= 0) terminerRdv(etat, rdv.chambreId, tirage, evenements);
  }

  if (ouvert) {
    // Patience sur le quai
    for (const client of [...etat.file]) {
      client.patience -= B.MINUTES_PAR_TICK;
      if (client.patience <= 0) {
        etat.file = etat.file.filter((c) => c !== client);
        etat.reputation = borner(etat.reputation - B.REPUTATION_CLIENT_PERDU);
        if (etat.nuit) etat.nuit.perdus += 1;
        evenements.push({ type: 'clientParti', client: modeleClient(client.modele).nom });
      }
    }

    // Arrivées
    const depuisOuverture = ecart(B.HEURE_OUVERTURE, etat.minuteDuJour);
    const premierClientGaranti =
      etat.nuitsBouclees === 0 && depuisOuverture === B.PREMIER_CLIENT_APRES && etat.prochainClient === 1;
    const parHeure =
      (B.ARRIVEES_PAR_HEURE_BASE + (etat.reputation / 100) * B.ARRIVEES_BONUS_REPUTATION) *
      trouverOffre(etat.offre).affluence;
    if (premierClientGaranti || tirage.chance(parHeure * heures)) arrivee(etat, tirage, evenements);

    // Dispute sur le quai
    const maintenant = instant(etat);
    if (etat.dispute && maintenant >= etat.dispute.expire) {
      etat.dispute = null;
      depenser(etat, B.DISPUTE_CASSE);
      etat.reputation = borner(etat.reputation - B.DISPUTE_REPUTATION);
      evenements.push({ type: 'disputeDegeneree', montant: B.DISPUTE_CASSE });
    } else if (
      !etat.dispute &&
      etat.file.length >= 2 &&
      tirage.chance(B.DISPUTE_CHANCE_PAR_HEURE * etat.file.length * heures)
    ) {
      etat.dispute = { expire: maintenant + B.DISPUTE_DELAI };
      evenements.push({ type: 'dispute' });
    }

    // Répartition des clients, sauf juste avant la fermeture
    if (ecart(etat.minuteDuJour, B.HEURE_FERMETURE) > B.DERNIER_RDV_AVANT_FERMETURE) repartir(etat, tirage, evenements);
  }

  // Ménage : les chambres libres les plus sales d'abord
  let capacite = etat.equipes.menage * (ouvert ? B.MENAGE_MAISON_OUVERTE : B.MENAGE_MAISON_FERMEE) * heures;
  const occupees = occupes(etat).chambres;
  const aNettoyer = etat.chambres
    .filter((c) => c.ouverte && !occupees.has(c.id) && c.proprete < 100)
    .sort((a, b) => a.proprete - b.proprete);
  for (const chambre of aNettoyer) {
    if (capacite <= 0) break;
    const gain = Math.min(capacite, 100 - chambre.proprete);
    chambre.proprete += gain;
    capacite -= gain;
  }

  // Personnel : récupération et moral
  const auTravail = occupes(etat).employes;
  for (const e of etat.personnel) {
    if (!auTravail.has(e.id)) {
      const recup = ouvert && !e.repos ? B.RECUPERATION_EN_SERVICE : B.RECUPERATION_AU_REPOS;
      e.fatigue = borner(e.fatigue - recup * heures);
    }
    if (e.fatigue > B.SEUIL_FATIGUE) e.moral = borner(e.moral - B.MORAL_PERTE_FATIGUE * heures);
    else if (e.moral < 70) e.moral = borner(e.moral + B.MORAL_REMONTEE * heures);
  }

  // Salaires à midi, charges fixes le lundi matin
  if (etat.minuteDuJour === B.HEURE_SALAIRES) {
    const montant = etat.equipes.menage * B.SALAIRE_MENAGE;
    if (montant > 0) {
      depenser(etat, montant);
      evenements.push({ type: 'salaires', montant });
    }
  }
}

/** Nombre de mensualités de l'emprunt de rachat. */
export const NOMBRE_MENSUALITES = Math.ceil(B.EMPRUNT_RACHAT / B.MENSUALITE);

/** Jour de la prochaine mensualité, ou null si l'emprunt est remboursé. */
export function jourProchaineMensualite(etat: EtatJeu): number | null {
  if (etat.mensualitesPayees >= NOMBRE_MENSUALITES) return null;
  return B.JOUR_PREMIERE_MENSUALITE + etat.mensualitesPayees * B.JOURS_PAR_MOIS;
}

/** Charges fixes au début de chaque lundi (sauf le tout premier), mensualité le jour dit. */
export function prelevementsDuMatin(etat: EtatJeu, evenements: Sortie): void {
  if (etat.jour > 1 && (etat.jour - 1) % 7 === 0) {
    depenser(etat, B.CHARGES_FIXES);
    evenements.push({ type: 'charges', montant: B.CHARGES_FIXES });
  }
  if (etat.jour === jourProchaineMensualite(etat)) {
    // La réserve paie en premier, la trésorerie complète.
    const depuisReserve = Math.min(etat.reserve, B.MENSUALITE);
    etat.reserve -= depuisReserve;
    depenser(etat, B.MENSUALITE - depuisReserve);
    etat.mensualitesPayees += 1;
    evenements.push({
      type: 'mensualite',
      montant: B.MENSUALITE,
      depuisReserve,
      restantes: NOMBRE_MENSUALITES - etat.mensualitesPayees,
    });
  }
}
