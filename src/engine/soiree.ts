// La vie de la maison : clients, rendez-vous, ménage, personnel, dépenses.
// Ces fonctions modifient une copie de travail de l'état, faite par le tick.

import * as B from '../content/balance';
import type { IdFormule } from '../content/balance';
import { AVIS, CLIENTS, trouverOffre, type ModeleClient, type Segment } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import type { EtatJeu, Nuit } from './etat';
import type { Tirage } from './hasard';
import { verifierPaliers, type EvenementPalier } from './paliers';
import { declencherImprevu, type EvenementImprevu } from './imprevus';
import { aTrait, nuitDuPersonnel, type EvenementPersonnel } from './personnel';
import { revelerTraits, type EvenementRecrutement } from './recrutement';
import { ecart, instant } from './temps';
import { depenser, encaisser, noterDepense } from './comptes';
import { demandeTendance, disputeTendance } from './semaine';
import { bruitDuSoir, changerTapage } from './quartier';
import {
  affluenceTheme,
  attraitTheme,
  boucheTheme,
  disputeTheme,
  fatigueTheme,
  patienceTheme,
  prixTheme,
  qualiteTheme,
  type EvenementTheme,
} from './themes';
import {
  attraitSegment,
  changerReputationGlobale,
  changerSatisfaction,
  gainReputation,
  noterClient,
  ouvrirNuitClientele,
  segmentOuvert,
} from './clientele';

export { gainReputation, segmentOuvert };
import {
  livrerCommandeBar,
  patienceBar,
  qualiteBar,
  rembourserAvance,
  servirChampagne,
  venteBar,
  type EvenementBar,
} from './bar';
import {
  chargeFormule,
  demandePrix,
  ecartTarif,
  formuleActive,
  patienceTarif,
  prixRessenti,
  prochainClient,
  qualiteDesRegles,
  quotaAtteint,
  selectionActive,
  type EvenementRegle,
} from './regles';

export type EvenementSoiree =
  | { type: 'arrivee'; client: string }
  | { type: 'clientParti'; client: string }
  | { type: 'filePleine' }
  | { type: 'debutRdv'; chambreId: string; employeId: string; prenom?: string; client: string }
  | { type: 'finRdv'; chambreId: string; client: string; montant: number; avis: string }
  | { type: 'salaires'; montant: number }
  | { type: 'charges'; montant: number }
  | { type: 'portier'; montant: number }
  | { type: 'dispute' }
  | { type: 'disputeDegeneree'; montant: number }
  | { type: 'miseEnReserve'; montant: number }
  | { type: 'mensualite'; montant: number; depuisReserve: number; restantes: number }
  | { type: 'bilan'; nuit: Nuit }
  | EvenementPalier
  | Extract<EvenementRecrutement, { type: 'traitRevele' }>
  | EvenementPersonnel
  | EvenementImprevu
  | EvenementRegle
  | EvenementBar
  | EvenementTheme;

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
    imprevus: 0,
    bar: 0,
  };
}

export { depenser };

export function ouvrirNuit(etat: EtatJeu, evenements: Sortie): void {
  etat.nuit = nouvelleNuit(etat);
  // Le planning du briefing s'applique : qui se repose ce soir, qui prend son service.
  for (const e of etat.personnel) {
    e.rdvCeSoir = 0;
    e.chargeCeSoir = 0;
    e.repos = e.reposPrevu;
    e.enServiceCeSoir = !e.repos;
    e.reposPrevu = false;
    if (e.repos) e.promesseRepos = null;
  }
  etat.linge += etat.lingeCommande;
  etat.lingeCommande = 0;
  livrerCommandeBar(etat);
  ouvrirNuitClientele(etat);
  if (etat.themeDuSoir) {
    // Payé au briefing, le thème compte dans les dépenses de sa nuit (la trésorerie, elle, est déjà débitée).
    const cout = B.THEMES[etat.themeDuSoir]?.cout ?? 0;
    if (etat.nuit) etat.nuit.depenses += cout;
    evenements.push({ type: 'theme', id: etat.themeDuSoir, montant: cout });
  }
  // Sélection stricte : le portier se paie à l'ouverture.
  const portier = selectionActive(etat).cout;
  if (portier > 0) {
    depenser(etat, portier, 'portier');
    evenements.push({ type: 'portier', montant: portier });
  }
}

