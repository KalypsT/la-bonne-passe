// Accès protégé au localStorage : il peut être absent ou bloqué (navigation privée, stockage plein).

/** Sous-ensemble de l'API Storage, remplaçable par une version en mémoire dans les tests. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/** Le localStorage du navigateur, ou null s'il est inaccessible. */
function localStorageOuNull(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Stockage du navigateur dont aucun accès ne lève d'exception. */
export const stockageNavigateur: Stockage = {
  getItem(cle) {
    try {
      return localStorageOuNull()?.getItem(cle) ?? null;
    } catch {
      return null;
    }
  },
  setItem(cle, valeur) {
    try {
      localStorageOuNull()?.setItem(cle, valeur);
    } catch {
      // Stockage plein ou bloqué : la partie continue sans sauvegarde.
    }
  },
  removeItem(cle) {
    try {
      localStorageOuNull()?.removeItem(cle);
    } catch {
      // Ignoré.
    }
  },
};

/** Stockage en mémoire, pour les tests. */
export function creerStockageMemoire(): Stockage & { donnees: Map<string, string> } {
  const donnees = new Map<string, string>();
  return {
    donnees,
    getItem: (cle) => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => void donnees.set(cle, valeur),
    removeItem: (cle) => void donnees.delete(cle),
  };
}
