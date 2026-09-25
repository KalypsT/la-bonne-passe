import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  HEURE_BRIEFING,
  HEURE_DEBUT_JOURNEE,
  PROPRETE_CHAMBRE_OUVERTE,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
} from '../content/balance';
import { CHAMBRES } from '../content/maison';
import { soireeDeDepart } from '../engine/etat';
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
  // v2 → v3 : ajout de la variante de tenue de l'avatar.
  2: (d) => ({
    ...d,
    version: 3,
    joueur: { ...(estObjet(d.joueur) ? d.joueur : {}), tenue: 0 },
  }),
  // v3 → v4 : horloge avec briefing, réputation, chambres, palier et systèmes.
  // Le jour change désormais à 5 h et non plus à minuit.
  3: ({ paliers: _paliers, ...d }) => {
    const minute = typeof d.minuteDuJour === 'number' ? d.minuteDuJour : HEURE_BRIEFING;
    const jourBrut = typeof d.jour === 'number' ? d.jour : 1;
    const jour = minute < HEURE_DEBUT_JOURNEE && jourBrut > 1 ? jourBrut - 1 : jourBrut;
    // Une partie sauvegardée après 19 h est considérée comme briefée ; à 19 h pile, le briefing reste à faire.
    const briefe = minute !== HEURE_BRIEFING && (minute > HEURE_BRIEFING || minute < HEURE_DEBUT_JOURNEE);
    return {
      ...d,
      version: 4,
      jour,
      palier: 0,
      systemes: {
        personnel: true,
        finances: true,
        clientele: false,
        relations: false,
        recrutement: false,
        renovation: false,
        bar: false,
      },
      reputation: REPUTATION_INITIALE,
      briefingJour: briefe ? jour : jour - 1,
      chambres: CHAMBRES.map((c) => ({
        id: c.id,
        ouverte: c.ouverteAuDepart,
        proprete: c.ouverteAuDepart ? PROPRETE_CHAMBRE_OUVERTE : 0,
        etat: c.ouverteAuDepart ? ETAT_CHAMBRE_OUVERTE : ETAT_CHAMBRE_FERMEE,
      })),
    };
  },
  // v4 → v5 : Sanne, l'équipe de ménage, le linge, l'offre du soir et la vie de la soirée.
  // Une partie sauvegardée en pleine soirée reprend avec un quai vide.
  4: (d) => ({
    ...d,
    ...soireeDeDepart(),
    version: 5,
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
    typeof joueur.tenue === 'number' &&
    (joueur.genre === 'patronne' || joueur.genre === 'patron') &&
    estObjet(maison) &&
    typeof maison.nom === 'string' &&
    typeof d.chapitre === 'number' &&
    typeof d.tresorerie === 'number' &&
    typeof d.jour === 'number' &&
    typeof d.minuteDuJour === 'number' &&
    typeof d.hasard === 'number' &&
    typeof d.palier === 'number' &&
    typeof d.reputation === 'number' &&
    typeof d.briefingJour === 'number' &&
    Array.isArray(d.chambres) &&
    Array.isArray(d.personnel) &&
    Array.isArray(d.file) &&
    Array.isArray(d.rendezVous) &&
    typeof d.linge === 'number' &&
    estObjet(d.systemes)
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
