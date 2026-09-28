// Échanges de fichiers avec l'appareil : export d'une partie, import, actualisation du jeu.

/** Fait télécharger un fichier texte à l'appareil. Faux si le navigateur a refusé. */
export function telecharger(nom: string, texte: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nom;
    lien.style.display = 'none';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    // Firefox lit le fichier après le clic : libérer l'adresse un peu plus tard.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ouvre le sélecteur de fichiers de l'appareil et renvoie le texte du fichier choisi.
 * Sans filtre de type : certains téléphones grisent les .json quand on en met un.
 */
export function choisirFichier(): Promise<string | null> {
  return new Promise((resoudre) => {
    try {
      const champ = document.createElement('input');
      champ.type = 'file';
      champ.style.display = 'none';
      document.body.appendChild(champ);
      const fin = (texte: string | null) => {
        champ.remove();
        resoudre(texte);
      };
      champ.addEventListener('change', () => {
        const fichier = champ.files?.[0];
        if (!fichier) return fin(null);
        fichier.text().then(fin, () => fin(null));
      });
      champ.addEventListener('cancel', () => fin(null));
      champ.click();
    } catch {
      resoudre(null);
    }
  });
}

/**
 * Recharge la page en allant chercher la dernière version publiée : le service worker vérifie d'abord
 * s'il a changé, puis le rechargement redemande la page au réseau (le cache ne sert que hors ligne).
 */
export async function actualiserJeu(): Promise<void> {
  try {
    const inscriptions = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(inscriptions.map((inscription) => inscription.update().catch(() => undefined)));
  } catch {
    // Pas de service worker (ou hors ligne) : le simple rechargement suffit.
  }
  window.location.reload();
}
