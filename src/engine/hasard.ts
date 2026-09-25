// Générateur pseudo-aléatoire à graine fixe (mulberry32).
// L'état du générateur vit dans l'état du jeu : une partie se rejoue à l'identique.

/** Renvoie un nombre dans [0, 1) et le nouvel état du générateur. */
export function tirer(etat: number): { valeur: number; etat: number } {
  const suivant = (etat + 0x6d2b79f5) | 0;
  let t = suivant;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const valeur = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { valeur, etat: suivant };
}
