import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  GRAINE_PAR_DEFAUT,
  LINGE_INITIAL,
  MINUTE_DE_DEPART,
  MINUTE_DE_DEPART_DIDACTICIEL,
  PROPRETE_CHAMBRE_OUVERTE,
  RDV_MAX_PAR_SOIR,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
  type IdFormule,
  type IdPriorite,
  type IdSelection,
} from '../content/balance';
import type { Offre } from '../content/clientele';
import { CHAMBRES } from '../content/maison';
import type { QuestionEntretien } from '../content/candidats';
import { SANNE, type DefinitionEmploye, type Silhouette, type Talent } from '../content/personnel';
import { PARTIE_PAR_DEFAUT, type Genre } from '../content/partie';
import type { EvenementMoteur } from './tick';
import { clienteleDeDepart, type Clientele } from './clientele';
import { semaineDeDepart, type BilanSemaine, type Semaine } from './semaine';
import { intriguesDeDepart, type Intrigues } from './intrigues';
import { quartierDeDepart, type Quartier } from './quartier';

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
  /** Segments de clientèle ouverts au palier 2. */
  affaires: boolean;
  groupes: boolean;
  bar: boolean;
  /** Tarif général et formule (palier 2). */
  tarifs: boolean;
  /** Sélection à l'entrée et priorité d'accueil (palier 2). */
  porte: boolean;
  /** Tendances de la semaine (premier lundi après le palier 2). */
  tendances: boolean;
  /** Soirées à thème, programmées au briefing (en même temps que les tendances). */
  themes: boolean;
}

/** Règles de la maison, réglables à tout moment dans l'onglet Clientèle (palier 2). */
export interface Regles {
  /** Indice du cran de tarif dans TARIFS (1 : prix normal). */
  tarif: number;
  formule: IdFormule;
  selection: IdSelection;
  priorite: IdPriorite;
}

export function reglesDeDepart(): Regles {
  return { tarif: 1, formule: 'standard', selection: 'normale', priorite: 'arrivee' };
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

/** Le bar, sous des draps au départ, à rénover au palier 2. */
export interface EtatBar {
  ouvert: boolean;
  /** Travaux en cours : instant (en minutes absolues) où ils se terminent. */
  travaux: number | null;
  /** Bouteilles en stock. */
  stock: number;
  /** Bouteilles commandées au briefing, livrées à l'ouverture. */
  commande: number;
}

/** Avance du grossiste : proposée le lendemain de la réouverture du bar, une seule fois. */
export interface Avance {
  statut: 'aVenir' | 'proposee' | 'acceptee' | 'refusee' | 'remboursee';
  /** Jour où le grossiste passe, une fois le bar rouvert. */
  jourOffre: number | null;
  /** Jour du remboursement, si l'avance est acceptée. */
  echeance: number | null;
  /** Montant à rembourser, intérêts compris. */
  montant: number;
}

export function barDeDepart(): { bar: EtatBar; avance: Avance } {
  return {
    bar: { ouvert: false, travaux: null, stock: 0, commande: 0 },
    avance: { statut: 'aVenir', jourOffre: null, echeance: null, montant: 0 },
  };
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
  /** Son rêve (identifiant de src/content/ambitions.ts), affiché sur sa fiche (v0.4). */
  ambition: string;
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
  /** Charge de ces rendez-vous (un court compte moins, une soirée complète plus), comparée au maximum du planning. */
  chargeCeSoir: number;
  /** Au repos jusqu'à la fin de la nuit. */
  repos: boolean;
  /** Repos prévu au planning du briefing : appliqué à l'ouverture. */
  reposPrevu: boolean;
  /** A pris son service à l'ouverture ce soir. */
  enServiceCeSoir: boolean;
  /** Menace de départ : jour où la personne part si rien ne change, ou null. */
  menaceDepart: number | null;
  /** Jour du dernier entretien individuel (0 : jamais). */
  dernierEntretien: number;
  /** Jour de la dernière prime (très négatif : jamais). */
  dernierePrime: number;
  /** Promesse de repos : jour limite pour la tenir, ou null. */
  promesseRepos: number | null;
  /** Jour où la personne a été recadrée : plus concentrée ce soir-là. */
  recadre: number;
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
  /** Formule en vigueur quand le rendez-vous a commencé. */
  formule: IdFormule;
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
  /** Imprévus tranchés cette nuit. */
  imprevus: number;
  /** Recette du bar (comprise dans les recettes). */
  bar: number;
}

/** Imprévu en attente de ta décision (carte en pause). */
export interface ImprevuEnCours {
  id: string;
  /** Personne concernée, et seconde personne pour une querelle. */
  employeId: string | null;
  employe2Id: string | null;
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
  equipes: { menage: number; bar: number };
  bar: EtatBar;
  avance: Avance;
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
  /** Rendez-vous maximum par personne et par soir (planning). */
  rdvMax: number;
  /** Affinité de chaque paire, clé « idA|idB » triée. */
  affinites: Record<string, number>;
  imprevu: ImprevuEnCours | null;
  /** Imprévus déjà vus au moins une fois. */
  imprevusVus: string[];
  /** Numéro de la dernière nuit où chaque imprévu est sorti (v0.4), pour ne pas le revoir trop tôt. */
  imprevusNuit: Record<string, number>;
  /** Instant à partir duquel un nouvel imprévu peut tomber. */
  prochainImprevu: number;
  /** Personnes parties, dont la carte d'adieu reste à montrer. */
  adieux: string[];
  /** Satisfaction par segment et fréquentation (v0.3). La réputation en est la moyenne pondérée. */
  clientele: Clientele;
  regles: Regles;
  /** Semaine en cours : comptes par poste, tendances, situation de départ. */
  semaine: Semaine;
  /** Bilan de la dernière semaine écoulée. */
  bilanSemaine: BilanSemaine | null;
  /** Le bilan du lundi attend d'être lu (carte en pause). */
  bilanAVoir: boolean;
  /** Thème de la soirée programmé au dernier briefing, ou null. */
  themeDuSoir: string | null;
  /** Nouveautés arrivées avec une mise à jour du jeu, pour un palier déjà atteint : Josée les présente. */
  nouveautes: string[];
  /** Intrigues en cours et terminées, et la carte qui attend ta décision (v0.4). */
  intrigues: Intrigues;
  /** Le quartier : tapage, insonorisation (v0.4). */
  quartier: Quartier;
  /** Étape du didacticiel de Madame Josée, ou null s'il est fini ou passé. */
  didacticiel: number | null;
  /** État courant du générateur pseudo-aléatoire. */
  hasard: number;
}

/** À augmenter à chaque changement de structure, avec une migration dans src/save/migrations.ts. */
export const VERSION_ETAT = 18;

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
    affaires: false,
    groupes: false,
    bar: false,
    tarifs: false,
    porte: false,
    tendances: false,
    themes: false,
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
    ambition: def.ambition,
    traitsConnus: [...def.traits],
    finEssai: null,
    nuitsTravaillees: 0,
    part: def.part,
    fatigue: def.fatigue,
    moral: def.moral,
    loyaute: def.loyaute,
    rdvCeSoir: 0,
    chargeCeSoir: 0,
    repos: false,
    ...suiviDeDepart(),
  };
}

