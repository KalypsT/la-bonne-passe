// La deuxième maison ouverte (v1.0, partie 1) : elle tourne seule, tenue par sa gérante.
// Pas de scène : chaque lundi, un bilan résumé qui passe dans les comptes, et une consigne pour la semaine.
// Voir « Montée en puissance » dans les spécifications ; valeurs dans balance.ts (MAISON2).

import * as B from '../content/balance';
import type { IdConsigne } from '../content/balance';
import { LIEUX } from '../content/agrandir';
import { GERANTE_EXTERNE, INCIDENTS_MAISON2 } from '../content/maison2';
import { accepteGerance, personnelMax } from './agrandir';
import { depenser, encaisser } from './comptes';
import { creerEmploye, type Employe, type EtatJeu } from './etat';
import { creerTirage, tirer } from './hasard';

export interface GeranteMaison {
  /** La personne, telle qu'elle a quitté le salon (ou venue d'ailleurs) ; sa loyauté évolue avec la maison. */
  employe: Employe;
  /** Venue d'ailleurs : elle s'en va au lieu de revenir au salon. */
  externe: boolean;
  /** Salaire par nuit ouverte. */
  salaire: number;
}

/** Ce que la gérante raconte au lundi. */
export interface BilanMaison {
  semaine: number;
  nuits: number;
  rendezVous: number;
  recette: number;
  /** Charges, salaire, incident et caisse. */
  frais: number;
  resultat: number;
  reputationAvant: number;
  reputation: number;
  /** Identifiant de l'incident de la semaine (src/content/maison2.ts), ou null. */
  incident: string | null;
  caisse: number;
  consigne: IdConsigne;
  /** Prénom et genre de la gérante de la semaine, pour les textes. */
  prenom: string;
  genre: 'f' | 'm';
  loyaute: number;
}

export type AnnonceMaison = { id: 'prete' } | { id: 'inauguree'; prenom: string } | { id: 'demission'; prenom: string; genre: 'f' | 'm' };

export interface Maison2 {
  gerante: GeranteMaison | null;
  /** Consigne choisie (vaut au prochain lundi), et celle de la semaine en cours. */
  consigne: IdConsigne;
  consigneSemaine: IdConsigne;
  reputation: number;
  /** Jour de l'inauguration, ou null tant qu'elle n'a pas eu lieu. */
  inauguration: number | null;
  /** Nuits ouvertes depuis le dernier lundi. */
  nuitsSemaine: number;
  /** Derniers bilans, du plus ancien au plus récent. */
  bilans: BilanMaison[];
  /** Résultat cumulé depuis l'ouverture (hors achat, travaux et inauguration). */
  total: number;
  /** Cartes de Josée qui attendent d'être lues. */
  annonces: AnnonceMaison[];
  /** La gérante venue d'ailleurs est partie (démission ou fin de contrat) : elle ne revient pas. */
  externePartie: boolean;
}

export type EvenementMaison2 =
  | { type: 'maisonConfiee'; prenom: string; genre: 'f' | 'm'; externe: boolean; accepte: boolean }
  | { type: 'maisonRappel'; prenom: string; externe: boolean }
  | { type: 'inauguration'; montant: number }
  | { type: 'maisonRouverte' }
  | { type: 'consigneMaison'; consigne: IdConsigne }
  | { type: 'bilanMaison'; resultat: number }
  | { type: 'demissionMaison'; prenom: string };

export type OrdreMaison2 =
  /** Une personne de l'équipe (son identifiant), ou la gérante venue d'ailleurs (`externe`). */
  | { type: 'confierMaison'; employeId: string | 'externe' }
  | { type: 'rappelerGeranteMaison' }
  | { type: 'inaugurer' }
  | { type: 'consigneMaison'; consigne: IdConsigne }
  | { type: 'annonceMaisonVue' };

interface Sortie {
  push(e: EvenementMaison2): unknown;
}

