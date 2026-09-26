import { beforeAll, describe, expect, it } from 'vitest';
import { simuler, type OptionsSimulation } from './simulation';

// v0.6, partie 2 : la banque. Joueur actif (cartes au hasard), 56 nuits, 10 graines.
// Le joueur qui gère ne fait pas faillite ; celui qui laisse faire la frôle. Mesures dans docs/EQUILIBRAGE.md.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
type Partie = ReturnType<typeof simuler>;
const parties = new Map<string, Partie[]>();
const jouer = (nom: string, o: Partial<OptionsSimulation>) =>
  parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...o })));

beforeAll(() => {
  jouer('classique', {});
  jouer('quatre', { rdvMax: 4 });
  jouer('stricte', { regles: { selection: 'stricte' } });
  // v0.6, partie 4 : quatre mois, pour l'impôt du premier trimestre (annoncé au jour 85, prélevé au jour 99).
  jouer('quatreMois', { nuits: 112 });
}, 180_000);

const moyenne = (nom: string, f: (p: Partie) => number) => {
  const l = parties.get(nom)!;
  return l.reduce((s, p) => s + f(p), 0) / l.length;
};

describe('équilibrage de la banque', () => {
  it('l’impôt du premier trimestre pèse sans ruiner : 1 000 à 3 000 €, jamais de faillite sur quatre mois', () => {
    const impot = moyenne('quatreMois', (p) => p.bilans.reduce((t, b) => t + b.comptes.depenses.impots, 0));
    expect(impot).toBeGreaterThan(1000);
    expect(impot).toBeLessThan(3000);
    expect(parties.get('quatreMois')!.filter((p) => p.etat.finDePartie).length).toBe(0);
  });

  const DEUX_MOIS = ['classique', 'quatre', 'stricte'];

  it('le joueur actif ne fait jamais faillite en deux mois, et paie presque toujours à l’heure', () => {
    for (const nom of DEUX_MOIS) {
      expect(parties.get(nom)!.filter((p) => p.etat.finDePartie).length).toBe(0);
      expect(moyenne(nom, (p) => p.etat.banque.impayees)).toBeLessThanOrEqual(0.2);
    }
  });

  it('les agios restent une piqûre de rappel : moins de 200 € en deux mois', () => {
    for (const nom of DEUX_MOIS) {
      const agios = moyenne(nom, (p) => p.bilans.reduce((t, b) => t + b.comptes.depenses.agios, 0) + p.etat.semaine.comptes.depenses.agios);
      expect(agios).toBeLessThan(200);
    }
  });
});
