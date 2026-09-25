import type { EtatJeu } from '../engine/etat';
import { migrer } from './migrations';
import { stockageNavigateur, type Stockage } from './stockage';

export const NOMBRE_EMPLACEMENTS = 3;

const PREFIXE = 'la-bonne-passe';
const cleSauvegarde = (emplacement: number) => `${PREFIXE}:partie:${emplacement}`;
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

/** Charge et migre la partie d'un emplacement. Null si vide ou illisible. */
export function charger(emplacement: number, stockage: Stockage = stockageNavigateur): EtatJeu | null {
  const sauvegarde = lireJson(stockage, cleSauvegarde(emplacement));
  if (typeof sauvegarde !== 'object' || sauvegarde === null) return null;
  return migrer((sauvegarde as { etat?: unknown }).etat);
}

export function sauvegarder(
  emplacement: number,
  etat: EtatJeu,
  maintenant: number,
  stockage: Stockage = stockageNavigateur,
): void {
  stockage.setItem(cleSauvegarde(emplacement), JSON.stringify({ version: etat.version, etat }));
  const index = lireIndex(stockage);
  index[emplacement] = resumer(etat, maintenant);
  ecrireIndex(stockage, index);
}

export function supprimer(emplacement: number, stockage: Stockage = stockageNavigateur): void {
  stockage.removeItem(cleSauvegarde(emplacement));
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
    if (stockage.getItem(cleSauvegarde(i)) === null) {
      if (index[i]) {
        delete index[i];
        indexModifie = true;
      }
      return { statut: 'vide' };
    }
    const enCache = index[i];
    if (enCache) return { statut: 'partie', resume: enCache };

    const etat = charger(i, stockage);
    if (!etat) return { statut: 'illisible' };
    index[i] = resumer(etat, 0);
    indexModifie = true;
    return { statut: 'partie', resume: index[i] };
  });

  if (indexModifie) ecrireIndex(stockage, index);
  return emplacements;
}
