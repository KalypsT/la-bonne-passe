import type { EtatJeu } from '../engine/etat';
import { migrer } from './migrations';
import { stockageNavigateur, type Stockage } from './stockage';

export const NOMBRE_EMPLACEMENTS = 3;

const PREFIXE = 'la-bonne-passe';
const cleSauvegarde = (emplacement: number) => `${PREFIXE}:partie:${emplacement}`;
/** Dernière sauvegarde relue et reconnue valide, reprise si la principale ne se charge plus. */
const cleSecours = (emplacement: number) => `${PREFIXE}:partie:${emplacement}:secours`;
const CLE_INDEX = `${PREFIXE}:index`;

/** Résumé léger d'une partie, pour l'écran titre, sans charger la sauvegarde complète. */
export interface ResumePartie {
  avatar: string;
  /** Absente des index écrits avant la version 3 : prendre 0. */
  tenue?: number;
  prenom: string;
  nomMaison: string;
  chapitre: number;
  jour: number;
  minuteDuJour: number;
  tresorerie: number;
  /** Date de dernière partie, en millisecondes depuis 1970. */
  dernierePartie: number;
  /** Jour de la faillite, si la partie s'est finie ainsi (v0.6). */
  faillite?: number;
  /** Le chapitre en cours est bouclé (v1.0). */
  chapitreFini?: boolean;
}

export type Emplacement =
  | { statut: 'vide' }
  | { statut: 'partie'; resume: ResumePartie }
  | { statut: 'illisible' };

type Index = Record<string, ResumePartie>;

export function resumer(etat: EtatJeu, dernierePartie: number): ResumePartie {
  return {
    avatar: etat.joueur.avatar,
    tenue: etat.joueur.tenue,
    prenom: etat.joueur.prenom,
    nomMaison: etat.maison.nom,
    chapitre: etat.chapitre,
    jour: etat.jour,
    minuteDuJour: etat.minuteDuJour,
    tresorerie: etat.tresorerie,
    dernierePartie,
    ...(etat.finDePartie ? { faillite: etat.finDePartie.jour } : {}),
    ...(etat.finChapitre ? { chapitreFini: true } : {}),
  };
}

function lireJson(stockage: Stockage, cle: string): unknown {
  const texte = stockage.getItem(cle);
  if (texte === null) return null;
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return null;
  }
}

function lireIndex(stockage: Stockage): Index {
  const index = lireJson(stockage, CLE_INDEX);
  return typeof index === 'object' && index !== null ? (index as Index) : {};
}

function ecrireIndex(stockage: Stockage, index: Index): void {
  stockage.setItem(CLE_INDEX, JSON.stringify(index));
}

/** Enveloppe écrite dans le stockage. `ecriture` compte les écritures, pour repérer celles d'un autre onglet. */
interface Enveloppe {
  version?: unknown;
  etat?: unknown;
  ecriture?: unknown;
}

function lireEnveloppe(stockage: Stockage, cle: string): Enveloppe | null {
  const brut = lireJson(stockage, cle);
  return typeof brut === 'object' && brut !== null ? (brut as Enveloppe) : null;
}

function chargerCle(stockage: Stockage, cle: string): EtatJeu | null {
  const enveloppe = lireEnveloppe(stockage, cle);
  return enveloppe ? migrer(enveloppe.etat) : null;
}

/** Charge et migre la partie d'un emplacement, ou sa copie de secours. Null si vide ou illisible. */
export function charger(emplacement: number, stockage: Stockage = stockageNavigateur): EtatJeu | null {
  return chargerCle(stockage, cleSauvegarde(emplacement)) ?? chargerCle(stockage, cleSecours(emplacement));
}

/**
 * Numéro de la dernière écriture de cet emplacement (0 s'il est vide ou d'avant ce compteur).
 * Si ce numéro change sans que cet onglet ait écrit, un autre onglet a sauvegardé entre-temps.
 */
export function lireEcriture(emplacement: number, stockage: Stockage = stockageNavigateur): number {
  const ecriture = lireEnveloppe(stockage, cleSauvegarde(emplacement))?.ecriture;
  return typeof ecriture === 'number' && Number.isFinite(ecriture) ? ecriture : 0;
}

/**
 * Écrit la partie, puis la relit : si elle se recharge, elle devient aussi la copie de secours.
 * Une partie abîmée par un bogue n'écrase donc jamais la dernière copie saine.
 * Renvoie le numéro d'écriture désormais stocké (inchangé si l'écriture a échoué).
 */
