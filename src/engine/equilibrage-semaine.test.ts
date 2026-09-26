import { beforeAll, describe, expect, it } from 'vitest';
import type { Offre } from '../content/clientele';
import type { Regles } from './etat';
import { choixAdaptatif, simuler, type ResumeNuit } from './simulation';

// « L'offre change-t-elle vraiment la partie ? » La bonne réponse dépend de la semaine,
// et un joueur qui suit les tendances fait mieux que celui qui ne touche à rien.

const GRAINES = [1, 2, 3, 4, 5, 6];
type Partie = { nuits: ResumeNuit[]; avoir: number };
const parties = new Map<string, Partie[]>();

type Etat = Parameters<typeof choixAdaptatif>[0];

function jouer(
  nom: string,
  offre: Offre | ((e: Etat) => Offre),
  regles: Partial<Regles> | ((e: Etat) => Partial<Regles>),
  tendances?: string[],
  nuits = 35,
  theme?: (e: Etat) => string | null,
) {
  parties.set(
    nom,
    GRAINES.map((graine) => {
      // Sans intrigue : leurs choix et leurs coûts brouilleraient la comparaison des offres (gardées à part).
      const r = simuler({ graine, offre, rdvMax: 3, nuits, regles, tendances, theme, intrigues: false });
      return { nuits: r.nuits, avoir: r.etat.tresorerie + r.etat.reserve };
    }),
  );
}

beforeAll(() => {
  // Tendances tirées au hasard, 28 nuits : le joueur qui ne touche à rien contre celui qui s'adapte.
  jouer('fixe', 'classique', {}, undefined, 28);
  jouer('adaptatif', (e) => choixAdaptatif(e).offre, (e) => choixAdaptatif(e).regles, undefined, 28);
  jouer('adaptatifThemes', (e) => choixAdaptatif(e).offre, (e) => choixAdaptatif(e).regles, undefined, 28, (e) => choixAdaptatif(e).theme);
  // Une même tendance toutes les semaines, pour comparer les réponses.
  for (const t of ['congres', 'controles', 'match']) {
    jouer(`${t}-classique`, 'classique', {}, [t]);
    jouer(`${t}-cher`, 'classique', { tarif: 2 }, [t]);
  }
  jouer('controles-doux', 'classique', { tarif: 0 }, ['controles']);
  jouer('sans-classique', 'classique', {}, []);
  jouer('sans-doux', 'classique', { tarif: 0 }, []);
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

  it('le tarif −20 % : presque gratuit et apprécié pendant une semaine creuse, ruineux le reste du temps', () => {
    expect(argent('controles-doux')).toBeGreaterThan(argent('controles-classique') - 30);
    expect(reputation('controles-doux')).toBeGreaterThan(reputation('controles-classique') + 2);
    expect(argent('sans-doux')).toBeLessThan(argent('sans-classique') - 100);
  });

  it('un soir de match, le portier sauve la réputation ; la porte ouverte la ruine', () => {
    expect(reputation('match-stricte')).toBeGreaterThan(reputation('match-classique') + 10);
    expect(reputation('match-laxiste')).toBeLessThan(reputation('match-classique'));
  });

  it('le joueur qui suit les tendances fait mieux, en réputation comme en argent, que celui qui ne touche à rien', () => {
    expect(reputation('adaptatif')).toBeGreaterThan(reputation('fixe') + 2);
    expect(moyenne('adaptatif', (p) => p.avoir)).toBeGreaterThan(moyenne('fixe', (p) => p.avoir));
  });

  it('avec deux soirées à thème par semaine, il achète de la réputation sans se ruiner', () => {
    expect(reputation('adaptatifThemes')).toBeGreaterThan(reputation('adaptatif') + 3);
    expect(moyenne('adaptatifThemes', (p) => p.avoir)).toBeGreaterThan(moyenne('fixe', (p) => p.avoir) * 0.97);
  });
});
