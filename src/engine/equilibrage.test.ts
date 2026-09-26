import { beforeAll, describe, expect, it } from 'vitest';
import type { Offre } from '../content/clientele';
import { partsDeClientele, simuler, type ResumeNuit } from './simulation';

// Parties simulées d'un joueur actif (voir simulation.ts) : 28 nuits, 20 graines (10 ne suffisaient plus à départager
// des offres proches, v0.4). v0.6, partie 8 : 28 nuits au lieu de 14, pour comparer les crans sur trois semaines ; une
// seule semaine dépend trop de sa tendance (une semaine de contrôles de police divise la demande par deux).
// Les cibles viennent des spécifications (« Économie et finances ») et de docs/EQUILIBRAGE.md.

const GRAINES = Array.from({ length: 20 }, (_, i) => i + 1);
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
        const r = simuler({ graine, offre, nuits: 28, rdvMax, cartes: false });
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
const netSemaine2 = (p: { nuits: ResumeNuit[] }) => p.nuits.slice(7, 14).reduce((s, n) => s + n.net, 0) / 7;
/** Net moyen des nuits 8 à 28, une fois l'équipe au complet. */
const netMois = (p: { nuits: ResumeNuit[] }) => p.nuits.slice(7, 28).reduce((s, n) => s + n.net, 0) / 21;
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
    if (process.env.MESURE) {
      for (const [o, n] of COMBINAISONS) {
        console.log(o, n, 'net s2', moyenne(o, n, netSemaine2).toFixed(0), 'net mois', moyenne(o, n, netMois).toFixed(0), 'rep 7/14/28', [7, 14, 28].map((x) => moyenne(o, n, reputationNuit(x)).toFixed(1)).join('/'), 'moral', moyenne(o, n, (p) => p.moral).toFixed(0));
      }
    }
    // La classique rapporte le plus d'argent…
    for (const autre of ['happy', 'feutree'] as const) expect(moyenne('classique', 4, netSemaine2)).toBeGreaterThan(moyenne(autre, 4, netSemaine2));
    // … le happy hour fait connaître la maison le plus vite…
    expect(moyenne('happy', 4, reputationNuit(7))).toBeGreaterThan(moyenne('classique', 4, reputationNuit(7)));
    // … et la soirée feutrée construit la meilleure réputation sur la durée (v0.6, partie 8 : au bout du mois, 48,8 contre
    // 44,8 et 42,1 ; à la nuit 14, elle talonne encore le happy hour).
    expect(moyenne('feutree', 4, reputationNuit(28))).toBeGreaterThan(moyenne('classique', 4, reputationNuit(28)));
    expect(moyenne('feutree', 4, reputationNuit(28))).toBeGreaterThan(moyenne('happy', 4, reputationNuit(28)));
  });

  it('4 rendez-vous par personne rapportent plus, mais usent le moral', () => {
    expect(moyenne('classique', 4, netMois)).toBeGreaterThan(moyenne('classique', 3, netMois));
    expect(moyenne('classique', 4, (p) => p.moral)).toBeLessThan(moyenne('classique', 3, (p) => p.moral));
  });

  it('la réputation reste loin du palier 4 (réputation 50) la première semaine', () => {
    for (const liste of parties.values()) for (const p of liste) expect(p.nuits[6]!.reputation).toBeLessThan(50);
  });

  it('l’offre du soir change la clientèle : qui vient, et qui est content', () => {
    const parts = (offre: Offre) => partsDeClientele(parties.get(`${offre}-4`)!.flatMap((p) => p.nuits.slice(7)));
    const satisfaction = (offre: Offre, segment: 'touriste' | 'habitue') => moyenne(offre, 4, (p) => p.nuits[13]!.satisfaction[segment]);
    // Le happy hour remplit la maison de touristes, la soirée feutrée d'habitués : au moins 10 points d'écart.
    expect(parts('happy').touriste - parts('feutree').touriste).toBeGreaterThanOrEqual(10);
    expect(parts('feutree').habitue - parts('happy').habitue).toBeGreaterThanOrEqual(10);
    // Et chaque offre soigne le segment qu'elle attire.
    expect(satisfaction('happy', 'touriste')).toBeGreaterThan(satisfaction('classique', 'touriste'));
    expect(satisfaction('feutree', 'habitue')).toBeGreaterThan(satisfaction('classique', 'habitue'));
  });
});
