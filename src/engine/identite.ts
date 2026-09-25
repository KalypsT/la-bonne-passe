import { MOTS_INTERDITS, RACINES_INTERDITES } from '../content/motsInterdits';
import { LIMITES_NOMS } from '../content/partie';

export type ErreurNom = 'vide' | 'long' | 'caracteres' | 'injurieux';

/** Lettres (accents compris), chiffres, espaces et ponctuation simple. */
const CARACTERES_AUTORISES = /^[\p{L}\p{N} '’\-&.!]+$/u;

/** Supprime les espaces en trop. */
export function nettoyerNom(texte: string): string {
  return texte.trim().replace(/\s+/g, ' ');
}

/** Minuscules, sans accents, avec les chiffres déguisés en lettres (« s4l0pe » → « salope »). */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[0@4]/g, (c) => (c === '0' ? 'o' : 'a'))
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't');
}

export function estInjurieux(texte: string): boolean {
  const normal = normaliser(texte);
  const mots = normal.split(/[^a-z]+/).filter(Boolean);
  if (mots.some((mot) => MOTS_INTERDITS.includes(mot))) return true;
  // Lettres seules, pour déjouer les séparateurs : « s.a.l.o.p.e », « con nard ».
  const colle = mots.join('');
  return RACINES_INTERDITES.some((racine) => colle.includes(racine));
}

function validerNom(texte: string, longueurMax: number): ErreurNom | null {
  const nom = nettoyerNom(texte);
  if (nom.length === 0) return 'vide';
  if (nom.length > longueurMax) return 'long';
  if (!CARACTERES_AUTORISES.test(nom)) return 'caracteres';
  if (estInjurieux(nom)) return 'injurieux';
  return null;
}

export function validerPrenom(texte: string): ErreurNom | null {
  return validerNom(texte, LIMITES_NOMS.prenom);
}

export function validerNomMaison(texte: string): ErreurNom | null {
  return validerNom(texte, LIMITES_NOMS.maison);
}
