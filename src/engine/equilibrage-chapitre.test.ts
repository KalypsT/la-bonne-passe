// Garde d'équilibrage de la durée du chapitre 1 (v1.0, partie 6). La deuxième maison se reprend à bail et la banque
// la finance : un joueur actif boucle le chapitre vers le jour 90 à 110, soit 8 à 11 h de jeu à la vitesse courante
// (×2 le jour, ×1 le soir), 6 à 8 h à ×2. Mesuré (`npm run rapport`, 10 graines) : cran 4, jour 107 ; cran 3 à crédit,
// jour 106 ; feutrée à crédit, jour 87 ; passif qui suit Josée, jour 106. Voir docs/EQUILIBRAGE.md.

import { describe, expect, it } from 'vitest';
import { secondesReelles, simuler } from './simulation';

describe('la durée du chapitre 1', () => {
  it('au cran 3, deuxième maison à crédit : fin entre les jours 75 et 150, en 6 à 14 h à la vitesse courante', () => {
    const parties = [1, 2, 3, 4].map((graine) =>
      simuler({ graine, nuits: 170, offre: 'classique', rdvMax: 3, permis: true, etablissement: true, maison2: 'externe', empruntMaison: true }),
    );
    const finies = parties.filter((p) => p.etat.finChapitre);
    expect(finies.length).toBeGreaterThanOrEqual(3);
    for (const p of finies) {
      const jour = p.etat.finChapitre!.jour;
      expect(jour).toBeGreaterThanOrEqual(75);
      expect(jour).toBeLessThanOrEqual(150);
      const heures = secondesReelles(p.nuits.slice(0, jour), 'courant') / 3600;
      expect(heures).toBeGreaterThan(6);
      expect(heures).toBeLessThan(14);
    }
  }, 180_000);
});
