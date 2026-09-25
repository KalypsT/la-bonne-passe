// Valeurs par défaut d'une nouvelle partie (avant l'écran de création du personnage).

export type Genre = 'patronne' | 'patron';

export const PARTIE_PAR_DEFAUT = {
  prenom: 'Anouk',
  avatar: 'patronne-1',
  genre: 'patronne' as Genre,
  nomMaison: 'La bonne passe',
  ville: 'Amsterdam',
};
