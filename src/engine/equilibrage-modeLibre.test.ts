// Garde d'équilibrage du mode libre (v1.0, partie 3) : après la fin du chapitre, les objectifs se renouvellent et se
// réussissent environ une fois sur deux pour un joueur attentif qui continue comme avant. Voir docs/EQUILIBRAGE.md
// (rapport complet : 10 graines, 336 nuits, 51 % de réussite au cran 4).

import { describe, expect, it } from 'vitest';
import { simuler } from './simulation';

describe('équilibrage du mode libre', () => {
  it('au cran 4, des objectifs variés, réussis une à deux fois sur trois', () => {
    const parties = [1, 2, 3, 4].map((graine) =>
      simuler({ graine, nuits: 266, offre: 'classique', rdvMax: 4, permis: true, etablissement: true, maison2: 'externe' }),
    );
    const resultats = parties.flatMap((p) => p.bilans.flatMap((b) => (b.modeLibre?.resultat ? [b.modeLibre.resultat] : [])));
    expect(parties.every((p) => p.etat.finChapitre !== null)).toBe(true);
    expect(resultats.length).toBeGreaterThanOrEqual(12);
    expect(new Set(resultats.map((r) => r.type)).size).toBeGreaterThanOrEqual(3);
    const taux = resultats.filter((r) => r.reussi).length / resultats.length;
    expect(taux).toBeGreaterThanOrEqual(0.3);
    expect(taux).toBeLessThanOrEqual(0.8);
    // Les intrigues et les cartes continuent : jamais une semaine sans rien après la fin.
    for (const p of parties) {
      const fin = p.etat.finChapitre!.jour;
      for (let s = fin + 1; s + 7 <= p.nuits.length; s += 7) {
        const semaine = p.nuits.filter((n) => n.numero >= s && n.numero < s + 7);
        expect(semaine.reduce((t, n) => t + n.intrigues.length + n.imprevus.length, 0)).toBeGreaterThan(0);
      }
    }
  }, 120_000);
});