/** Champs de suivi d'une personne, ajoutés en version 8. */
export function suiviDeDepart() {
  return {
    reposPrevu: false,
    enServiceCeSoir: false,
    menaceDepart: null as number | null,
    dernierEntretien: 0,
    dernierePrime: -99,
    promesseRepos: null as number | null,
    recadre: 0,
  };
}

/** Champs ajoutés en version 5 : le personnel et la vie de la soirée. */
export function soireeDeDepart() {
  return {
    personnel: [creerEmploye(SANNE)],
    equipes: { menage: 1, bar: 0 },
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

/** Champs ajoutés en version 8 : planning, affinités, imprévus et départs. */
export function personnelDeDepart() {
  return {
    rdvMax: RDV_MAX_PAR_SOIR,
    affinites: {} as Record<string, number>,
    imprevu: null as ImprevuEnCours | null,
    imprevusVus: [] as string[],
    imprevusNuit: {} as Record<string, number>,
    prochainImprevu: 0,
    adieux: [] as string[],
  };
}

export interface OptionsNouvellePartie {
  graine?: number;
  joueur?: Joueur;
  nomMaison?: string;
  /** Commence par la soirée guidée de Madame Josée, une heure avant le briefing. */
  didacticiel?: boolean;
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
    minuteDuJour: options.didacticiel ? MINUTE_DE_DEPART_DIDACTICIEL : MINUTE_DE_DEPART,
    briefingJour: 0,
    chambres: chambresDeDepart(),
    ...soireeDeDepart(),
    ...maisonDeDepart(),
    ...recrutementDeDepart(),
    ...personnelDeDepart(),
    clientele: clienteleDeDepart(),
    regles: reglesDeDepart(),
    ...barDeDepart(),
    semaine: semaineDeDepart(),
    bilanSemaine: null,
    bilanAVoir: false,
    themeDuSoir: null,
    nouveautes: [],
    intrigues: intriguesDeDepart(),
    quartier: quartierDeDepart(),
    didacticiel: options.didacticiel ? 0 : null,
    hasard: (options.graine ?? GRAINE_PAR_DEFAUT) | 0,
  };
}
