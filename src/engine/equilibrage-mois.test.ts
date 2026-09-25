import { beforeAll, describe, expect, it } from 'vitest';
import { simuler } from './simulation';

// Le premier mois se boucle de justesse si le joueur gère activement ; laisser faire mène à un léger déficit.
// (« Économie et finances » dans les spécifications.) 28 nuits, 10 graines : la mensualité du jour 28 est payée.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
type Partie = { avoir: number; min: number };
let actif: Partie[] = [];
let passif: Partie[] = [];

beforeAll(() => {
  const jouer = (recruter: boolean) =>
    GRAINES.map((graine) => {
      const r = simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 28, recruter, renover: recruter, equipeBar: recruter ? 1 : 0 });
      return { avoir: r.etat.tresorerie + r.etat.reserve, min: r.tresorerieMin };
    });
  actif = jouer(true);
  passif = jouer(false);
}, 30_000);

const moyenne = (liste: Partie[], f: (p: Partie) => number) => liste.reduce((s, p) => s + f(p), 0) / liste.length;

describe('le premier mois', () => {
  it('un joueur actif le boucle de justesse : 0 à 4 000 € après la mensualité, trois chambres et le bar rouverts', () => {
    expect(moyenne(actif, (p) => p.avoir)).toBeGreaterThan(0);
    expect(moyenne(actif, (p) => p.avoir)).toBeLessThan(4000);
    for (const p of actif) expect(p.avoir).toBeGreaterThan(-2000);
  });

  it('sans jamais s’enfoncer au-delà du découvert toléré (−2 000 €)', () => {
    for (const p of actif) expect(p.min).toBeGreaterThan(-2000);
  });

  it('laisser faire mène à un léger déficit', () => {
    expect(moyenne(passif, (p) => p.avoir)).toBeLessThan(0);
    expect(moyenne(passif, (p) => p.avoir)).toBeGreaterThan(-3000);
  });
});
