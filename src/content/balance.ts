// Valeurs d'équilibrage du jeu, regroupées ici pour pouvoir les ajuster facilement.

import type { Segment } from './clientele';

/** Durée d'un pas du moteur, en minutes de jeu. */
export const MINUTES_PAR_TICK = 5;

/** Graine du hasard par défaut d'une nouvelle partie. */
export const GRAINE_PAR_DEFAUT = 20260925;

// ——— Horaires (en minutes depuis minuit) ———

/** Début de la journée de jeu : le jour change à cette heure, pas à minuit. */
export const HEURE_DEBUT_JOURNEE = 5 * 60;
/** Le briefing, en pause, obligatoire chaque jour. */
export const HEURE_BRIEFING = 19 * 60;
/** Ouverture de la maison, si le briefing a eu lieu. */
export const HEURE_OUVERTURE = 20 * 60;
/** Fermeture de la maison, le lendemain matin. */
export const HEURE_FERMETURE = 4 * 60;
/** Heure de départ d'une nouvelle partie : directement au briefing. */
export const MINUTE_DE_DEPART = HEURE_BRIEFING;
/** Avec le didacticiel, la partie commence une heure avant, pour visiter la maison et lancer le temps. */
export const MINUTE_DE_DEPART_DIDACTICIEL = 18 * 60;

// ——— Rythme en temps réel, à la vitesse ×1 ———

/** Durée réelle de la journée, de 5 h à 19 h (accélérée). */
export const SECONDES_REELLES_JOURNEE = 45;
/** Durée réelle de la soirée, de l'ouverture à la fermeture. */
export const SECONDES_REELLES_SOIREE = 360;
/** Vitesses proposées au joueur, en plus de la pause. */
export const VITESSES = [1, 2, 4] as const;

// ——— Départ ———

/** Trésorerie au début d'une partie, en euros. */
export const TRESORERIE_INITIALE = 3000;
/** Réputation au début d'une partie, sur 100. */
export const REPUTATION_INITIALE = 15;
/** Propreté et état (en %) de la chambre en service au départ. */
export const PROPRETE_CHAMBRE_OUVERTE = 80;
export const ETAT_CHAMBRE_OUVERTE = 72;
/** État (en %) des chambres qui dorment sous des draps. */
export const ETAT_CHAMBRE_FERMEE = 35;

// ——— Finances ———

export const EMPRUNT_RACHAT = 30000;
export const MENSUALITE = 2500;
/** Jour de la première mensualité, puis tous les 28 jours (un mois de jeu = 4 semaines). */
export const JOUR_PREMIERE_MENSUALITE = 28;
export const JOURS_PAR_MOIS = 28;
/** Réserve de sécurité : part de la recette du soir mise de côté (palier 1). */
export const TAUX_RESERVE = [0, 0.1, 0.2] as const;

// ——— Clientèle ———

/** Arrivées par heure d'ouverture : BASE + réputation / 100 × BONUS_REPUTATION, puis × affluence de l'offre. */
export const ARRIVEES_PAR_HEURE_BASE = 1;
export const ARRIVEES_BONUS_REPUTATION = 2.4;
/** Places sur le quai ; au-delà, le client repart aussitôt. */
export const PLACES_FILE = 4;
/** Patience d'un client sur le quai, en minutes de jeu. */
export const PATIENCE_CLIENT = 55;
/** Premier client garanti de la toute première soirée, en minutes après l'ouverture. */
export const PREMIER_CLIENT_APRES = 10;
/** Plus aucun rendez-vous ne commence dans les N minutes avant la fermeture. */
export const DERNIER_RDV_AVANT_FERMETURE = 45;
/** Durée d'un rendez-vous, en minutes (tirée entre les deux). */
export const DUREE_RDV_MIN = 50;
export const DUREE_RDV_MAX = 75;
/** Rendez-vous maximum par personne et par soir, au départ ; réglable au briefing dès le palier 1. */
export const RDV_MAX_PAR_SOIR = 4;

