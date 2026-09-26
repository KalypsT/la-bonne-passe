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
/**
 * Durée réelle de la soirée, de l'ouverture à la fermeture (6 minutes jusqu'en v0.4 : trop long au téléphone).
 * Tout ce que le joueur doit faire à temps pendant la soirée (délais des alertes, dispute, client pressé) est compté
 * en minutes de jeu : si cette durée change, ces délais changent en proportion inverse, pour garder le même temps
 * de réaction réel (environ 15 à 22 secondes à ×1). Voir le test « rythme en temps réel » dans tick.test.ts.
 */
export const SECONDES_REELLES_SOIREE = 180;
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
export const ARRIVEES_BONUS_REPUTATION = 1.5;
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
export const REPUTATION_FREIN = 3.5;
export const REPUTATION_CLIENT_PERDU = 0.1;
export const REPUTATION_FILE_PLEINE = 0;

/** Poids de la qualité d'un rendez-vous (0 à 1). */
export const QUALITE = {
  talent: 0.45,
  proprete: 0.2,
  etat: 0.15,
  linge: 0.12,
  premium: 0.06,
  malusFatigue: 0.15,
};
/** Budgets des clients (src/content/clientele.ts) multipliés : le levier général des recettes. */
export const BUDGET_CLIENTS = 0.8;
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

export const SALAIRE_MENAGE = 110; // par jour et par personne, à midi
export const HEURE_SALAIRES = 12 * 60;
export const CHARGES_FIXES = 1150; // chaque lundi
/** Dispute sur le quai : chance par heure et par client en file au-delà du premier. */
export const DISPUTE_CHANCE_PAR_HEURE = 0.05;
export const DISPUTE_DELAI = 80; // minutes de jeu avant que ça dégénère (30 s réelles à ×1)
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
  teteDAfficheHabitues: 1.3, // poids des habitués dans les arrivées, si une Tête d'affiche est en service
  juristeRemise: 0.5, // amendes et arrangements multipliés, si une personne Juriste est dans l'équipe
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
export const IMPREVU_CHANCE_PAR_HEURE = 0.5;
export const IMPREVUS_MAX_PAR_NUIT = 3;
export const IMPREVU_ECART_MIN = 75; // minutes entre deux imprévus
export const IMPREVU_PREMIER_APRES = 30; // minutes après l'ouverture, au plus tôt
/**
 * Force des effets de réputation et de satisfaction écrits sur les imprévus. Avec 24 cartes et environ
 * 45 imprévus par mois, des effets pleins faisaient grimper la réputation de 12 points en un mois.
 */
export const IMPREVU_FORCE_SATISFACTION = 0.5;
/** Un imprévu vu ne revient pas avant tant de nuits (sauf s'il n'y a rien d'autre à tirer). */
export const IMPREVU_REPOS_NUITS = 8;
/** Poids d'un imprévu jamais vu, et facteur quand les circonstances le favorisent (tendance, thème, règle). */
export const IMPREVU_POIDS_NOUVEAU = 3;
export const IMPREVU_POIDS_BONUS = 3;

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
export const ELASTICITE_PRIX = { touriste: 2, habitue: 0.8, affaires: 0.2, groupe: 1.3 };
/** Demande minimale d'un segment, quel que soit le tarif. */
export const DEMANDE_PRIX_MIN = 0.2;
/** Le tarif se sent aussi dans l'avis : qualité ressentie − élasticité × écart × ce facteur. */
export const PRIX_RESSENTI = 0.8;
/** À ce prix-là, on attend : patience sur le quai × (1 − écart × ce facteur). */
export const PATIENCE_TARIF = 1;

