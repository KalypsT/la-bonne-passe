// Valeurs par défaut et règles de saisie d'une nouvelle partie.

export type Genre = 'patronne' | 'patron';

export const PARTIE_PAR_DEFAUT = {
  prenom: 'Anouk',
  avatar: 'patronne-1',
  tenue: 0,
  genre: 'patronne' as Genre,
  nomMaison: 'La bonne passe',
  ville: 'Amsterdam',
};

/** Longueurs maximales, pour que tout tienne sur l'enseigne et dans les cartes. */
export const LIMITES_NOMS = {
  prenom: 16,
  maison: 22,
};
