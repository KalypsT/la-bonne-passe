import { beforeAll, describe, expect, it } from 'vitest';
import { simuler, type OptionsSimulation, type ResumeNuit } from './simulation';

// Le bar (palier 2) : un investissement qui se rembourse, et une formule champagne qui rapporte
// mais fâche touristes et habitués. Joueur actif, soirée classique à 3 rendez-vous, 42 nuits, 10 graines.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VARIANTES: Record<string, Partial<OptionsSimulation>> = {
  sansBar: { equipeBar: 0 },
  bar: {},
  champagne: { regles: { formule: 'champagne' } },
};
const parties = new Map<string, { nuits: ResumeNuit[]; avoir: number }[]>();

beforeAll(() => {
  for (const [nom, options] of Object.entries(VARIANTES)) {
    parties.set(
      nom,
      GRAINES.map((graine) => {
        // Sans tendance ni carte : on mesure le bar, pas le hasard des semaines, des imprévus ni des histoires.
        const r = simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 42, tendances: [], cartes: false, ...options });
        return { nuits: r.nuits, avoir: r.etat.tresorerie + r.etat.reserve };
      }),
    );
  }
}, 30_000);

const moyenne = (nom: string, f: (p: { nuits: ResumeNuit[]; avoir: number }) => number) => {
  const liste = parties.get(nom)!;
  return liste.reduce((s, p) => s + f(p), 0) / liste.length;
};
const resultat = (debut: number, fin: number) => (p: { nuits: ResumeNuit[] }) =>
  p.nuits.slice(debut, fin).reduce((s, n) => s + n.resultat, 0) / (fin - debut);

describe('équilibrage du bar', () => {
  it('le bar rouvre dans la deuxième semaine pour un joueur actif', () => {
    for (const p of parties.get('bar')!) {
      const premiere = p.nuits.findIndex((n) => n.bar > 0) + 1;
      expect(premiere).toBeGreaterThanOrEqual(5);
      expect(premiere).toBeLessThanOrEqual(14);
    }
  });

  it('une fois rouvert, il rapporte chaque jour et finit par se rembourser', () => {
    expect(moyenne('bar', resultat(28, 42))).toBeGreaterThan(moyenne('sansBar', resultat(28, 42)) + 50);
    expect(moyenne('bar', (p) => p.avoir)).toBeGreaterThan(moyenne('sansBar', (p) => p.avoir));
  });

  it('la formule champagne rapporte plus, mais coûte de la réputation', () => {
    expect(moyenne('champagne', resultat(7, 42))).toBeGreaterThan(moyenne('bar', resultat(7, 42)));
    expect(moyenne('champagne', (p) => p.nuits[41]!.reputation)).toBeLessThan(moyenne('bar', (p) => p.nuits[41]!.reputation) - 3);
  });
});
