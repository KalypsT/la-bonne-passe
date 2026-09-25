// Filtre de l'enseigne et du prénom. Les mots sont écrits sans accents, en minuscules.

/** Refusés s'ils apparaissent comme mot entier (« cul » bloqué, « culture » accepté). */
export const MOTS_INTERDITS = [
  'con', 'cons', 'conne', 'connes', 'pute', 'putes', 'putain', 'merde', 'salaud', 'salauds',
  'batard', 'batards', 'pd', 'pede', 'pedes', 'tapette', 'gouine', 'negre', 'negro', 'bougnoule',
  'youpin', 'bite', 'bites', 'couille', 'couilles', 'chatte', 'foutre', 'cul', 'fdp', 'ntm', 'nique',
  'niquer', 'enfoire', 'trouduc', 'bitch', 'shit', 'cunt', 'whore', 'slut', 'dick', 'cock', 'fag',
  'nazi', 'nazis', 'hitler', 'mineur', 'mineure', 'mineurs', 'mineures', 'gamine', 'gamines',
];

/** Refusés même collés à d'autres lettres (« lesconnards »). */
export const RACINES_INTERDITES = [
  'connard', 'connasse', 'salope', 'encule', 'enculer', 'branleur', 'pouffiasse', 'fuck', 'nigg',
  'faggot', 'pedo', 'negre', 'bougnoul', 'youpin', 'fillette', 'lolita', 'ecolier', 'collegienne',
];