export function fermerNuit(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  // Les rendez-vous en cours se terminent, les clients du quai rentrent chez eux.
  for (const rdv of [...etat.rendezVous]) terminerRdv(etat, rdv.chambreId, tirage, evenements);
  etat.file = [];
  etat.dispute = null;
  etat.imprevu = null;
  nuitDuPersonnel(etat, etat.nuit?.reputationDebut ?? etat.reputation, tirage, evenements);
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

function occupes(etat: EtatJeu) {
  return {
    chambres: new Set(etat.rendezVous.map((r) => r.chambreId)),
    employes: new Set(etat.rendezVous.map((r) => r.employeId)),
  };
}

export function employeDisponible(etat: EtatJeu, id: string): boolean {
  const e = etat.personnel.find((x) => x.id === id);
  return !!e && !e.repos && !quotaAtteint(etat, e) && !occupes(etat).employes.has(id);
}

export function chambreDisponible(etat: EtatJeu, id: string): boolean {
  const c = etat.chambres.find((x) => x.id === id);
  return !!c && c.ouverte && c.proprete >= B.SEUIL_CHAMBRE_INUTILISABLE && !occupes(etat).chambres.has(id);
}

function fetardeEnService(etat: EtatJeu): boolean {
  return etat.personnel.some((e) => e.enServiceCeSoir && !e.repos && aTrait(e, 'Fêtarde'));
}

/** Patience d'un client : la sienne, et une Fêtarde en service met l'ambiance. */
function patienceClient(etat: EtatJeu, modele: ModeleClient): number {
  const base = (modele.patience ?? B.PATIENCE_CLIENT) * patienceTarif(etat);
  return Math.round(base + (fetardeEnService(etat) ? B.TRAITS_EFFETS.fetardePatience : 0) + patienceBar(etat) + patienceTheme(etat));
}

export function arrivee(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  const presents = new Set([...etat.file.map((c) => c.modele), ...etat.rendezVous.map((r) => r.modele)]);
  const possibles = CLIENTS.filter((c) => !presents.has(c.id) && segmentOuvert(etat, c.segment));
  if (possibles.length === 0) return;
  const poids = possibles.map((c) => poidsSegment(etat, c.segment) * demandeSegment(etat, c.segment));
  const modele = tirage.choisir(possibles, poids);
  // Sélection à l'entrée : la porte se referme poliment.
  const refus = selectionActive(etat).refus[modele.segment] ?? 0;
  if (refus > 0 && tirage.chance(refus)) {
    changerSatisfaction(etat, modele.segment, -B.REFUS_SATISFACTION * B.SATISFACTION_PAR_CLIENT);
    evenements.push({ type: 'refuse', client: modele.nom });
    return;
  }
  // Quai plein : le client repart aussitôt, et son segment s'en souvient.
  if (etat.file.length >= B.PLACES_FILE) {
    perdreClient(etat, modele.segment, B.REPUTATION_FILE_PLEINE);
    evenements.push({ type: 'filePleine' });
    return;
  }
  mettreSurLeQuai(etat, modele, evenements);
  // Un groupe, c'est rarement une personne seule.
  if (modele.segment === 'groupe' && etat.file.length < B.PLACES_FILE && tirage.chance(B.GROUPE_CHANCE_ACCOMPAGNE)) {
    const amis = CLIENTS.filter(
      (c) => c.segment === 'groupe' && c.id !== modele.id && !etat.file.some((f) => f.modele === c.id) && !etat.rendezVous.some((r) => r.modele === c.id),
    );
    if (amis.length > 0) mettreSurLeQuai(etat, tirage.choisir(amis), evenements);
  }
}

/** Un client repart sans avoir été reçu : son segment perd un peu, selon ce qu'il supporte mal. */
function perdreClient(etat: EtatJeu, segment: Segment, perte: number): void {
  if (etat.nuit) etat.nuit.perdus += 1;
  noterClient(etat, segment, 'perdus');
  changerSatisfaction(etat, segment, -perte * B.SATISFACTION_PAR_CLIENT * B.SENSIBILITE_ATTENTE[segment]);
}

/** Poids d'un segment dans les arrivées, avant le tarif : offre du soir, satisfaction, sélection, Fêtarde. */
function poidsSegment(etat: EtatJeu, segment: Segment): number {
  let p =
    (trouverOffre(etat.offre).attire[segment] ?? 1) *
    B.POIDS_SEGMENTS[segment] *
    attraitSegment(etat, segment) *
    (selectionActive(etat).attire[segment] ?? 1) *
    (B.FORMULES[formuleActive(etat)].attire[segment] ?? 1) *
    attraitTheme(etat, segment);
  if (segment === 'groupe' && fetardeEnService(etat)) p *= B.FETARDE_ATTIRE_GROUPES;
  return p;
}

/** Demande d'un segment : l'effet inverse du tarif, et les tendances de la semaine. */
function demandeSegment(etat: EtatJeu, segment: Segment): number {
  return demandePrix(etat, segment) * demandeTendance(etat, segment);
}

/**
 * Effet du tarif et des tendances sur le volume des arrivées : la demande moyenne des clients possibles,
 * pondérée par leur poids. Un tarif haut fait fuir surtout les segments sensibles au prix ; un congrès fait venir du monde.
 */
export function facteurDemande(etat: EtatJeu): number {
  let total = 0;
  let avecDemande = 0;
  for (const c of CLIENTS) {
    if (!segmentOuvert(etat, c.segment)) continue;
    const p = poidsSegment(etat, c.segment);
    total += p;
    avecDemande += p * demandeSegment(etat, c.segment);
  }
  return total > 0 ? avecDemande / total : 1;
}

function mettreSurLeQuai(etat: EtatJeu, modele: ModeleClient, evenements: Sortie): void {
  etat.file.push({ id: etat.prochainClient, modele: modele.id, patience: patienceClient(etat, modele) });
  etat.prochainClient += 1;
  evenements.push({ type: 'arrivee', client: modele.nom });
}

function repartir(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  while (etat.file.length > 0) {
    const client = prochainClient(etat, (c) => modeleClient(c.modele).segment)!;
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
    const formule = formuleActive(etat);
    const brute = tirage.entre(B.DUREE_RDV_MIN, B.DUREE_RDV_MAX) * B.FORMULES[formule].duree;
    const duree = Math.max(B.MINUTES_PAR_TICK, Math.round(brute / B.MINUTES_PAR_TICK) * B.MINUTES_PAR_TICK);
    etat.file = etat.file.filter((c) => c !== client);
    etat.rendezVous.push({
      chambreId: chambre.id,
      employeId: employe.id,
      clientId: client.id,
      modele: client.modele,
      formule,
      duree,
      restant: duree,
    });
    evenements.push({ type: 'debutRdv', chambreId: chambre.id, employeId: employe.id, prenom: employe.prenom, client: modele.nom });
  }
}

/** Qualité d'un rendez-vous, entre 0 et 1. */
export function qualiteRdv(
  etat: EtatJeu,
  chambreId: string,
  employeId: string,
  modeleId: string,
  formule: IdFormule = 'standard',
): number {
  const chambre = etat.chambres.find((c) => c.id === chambreId);
  const employe = etat.personnel.find((e) => e.id === employeId);
  if (!chambre || !employe) return 0;
  const q = B.QUALITE;
  const modele = modeleClient(modeleId);
  const talent = employe.talents[modele.attend];
  const valeur =
    (talent / 5) * q.talent +
    (chambre.proprete / 100) * q.proprete +
    (chambre.etat / 100) * q.etat +
    (etat.linge > 0 ? q.linge : 0) +
    (trouverChambre(chambreId)?.premium ? q.premium : 0) +
    trouverOffre(etat.offre).qualite -
    (employe.fatigue > B.SEUIL_FATIGUE ? q.malusFatigue : 0) -
    (employe.moral < B.SEUIL_MORAL_BAS ? B.MALUS_QUALITE_MORAL_BAS : 0) +
    (employe.recadre === etat.jour ? B.ENTRETIEN.recadrer.qualite : 0) +
    qualiteDesRegles(etat, modele.segment, formule) +
    qualiteBar(etat, modele.segment) +
    qualiteTheme(etat, modele.segment);
  return borner(valeur, 0, 1);
}

function terminerRdv(etat: EtatJeu, chambreId: string, tirage: Tirage, evenements: Sortie): void {
  const rdv = etat.rendezVous.find((r) => r.chambreId === chambreId);
  const chambre = etat.chambres.find((c) => c.id === chambreId);
  const employe = etat.personnel.find((e) => e.id === rdv?.employeId);
  if (!rdv || !chambre || !employe) return;
  const modele = modeleClient(rdv.modele);

  const formule = B.FORMULES[rdv.formule] ?? B.FORMULES.standard;
  const qualite = qualiteRdv(etat, chambreId, employe.id, rdv.modele, rdv.formule);
  // Le client paie selon la qualité ; il juge aussi le prix, surtout s'il y est sensible.
  const ressentie = borner(qualite + prixRessenti(etat, modele.segment), 0, 1);
  const tarif = trouverOffre(etat.offre).prix * (1 + ecartTarif(etat)) * formule.prix * prixTheme(etat);
  const prix = Math.round((modele.budget * B.BUDGET_CLIENTS * tarif * (B.PRIX_MIN + B.PRIX_ECART * qualite)) / 5) * 5;
  const maison = Math.round(prix * (1 - employe.part));
  encaisser(etat, maison, 'rendezVous');
  const gain = gainReputation(etat.clientele.satisfaction[modele.segment], ressentie);
  const effet = gain > 0 ? gain * trouverOffre(etat.offre).reputation * boucheTheme(etat) : gain;
  changerSatisfaction(etat, modele.segment, effet * B.SATISFACTION_PAR_CLIENT);
  noterClient(etat, modele.segment, 'servis');

  const fatigue = tirage.entre(B.FATIGUE_PAR_RDV_MIN, B.FATIGUE_PAR_RDV_MAX);
  employe.fatigue = borner(
    employe.fatigue + fatigue * formule.fatigue * fatigueTheme(etat) * (aTrait(employe, 'Fêtarde') ? B.TRAITS_EFFETS.fetardeFatigue : 1),
  );
  employe.rdvCeSoir += 1;
  employe.chargeCeSoir += chargeFormule(rdv.formule);
  employe.moral = borner(employe.moral - B.MORAL_PAR_RDV * formule.charge);
  etat.linge = Math.max(0, etat.linge - B.LINGE_PAR_RDV);
  chambre.proprete = borner(chambre.proprete - tirage.entre(B.SALISSURE_MIN, B.SALISSURE_MAX) * formule.salissure);
  chambre.etat = borner(chambre.etat - tirage.entre(B.USURE_MIN, B.USURE_MAX));

  // Le client passe au bar ; la formule champagne prend sa bouteille.
  if (rdv.formule === 'champagne') servirChampagne(etat, evenements);
  venteBar(etat, modele.segment, evenements);

  const liste = ressentie >= 0.75 ? AVIS.excellents : ressentie >= 0.55 ? AVIS.corrects : AVIS.decevants;
  const avis = { client: modele.nom, texte: tirage.choisir(liste), qualite: ressentie };
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

/** Chaque Tête brûlée en service, et chaque client d'un groupe sur le quai, fait monter le ton ; la sélection à l'entrée le fait baisser. */
export function facteurDispute(etat: EtatJeu): number {
  const n = etat.personnel.filter((e) => e.enServiceCeSoir && !e.repos && aTrait(e, 'Tête brûlée')).length;
  const groupes = etat.file.filter((c) => modeleClient(c.modele).segment === 'groupe').length;
  return Math.pow(B.TRAITS_EFFETS.teteBruleeDispute, n) * Math.pow(B.GROUPE_DISPUTE, groupes) * selectionActive(etat).dispute * disputeTendance(etat) * disputeTheme(etat);
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
        perdreClient(etat, modeleClient(client.modele).segment, B.REPUTATION_CLIENT_PERDU);
        evenements.push({ type: 'clientParti', client: modeleClient(client.modele).nom });
      }
    }

    // Arrivées
    const depuisOuverture = ecart(B.HEURE_OUVERTURE, etat.minuteDuJour);
    const premierClientGaranti =
      etat.nuitsBouclees === 0 && depuisOuverture === B.PREMIER_CLIENT_APRES && etat.prochainClient === 1;
    const parHeure =
      (B.ARRIVEES_PAR_HEURE_BASE + (etat.reputation / 100) * B.ARRIVEES_BONUS_REPUTATION) *
      trouverOffre(etat.offre).affluence *
      selectionActive(etat).affluence *
      B.FORMULES[formuleActive(etat)].affluence *
      affluenceTheme(etat) *
      facteurDemande(etat);
    if (premierClientGaranti || tirage.chance(parHeure * heures)) arrivee(etat, tirage, evenements);

    // Dispute sur le quai
    const maintenant = instant(etat);
    if (etat.dispute && maintenant >= etat.dispute.expire) {
      etat.dispute = null;
      depenser(etat, B.DISPUTE_CASSE, 'incidents');
      changerReputationGlobale(etat, -B.DISPUTE_REPUTATION);
      changerTapage(etat, B.TAPAGE.dispute * (etat.quartier.insonorise ? B.TAPAGE.insonorise : 1));
      evenements.push({ type: 'disputeDegeneree', montant: B.DISPUTE_CASSE });
    } else if (
      !etat.dispute &&
      etat.file.length >= 2 &&
      tirage.chance(B.DISPUTE_CHANCE_PAR_HEURE * etat.file.length * heures * facteurDispute(etat))
    ) {
      etat.dispute = { expire: maintenant + B.DISPUTE_DELAI };
      evenements.push({ type: 'dispute' });
    }

    bruitDuSoir(etat, heures);
    declencherImprevu(etat, tirage, evenements);

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
      const recup =
        ouvert && !e.repos
          ? B.RECUPERATION_EN_SERVICE
          : B.RECUPERATION_AU_REPOS * (aTrait(e, 'Solitaire') ? B.TRAITS_EFFETS.solitaireRepos : 1);
      e.fatigue = borner(e.fatigue - recup * heures);
    }
    if (e.fatigue > B.SEUIL_FATIGUE) e.moral = borner(e.moral - B.MORAL_PERTE_FATIGUE * heures);
    else if (e.moral < B.MORAL_PLAFOND_NATUREL) e.moral = Math.min(B.MORAL_PLAFOND_NATUREL, e.moral + B.MORAL_REMONTEE * heures);
  }

  // Salaires à midi, charges fixes le lundi matin
  if (etat.minuteDuJour === B.HEURE_SALAIRES) {
    const montant = etat.equipes.menage * B.SALAIRE_MENAGE + etat.equipes.bar * B.SALAIRE_BAR;
    if (montant > 0) {
      depenser(etat, montant, 'salaires');
      evenements.push({ type: 'salaires', montant });
    }
  }
}

