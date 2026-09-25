import { beforeAll, describe, expect, it } from 'vitest';
import type { Segment } from '../content/clientele';
import { simuler, type ResumeNuit } from './simulation';

// Soirées à thème, programmées le vendredi et le samedi : chacune soigne son monde.
// Joueur actif, classique à 3 rendez-vous, 35 nuits, 6 graines.

const GRAINES = [1, 2, 3, 4, 5, 6];
const parties = new Map<string, ResumeNuit[][]>();
const vendrediSamedi = (theme: string | null) => (e: { jour: number }) => ([4, 5].includes((e.jour - 1) % 7) ? theme : null);

function jouer(nom: string, theme: string | null, tendances: string[] = []) {
  parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 35, tendances, theme: vendrediSamedi(theme) }).nuits));
}

beforeAll(() => {
  for (const theme of [null, 'masquee', 'burlesque', 'jazz', 'anneesFolles']) jouer(String(theme), theme);
  jouer('match-sans', null, ['match']);
  jouer('match-burlesque', 'burlesque', ['match']);
}, 30_000);

const moyenne = (nom: string, f: (n: ResumeNuit[]) => number) => {
  const liste = parties.get(nom)!;
  return liste.reduce((s, n) => s + f(n), 0) / liste.length;
};
const satisfaction = (nom: string, s: Segment) => moyenne(nom, (n) => n[34]!.satisfaction[s]);
const bar = (nom: string) => moyenne(nom, (n) => n.slice(14).reduce((s, x) => s + x.bar, 0));
const argent = (nom: string) => moyenne(nom, (n) => n.slice(14).reduce((s, x) => s + x.resultat, 0) / 21);

describe('équilibrage des soirées à thème', () => {
  it('la soirée masquée soigne les clients d’affaires, le jazz les habitués', () => {
    expect(satisfaction('masquee', 'affaires')).toBeGreaterThan(satisfaction('null', 'affaires') + 4);
    expect(satisfaction('jazz', 'habitue')).toBeGreaterThan(satisfaction('null', 'habitue') + 4);
  });

  it('les années folles font tourner le bar', () => {
    expect(bar('anneesFolles')).toBeGreaterThan(bar('null') * 1.12);
  });

  it('un soir de match, le burlesque fait parler de la maison', () => {
    const rep = (nom: string) => moyenne(nom, (n) => n[34]!.reputation);
    expect(rep('match-burlesque')).toBeGreaterThan(rep('match-sans') + 2);
    expect(satisfaction('match-burlesque', 'groupe')).toBeGreaterThan(satisfaction('match-sans', 'groupe'));
  });

  it('deux soirées par semaine ne ruinent personne', () => {
    for (const theme of ['masquee', 'burlesque', 'jazz', 'anneesFolles']) expect(argent(theme), theme).toBeGreaterThan(argent('null') * 0.9);
  });
});
