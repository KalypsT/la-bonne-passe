// Soirées à thème (palier 2, au premier lundi) : un thème par soir, choisi au briefing.
// Voir « Leviers d'offre » dans les spécifications.

import * as B from '../content/balance';
import type { Segment } from '../content/clientele';
import type { EtatJeu } from './etat';

export type EvenementTheme = { type: 'theme'; id: string; montant: number };

/** Le thème de ce soir et sa force : 1 la première fois de la semaine, puis ×0,5 à chaque reprise. */
export function themeDuSoir(etat: EtatJeu): { reglage: B.ReglageTheme; force: number } | null {
  const id = etat.themeDuSoir;
  const reglage = id ? B.THEMES[id] : undefined;
  if (!id || !reglage) return null;
  const reprises = Math.max(0, etat.semaine.themes.filter((t) => t === id).length - 1);
  return { reglage, force: Math.pow(B.THEME_LASSITUDE, reprises) };
}

/** Force qu'aurait ce thème s'il était programmé ce soir (pour l'afficher au briefing). */
export function forceSiProgramme(etat: EtatJeu, id: string): number {
  return Math.pow(B.THEME_LASSITUDE, etat.semaine.themes.filter((t) => t === id).length);
}

/** Un multiplicateur atténué par la lassitude : 1,6 à force 0,5 devient 1,3. */
function multiplicateur(m: number | undefined, force: number): number {
  return 1 + ((m ?? 1) - 1) * force;
}

export function patienceTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? t.reglage.patience * t.force : 0;
}

export function boucheTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.bouche, t.force) : 1;
}

export function prixTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.prix, t.force) : 1;
}

export function affluenceTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.affluence, t.force) : 1;
}

export function attraitTheme(etat: EtatJeu, segment: Segment): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.attire[segment], t.force) : 1;
}

export function qualiteTheme(etat: EtatJeu, segment: Segment): number {
  const t = themeDuSoir(etat);
  return t ? (t.reglage.qualite[segment] ?? 0) * t.force : 0;
}

export function fatigueTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.fatigue, t.force) : 1;
}

export function disputeTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.dispute, t.force) : 1;
}

export function barTheme(etat: EtatJeu): number {
  const t = themeDuSoir(etat);
  return t ? multiplicateur(t.reglage.bar, t.force) : 1;
}