/** Nombre de mensualités de l'emprunt de rachat. */
export const NOMBRE_MENSUALITES = Math.ceil(B.EMPRUNT_RACHAT / B.MENSUALITE);

/** Jours des prochaines mensualités (jusqu'à n), dans l'ordre. */
export function prochainesMensualites(etat: EtatJeu, n: number): number[] {
  const jours: number[] = [];
  for (let k = etat.mensualitesPayees; k < NOMBRE_MENSUALITES && jours.length < n; k++) {
    jours.push(B.JOUR_PREMIERE_MENSUALITE + k * B.JOURS_PAR_MOIS);
  }
  return jours;
}

/** Jour de la prochaine mensualité, ou null si l'emprunt est remboursé. */
export function jourProchaineMensualite(etat: EtatJeu): number | null {
  if (etat.mensualitesPayees >= NOMBRE_MENSUALITES) return null;
  return B.JOUR_PREMIERE_MENSUALITE + etat.mensualitesPayees * B.JOURS_PAR_MOIS;
}

/** Charges fixes au début de chaque lundi (sauf le tout premier), mensualité le jour dit. */
export function prelevementsDuMatin(etat: EtatJeu, evenements: Sortie): void {
  if (etat.jour > 1 && (etat.jour - 1) % 7 === 0) {
    depenser(etat, B.CHARGES_FIXES, 'charges');
    evenements.push({ type: 'charges', montant: B.CHARGES_FIXES });
  }
  rembourserAvance(etat, evenements);
  if (etat.jour === jourProchaineMensualite(etat)) {
    // La réserve paie en premier, la trésorerie complète.
    const depuisReserve = Math.min(etat.reserve, B.MENSUALITE);
    etat.reserve -= depuisReserve;
    noterDepense(etat, depuisReserve, 'mensualite');
    depenser(etat, B.MENSUALITE - depuisReserve, 'mensualite');
    etat.mensualitesPayees += 1;
    evenements.push({
      type: 'mensualite',
      montant: B.MENSUALITE,
      depuisReserve,
      restantes: NOMBRE_MENSUALITES - etat.mensualitesPayees,
    });
  }
}
