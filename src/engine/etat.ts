import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  GRAINE_PAR_DEFAUT,
  LINGE_INITIAL,
  MINUTE_DE_DEPART,
  PROPRETE_CHAMBRE_OUVERTE,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
} from '../content/balance';
import type { Offre } from '../content/clientele';
import { CHAMBRES } from '../content/maison';
import { SANNE, type DefinitionEmploye, type Talent } from '../content/personnel';
import { PARTIE_PAR_DEFAUT, type Genre } from '../content/partie';

/** Drapeaux d'ouverture des systèmes. L'interface masque ou verrouille ce qui est fermé. */
export interface Systemes {
  personnel: boolean;
  finances: boolean;
  clientele: boolean;
  relations: boolean;
  recrutement: boolean;
  renovation: boolean;
  bar: boolean;
}

export interface Joueur {
  prenom: string;
  /** Identifiant de l'avatar choisi (voir src/content/avatars.ts). */
  avatar: string;
  /** Variante de tenue de l'avatar : 0 ou 1. */
  tenue: number;
  /** Sert à accorder les textes : « la patronne » ou « le patron ». */
  genre: Genre;
}

export interface EtatChambre {
  id: string;
  /** En service (sinon sous des draps). */
  ouverte: boolean;
  /** Propreté en %. */
  proprete: number;
  /** État général en %, qui baisse avec l'usure. */
  etat: number;
}

export interface Employe {
  id: string;
  talents: Record<Talent, number>;
  traits: string[];
  /** Part gardée sur chaque rendez-vous. */
  part: number;
  fatigue: number;
  moral: number;
  loyaute: number;
  /** Rendez-vous déjà faits ce soir. */
  rdvCeSoir: number;
  /** Au repos jusqu'à la fin de la nuit. */
  repos: boolean;
}

export interface ClientEnFile {
  id: number;
  modele: string;
  /** Patience restante, en minutes. */
  patience: number;
}

export interface RendezVous {
  chambreId: string;
  employeId: string;
  clientId: number;
  modele: string;
  duree: number;
  /** Minutes restantes. */
  restant: number;
}

export interface Avis {
  client: string;
  texte: string;
  qualite: number;
}

/** Comptes de la nuit en cours, pour le bilan de fermeture. */
export interface Nuit {
  numero: number;
  recettes: number;
  partPersonnel: number;
  depenses: number;
  servis: number;
  perdus: number;
  reputationDebut: number;
  meilleurAvis: Avis | null;
  pireAvis: Avis | null;
}

export interface EtatJeu {
  version: number;
  joueur: Joueur;
  maison: { nom: string; ville: string };
  /** Chapitre de la campagne, à partir de 1. */
  chapitre: number;
  /** Palier de montée en puissance atteint (0 au départ). */
  palier: number;
  systemes: Systemes;
  /** Trésorerie en euros. */
  tresorerie: number;
  /** Réputation sur 100. */
  reputation: number;
  /** Jour de jeu, à partir de 1. Il change à 5 h, pas à minuit. */
  jour: number;
  /** Heure de l'horloge, en minutes depuis minuit (0 à 1435). */
  minuteDuJour: number;
  /** Dernier jour dont le briefing de 19 h a été validé (0 : aucun). */
  briefingJour: number;
  chambres: EtatChambre[];
  personnel: Employe[];
  equipes: { menage: number };
  /** Draps propres en stock. */
  linge: number;
  /** Draps commandés au briefing, livrés à l'ouverture. */
  lingeCommande: number;
  offre: Offre;
  file: ClientEnFile[];
  rendezVous: RendezVous[];
  prochainClient: number;
  /** Nuit en cours, ou dernière nuit terminée jusqu'à la prochaine ouverture. */
  nuit: Nuit | null;
  nuitsBouclees: number;
  /** Dispute en cours sur le quai : instant (en minutes absolues) où elle dégénère. */
  dispute: { expire: number } | null;
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
}

/** À augmenter à chaque changement de structure, avec une migration dans src/save/migrations.ts. */
export const VERSION_ETAT = 5;

/** Systèmes ouverts au départ : onglets Maison, Personnel, Finances et Journal. */
export function systemesDeDepart(): Systemes {
  return {
    personnel: true,
    finances: true,
    clientele: false,
    relations: false,
    recrutement: false,
    renovation: false,
    bar: false,
  };
}

export function chambresDeDepart(): EtatChambre[] {
  return CHAMBRES.map((c) => ({
    id: c.id,
    ouverte: c.ouverteAuDepart,
    proprete: c.ouverteAuDepart ? PROPRETE_CHAMBRE_OUVERTE : 0,
    etat: c.ouverteAuDepart ? ETAT_CHAMBRE_OUVERTE : ETAT_CHAMBRE_FERMEE,
  }));
}

export function creerEmploye(def: DefinitionEmploye): Employe {
  return {
    id: def.id,
    talents: { ...def.talents },
    traits: [...def.traits],
    part: def.part,
    fatigue: def.fatigue,
    moral: def.moral,
    loyaute: def.loyaute,
    rdvCeSoir: 0,
    repos: false,
  };
}

/** Champs ajoutés en version 5 : le personnel et la vie de la soirée. */
export function soireeDeDepart() {
  return {
    personnel: [creerEmploye(SANNE)],
    equipes: { menage: 1 },
    linge: LINGE_INITIAL,
    lingeCommande: 0,
    offre: 'classique' as Offre,
    file: [],
    rendezVous: [],
    prochainClient: 1,
    nuit: null,
    nuitsBouclees: 0,
    dispute: null,
  };
}

export interface OptionsNouvellePartie {
  graine?: number;
  joueur?: Joueur;
  nomMaison?: string;
}

export function creerEtatInitial(options: OptionsNouvellePartie = {}): EtatJeu {
  const { prenom, avatar, tenue, genre, nomMaison, ville } = PARTIE_PAR_DEFAUT;
  return {
    version: VERSION_ETAT,
    joueur: options.joueur ?? { prenom, avatar, tenue, genre },
    maison: { nom: options.nomMaison ?? nomMaison, ville },
    chapitre: 1,
    palier: 0,
    systemes: systemesDeDepart(),
    tresorerie: TRESORERIE_INITIALE,
    reputation: REPUTATION_INITIALE,
    jour: 1,
    minuteDuJour: MINUTE_DE_DEPART,
    briefingJour: 0,
    chambres: chambresDeDepart(),
    ...soireeDeDepart(),
    hasard: (options.graine ?? GRAINE_PAR_DEFAUT) | 0,
  };
}
