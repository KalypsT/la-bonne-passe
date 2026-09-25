import { beforeAll, describe, expect, it } from 'vitest';
import type { Segment } from '../content/clientele';
import type { Regles } from './etat';
import { partsDeClientele, simuler, type ResumeNuit } from './simulation';

// Règles de la maison (palier 2) : chaque choix doit rapporter quelque chose et coûter autre chose.
// Parties du joueur actif, soirée classique à 3 rendez-vous, 21 nuits, 10 graines. Voir docs/EQUILIBRAGE.md.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const VARIANTES: Record<string, Partial<Regles>> = {
  base: {},
  tarifBas: { tarif: 0 },
  tarifHaut: { tarif: 2 },
  court: { formule: 'court' },
  complete: { formule: 'complete' },
  laxiste: { selection: 'laxiste' },
  stricte: { selection: 'stricte' },
  habitues: { priorite: 'habitues' },
  presses: { priorite: 'presses' },
};
const parties = new Map<string, ResumeNuit[][]>();

beforeAll(() => {
  for (const [nom, regles] of Object.entries(VARIANTES)) {
    parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 21, regles }).nuits));
  }
}, 30_000);

const moyenne = (nom: string, f: (nuits: ResumeNuit[]) => number) => {
  const liste = parties.get(nom)!;
  return liste.reduce((s, n) => s + f(n), 0) / liste.length;
};
/** Résultat réel moyen par jour, de la nuit 8 à la nuit 21 (règles ouvertes, équipe au complet). */
const argent = (nom: string) => moyenne(nom, (n) => n.slice(7).reduce((s, x) => s + x.resultat, 0) / 14);
const reputation = (nom: string) => moyenne(nom, (n) => n[20]!.reputation);
const satisfaction = (nom: string, s: Segment) => moyenne(nom, (n) => n[20]!.satisfaction[s]);
const part = (nom: string, s: Segment) => partsDeClientele(parties.get(nom)!.flatMap((n) => n.slice(7)))[s];

describe('équilibrage des règles de la maison', () => {
  it('tarif +20 % : plus d’argent, mais la réputation et les touristes en pâtissent', () => {
    expect(argent('tarifHaut')).toBeGreaterThan(argent('base') * 1.15);
    expect(reputation('tarifHaut')).toBeLessThan(reputation('base') - 2);
    expect(satisfaction('tarifHaut', 'touriste')).toBeLessThan(satisfaction('base', 'touriste') - 10);
  });

  it('tarif −20 % : moins d’argent, des touristes plus nombreux et plus contents', () => {
    expect(argent('tarifBas')).toBeLessThan(argent('base'));
    expect(satisfaction('tarifBas', 'touriste')).toBeGreaterThan(satisfaction('base', 'touriste') + 4);
    expect(part('tarifBas', 'touriste')).toBeGreaterThan(part('base', 'touriste'));
  });

  it('formule courte : meilleure réputation et clients d’affaires ravis, mais moins d’argent', () => {
    expect(reputation('court')).toBeGreaterThan(reputation('base') + 2);
    expect(satisfaction('court', 'affaires')).toBeGreaterThan(satisfaction('base', 'affaires') + 5);
    expect(argent('court')).toBeLessThan(argent('base'));
  });

  it('soirée complète : plus d’argent et des habitués comblés, mais les pressés fuient', () => {
    expect(argent('complete')).toBeGreaterThan(argent('base'));
    expect(satisfaction('complete', 'affaires')).toBeLessThan(satisfaction('base', 'affaires') - 5);
    expect(part('complete', 'habitue')).toBeGreaterThan(part('base', 'habitue'));
  });

  it('sélection stricte : une maison calme qui plaît aux habitués, sans les groupes', () => {
    expect(part('stricte', 'groupe')).toBeLessThan(part('base', 'groupe') - 8);
    expect(satisfaction('stricte', 'habitue')).toBeGreaterThan(satisfaction('base', 'habitue') + 5);
    expect(satisfaction('stricte', 'groupe')).toBeLessThan(satisfaction('base', 'groupe'));
  });

  it('sélection laxiste : la fête pour les groupes, au détriment de la réputation', () => {
    expect(part('laxiste', 'groupe')).toBeGreaterThan(part('base', 'groupe') + 4);
    expect(satisfaction('laxiste', 'groupe')).toBeGreaterThan(satisfaction('base', 'groupe'));
    expect(reputation('laxiste')).toBeLessThan(reputation('base'));
  });

  it('la priorité d’accueil soigne le segment choisi', () => {
    expect(satisfaction('habitues', 'habitue')).toBeGreaterThan(satisfaction('base', 'habitue'));
    expect(satisfaction('presses', 'affaires')).toBeGreaterThan(satisfaction('base', 'affaires'));
  });

  it('aucune règle ne gagne à la fois sur l’argent et sur la réputation', () => {
    for (const nom of Object.keys(VARIANTES)) {
      if (nom === 'base' || nom === 'habitues' || nom === 'presses') continue;
      const mieuxArgent = argent(nom) > argent('base') * 1.03;
      const mieuxReputation = reputation(nom) > reputation('base') + 1;
      expect(mieuxArgent && mieuxReputation, nom).toBe(false);
    }
  });
});
