// La chronique de la partie et la fin du chapitre 1 (v1.0, partie 2).
// Josée retient ce qui compte (les paliers, les arrivées et les départs, les travaux, les histoires) ;
// le soir où la deuxième maison est ouverte avec une maison d'origine assez réputée, le chapitre se boucle.
// Voir « Campagne et fin de partie » dans les spécifications ; seuils dans balance.ts (FIN_CHAPITRE).

import * as B from '../content/balance';
import { INTRIGUES_PRINCIPALES } from '../content/intrigues';
import { INTRIGUE_CHAT_NOIR } from '../content/rivale';
import { totalRecettes } from './comptes';
import type { EtatJeu } from './etat';
import type { EvenementMoteur } from './tick';

/** Un moment marquant, avec son jour. */
export type Moment = { jour: number } & (
  | { type: 'palier'; numero: number }
  | { type: 'embauche'; prenom: string }
  | { type: 'depart'; prenom: string }
  | { type: 'chambre'; chambreId: string }
  | { type: 'bar' }
  | { type: 'emprunt'; montant: number }
  | { type: 'impayee' }
  | { type: 'sursis' }
  | { type: 'intrigue'; id: string; fin: string; prenom?: string }
  | { type: 'agrandissement' }
  | { type: 'gerance'; prenom: string }
  | { type: 'achatLieu'; lieu: string }
  | { type: 'inauguration'; prenom: string }
);

export interface Chronique {
  /** Jour où Josée a commencé à tenir la chronique : 1, sauf pour une partie d'avant la v1.0. */
  depuis: number;
  /** Recettes des semaines closes (la semaine en cours s'y ajoute à l'affichage). */
  recettes: number;
  /** Meilleur résultat d'une semaine. */
  meilleureSemaine: number;
  /** Soirées ouvertes, par offre du soir, et soirées à thème. */
  soirees: { classique: number; happy: number; feutree: number };
  themes: number;
  embauches: number;
  departs: number;
  /** Disputes qui dégénèrent et alertes manquées. */
  incidents: number;
  impayees: number;
  emprunts: number;
  /** Temps réel passé dans la partie, en secondes (compté par l'interface). */
  tempsJoue: number;
  moments: Moment[];
}

/** Titre final, selon le style de jeu (src/content/fin.ts pour les noms). */
export type IdTitre = 'velours' | 'discretion' | 'fete' | 'batisseuse' | 'famille' | 'funambule' | 'quartier';

/** Ce que l'écran de fin raconte, figé le soir où le chapitre se boucle. */
export interface FinChapitre {
  jour: number;
  titre: IdTitre;
  recettes: number;
  tempsJoue: number;
  reputation: number;
  /** Qui est resté : les personnes d'au moins 28 nuits, et la gérante de la deuxième maison. */
  fideles: string[];
  partis: string[];
  /** Les moments retenus pour l'écran, dans l'ordre. */
  moments: Moment[];
  /** Le lieu de la deuxième maison, et sa gérante. */
  lieu: string;
  gerante: string;
}

export type EvenementChronique = { type: 'finChapitre'; jour: number; titre: IdTitre };

export function chroniqueDeDepart(depuis = 1): Chronique {
  return {
    depuis,
    recettes: 0,
    meilleureSemaine: 0,
    soirees: { classique: 0, happy: 0, feutree: 0 },
    themes: 0,
    embauches: 0,
    departs: 0,
    incidents: 0,
    impayees: 0,
    emprunts: 0,
    tempsJoue: 0,
    moments: [],
  };
}

const MOMENTS_GARDES = 200;

/** Les histoires qui comptent pour la fin du chapitre : les intrigues des personnages et du Chat Noir, pas les petites
 * chaînes du quartier ni les suites d'imprévus. */
const HISTOIRES = new Set([...INTRIGUES_PRINCIPALES, INTRIGUE_CHAT_NOIR].map((d) => d.id));

function noter(etat: EtatJeu, moment: Moment): void {
  const c = etat.chronique;
  c.moments = [...c.moments, moment].slice(-MOMENTS_GARDES);
}

/** Relit les événements d'un pas du moteur et retient ce qui compte. */
export function noterChronique(etat: EtatJeu, evenements: readonly EvenementMoteur[]): void {
  const c = etat.chronique;
  const jour = etat.jour;
  for (const e of evenements) {
    switch (e.type) {
      case 'ouverture':
        c.soirees[etat.offre] += 1;
        if (etat.themeDuSoir) c.themes += 1;
        break;
      case 'palier':
        if (e.numero >= 2) noter(etat, { jour, type: 'palier', numero: e.numero });
        break;
      case 'embauche':
        c.embauches += 1;
        noter(etat, { jour, type: 'embauche', prenom: e.prenom });
        break;
      case 'depart':
        c.departs += 1;
        noter(etat, { jour, type: 'depart', prenom: e.prenom });
        break;
      case 'finTravaux':
        noter(etat, { jour, type: 'chambre', chambreId: e.chambreId });
        break;
      case 'finTravauxBar':
        noter(etat, { jour, type: 'bar' });
        break;
      case 'emprunt':
        c.emprunts += 1;
        noter(etat, { jour, type: 'emprunt', montant: e.montant });
        break;
      case 'mensualiteImpayee':
        c.impayees += 1;
        noter(etat, { jour, type: 'impayee' });
        break;
      case 'sursis':
        noter(etat, { jour, type: 'sursis' });
        break;
      case 'disputeDegeneree':
      case 'alerteManquee':
        c.incidents += 1;
        break;
      case 'intrigueFinie':
        if (HISTOIRES.has(e.id) && e.fin !== 'ecartee')
          noter(etat, { jour, type: 'intrigue', id: e.id, fin: e.fin, ...(e.prenom ? { prenom: e.prenom } : {}) });
        break;
      case 'agrandissementFini':
        noter(etat, { jour, type: 'agrandissement' });
        break;
      case 'gerance':
        if (e.accepte) noter(etat, { jour, type: 'gerance', prenom: etat.personnel.find((x) => x.id === e.employeId)?.prenom ?? '' });
        break;
      case 'achatLieu':
        noter(etat, { jour, type: 'achatLieu', lieu: e.lieu });
        break;
      case 'inauguration':
        noter(etat, { jour, type: 'inauguration', prenom: etat.maison2.gerante?.employe.prenom ?? '' });
        break;
    }
  }
}

