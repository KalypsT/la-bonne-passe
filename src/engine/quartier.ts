// Le quartier autour de la maison : le tapage de chaque nuit, qui nourrit l'intrigue du voisin du dessus
// et, chaque matin, la relation avec les voisins (src/engine/relations.ts).

import * as B from '../content/balance';
import { CLIENTS } from '../content/clientele';
import type { EtatJeu } from './etat';
import { facteurTapageVoisins } from './relations';

export interface Quartier {
  /** Bruit accumulé, de 0 à 100 : il monte les soirs de fête et retombe chaque matin. */
  tapage: number;
  /** La maison est insonorisée : le bruit porte moins loin. */
  insonorise: boolean;
}

export function quartierDeDepart(): Quartier {
  return { tapage: 0, insonorise: false };
}

const borner = (v: number) => Math.min(100, Math.max(0, v));

function segmentDe(modele: string) {
  return CLIENTS.find((c) => c.id === modele)?.segment;
}

/** Facteur de bruit de la soirée : porte, thème, insonorisation. */
export function facteurTapage(etat: EtatJeu): number {
  const T = B.TAPAGE;
  return (
    (T.selection[etat.regles.selection] ?? 1) *
    (etat.themeDuSoir ? (T.themes[etat.themeDuSoir] ?? 1) : 1) *
    (etat.quartier.insonorise ? T.insonorise : 1) *
    facteurTapageVoisins(etat)
  );
}

/** Un pas de soirée : le bruit des clients présents, sur le quai et dans les chambres. */
export function bruitDuSoir(etat: EtatJeu, heures: number): void {
  const presents = [...etat.file.map((c) => c.modele), ...etat.rendezVous.map((r) => r.modele)];
  let bruit = 0;
  for (const modele of presents) bruit += segmentDe(modele) === 'groupe' ? B.TAPAGE.parGroupeParHeure : B.TAPAGE.parClientParHeure;
  if (bruit > 0) changerTapage(etat, bruit * heures * facteurTapage(etat));
}

export function changerTapage(etat: EtatJeu, delta: number): void {
  etat.quartier.tapage = borner(etat.quartier.tapage + delta);
}

/** Le matin, le quartier oublie un peu. */
export function matinDuQuartier(etat: EtatJeu): void {
  etat.quartier.tapage = Math.round(etat.quartier.tapage * B.TAPAGE.decroissance * 10) / 10;
}
