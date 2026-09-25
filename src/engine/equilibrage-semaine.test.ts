import { beforeAll, describe, expect, it } from 'vitest';
import type { Offre } from '../content/clientele';
import type { Regles } from './etat';
import { choixAdaptatif, simuler, type ResumeNuit } from './simulation';

// « L'offre change-t-elle vraiment la partie ? » La bonne réponse dépend de la semaine,
// et un joueur qui suit les tendances fait mieux que celui qui ne touche à rien.

const GRAINES = [1, 2, 3, 4, 5, 6];
type Partie = { nuits: ResumeNuit[]; avoir: number };
const parties = new Map<string, Partie[]>();

function jouer(nom: string, offre: Offre | ((e: Parameters<typeof choixAdaptatif>[0]) => Offre), regles: Partial<Regles> | ((e: Parameters<typeof choixAdaptatif>[0]) => Partial<Regles>), tendances?: string[], nuits = 35) {
  parties.set(
    nom,
    GRAINES.map((graine) => {
      const r = simuler({ graine, offre, rdvMax: 3, nuits, regles, tendances });
      return { nuits: r.nuits, avoir: r.etat.tresorerie + r.etat.reserve };
    }),
  );
}

beforeAll(() => {
  // Tendances tirées au hasard, 28 nuits : le joueur qui ne touche à rien contre celui qui s'adapte.
  jouer('fixe', 'classique', {}, undefined, 28);
  jouer('adaptatif', (e) => choixAdaptatif(e).offre, (e) => choixAdaptatif(e).regles, undefined, 28);
  // Une même tendance toutes les semaines, pour comparer les réponses.
  for (const t of ['congres', 'controles', 'match']) {
    jouer(`${t}-classique`, 'classique', {}, [t]);
    jouer(`${t}-cher`, 'classique', { tarif: 2 }, [t]);
  }
  jouer('match-stricte', 'classique', { selection: 'stricte' }, ['match']);
  jouer('match-laxiste', 'classique', { selection: 'laxiste' }, ['match']);
}, 30_000);

const moyenne = (nom: string, f: (p: Partie) => number) => {
  const liste = parties.get(nom)!;
  return liste.reduce((s, p) => s + f(p), 0) / liste.length;
};
/** Résultat réel moyen par jour, une fois les tendances ouvertes (nuits 15 à 35). */
const argent = (nom: string) => moyenne(nom, (p) => p.nuits.slice(14).reduce((s, n) => s + n.resultat, 0) / p.nuits.slice(14).length);
const reputation = (nom: string) => moyenne(nom, (p) => p.nuits[p.nuits.length - 1]!.reputation);

describe('l’offre change la partie', () => {
  it('le même tarif +20 % : gagnant pendant un congrès, perdant pendant une semaine de contrôles', () => {
    expect(argent('congres-cher')).toBeGreaterThan(argent('congres-classique') * 1.3);
    expect(argent('controles-cher')).toBeLessThan(argent('controles-classique'));
  });

  it('un soir de match, le portier sauve la réputation ; la porte ouverte la ruine', () => {
    expect(reputation('match-stricte')).toBeGreaterThan(reputation('match-classique') + 10);
    expect(reputation('match-laxiste')).toBeLessThan(reputation('match-classique'));
  });

  it('le joueur qui suit les tendances fait mieux, en réputation comme en argent, que celui qui ne touche à rien', () => {
    expect(reputation('adaptatif')).toBeGreaterThan(reputation('fixe') + 3);
    expect(moyenne('adaptatif', (p) => p.avoir)).toBeGreaterThan(moyenne('fixe', (p) => p.avoir));
  });
});
