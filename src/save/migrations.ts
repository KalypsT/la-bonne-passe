import { TRESORERIE_INITIALE } from '../content/balance';
import { PARTIE_PAR_DEFAUT } from '../content/partie';
import { VERSION_ETAT, type EtatJeu } from '../engine/etat';

type Donnees = Record<string, unknown>;

/**
 * MIGRATIONS[n] transforme une sauvegarde de version n en version n + 1.
 * Ne jamais modifier une migration existante : en ajouter une nouvelle.
 */
const MIGRATIONS: Record<number, (d: Donnees) => Donnees> = {
  // v1 → v2 : ajout du joueur, de la maison, du chapitre et de la trésorerie.
  1: (d) => ({
    ...d,
    version: 2,
    joueur: {
      prenom: PARTIE_PAR_DEFAUT.prenom,
      avatar: PARTIE_PAR_DEFAUT.avatar,
      genre: PARTIE_PAR_DEFAUT.genre,
    },
    maison: { nom: PARTIE_PAR_DEFAUT.nomMaison, ville: PARTIE_PAR_DEFAUT.ville },
    chapitre: 1,
    tresorerie: TRESORERIE_INITIALE,
  }),
};

function estObjet(v: unknown): v is Donnees {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Vérification minimale de la forme de l'état, pour écarter une sauvegarde abîmée. */
function estEtatValide(d: Donnees): boolean {
  const joueur = d.joueur;
  const maison = d.maison;
  return (
    d.version === VERSION_ETAT &&
    estObjet(joueur) &&
    typeof joueur.prenom === 'string' &&
    typeof joueur.avatar === 'string' &&
    estObjet(maison) &&
    typeof maison.nom === 'string' &&
    typeof d.chapitre === 'number' &&
    typeof d.tresorerie === 'number' &&
    typeof d.jour === 'number' &&
    typeof d.minuteDuJour === 'number' &&
    typeof d.hasard === 'number' &&
    estObjet(d.paliers)
  );
}

/**
 * Amène des données de sauvegarde, de n'importe quelle version connue, à la version courante.
 * Renvoie null si les données sont illisibles ou d'une version future.
 */
export function migrer(brut: unknown): EtatJeu | null {
  if (!estObjet(brut) || typeof brut.version !== 'number') return null;
  let donnees = brut;
  while (typeof donnees.version === 'number' && donnees.version < VERSION_ETAT) {
    const etape = MIGRATIONS[donnees.version];
    if (!etape) return null;
    donnees = etape(donnees);
  }
  return estEtatValide(donnees) ? (donnees as unknown as EtatJeu) : null;
}