/** Effets sur la réputation. Un rendez-vous rapporte (qualité − 0,4) × REPUTATION_PAR_RDV. */
export const REPUTATION_PAR_RDV = 2.0;
/**
 * Les gains ralentissent quand la réputation monte : × (1 − réputation / 100) ^ FREIN.
 * Les pertes, elles, tombent en entier. Cible : avec Sanne seule, réputation 25 au mieux vers la nuit 4 ou 5 (voir paliers.test.ts).
 */
export const REPUTATION_FREIN = 2;
export const REPUTATION_CLIENT_PERDU = 0.15;
export const REPUTATION_FILE_PLEINE = 0.05;

/** Poids de la qualité d'un rendez-vous (0 à 1). */
export const QUALITE = {
  talent: 0.45,
  proprete: 0.2,
  etat: 0.15,
  linge: 0.12,
  premium: 0.06,
  malusFatigue: 0.15,
};
/** Le prix payé varie de 75 % à 125 % du budget selon la qualité. */
export const PRIX_MIN = 0.75;
export const PRIX_ECART = 0.5;

// ——— Personnel ———

export const FATIGUE_PAR_RDV_MIN = 12;
export const FATIGUE_PAR_RDV_MAX = 17;
/** Au-delà, la qualité baisse et le moral s'use. */
export const SEUIL_FATIGUE = 75;
/** Au-delà, une alerte signale l'épuisement. */
export const SEUIL_EPUISEMENT = 80;
/** Récupération par heure : en service sans client, ou au repos. */
export const RECUPERATION_EN_SERVICE = 1;
export const RECUPERATION_AU_REPOS = 4;
export const MORAL_PERTE_FATIGUE = 2; // par heure
/** Le moral remonte seul, lentement, jusqu'à un plafond ; au-delà, il faut des soins (repos, entretien, prime). */
export const MORAL_REMONTEE = 0.15; // par heure
export const MORAL_PLAFOND_NATUREL = 60;
/** Chaque rendez-vous use un peu le moral : clients lourds, talons hauts, sourires de commande. */
export const MORAL_PAR_RDV = 2;

// ——— Maison ———

/** Salissure d'une chambre après un rendez-vous, en points de propreté. */
export const SALISSURE_MIN = 18;
export const SALISSURE_MAX = 26;
export const USURE_MIN = 1;
export const USURE_MAX = 2.2;
/** Sous ce seuil : alerte ; sous le second : la chambre ne reçoit plus. */
export const SEUIL_CHAMBRE_SALE = 40;
export const SEUIL_CHAMBRE_INUTILISABLE = 15;
/** Points de propreté rendus par heure et par personne de ménage. */
export const MENAGE_MAISON_OUVERTE = 5;
export const MENAGE_MAISON_FERMEE = 16;
export const NETTOYAGE_EXPRESS = 30;
/** Effectif de l'équipe de ménage : 1 au départ, jusqu'à MENAGE_MAX à partir du palier 1. */
export const MENAGE_MAX = 2;

/** Rouvrir une chambre sous des draps (palier 1). */
export const RENOVATION = { prix: 900, heures: 8 };
/** Propreté et état d'une chambre qui sort de travaux. */
export const PROPRETE_APRES_TRAVAUX = 100;
export const ETAT_APRES_TRAVAUX = 90;

export const LINGE_INITIAL = 40;
export const LINGE_PAR_RDV = 10;
export const SEUIL_LINGE = 10;
export const COMMANDE_LINGE = { draps: 50, prix: 60 };
export const LIVRAISON_EXPRESS_LINGE = { draps: 50, prix: 90 };

// ——— Dépenses ———

export const SALAIRE_MENAGE = 90; // par jour et par personne, à midi
export const HEURE_SALAIRES = 12 * 60;
export const CHARGES_FIXES = 600; // chaque lundi
/** Dispute sur le quai : chance par heure et par client en file au-delà du premier. */
export const DISPUTE_CHANCE_PAR_HEURE = 0.05;
export const DISPUTE_DELAI = 40; // minutes avant que ça dégénère
export const DISPUTE_CASSE = 120;
export const DISPUTE_REPUTATION = 2;
export const DISPUTE_VERRE_OFFERT = 40;
export const DISPUTE_CALMER_REUSSITE = 0.65;

