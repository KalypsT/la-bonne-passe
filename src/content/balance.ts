// Valeurs d'équilibrage du jeu, regroupées ici pour pouvoir les ajuster facilement.

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
/** Jour de la première mensualité. */
export const JOUR_PREMIERE_MENSUALITE = 28;

// ——— Clientèle ———

/** Arrivées par heure d'ouverture : BASE + réputation / 100 × BONUS_REPUTATION, puis × affluence de l'offre. */
export const ARRIVEES_PAR_HEURE_BASE = 1;
export const ARRIVEES_BONUS_REPUTATION = 3.2;
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
/** Rendez-vous maximum par personne et par soir (règle non réglable avant le palier 1). */
export const RDV_MAX_PAR_SOIR = 4;

/** Effets sur la réputation. */
export const REPUTATION_PAR_RDV = 8; // × (qualité − 0,4)
export const REPUTATION_CLIENT_PERDU = 0.2;
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
export const MORAL_REMONTEE = 0.3; // par heure, sous 70

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