export function maison2DeDepart(): Maison2 {
  return {
    gerante: null,
    consigne: 'equilibree',
    consigneSemaine: 'equilibree',
    reputation: B.MAISON2.reputationOuverture,
    inauguration: null,
    nuitsSemaine: 0,
    bilans: [],
    total: 0,
    annonces: [],
    externePartie: false,
  };
}

/** Le hasard de la deuxième maison, à part pour ne décaler aucune partie existante. */
export function hasardMaison2DeDepart(graine: number): number {
  return tirer(graine * 37 + 19).etat;
}

export function moyenneTalents(e: Pick<Employe, 'talents'>): number {
  const v = Object.values(e.talents);
  return v.reduce((s, x) => s + x, 0) / v.length;
}

/** 0,8 + 0,05 × la moyenne des talents : de 0,85 à 1,05. */
export function facteurGerante(e: Pick<Employe, 'talents'> & { traits?: string[] }): number {
  return 0.8 + 0.05 * moyenneTalents(e) + (e.traits?.includes('Pilier') ? B.GERANTE.pilierMaison2 : 0);
}

export function lieuMaison2(etat: EtatJeu) {
  return LIEUX.find((l) => l.id === etat.etablissement.lieu) ?? null;
}

/** Une personne de l'équipe peut tenir la deuxième maison : confirmée, assez ancienne, libre, et pas seule au salon. */
export function peutConfier(etat: EtatJeu, employeId: string): boolean {
  const e = etat.personnel.find((x) => x.id === employeId);
  return (
    !!e &&
    etat.systemes.maison2 &&
    etat.etablissement.statut === 'pret' &&
    etat.maison2.gerante === null &&
    etat.personnel.length > 1 &&
    e.finEssai === null &&
    e.nuitsTravaillees >= B.GERANTE.nuitsMin &&
    !etat.rendezVous.some((r) => r.employeId === e.id) &&
    !etat.intrigues.actives.some((i) => i.employeId === e.id)
  );
}

export function peutEngagerExterne(etat: EtatJeu): boolean {
  return etat.systemes.maison2 && etat.etablissement.statut === 'pret' && etat.maison2.gerante === null && !etat.maison2.externePartie;
}

export function peutInaugurer(etat: EtatJeu): boolean {
  const m = etat.maison2;
  return (
    etat.etablissement.statut === 'pret' && m.gerante !== null && (m.inauguration !== null || etat.tresorerie >= B.MAISON2.inauguration)
  );
}

/** Une personne rappelée revient au salon s'il y a de la place ; une gérante venue d'ailleurs s'en va toujours. */
export function peutRappeler(etat: EtatJeu): boolean {
  const g = etat.maison2.gerante;
  return !!g && (g.externe || etat.personnel.length < personnelMax(etat));
}

/** La personne revient au salon, reposée, avec la loyauté que la maison lui a laissée. */
function revenirAuSalon(etat: EtatJeu, e: Employe): void {
  etat.personnel.push({
    ...e,
    fatigue: 0,
    moral: Math.max(0, e.moral + B.MAISON2.moralRappel),
    rdvCeSoir: 0,
    chargeCeSoir: 0,
    repos: false,
    reposPrevu: false,
    enServiceCeSoir: false,
    menaceDepart: null,
    promesseRepos: null,
    plafondCeSoir: undefined,
    pauseJusqua: undefined,
  });
}

/** La personne quitte le salon pour la deuxième maison : ce n'est pas un départ, l'équipe ne le vit pas mal. */
function quitterLeSalon(etat: EtatJeu, e: Employe): void {
  etat.personnel = etat.personnel.filter((x) => x !== e);
  etat.essaisATrancher = etat.essaisATrancher.filter((id) => id !== e.id);
  for (const cle of Object.keys(etat.affinites)) if (cle.split('|').includes(e.id)) delete etat.affinites[cle];
  if (etat.gerante === e.id) etat.gerante = null;
}

