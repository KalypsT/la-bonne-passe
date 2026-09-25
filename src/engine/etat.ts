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
import type { QuestionEntretien } from '../content/candidats';
import { SANNE, type DefinitionEmploye, type Silhouette, type Talent } from '../content/personnel';
import { PARTIE_PAR_DEFAUT, type Genre } from '../content/partie';
import type { EvenementMoteur } from './tick';

/** Drapeaux d'ouverture des systèmes. L'interface masque ou verrouille ce qui est fermé. */
export interface Systemes {
  personnel: boolean;
  finances: boolean;
  clientele: boolean;
  relations: boolean;
  recrutement: boolean;
  renovation: boolean;
  /** Planning du soir au briefing (palier 1). */
  planning: boolean;
  /** Réserve de sécurité (palier 1). */
  reserve: boolean;
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
  /** Travaux en cours : instant (en minutes absolues) où ils se terminent. */
  travaux: number | null;
}

/** Qui est la personne : de quoi l'afficher partout sans revenir aux contenus. */
export interface Identite {
  id: string;
  prenom: string;
  age: number;
  genre: 'f' | 'm';
  accroche: string;
  silhouette: Silhouette;
  talents: Record<Talent, number>;
  /** Tous ses traits, connus ou non du joueur. */
  traits: string[];
}

export interface Employe extends Identite {
  /** Traits que le joueur a découverts. */
  traitsConnus: string[];
  /** Jour de fin de la période d'essai, ou null une fois confirmée. */
  finEssai: number | null;
  nuitsTravaillees: number;
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

export interface Candidat extends Identite {
  intro: string;
  questions: QuestionEntretien[];
  partMin: number;
  source: 'visite' | 'annonce' | 'boucheAOreille';
  /** Jour à partir duquel le candidat ne t'attend plus. */
  expire: number;
  /** Question posée à l'entretien (indice), ou null. */
  questionPosee: number | null;
  /** Part demandée en retour d'une proposition trop basse, ou null. */
  contreOffre: number | null;
}

/** Visite d'un candidat prévue dans la journée : elle met le jeu en pause. */
export interface Visite {
  /** Instant de la visite, en minutes absolues. */
  instant: number;
  candidat: Candidat;
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
  /** Part de la recette mise en réserve à la fermeture. */
  reserve: number;
}

/** Une ligne du journal : l'événement brut, mis en texte à l'affichage (les textes restent dans src/content). */
export interface EntreeJournal {
  jour: number;
  minuteDuJour: number;
  evenement: EvenementMoteur;
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
  /** Réserve de sécurité, en euros, mise de côté hors de la trésorerie. */
  reserve: number;
  /** Part de la recette du soir mise en réserve : 0, 0,1 ou 0,2. */
  tauxReserve: number;
  mensualitesPayees: number;
  /** Paliers atteints dont la carte d'annonce n'a pas encore été vue. */
  annonces: number[];
  /** Derniers événements, du plus récent au plus ancien. */
  journal: EntreeJournal[];
  /** Candidats qui attendent une réponse (visites passées et marché du lundi). */
  candidats: Candidat[];
  /** Visites à venir, candidats compris. */
  visites: Visite[];
  prochainCandidat: number;
  /** Personnes dont la période d'essai est finie et attend ta décision. */
  essaisATrancher: string[];
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
}

/** À augmenter à chaque changement de structure, avec une migration dans src/save/migrations.ts. */
export const VERSION_ETAT = 7;

/** Systèmes ouverts au départ : onglets Maison, Personnel, Finances et Journal. */
export function systemesDeDepart(): Systemes {
  return {
    personnel: true,
    finances: true,
    clientele: false,
    relations: false,
    recrutement: false,
    renovation: false,
    planning: false,
    reserve: false,
    bar: false,
  };
}

export function chambresDeDepart(): EtatChambre[] {
  return CHAMBRES.map((c) => ({
    id: c.id,
    ouverte: c.ouverteAuDepart,
    proprete: c.ouverteAuDepart ? PROPRETE_CHAMBRE_OUVERTE : 0,
    etat: c.ouverteAuDepart ? ETAT_CHAMBRE_OUVERTE : ETAT_CHAMBRE_FERMEE,
    travaux: null,
  }));
}

export function creerEmploye(def: DefinitionEmploye): Employe {
  return {
    id: def.id,
    prenom: def.prenom,
    age: def.age,
    genre: def.genre,
    accroche: def.accroche,
    silhouette: { ...def.silhouette },
    talents: { ...def.talents },
    traits: [...def.traits],
    traitsConnus: [...def.traits],
    finEssai: null,
    nuitsTravaillees: 0,
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

/** Champs ajoutés en version 6 : paliers, réserve, mensualités et journal. */
export function maisonDeDepart() {
  return {
    reserve: 0,
    tauxReserve: 0,
    mensualitesPayees: 0,
    annonces: [] as number[],
    journal: [] as EntreeJournal[],
  };
}

/** Champs ajoutés en version 7 : le recrutement. */
export function recrutementDeDepart() {
  return {
    candidats: [] as Candidat[],
    visites: [] as Visite[],
    prochainCandidat: 1,
    essaisATrancher: [] as string[],
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
    ...maisonDeDepart(),
    ...recrutementDeDepart(),
    hasard: (options.graine ?? GRAINE_PAR_DEFAUT) | 0,
  };
}
