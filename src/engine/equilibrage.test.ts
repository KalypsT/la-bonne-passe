import { beforeAll, describe, expect, it } from 'vitest';
import type { Offre } from '../content/clientele';
import { simuler, type ResumeNuit } from './simulation';

// Parties simulées d'un joueur actif (voir simulation.ts) : 14 nuits, 5 graines.
// Les cibles viennent des spécifications (« Économie et finances ») et de docs/EQUILIBRAGE.md.

const GRAINES = [1, 2, 3, 4, 5];
const OFFRES: Offre[] = ['classique', 'happy', 'feutree'];
type Cle = `${Offre}-${number}`;
const parties = new Map<Cle, { nuits: ResumeNuit[]; moral: number; departs: number }[]>();

/** Les combinaisons comparées : les trois offres à 4 rendez-vous, et la classique à 3. */
const COMBINAISONS: [Offre, number][] = [...OFFRES.map((o): [Offre, number] => [o, 4]), ['classique', 3]];

beforeAll(() => {
  for (const [offre, rdvMax] of COMBINAISONS) {
    parties.set(
      `${offre}-${rdvMax}`,
      GRAINES.map((graine) => {
        const r = simuler({ graine, offre, nuits: 14, rdvMax });
        const moral = r.etat.personnel.reduce((s, e) => s + e.moral, 0) / r.etat.personnel.length;
        return { nuits: r.nuits, moral, departs: r.departs };
      }),
    );
  }
}, 60_000);

const moyenne = (offre: Offre, rdvMax: number, f: (p: { nuits: ResumeNuit[]; moral: number; departs: number }) => number) => {
  const liste = parties.get(`${offre}-${rdvMax}`)!;
  return liste.reduce((s, p) => s + f(p), 0) / liste.length;
};
const netSemaine2 = (p: { nuits: ResumeNuit[] }) => p.nuits.slice(7).reduce((s, n) => s + n.net, 0) / 7;
const reputationNuit = (n: number) => (p: { nuits: ResumeNuit[] }) => p.nuits[n - 1]!.reputation;

describe('équilibrage, joueur actif', () => {
  it('le palier 2 (réputation 25) tombe entre la nuit 3 et la fin de la première semaine', () => {
    for (const liste of parties.values()) {
      for (const p of liste) {
        const nuit = p.nuits.find((n) => n.palier >= 2)?.numero ?? 99;
        expect(nuit).toBeGreaterThanOrEqual(3);
        expect(nuit).toBeLessThanOrEqual(7);
      }
    }
  });

  it('une soirée correcte rapporte 600 à 1 000 € net à la maison une fois l’équipe au complet', () => {
    const net = moyenne('classique', 3, netSemaine2);
    expect(net).toBeGreaterThanOrEqual(600);
    expect(net).toBeLessThanOrEqual(1200);
  });

  it('aucune offre ne gagne partout', () => {
    // La classique rapporte le plus d'argent…
    for (const autre of ['happy', 'feutree'] as const) expect(moyenne('classique', 4, netSemaine2)).toBeGreaterThan(moyenne(autre, 4, netSemaine2));
    // … le happy hour fait connaître la maison le plus vite…
    expect(moyenne('happy', 4, reputationNuit(7))).toBeGreaterThan(moyenne('classique', 4, reputationNuit(7)));
    // … et la soirée feutrée construit la meilleure réputation sur la durée.
    expect(moyenne('feutree', 4, reputationNuit(14))).toBeGreaterThan(moyenne('classique', 4, reputationNuit(14)));
    expect(moyenne('feutree', 4, reputationNuit(14))).toBeGreaterThan(moyenne('happy', 4, reputationNuit(14)));
  });

  it('4 rendez-vous par personne rapportent plus, mais usent le moral', () => {
    expect(moyenne('classique', 4, netSemaine2)).toBeGreaterThan(moyenne('classique', 3, netSemaine2));
    expect(moyenne('classique', 4, (p) => p.moral)).toBeLessThan(moyenne('classique', 3, (p) => p.moral));
  });

  it('la réputation reste loin du palier 4 (réputation 50) la première semaine', () => {
    for (const liste of parties.values()) for (const p of liste) expect(p.nuits[6]!.reputation).toBeLessThan(50);
  });
});