// ——— Recrutement (palier 1) ———

/** Personnes suivies au plus dans la maison d'origine (Sanne comprise). */
export const PERSONNEL_MAX = 4;
/** Parts que le joueur peut proposer à l'entretien. */
export const PARTS_PROPOSEES = [0.45, 0.5, 0.55] as const;
/** Proposer plus que le tarif du quartier (50 %) rend la recrue plus loyale d'emblée. */
export const BONUS_LOYAUTE_PART_HAUTE = 15;
/** Valeurs de départ d'une recrue. */
export const RECRUE = { moral: 78, loyaute: 55, fatigue: 10 };
/** Jours pendant lesquels un candidat reçu en visite attend ta réponse. */
export const JOURS_REFLEXION = 3;
/** Durée de la période d'essai, en jours. */
export const DUREE_ESSAI = 7;
/** Nuits travaillées avant qu'un trait caché se révèle. */
export const NUITS_POUR_REVELER_TRAIT = 2;
/** Marché du lundi : 1 candidat, +1 par tranche de réputation, jusqu'au maximum. */
export const MARCHE_BASE = 1;
export const MARCHE_REPUTATION_PAR_CANDIDAT = 20;
export const MARCHE_MAX = 5;

// ——— Personnel complet (palier 1) ———

/** Rendez-vous maximum par personne et par soir : crans proposés au briefing, et valeur de départ. */
export const RDV_MAX_CRANS = [2, 3, 4] as const;
/** Une soirée de repos au planning : moral regagné à la fermeture. */
export const MORAL_SOIR_DE_REPOS = 8;
/** Moral bas : sous ce seuil, la qualité des rendez-vous baisse. */
export const SEUIL_MORAL_BAS = 30;
export const MALUS_QUALITE_MORAL_BAS = 0.06;

/** Menace de départ : sous ce moral, la personne annonce qu'elle part ; au-dessus du second, elle reste. */
export const SEUIL_MENACE_DEPART = 20;
export const SEUIL_MENACE_LEVEE = 30;
/** Jours laissés pour la retenir (plus pour une personne Fidèle ou très loyale). */
export const DELAI_MENACE = 3;
export const DELAI_MENACE_FIDELE = 2;
export const LOYAUTE_DELAI_BONUS = 70;
/** Un départ : le moral des autres en pâtit (et la satisfaction des habitués, voir DEPART_SATISFACTION_HABITUES). */
export const DEPART_MORAL_AUTRES = 5;

/** Effets des traits. */
export const TRAITS_EFFETS = {
  merePoule: 3, // moral des autres, chaque nuit
  fideleLoyaute: 0.5, // les pertes de loyauté sont multipliées par ce facteur
  divaSansPremium: 4, // moral perdu chaque nuit sans chambre premium ouverte
  ambitieuseParPoint: 1.5, // moral gagné par point de réputation gagné dans la nuit
  solitaireRepos: 1.5, // récupération au repos multipliée
  solitaireMoralRepos: 4, // moral en plus d'un soir de repos
  teteBruleeDispute: 1.5, // chance de dispute sur le quai multipliée, par Tête brûlée en service
  fetardeFatigue: 1.25, // fatigue par rendez-vous multipliée
  fetardePatience: 15, // minutes de patience en plus pour les clients, si une Fêtarde est en service
};

/** Entretien individuel : une fois par jour et par personne. */
export const ENTRETIEN = {
  ecouter: { moral: 8, loyaute: 2 },
  promettre: { moral: 14, loyaute: 4 },
  recadrer: { moral: -8, loyaute: -2, qualite: 0.06 },
  /** Promesse de repos non tenue dans ce délai (jours) : */
  delaiPromesse: 3,
  promesseRompue: { moral: -15, loyaute: -10 },
};