export function appliquerMaison2(etat: EtatJeu, ordre: OrdreMaison2, evenements: Sortie): void {
  if (etat.finDePartie) return;
  const m = etat.maison2;
  switch (ordre.type) {
    case 'confierMaison': {
      if (ordre.employeId === 'externe') {
        if (!peutEngagerExterne(etat)) return;
        const employe = creerEmploye(GERANTE_EXTERNE);
        employe.loyaute = B.MAISON2.loyauteExterne;
        m.gerante = { employe, externe: true, salaire: B.MAISON2.salaireExterne };
        evenements.push({ type: 'maisonConfiee', prenom: employe.prenom, genre: employe.genre, externe: true, accepte: true });
        return;
      }
      if (!peutConfier(etat, ordre.employeId)) return;
      const e = etat.personnel.find((x) => x.id === ordre.employeId)!;
      const accepte = accepteGerance(e);
      if (accepte) {
        quitterLeSalon(etat, e);
        const employe = structuredClone(e);
        if (employe.ambition === 'gerante') employe.loyaute = Math.min(100, employe.loyaute + B.MAISON2.loyauteAmbition);
        m.gerante = { employe, externe: false, salaire: B.GERANTE.salaire };
      }
      evenements.push({ type: 'maisonConfiee', prenom: e.prenom, genre: e.genre, externe: false, accepte });
      return;
    }
    case 'rappelerGeranteMaison': {
      const g = m.gerante;
      if (!g || !peutRappeler(etat)) return;
      m.gerante = null;
      if (etat.etablissement.statut === 'ouvert') etat.etablissement.statut = 'pret';
      if (g.externe) m.externePartie = true;
      else revenirAuSalon(etat, g.employe);
      evenements.push({ type: 'maisonRappel', prenom: g.employe.prenom, externe: g.externe });
      return;
    }
    case 'inaugurer': {
      if (!peutInaugurer(etat)) return;
      etat.etablissement.statut = 'ouvert';
      m.consigneSemaine = m.consigne;
      if (m.inauguration !== null) {
        evenements.push({ type: 'maisonRouverte' });
        return;
      }
      depenser(etat, B.MAISON2.inauguration, 'maison2');
      m.inauguration = etat.jour;
      m.reputation = B.MAISON2.reputationOuverture + (etat.relations.jauges.presse >= B.RELATIONS.bons ? B.MAISON2.bonusPresse : 0);
      m.annonces.push({ id: 'inauguree', prenom: m.gerante!.employe.prenom });
      evenements.push({ type: 'inauguration', montant: B.MAISON2.inauguration });
      return;
    }
    case 'consigneMaison': {
      if (!(ordre.consigne in B.MAISON2.consignes) || m.consigne === ordre.consigne || m.inauguration === null) return;
      m.consigne = ordre.consigne;
      evenements.push({ type: 'consigneMaison', consigne: ordre.consigne });
      return;
    }
    case 'annonceMaisonVue':
      m.annonces.shift();
      return;
  }
}

/** Les travaux finis : la maison attend sa gérante, et Josée le dit. */
export function maisonPrete(etat: EtatJeu): void {
  if (etat.systemes.maison2) return;
  etat.systemes.maison2 = true;
  etat.maison2.annonces.push({ id: 'prete' });
}

/** À 5 h : la nuit qui vient de finir comptait-elle pour la deuxième maison ? */
export function matinMaison2(etat: EtatJeu): void {
  if (etat.etablissement.statut === 'ouvert') etat.maison2.nuitsSemaine += 1;
}

/**
 * Le lundi à 5 h, avant que la semaine ne se referme : la gérante fait ses comptes, qui passent dans ceux
 * de la semaine écoulée. Renvoie son bilan (null si la maison n'a pas ouvert de la semaine).
 */
