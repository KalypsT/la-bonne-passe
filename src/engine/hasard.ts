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

/** Tirages successifs à partir d'une graine ; `etat()` donne la graine à ranger dans l'état du jeu. */
export interface Tirage {
  /** Nombre dans [0, 1). */
  suivant(): number;
  /** Nombre dans [min, max). */
  entre(min: number, max: number): number;
  /** Vrai avec la probabilité donnée. */
  chance(probabilite: number): boolean;
  /** Un élément au hasard, selon des poids facultatifs. */
  choisir<T>(liste: readonly T[], poids?: readonly number[]): T;
  etat(): number;
}

export function creerTirage(graine: number): Tirage {
  let courant = graine;
  const suivant = () => {
    const r = tirer(courant);
    courant = r.etat;
    return r.valeur;
  };
  return {
    suivant,
    entre: (min, max) => min + suivant() * (max - min),
    chance: (probabilite) => suivant() < probabilite,
    choisir(liste, poids) {
      if (liste.length === 0) throw new Error('Liste vide');
      const p = poids ?? liste.map(() => 1);
      const total = p.reduce((a, b) => a + b, 0);
      let reste = suivant() * total;
      for (let i = 0; i < liste.length; i++) {
        reste -= p[i] ?? 0;
        if (reste < 0) return liste[i]!;
      }
      return liste[liste.length - 1]!;
    },
    etat: () => courant,
  };
}
