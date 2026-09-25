// Accès protégé au localStorage : il peut être absent ou bloqué (navigation privée, stockage plein).

export function lire(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}

export function ecrire(cle: string, valeur: string): boolean {
  try {
    window.localStorage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}
