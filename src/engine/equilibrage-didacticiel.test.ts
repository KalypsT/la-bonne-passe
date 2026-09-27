// Garde d'équilibrage du didacticiel final (v1.0, partie 5) : le joueur passif (Sanne seule, rien rénové) fait faillite
// entre les jours 56 et 84 ; le même joueur, s'il fait ce que Josée conseille et seulement cela, s'en sort.
// Mesuré (10 graines, 168 nuits) : passif, 10 faillites sur 10, toutes au jour 84 ; qui suit Josée, aucune faillite,
// 4 personnes, 3 chambres, palier 5 atteint dans les 10 parties. Voir docs/EQUILIBRAGE.md.

import { describe, expect, it } from 'vitest';
import { simuler } from './simulation';

describe('le didacticiel final', () => {
  it('le joueur passif qui suit les conseils de Josée ne fait plus faillite, et avance', () => {
    const graines = [1, 2, 3, 4, 5, 6];
    const passifs = graines.map((graine) => simuler({ graine, nuits: 112, offre: 'classique', rdvMax: 4, recruter: false, renover: false }));
    const guides = graines.map((graine) => simuler({ graine, nuits: 112, offre: 'classique', rdvMax: 4, recruter: false, renover: false, suitJosee: true }));
    expect(passifs.filter((p) => p.etat.finDePartie).length).toBeGreaterThanOrEqual(5);
    expect(guides.filter((p) => p.etat.finDePartie).length).toBe(0);
    for (const p of guides) {
      expect(p.etat.personnel.length).toBeGreaterThanOrEqual(3);
      expect(p.etat.chambres.filter((c) => c.ouverte).length).toBeGreaterThanOrEqual(2);
      expect(p.etat.palier).toBeGreaterThanOrEqual(4);
      expect(p.etat.conseils.vus).toEqual(expect.arrayContaining(['renover', 'recruter', 'lingeAuto']));
    }
  }, 120_000);
});