/** Le lundi : la semaine close rejoint les recettes de la partie. */
export function noterSemaineChronique(etat: EtatJeu): void {
  const b = etat.bilanSemaine;
  if (!b) return;
  etat.chronique.recettes += totalRecettes(b.comptes);
  etat.chronique.meilleureSemaine = Math.max(etat.chronique.meilleureSemaine, b.resultat);
}

/** Recettes de toute la partie, semaine en cours comprise. */
export function recettesTotales(etat: EtatJeu): number {
  return etat.chronique.recettes + totalRecettes(etat.semaine.comptes);
}

/**
 * Le titre selon le style de jeu : le premier trait qui ressort, dans cet ordre.
 * Discrétion : une majorité de soirées feutrées. Fête : happy hours et thèmes. Bâtisseuse : le bâtiment voisin et une
 * grande équipe. Famille : personne n'est parti. Funambule : la banque a attendu au moins une fois. Velours : la
 * réputation au sommet. Sinon, on est « du quartier ».
 * Mesure (partie 2) : avec le velours en premier, les 38 fins de chapitre simulées donnaient toutes « velours » (une
 * maison bien tenue finit vers 94 de réputation) ; il vient donc en dernier, après les styles.
 */
export function titreDuStyle(etat: EtatJeu): IdTitre {
  const T = B.FIN_CHAPITRE.titres;
  const c = etat.chronique;
  const soirees = Math.max(1, c.soirees.classique + c.soirees.happy + c.soirees.feutree);
  if (c.soirees.feutree / soirees >= T.discretion) return 'discretion';
  if ((c.soirees.happy + c.themes) / soirees >= T.fete) return 'fete';
  if (etat.agrandissement.achete.length > 0 && etat.personnel.length >= T.batisseuse) return 'batisseuse';
  if (c.departs === 0 && c.embauches >= T.famille) return 'famille';
  if (c.impayees > 0) return 'funambule';
  if (etat.reputation >= T.velours) return 'velours';
  return 'quartier';
}

/** Les moments qui méritent l'écran de fin : les grands tournants d'abord, puis dans l'ordre des jours. */
export function momentsMarquants(moments: readonly Moment[], nombre: number = B.FIN_CHAPITRE.moments): Moment[] {
  const poids: Record<Moment['type'], number> = {
    inauguration: 10,
    achatLieu: 9,
    agrandissement: 8,
    intrigue: 7,
    palier: 6,
    sursis: 6,
    impayee: 5,
    emprunt: 5,
    gerance: 5,
    depart: 4,
    bar: 3,
    embauche: 3,
    chambre: 2,
  };
  const indexes = moments.map((m, i) => ({ m, i }));
  indexes.sort((a, b) => poids[b.m.type] - poids[a.m.type] || a.i - b.i);
  return indexes
    .slice(0, nombre)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.m);
}

/** Le chapitre est-il bouclé ? La deuxième maison ouverte, et la maison d'origine assez réputée. */
export function chapitreBoucle(etat: EtatJeu): boolean {
  return (
    etat.finChapitre === null &&
    etat.maison2.inauguration !== null &&
    etat.etablissement.statut === 'ouvert' &&
    etat.reputation >= B.FIN_CHAPITRE.reputation
  );
}

/** À la fermeture : si le chapitre est bouclé, Josée le raconte. Le jeu continue ensuite. */
export function verifierFinChapitre(etat: EtatJeu, evenements: { push(e: EvenementChronique): unknown }): void {
  if (!chapitreBoucle(etat)) return;
  const titre = titreDuStyle(etat);
  const partis = [...new Set(etat.chronique.moments.flatMap((m) => (m.type === 'depart' ? [m.prenom] : [])))];
  const g = etat.maison2.gerante;
  etat.finChapitre = {
    jour: etat.jour,
    titre,
    recettes: recettesTotales(etat),
    tempsJoue: etat.chronique.tempsJoue,
    reputation: Math.floor(etat.reputation),
    fideles: [
      ...etat.personnel.filter((e) => e.nuitsTravaillees >= B.FIN_CHAPITRE.nuitsFidele).map((e) => e.prenom),
      ...(g && !g.externe ? [g.employe.prenom] : []),
    ],
    partis: partis.filter((p) => !etat.personnel.some((e) => e.prenom === p)),
    moments: momentsMarquants(etat.chronique.moments),
    lieu: etat.etablissement.lieu ?? '',
    gerante: g?.employe.prenom ?? '',
  };
  etat.finChapitreAVoir = true;
  // Le mode libre commence : dès lundi, un objectif par semaine (partie 3).
  etat.systemes.modeLibre = true;
  evenements.push({ type: 'finChapitre', jour: etat.jour, titre });
}