export type IdFormule = 'court' | 'standard' | 'complete' | 'champagne';
export interface ReglageFormule {
  /** Durée, prix, fatigue, usure du moral et salissure, en multiplicateurs. */
  duree: number;
  prix: number;
  /** Ce que compte le rendez-vous dans le maximum par personne et par soir. */
  charge: number;
  /** Écart de prix ressenti, ajouté à celui du tarif : il agit sur la demande, l'avis et la patience. */
  prixRessenti: number;
  /** Arrivées multipliées, et poids de certains segments : les pressés fuient les longues soirées. */
  affluence: number;
  attire: Partial<Record<Segment, number>>;
  fatigue: number;
  salissure: number;
  /** Qualité ressentie selon le segment. */
  qualite: Partial<Record<Segment, number>>;
}
export const FORMULES: Record<IdFormule, ReglageFormule> = {
  court: { duree: 0.6, prix: 0.6, charge: 0.75, prixRessenti: 0, affluence: 1.1, attire: { affaires: 1.4 }, fatigue: 0.7, salissure: 0.7, qualite: { affaires: 0.06, touriste: -0.03, habitue: -0.08 } },
  standard: { duree: 1, prix: 1, charge: 1, prixRessenti: 0, affluence: 1, attire: {}, fatigue: 1, salissure: 1, qualite: {} },
  /** Rendez-vous classique avec une bouteille du bar (bar ouvert et servi). */
  champagne: { duree: 1.1, prix: 1.25, charge: 1, prixRessenti: 0.15, affluence: 1, attire: { affaires: 1.2, groupe: 1.2 }, fatigue: 1.3, salissure: 1, qualite: { affaires: 0.05, groupe: 0.05, touriste: -0.06, habitue: -0.06 } },
  complete: { duree: 1.5, prix: 1.85, charge: 1.5, prixRessenti: 0.05, affluence: 0.8, attire: { affaires: 0.4, habitue: 1.3 }, fatigue: 1.4, salissure: 1.2, qualite: { habitue: 0.1, touriste: 0.06, groupe: 0.03, affaires: -0.1 } },
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

// ——— Bar et équipe Bar (v0.3, palier 2) ———

/** Rouvrir le bar, sous ses draps depuis des années. */
export const RENOVATION_BAR = { prix: 1200, heures: 8 };
/** Bouteilles trouvées à la cave le jour de la réouverture. */
export const BAR_STOCK_REOUVERTURE = 20;
/** Équipe Bar : salaire par jour et par personne, à midi, et effectif maximal. */
export const SALAIRE_BAR = 130;
export const BAR_MAX = 2;
/** Commande au briefing, livrée à l'ouverture ; livraison express en soirée. Stock en bouteilles. */
export const COMMANDE_BAR = { bouteilles: 40, prix: 240 };
export const LIVRAISON_EXPRESS_BAR = { bouteilles: 20, prix: 200 };
/** Sous ce stock, le bar donne l'alerte. */
export const SEUIL_BAR = 6;
/** Chaque client reçu passe au bar : recette (en €, toute à la maison) et bouteilles bues, selon son segment. */
export const BAR_RECETTE: Record<Segment, number> = { touriste: 15, habitue: 11, affaires: 26, groupe: 33 };
export const BAR_CONSO: Record<Segment, number> = { touriste: 0.5, habitue: 0.4, affaires: 0.5, groupe: 1.2 };
/** Un bar qui sert : qualité ressentie en plus selon le segment ; la deuxième personne au bar ajoute BAR_DEUXIEME partout. */
export const BAR_QUALITE: Record<Segment, number> = { touriste: 0.03, habitue: 0.02, affaires: 0.02, groupe: 0.06 };
export const BAR_DEUXIEME = 0.02;
/** Un bar ouvert mais vide : les groupes surtout le prennent mal. */
export const BAR_VIDE_QUALITE: Partial<Record<Segment, number>> = { groupe: -0.06, touriste: -0.02 };
/** Sur le quai, on patiente mieux un verre à la main (minutes en plus). */
export const BAR_PATIENCE = 10;
/**
 * Avance fournisseur : le grossiste propose, le lendemain de la réouverture, du stock sans payer,
 * remboursé avec des intérêts au bout de quelques jours.
 */
/** Formule champagne : bouteilles prises au bar par rendez-vous. */
export const CHAMPAGNE_BOUTEILLES = 1;
export const AVANCE_FOURNISSEUR = { bouteilles: 250, valeur: 1500, taux: 0.1, jours: 14, heure: 11 * 60 };

// ——— La semaine : tendances et bilan du lundi (v0.3) ———

/** Chaque lundi, une tendance, et parfois une deuxième. */
export const TENDANCE_DEUXIEME_CHANCE = 0.4;
/**
 * Effets des tendances : la demande de chaque segment est multipliée (le volume des arrivées suit),
 * et certaines font monter le ton sur le quai. `segments` : ceux qui doivent être ouverts pour la tirer.
 */
export const TENDANCES_EFFETS: Record<string, { demande: Partial<Record<Segment, number>>; dispute?: number; segments: Segment[] }> = {
  congres: { demande: { affaires: 2.2 }, segments: ['affaires'] },
  match: { demande: { groupe: 2 }, dispute: 1.4, segments: ['groupe'] },
  hauteSaison: { demande: { touriste: 1.7 }, segments: ['touriste'] },
  greve: { demande: { touriste: 0.3, groupe: 0.4, affaires: 0.6, habitue: 0.8 }, segments: ['touriste', 'groupe'] },
  salon: { demande: { affaires: 1.5, touriste: 1.2 }, segments: ['affaires'] },
  pluie: { demande: { touriste: 0.6, groupe: 0.7, affaires: 0.8, habitue: 1.2 }, segments: ['habitue'] },
  paie: { demande: { habitue: 1.6 }, segments: ['habitue'] },
  evg: { demande: { groupe: 1.8, touriste: 1.1 }, dispute: 1.3, segments: ['groupe'] },
  controles: { demande: { touriste: 0.5, habitue: 0.5, affaires: 0.4, groupe: 0.5 }, segments: ['affaires'] },
};
/** Projection du bilan du lundi : sur combien de semaines. */
export const SEMAINES_PROJETEES = 4;

// ——— Soirées à thème (v0.3, palier 2, au premier lundi) ———

export interface ReglageTheme {
  /** Prix de la soirée (décor, musiciens, costumes), payé au briefing. */
  cout: number;
  /** Supplément payé par chaque client ce soir-là (droit d'entrée, costume) : prix multiplié. */
  prix: number;
  /** Arrivées multipliées. */
  affluence: number;
  /** Poids de certains segments dans les arrivées. */
  attire: Partial<Record<Segment, number>>;
  /** Qualité ressentie selon le segment. */
  qualite: Partial<Record<Segment, number>>;
  /** Fatigue par rendez-vous multipliée. */
  fatigue: number;
  /** Chance de dispute multipliée. */
  dispute: number;
  /** Recette et consommation du bar multipliées. */
  bar: number;
  /** Minutes de patience en plus sur le quai : on attend volontiers en profitant du spectacle. */
  patience: number;
  /** Bouche-à-oreille : gains de satisfaction de la soirée multipliés. */
  bouche: number;
}

export const THEMES: Record<string, ReglageTheme> = {
  masquee: {
    cout: 80,
    prix: 1.1,
    affluence: 1.05,
    attire: { affaires: 1.8, habitue: 1.2 },
    qualite: { affaires: 0.2, habitue: 0.04, touriste: 0.02 },
    fatigue: 1,
    dispute: 0.9,
    bar: 1.1,
    patience: 0,
    bouche: 1,
  },
  burlesque: {
    cout: 100,
    prix: 1.15,
    affluence: 1.2,
    attire: { touriste: 1.5, groupe: 1.5 },
    qualite: { groupe: 0.15, touriste: 0.12, habitue: -0.03 },
    fatigue: 1.2,
    dispute: 1,
    bar: 1.3,
    patience: 20,
    bouche: 3,
  },
  jazz: {
    cout: 60,
    prix: 1.1,
    affluence: 1,
    attire: { habitue: 1.6, touriste: 1.1 },
    qualite: { habitue: 0.2, affaires: 0.03, touriste: 0.02 },
    fatigue: 0.85,
    dispute: 0.7,
    bar: 1,
    patience: 10,
    bouche: 1,
  },
  anneesFolles: {
    cout: 130,
    prix: 1.15,
    affluence: 1.15,
    attire: { groupe: 1.3, touriste: 1.2, affaires: 1.2 },
    qualite: { groupe: 0.07, touriste: 0.06, affaires: 0.05, habitue: 0.02 },
    fatigue: 1.3,
    dispute: 1.1,
    bar: 1.8,
    patience: 15,
    bouche: 1,
  },
};
/** Un même thème répété dans la semaine lasse : ses effets sont multipliés par ce facteur à chaque reprise. */
export const THEME_LASSITUDE = 0.5;

// ——— v0.4 : intrigues et quartier ———

/** Intrigues : chaînes de cartes sur plusieurs jours. Au plus tant d'intrigues à la fois (les suites courtes ne comptent pas). */
export const INTRIGUES_MAX_ACTIVES = 2;
/** Jours de calme, au moins, entre la fin d'une intrigue et le début d'une autre. */
export const INTRIGUES_ECART_JOURS = 2;

/**
 * Tapage du quartier, de 0 à 100 : les groupes sur le quai et dans les chambres, la porte laxiste, les thèmes bruyants, les disputes.
 * Il retombe chaque matin. Au-dessus du seuil de plainte, le voisin du dessus descend.
 */
export const TAPAGE = {
  /** Par client d'un groupe présent (quai ou chambre), par heure d'ouverture. */
  parGroupeParHeure: 2,
  /** Par client d'un autre segment présent, par heure : un fond sonore. */
  parClientParHeure: 0.3,
  /** Selon la sélection à l'entrée. */
  selection: { laxiste: 1.4, normale: 1, stricte: 0.6 } as Record<string, number>,
  /** Selon le thème de la soirée. */
  themes: { burlesque: 1.5, anneesFolles: 1.3, jazz: 0.6, masquee: 0.9 } as Record<string, number>,
  /** Une dispute qui dégénère sur le quai. */
  dispute: 8,
  /** Chaque matin, le tapage est multiplié par ce facteur. */
  decroissance: 0.6,
  /** Une maison insonorisée ne laisse passer que cette part du bruit. */
  insonorise: 0.5,
  /** Le voisin du dessus se plaint une première fois. */
  plainte: 45,
  /** Le voisin revient si le tapage reste au-dessus de ce seuil. */
  recidive: 25,
};

/** L'intrigue du voisin du dessus : ce que coûtent les issues. */
export const VOISIN = {
  bouteille: 40,
  insonorisation: 900,
  arrangement: 350,
  amende: 800,
};

/** Suite de l'imprévu du client généreux : le pourboire, s'il revient et que tout se passe bien. */
export const COSTUME_POURBOIRE = 120;

/** Arc de Mila, « La tête d'affiche » : ce que coûtent les choix. */
export const ARC_MILA = {
  /** Au plus tôt, après tant de nuits travaillées (période d'essai finie). */
  nuits: 5,
  affiche: 120,
  prime: 200,
  /** Part qu'elle réclame. */
  part: 0.55,
};

/** Arc de Jonas, « Les examens » : ce que coûtent les choix. */
export const ARC_JONAS = {
  /** Plus tard que Mila : les deux arcs ne prennent pas ensemble les deux places d'intrigue, et le mois reste rythmé. */
  nuits: 14,
  inscription: 600,
  champagne: 60,
  reinscription: 300,
  /** Moral qu'il lui faut, le jour des résultats, pour réussir. */
  moralReussite: 45,
  /** Points de préparation qu'il lui faut (réviser au calme : 2, au salon : 1 ; inscription payée : 2, à moitié : 1). */
  preparation: 3,
};

/** Imprévus : une candidate ou un candidat remarquable se présente (talents hauts, part exigée). */
export const CANDIDAT_VEDETTE = { talentFort: 5, talentSecond: 4, partMin: 0.6 };

/** Imprévus de la v0.4 : les sommes en jeu (les effets sur le moral et la satisfaction sont écrits dans les cartes). */
export const IMPREVU_ARGENT = {
  inspectionAmende: 150,
  inspectionNormes: 150,
  evgCommission: 60,
  reparateur: 60,
  critiqueChampagne: 60,
  anniversaireChampagne: 45,
  privatisation: 500,
  privatisationNegociee: 800,
  remboursementSupplement: 60,
  cachetJazz: 80,
  caveNegociant: 150,
  caveNegociee: 100,
  caveBouteilles: 30,
  geste: 40,
  dedommagement: 50,
  veterinaire: 40,
  champagneEchevin: 30,
  // Suites
  afficheArticle: 60,
  bridgeTable: 120,
  galaTenue: 80,
};

/**
 * Alertes minutées de la soirée (v0.4) : une bulle, un délai, une ou deux actions, une conséquence si on l'ignore.
 * `chance` : probabilité par heure d'ouverture quand la condition est remplie ; `delai` : minutes de jeu pour réagir.
 * Les délais ont doublé en v0.5 quand la soirée est passée de 6 à 3 minutes : 40 à 60 minutes de jeu font toujours
 * 15 à 22 secondes réelles à ×1. Les durées de simulation (pause, patience gagnée) ne changent pas.
 */
export const ALERTES = {
  /** Client d'affaires sur le quai, à bout de patience : la bulle apparaît sous ce seuil (minutes). */
  presse: { seuilPatience: 30, patienceAutres: 5, verre: 10, patienceVerre: 20, satisfactionManquee: 3 },
  /** Groupe bruyant sur le quai, quand le quartier commence à s'agacer. */
  bruit: { seuilTapage: 25, chance: 0.8, delai: 60, rentrer: 1.5, groupe: 0.3, verre: 10, tapageVerre: 1, tapageManque: 8 },
  /** Client éméché au bar (bar qui sert) : ignoré, il déclenche une dispute. */
  ivre: { chance: 0.7, delai: 50, cafeReussite: 0.7, taxi: 20, tapageManque: 5 },
  /** Un client veut offrir une bouteille (bar qui sert) : une recette, si quelqu'un la sert à temps. */
  bouteille: { chance: 0.3, delai: 40, prix: 40 },
  /** Un photographe rôde sur le quai (palier 2, réputation assez haute, un client d'affaires présent). */
  photographe: { reputationMin: 30, chance: 0.5, delai: 50, billet: 20, satisfactionManquee: 3 },
  /** Un faux client envoyé par le Chat Noir fait un scandale sur le quai (v0.5, décidé le lundi par la rivale). */
  sabotage: { delai: 50, remboursement: 60, reussite: 0.6, reputation: 2, presse: -4, police: -3 },
  /** Une personne fatiguée demande une pause (`minutes` : durée de la pause, en temps de simulation). */
  pause: { fatigueMin: 50, chance: 0.9, delai: 60, minutes: 20, fatigue: 10, moral: 3, refus: 3, moralManque: 6, loyauteManque: 2 },
};

/** Défis de la semaine (v0.4) : les cibles. Elles visent environ une semaine sur deux réussie pour un joueur attentif. */
export const DEFIS = {
  congres: 12, // clients d'affaires reçus
  match: 3, // disputes sur le quai, au plus
  hauteSaison: 28, // touristes reçus
  evgBar: 2000, // recette du bar, en euros
  evgGroupes: 25, // clients des groupes reçus
  creuse: 55, // clients reçus malgré tout
  habitues: 5, // points de satisfaction gagnés chez les habitués
  attentive: 3, // alertes laissées filer, au plus
  bar: 1800, // recette du bar, en euros
  fidelite: 20, // part de clients perdus, au plus (%)
  affluence: 80, // clients reçus
  /** Un défi lié à une tendance de la semaine pèse tant de fois plus qu'un défi ordinaire au tirage. */
  poidsLie: 3,
}

/** Objectifs du mois (v0.4), évalués le jour de la mensualité. */
export const OBJECTIFS = {
  /** Premier mois : la réputation à atteindre. */
  reputationMois1: 42,
  /** Mois suivants : réputation actuelle + tant (plafonnée à 90). */
  reputationEnPlus: 8,
  /** Fidéliser la clientèle principale (le segment le plus reçu ces dernières nuits) : sa satisfaction + tant (plafonnée à 90). */
  satisfactionEnPlus: 8,
  /** Avoir (trésorerie et réserve) à garder après la mensualité. */
  avoir: 3000,
  /** Récompense d'un objectif atteint. */
  recompenseReputation: 2,
  recompenseMoral: 4,
};

// ——— v0.5 : relations avec le quartier (palier 3) ———

/**
 * Relations avec les acteurs du quartier : une jauge de −100 à +100 chacun.
 * En bons termes (au-dessus de `bons`), l'acteur rend des services ; en mauvais termes (sous `mauvais`), il crée des ennuis.
 */
export const RELATIONS = {
  /** Valeurs de départ : Josée a laissé de bons souvenirs à la mairie, et le quartier la connaît. */
  depart: { voisins: 10, mairie: 10, presse: 0, police: 5 } as Record<string, number>,
  bons: 40,
  mauvais: -40,
  /**
   * Chaque matin, une jauge revient un peu vers son point d'équilibre (sa valeur de départ ; pour la presse, selon la
   * réputation) : on oublie les faveurs comme les rancunes. Les voisins, eux, jugent la nuit passée (voir `voisins`).
   */
  retour: 0.02,
  /**
   * Les voisins lisent le tapage de la nuit (0 à 100), avant qu'il ne retombe : la jauge bouge de (neutre − tapage) × pente.
   * Une nuit plus calme que `neutre` les apaise, sans dépasser le plafond (au-delà, il faut des gestes) ; une nuit plus
   * bruyante les agace. Mesures v0.5 : tapage moyen de 34 en classique, 43 porte laxiste, 17 porte stricte, 24 en feutrée.
   */
  voisins: { neutre: 30, pente: 0.15, plafondCalme: 30 },
  /** Une nuit très bruyante : les voisins appellent la police. */
  police: { tapageAppel: 50, perte: 1 },
  /** Voisins en mauvais termes : leurs plaintes arrivent à la mairie, chaque matin. */
  mairie: { plaintesVoisins: 0.5 },
  /** La presse suit la réputation : elle revient vers (réputation − neutre) × pente plutôt que vers sa valeur de départ. */
  presse: { reputationNeutre: 35, pente: 0.6 },
  /** Une dispute qui dégénère sur le quai. */
  dispute: { police: -3, voisins: -2 },
  /** Un photographe laissé filer : la photo d'un client finit dans un journal. */
  photographeManque: { presse: -3 },
  /** Le groupe bruyant laissé sur le quai. */
  bruitManque: { voisins: -2 },
  /** Événements du quartier : chaque matin, en bons ou en mauvais termes, cette chance d'une carte, puis tant de jours de répit. */
  evenementChance: 0.35,
  evenementRepit: 7,
  /** Une action de relation par acteur et par semaine. */
  actionRepit: 7,
  /** En bons termes avec les voisins, ils tolèrent : le tapage monte moins vite. */
  voisinsTolerants: 0.8,
  /** Bonne ou mauvaise presse : la demande des touristes varie jusqu'à ± ce facteur (à ±100). */
  presseTouristes: 0.15,
  /** Un contrôle de police devant la porte : les arrivées de la soirée sont multipliées par ce facteur. */
  controleAffluence: 0.6,
  /** Ce que les voisins gardent de l'intrigue du voisin du dessus, selon son dénouement (sauvegardes d'avant la v0.5). */
  souvenirDuVoisin: { apaise: 8, invite: 15, insonorise: 10, rire: 5, arrangement: 0, bluff: -5, condamne: -20 } as Record<string, number>,
};

/** Actions de relations, dans l'onglet Relations : coût, gain, et parfois un risque. Textes dans src/content/relations.ts. */
export const ACTIONS_RELATIONS: Record<
  string,
  { acteur: string; cout: number; gain: number; autres?: Record<string, number>; risque?: { chance: number; effet: Record<string, number>; reputation?: number } }
> = {
  bouteilleVoisins: { acteur: 'voisins', cout: 40, gain: 6 },
  associationQuartier: { acteur: 'voisins', cout: 250, gain: 14, autres: { presse: 2 } },
  dejeunerEchevin: { acteur: 'mairie', cout: 120, gain: 8, risque: { chance: 0.2, effet: { mairie: -8, presse: -3 } } },
  festivalCanal: { acteur: 'mairie', cout: 450, gain: 16, autres: { voisins: 4 } },
  panierRedacteur: { acteur: 'presse', cout: 90, gain: 5 },
  soireePresse: { acteur: 'presse', cout: 200, gain: 10, risque: { chance: 0.25, effet: { presse: -14 }, reputation: -0.5 } },
  cafeCommissariat: { acteur: 'police', cout: 30, gain: 4 },
  tournoiPolice: { acteur: 'police', cout: 220, gain: 12, autres: { voisins: 2 } },
};

/** Les sommes en jeu dans les événements du quartier (v0.5). */
export const QUARTIER_ARGENT = {
  feteVoisins: 60,
  petitionRencontre: 150,
  normesPreventives: 100,
  inspectionAmende: 250,
  inspectionNormes: 200,
  inspectionAvocat: 150,
  fuiteAvocat: 300,
  portierSoir: 80,
  controleAvocat: 200,
};

// ——— v0.5 : la maison rivale, le Chat Noir (palier 3) ———

/**
 * Le Chat Noir, la maison chic qui débauche. Chaque lundi (à partir du premier lundi après le palier 3), son agressivité
 * se rapproche d'une cible qui dit combien la maison lui fait de l'ombre, puis elle agit peut-être.
 * Cible : (réputation − reputationNeutre) × parReputation + part des habitués et des clients d'affaires reçus
 * ces dernières nuits (0 à 1) × parClientele, bornée entre 0 et 100.
 */
export const RIVALE = {
  agressiviteDepart: 30,
  relationDepart: 0,
  reputationNeutre: 30,
  parReputation: 2,
  parClientele: 60,
  /** Part du chemin vers la cible parcourue chaque lundi. */
  rapprochement: 0.5,
  /** Chance d’agir un lundi : agressivité / 100 × ce facteur (certaine à partir de 84). */
  chanceAction: 1.2,
  /** Poids de chaque action au tirage, et agressivité minimale pour qu'elle soit possible. */
  actions: {
    prix: { poids: 3, min: 0 },
    rumeur: { poids: 3, min: 20 },
    sabotage: { poids: 2, min: 50 },
    debauchage: { poids: 2, min: 40 },
  } as Record<string, { poids: number; min: number }>,
  /** Au moins tant de jours entre deux tentatives de débauchage. */
  debauchageRepit: 28,
  /** Relation assez bonne : au lieu d'agir, elle propose parfois un échange de bons procédés. */
  allianceRelation: 40,
  allianceChance: 0.5,
  /** Baisse de prix : demande des habitués et des clients d'affaires multipliée jusqu'au lundi suivant. */
  prixConcurrence: 0.8,
  /** La même semaine, si la maison offre une coupe à ses habitués. */
  prixAttenue: 0.95,
  /** Faux client : chance par heure d'ouverture qu'il se présente, une fois le sabotage décidé. */
  sabotageChanceParHeure: 0.6,
  /** Débauchage : sous ce moral ou cette loyauté, la personne reçoit une offre ferme. */
  moralFragile: 45,
  loyauteFragile: 50,
  /** Réponses du joueur, une par semaine. */
  reponseRepit: 7,
  rumeur: { cout: 80, reussite: 0.55, concurrence: 1.1 },
  treve: { cout: 200, jours: 14, chanceBase: 0.3, chanceRelation: 0.6 },
  debaucher: { relation: -15, agressivite: 15 },
};

/** Les sommes en jeu dans les cartes du Chat Noir. */
export const RIVALE_ARGENT = {
  fleurs: 40,
  coupeHabitues: 150,
  dementi: 100,
  primeDiscrete: 150,
  contreOffre: 300,
};

// ——— v0.5 : équipes Accueil et Sécurité, assurance (palier 3) ———

/**
 * Équipes Accueil et Sécurité (palier 3), au niveau 1 (les formations viendront au palier 4).
 * Chaque personne règle seule une part des alertes de son domaine, dès leur apparition : de l'argent contre de l'attention.
 */
export const EQUIPES = {
  accueil: {
    salaire: 100,
    max: 2,
    /** Minutes de patience en plus sur le quai, par personne à l'accueil. */
    patience: 12,
    /** Part des alertes « client pressé » et « bruit sur le quai » réglées seules, par personne. */
    regle: 0.3,
  },
  securite: {
    salaire: 130,
    max: 2,
    /** Chance de dispute multipliée par (1 − ce facteur × effectif). */
    dispute: 0.2,
    /** Qualité ressentie en plus pour les clients d'affaires (la discrétion), par personne. */
    qualiteAffaires: 0.02,
    /** Part des alertes « client éméché », « photographe » et « faux client » réglées seules, et des disputes, par personne. */
    regle: 0.3,
    /** Avec la sécurité, la sélection stricte ne demande plus de portier payé à la soirée. */
    portierInclus: true,
  },
};

/** Assurance (palier 3, au premier lundi) : prime chaque lundi, part des sinistres remboursée. */
export const ASSURANCES = [
  { prime: 0, casse: 0, amendes: 0 },
  { prime: 80, casse: 0.7, amendes: 0 },
  { prime: 200, casse: 1, amendes: 1 },
] as const;