export function sauvegarder(
  emplacement: number,
  etat: EtatJeu,
  maintenant: number,
  stockage: Stockage = stockageNavigateur,
): number {
  const cle = cleSauvegarde(emplacement);
  const texte = JSON.stringify({ version: etat.version, etat, ecriture: lireEcriture(emplacement, stockage) + 1 });
  stockage.setItem(cle, texte);
  if (stockage.getItem(cle) === texte && chargerCle(stockage, cle)) stockage.setItem(cleSecours(emplacement), texte);
  const index = lireIndex(stockage);
  index[emplacement] = resumer(etat, maintenant);
  ecrireIndex(stockage, index);
  return lireEcriture(emplacement, stockage);
}

export function supprimer(emplacement: number, stockage: Stockage = stockageNavigateur): void {
  stockage.removeItem(cleSauvegarde(emplacement));
  stockage.removeItem(cleSecours(emplacement));
  const index = lireIndex(stockage);
  delete index[emplacement];
  ecrireIndex(stockage, index);
}

/**
 * État des 3 emplacements. Les sauvegardes font foi ; l'index n'est qu'un cache,
 * reconstruit si une entrée manque.
 */
export function lireEmplacements(stockage: Stockage = stockageNavigateur): Emplacement[] {
  const index = lireIndex(stockage);
  let indexModifie = false;

  const emplacements = Array.from({ length: NOMBRE_EMPLACEMENTS }, (_, i): Emplacement => {
    const principale = stockage.getItem(cleSauvegarde(i));
    if (principale === null && stockage.getItem(cleSecours(i)) === null) {
      if (index[i]) {
        delete index[i];
        indexModifie = true;
      }
      return { statut: 'vide' };
    }
    const enCache = index[i];
    if (enCache && principale !== null) return { statut: 'partie', resume: enCache };

    const etat = charger(i, stockage);
    if (!etat) return { statut: 'illisible' };
    index[i] = resumer(etat, enCache?.dernierePartie ?? 0);
    indexModifie = true;
    return { statut: 'partie', resume: index[i] };
  });

  if (indexModifie) ecrireIndex(stockage, index);
  return emplacements;
}

/** Une partie prête à être enregistrée en fichier sur l'appareil. */
export interface FichierPartie {
  nom: string;
  texte: string;
}

/** Nom de fichier sans accents ni caractères spéciaux : « Le Velours » → « le-velours ». */
function enNomDeFichier(texte: string): string {
  const nom = texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return nom || 'partie';
}

/**
 * Le fichier d'export d'un emplacement : une copie de la partie, à garder hors du navigateur.
 * Une sauvegarde illisible est exportée telle quelle, pour pouvoir être réparée à la main. Null si vide.
 */
export function exporterEmplacement(emplacement: number, stockage: Stockage = stockageNavigateur): FichierPartie | null {
  const etat = charger(emplacement, stockage);
  if (etat) {
    return {
      nom: `sauvegarde-${enNomDeFichier(etat.maison.nom)}-jour-${etat.jour}.json`,
      texte: JSON.stringify({ jeu: PREFIXE, version: etat.version, etat }),
    };
  }
  const brut = stockage.getItem(cleSauvegarde(emplacement)) ?? stockage.getItem(cleSecours(emplacement));
  return brut === null ? null : { nom: `sauvegarde-emplacement-${emplacement + 1}-illisible.json`, texte: brut };
}

/** La partie contenue dans un fichier d'export (ou une sauvegarde brute), migrée. Null si illisible. */
export function lireFichierPartie(texte: string): EtatJeu | null {
  let brut: unknown;
  try {
    brut = JSON.parse(texte) as unknown;
  } catch {
    return null;
  }
  return typeof brut === 'object' && brut !== null ? migrer((brut as Enveloppe).etat) : null;
}

export type ResultatImport = 'importee' | 'illisible' | 'occupe';

/** Range la partie d'un fichier dans un emplacement vide. Jamais par-dessus une partie existante. */
export function importerPartie(
  emplacement: number,
  texte: string,
  maintenant: number,
  stockage: Stockage = stockageNavigateur,
): ResultatImport {
  if (stockage.getItem(cleSauvegarde(emplacement)) !== null || stockage.getItem(cleSecours(emplacement)) !== null) {
    return 'occupe';
  }
  const etat = lireFichierPartie(texte);
  if (!etat) return 'illisible';
  sauvegarder(emplacement, etat, maintenant, stockage);
  return 'importee';
}
