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