export function semaineMaison2(etat: EtatJeu, evenements: Sortie): BilanMaison | null {
  const m = etat.maison2;
  const nuits = Math.min(7, m.nuitsSemaine);
  m.nuitsSemaine = 0;
  const lieu = lieuMaison2(etat);
  if (nuits === 0 || !lieu) {
    m.consigneSemaine = m.consigne;
    return null;
  }
  const P = B.MAISON2;
  const tirage = creerTirage(etat.hasardMaison2);
  const g = m.gerante;
  // Une gérante rappelée en cours de semaine a quand même tenu les nuits passées ; sans elle, on compte sans bonus.
  const personne = g?.employe ?? null;
  const consigne = P.consignes[m.consigneSemaine];
  const aleatoire = 1 + (tirage.suivant() * 2 - 1) * P.alea;
  const occupation = Math.min(1, (P.occupationBase + (P.occupationReputation * m.reputation) / 100) * consigne.affluence * aleatoire);
  const rendezVous = Math.round(lieu.chambres * P.rdvParChambre * nuits * occupation);
  const facteur = personne ? facteurGerante(personne) : 0.8;
  const rendement = P.rendement[lieu.id] ?? 1;
  const recette = Math.round(rendezVous * P.prixMoyen * rendement * (1 - P.partPersonnel) * facteur);

  const incident = tirage.chance(consigne.incident) ? tirage.choisir(INCIDENTS_MAISON2).id : null;
  const coutIncident = incident ? Math.round(P.incidentCout[0] + tirage.suivant() * (P.incidentCout[1] - P.incidentCout[0])) : 0;
  const caisse = personne && personne.loyaute < B.GERANTE.loyauteHonnete && !personne.traits.includes('Pilier') ? Math.round(recette * P.caisse) : 0;
  const salaire = (g?.salaire ?? 0) * nuits;
  const frais = Math.round((P.charges * nuits) / 7) + salaire + coutIncident + caisse;

  if (recette > 0) encaisser(etat, recette, 'maison2');
  depenser(etat, frais, 'maison2');

  // La réputation suit celle de la maison d'origine, la gérante et la consigne ; un incident la fait baisser.
  const reputationAvant = m.reputation;
  const cible = P.partReputationOrigine * etat.reputation + (personne ? (moyenneTalents(personne) - 3) * P.talentReputation : 0) + consigne.reputation;
  m.reputation += (cible - m.reputation) * P.suiviReputation * (nuits / 7);
  if (incident) m.reputation -= P.incidentReputation;
  m.reputation = Math.max(0, Math.min(100, m.reputation));

  if (personne) personne.loyaute = Math.max(0, Math.min(100, personne.loyaute + consigne.loyaute));

  const bilan: BilanMaison = {
    semaine: etat.semaine.numero,
    nuits,
    rendezVous,
    recette,
    frais,
    resultat: recette - frais,
    reputationAvant: Math.round(reputationAvant),
    reputation: Math.round(m.reputation),
    incident,
    caisse,
    consigne: m.consigneSemaine,
    prenom: personne?.prenom ?? '',
    genre: personne?.genre ?? 'f',
    loyaute: personne ? Math.round(personne.loyaute) : 0,
  };
  m.bilans = [...m.bilans, bilan].slice(-P.bilansGardes);
  m.total += bilan.resultat;
  m.consigneSemaine = m.consigne;
  evenements.push({ type: 'bilanMaison', resultat: bilan.resultat });

  // Trop peu attachée, la gérante s'en va : la maison ferme en attendant quelqu'un d'autre.
  if (g && personne && personne.loyaute < P.loyauteDemission) {
    m.gerante = null;
    if (g.externe) m.externePartie = true;
    if (etat.etablissement.statut === 'ouvert') etat.etablissement.statut = 'pret';
    m.annonces.push({ id: 'demission', prenom: personne.prenom, genre: personne.genre });
    evenements.push({ type: 'demissionMaison', prenom: personne.prenom });
  }
  etat.hasardMaison2 = tirage.etat();
  return bilan;
}
