import {
  HEURE_BRIEFING,
  HEURE_DEBUT_JOURNEE,
  HEURE_FERMETURE,
  HEURE_OUVERTURE,
  MINUTES_PAR_TICK,
  SECONDES_REELLES_JOURNEE,
  SECONDES_REELLES_SOIREE,
} from '../content/balance';
import type { EtatJeu } from './etat';

export const MINUTES_PAR_JOUR = 24 * 60;

/** Nombre de minutes de jeu entre deux heures de l'horloge, en passant minuit si besoin. */
export function ecart(de: number, a: number): number {
  return (a - de + MINUTES_PAR_JOUR) % MINUTES_PAR_JOUR;
}

/** Vrai si l'horloge est dans la plage [debut, fin[, qui peut passer minuit. */
export function dansPlage(minute: number, debut: number, fin: number): boolean {
  return ecart(debut, minute) < ecart(debut, fin);
}

/** La maison est ouverte entre l'ouverture et la fermeture, si le briefing du jour a eu lieu. */
export function estOuvert(etat: EtatJeu): boolean {
  return etat.briefingJour === etat.jour && dansPlage(etat.minuteDuJour, HEURE_OUVERTURE, HEURE_FERMETURE);
}

/** Le moteur attend la validation du briefing avant de laisser passer 19 h. */
export function attendBriefing(etat: EtatJeu): boolean {
  return etat.minuteDuJour === HEURE_BRIEFING && etat.briefingJour !== etat.jour;
}

/** Temps absolu, en minutes depuis le début de la partie (jour 1 à 5 h). */
export function instant(etat: EtatJeu): number {
  return (etat.jour - 1) * MINUTES_PAR_JOUR + ecart(HEURE_DEBUT_JOURNEE, etat.minuteDuJour);
}

/** Heure de l'horloge (minutes depuis minuit) d'un instant absolu. */
export function heureDeInstant(minutes: number): number {
  return (HEURE_DEBUT_JOURNEE + minutes) % MINUTES_PAR_JOUR;
}

export type Moment = 'nuit' | 'journee' | 'briefing' | 'soiree';

/** Le moment de la journée, pour l'affichage (ciel, lumières, néon). */
export function momentDeLaJournee(etat: EtatJeu): Moment {
  if (estOuvert(etat)) return 'soiree';
  if (dansPlage(etat.minuteDuJour, HEURE_DEBUT_JOURNEE, HEURE_BRIEFING)) return 'journee';
  if (dansPlage(etat.minuteDuJour, HEURE_BRIEFING, HEURE_OUVERTURE)) return 'briefing';
  return 'nuit';
}

const TICKS_JOURNEE = ecart(HEURE_DEBUT_JOURNEE, HEURE_BRIEFING) / MINUTES_PAR_TICK;
const TICKS_SOIREE = ecart(HEURE_OUVERTURE, HEURE_FERMETURE) / MINUTES_PAR_TICK;

/**
 * Durée réelle d'un pas de 5 minutes à la vitesse ×1 : lente quand la maison est ouverte,
 * accélérée le reste du temps.
 */
export function secondesParTick(etat: EtatJeu): number {
  return estOuvert(etat) ? SECONDES_REELLES_SOIREE / TICKS_SOIREE : SECONDES_REELLES_JOURNEE / TICKS_JOURNEE;
}

/** Jour de la semaine : 0 pour lundi. Le jour 1 est un lundi. */
export function jourDeLaSemaine(jour: number): number {
  return (jour - 1) % 7;
}