/** Primes : une par semaine et par personne. */
export const PRIMES = [
  { montant: 50, moral: 8, loyaute: 3 },
  { montant: 120, moral: 18, loyaute: 7 },
];
export const JOURS_ENTRE_PRIMES = 7;

/** Affinités entre employés, de −100 (rivalité) à +100 (amitié). */
export const AFFINITE = {
  initialeEcart: 15,
  initialeMerePoule: 10,
  parNuitPartagee: 2,
  solitaire: -2,
  teteBrulee: -3,
  diva: -3,
  merePoule: 3,
  hasard: 3,
  seuilAmitie: 40,
  seuilRivalite: -30,
  moralAmitie: 2,
};

/** Imprévus : environ 2 par soirée, en pause. */
export const IMPREVU_CHANCE_PAR_HEURE = 0.35;
export const IMPREVUS_MAX_PAR_NUIT = 3;
export const IMPREVU_ECART_MIN = 75; // minutes entre deux imprévus
export const IMPREVU_PREMIER_APRES = 30; // minutes après l'ouverture, au plus tôt

// ——— Palier 2 : se faire un nom ———

/** Réputation qui déclenche le palier 2. */
export const REPUTATION_PALIER_2 = 25;
/** Un client d'un groupe arrive parfois avec un ami du même groupe. */
export const GROUPE_CHANCE_ACCOMPAGNE = 0.5;
/** Les groupes font monter le ton : chance de dispute multipliée par client de groupe sur le quai. */
export const GROUPE_DISPUTE = 1.3;
/** Une Fêtarde en service attire les groupes : poids multiplié. */
export const FETARDE_ATTIRE_GROUPES = 1.6;
/** Poids de base des nouveaux segments dans les arrivées, avant l'offre du soir. */
export const POIDS_SEGMENTS = { touriste: 1, habitue: 1, affaires: 0.7, groupe: 0.8 };

// ——— Clientèle : satisfaction par segment (v0.3) ———

/**
 * Chaque segment a sa satisfaction (0 à 100), qui nourrit la réputation auprès de lui.
 * La réputation globale est la moyenne pondérée des segments ouverts, avec ces poids.
 */
export const POIDS_REPUTATION = { touriste: 1, habitue: 1.2, affaires: 0.9, groupe: 0.8 };
/**
 * Un client ne touche que son segment : ses gains et ses pertes sont multipliés par ce facteur,
 * pour que la réputation globale avance à peu près au même rythme qu'avant la v0.3.
 */
export const SATISFACTION_PAR_CLIENT = 2.2;
/** Un client parti sans être reçu : perte multipliée selon ce que le segment supporte mal. */
export const SENSIBILITE_ATTENTE = { touriste: 1, habitue: 1, affaires: 2, groupe: 0.8 };
/** Un départ du personnel : les habitués perdent leurs repères. */
export const DEPART_SATISFACTION_HABITUES = 3;
/**
 * Attrait d'un segment dans les arrivées : BASE + satisfaction × PENTE.
 * Les habitués sont les plus sensibles : ils reviennent quand ils sont contents.
 */
export const ATTRAIT_BASE = 0.5;
export const ATTRAIT_PENTE = { touriste: 0.02, habitue: 0.035, affaires: 0.025, groupe: 0.015 };
/** Nuits gardées pour la fréquentation affichée dans l'onglet Clientèle. */
export const NUITS_HISTORIQUE_CLIENTELE = 7;
/** Humeur d'un segment affichée dans sa fiche : basse sous le premier seuil, haute au-dessus du second. */
export const SEUILS_HUMEUR = [25, 50] as const;

// ——— Règles de la maison (v0.3, palier 2) : tarifs, formule, sélection, priorité ———

/** Crans du tarif général : écart au prix normal. */
export const TARIFS = [-0.2, 0, 0.2] as const;
/**
 * Sensibilité de chaque segment au tarif : la demande varie de −élasticité × écart
 * (au tarif +20 %, les touristes viennent 30 % moins, les affaires 4 % moins).
 */
