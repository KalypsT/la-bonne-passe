import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  GRAINE_PAR_DEFAUT,
  MINUTE_DE_DEPART,
  PROPRETE_CHAMBRE_OUVERTE,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
} from '../content/balance';
import { CHAMBRES } from '../content/maison';
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
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
}

/** À augmenter à chaque changement de structure, avec une migration dans src/save/migrations.ts. */
export const VERSION_ETAT = 4;

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
    hasard: (options.graine ?? GRAINE_PAR_DEFAUT) | 0,
  };
}
