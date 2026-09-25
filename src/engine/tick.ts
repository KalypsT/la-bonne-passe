import { HEURE_DEBUT_JOURNEE, HEURE_FERMETURE, HEURE_OUVERTURE, MINUTES_PAR_TICK } from '../content/balance';
import type { EtatJeu } from './etat';
import { attendBriefing, estOuvert, MINUTES_PAR_JOUR } from './temps';

/** Ordres envoyés par l'interface au moteur. */
export type Ordre = { type: 'validerBriefing' };

export type EvenementMoteur =
  | { type: 'nouveauJour'; jour: number }
  | { type: 'briefing'; jour: number }
  | { type: 'ouverture'; jour: number }
  | { type: 'fermeture'; jour: number };

export interface ResultatTick {
  etat: EtatJeu;
  evenements: EvenementMoteur[];
}

/** Applique les ordres du joueur, sans faire avancer le temps. */
export function appliquerOrdres(etat: EtatJeu, ordres: readonly Ordre[]): EtatJeu {
  let resultat = etat;
  for (const ordre of ordres) {
    switch (ordre.type) {
      case 'validerBriefing':
        if (attendBriefing(resultat)) resultat = { ...resultat, briefingJour: resultat.jour };
        break;
    }
  }
  return resultat;
}

/**
 * Avance la simulation d'un pas fixe de 5 minutes de jeu. Fonction pure.
 * À 19 h, le temps reste bloqué tant que le briefing n'est pas validé.
 */
export function tick(etatInitial: EtatJeu, ordres: readonly Ordre[] = []): ResultatTick {
  const etat = appliquerOrdres(etatInitial, ordres);
  if (attendBriefing(etat)) {
    return { etat, evenements: [{ type: 'briefing', jour: etat.jour }] };
  }

  const evenements: EvenementMoteur[] = [];
  const etaitOuvert = estOuvert(etat);
  const minuteDuJour = (etat.minuteDuJour + MINUTES_PAR_TICK) % MINUTES_PAR_JOUR;
  let jour = etat.jour;

  if (minuteDuJour === HEURE_DEBUT_JOURNEE) {
    jour += 1;
    evenements.push({ type: 'nouveauJour', jour });
  }

  const suivant: EtatJeu = { ...etat, jour, minuteDuJour };

  if (!etaitOuvert && estOuvert(suivant) && minuteDuJour === HEURE_OUVERTURE) {
    evenements.push({ type: 'ouverture', jour });
  }
  if (etaitOuvert && minuteDuJour === HEURE_FERMETURE) {
    evenements.push({ type: 'fermeture', jour });
  }
  if (attendBriefing(suivant)) {
    evenements.push({ type: 'briefing', jour });
  }

  return { etat: suivant, evenements };
}