export const ELASTICITE_PRIX = { touriste: 1.5, habitue: 0.8, affaires: 0.2, groupe: 1 };
/** Demande minimale d'un segment, quel que soit le tarif. */
export const DEMANDE_PRIX_MIN = 0.2;
/** Le tarif se sent aussi dans l'avis : qualité ressentie − élasticité × écart × ce facteur. */
export const PRIX_RESSENTI = 0.8;
/** À ce prix-là, on attend : patience sur le quai × (1 − écart × ce facteur). */
export const PATIENCE_TARIF = 1;

export type IdFormule = 'court' | 'standard' | 'complete';
export interface ReglageFormule {
  /** Durée, prix, fatigue, usure du moral et salissure, en multiplicateurs. */
  duree: number;
  prix: number;
  /** Ce que compte le rendez-vous dans le maximum par personne et par soir. */
  charge: number;
  /** Arrivées multipliées, et poids de certains segments : les pressés fuient les longues soirées. */
  affluence: number;
  attire: Partial<Record<Segment, number>>;
  fatigue: number;
  salissure: number;
  /** Qualité ressentie selon le segment. */
  qualite: Partial<Record<Segment, number>>;
}
export const FORMULES: Record<IdFormule, ReglageFormule> = {
  court: { duree: 0.6, prix: 0.6, charge: 0.75, affluence: 1.1, attire: { affaires: 1.4 }, fatigue: 0.7, salissure: 0.7, qualite: { affaires: 0.06, touriste: -0.03, habitue: -0.08 } },
  standard: { duree: 1, prix: 1, charge: 1, affluence: 1, attire: {}, fatigue: 1, salissure: 1, qualite: {} },
  complete: { duree: 1.5, prix: 1.7, charge: 1.5, affluence: 0.8, attire: { affaires: 0.4, habitue: 1.3 }, fatigue: 1.4, salissure: 1.2, qualite: { habitue: 0.1, touriste: 0.06, groupe: 0.03, affaires: -0.1 } },
};

export type IdSelection = 'laxiste' | 'normale' | 'stricte';
export interface ReglageSelection {
  /** Arrivées multipliées. */
  affluence: number;
  /** Chance de dispute multipliée. */
  dispute: number;
  /** Poids d'un segment dans les arrivées, multiplié. */
  attire: Partial<Record<Segment, number>>;
  /** Part des clients d'un segment refusés à la porte. */
  refus: Partial<Record<Segment, number>>;
  /** Qualité ressentie selon le segment : une maison calme ou un joyeux bazar. */
  qualite: Partial<Record<Segment, number>>;
  /** Portier loué pour la soirée, payé à l'ouverture. */
  cout: number;
}
export const SELECTIONS: Record<IdSelection, ReglageSelection> = {
  laxiste: { affluence: 1, dispute: 1.6, attire: { groupe: 1.4, touriste: 1.1 }, refus: {}, qualite: { groupe: 0.05, touriste: 0.03, habitue: -0.03, affaires: -0.04 }, cout: 0 },
  normale: { affluence: 1, dispute: 1, attire: {}, refus: {}, qualite: {}, cout: 0 },
  stricte: { affluence: 1, dispute: 0.4, attire: {}, refus: { groupe: 0.5, touriste: 0.2 }, qualite: { habitue: 0.03, affaires: 0.04 }, cout: 80 },
};
/** Un client refusé à la porte : son segment le prend un peu mal (avant SATISFACTION_PAR_CLIENT). */
export const REFUS_SATISFACTION = 0.15;

export type IdPriorite = 'arrivee' | 'habitues' | 'presses';
/** Le segment servi en priorité se sent reconnu : qualité ressentie en plus. */
export const PRIORITE_QUALITE: Record<IdPriorite, Partial<Record<Segment, number>>> = {
  arrivee: {},
  habitues: { habitue: 0.04 },
  presses: { affaires: 0.04 },
};
