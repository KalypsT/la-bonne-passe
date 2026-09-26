import { beforeAll, describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { ACTEURS, ACTEURS_ORDRE } from '../content/relations';
import { simuler, type OptionsSimulation } from './simulation';

// Le quartier vit-il ? (v0.5) Les relations réagissent au style de la maison, et les soigner coûte, mais rapporte.
// Joueur actif, classique à 3 rendez-vous, 56 nuits (le palier 3 tombe le jour 28), 10 graines.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
type Partie = ReturnType<typeof simuler>;
const parties = new Map<string, Partie[]>();

function jouer(nom: string, options: Partial<OptionsSimulation>) {
  parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, ...options })));
}

const EVENEMENTS_BONS = new Set(ACTEURS_ORDRE.map((a) => ACTEURS[a].evenementBons));
const EVENEMENTS_MAUVAIS = new Set(ACTEURS_ORDRE.map((a) => ACTEURS[a].evenementMauvais));
/** Événements du quartier du deuxième mois, d'une sorte ou de l'autre. */
const evenements = (p: Partie, sorte: Set<string>) =>
  p.nuits.slice(28).flatMap((n) => n.intrigues).map((x) => x.split(':')[0]!).filter((id) => sorte.has(id));
const fin = (p: Partie) => p.nuits[p.nuits.length - 1]!;
const moyenne = (nom: string, f: (p: Partie) => number) => parties.get(nom)!.reduce((t, p) => t + f(p), 0) / GRAINES.length;

beforeAll(() => {
  jouer('classique', {});
  jouer('laxiste', { regles: { selection: 'laxiste' } });
  jouer('stricte', { regles: { selection: 'stricte' } });
  jouer('soigneur', { relations: 'entretien', cibleRelations: 45 });
}, 60_000);

describe('le quartier réagit au style de la maison', () => {
  it('une porte laxiste fâche les voisins : mauvais termes et pétition', () => {
    const laxiste = parties.get('laxiste')!;
    console.log('voisins nuit 56', ['classique', 'laxiste', 'stricte', 'soigneur'].map((n) => `${n} ${moyenne(n, (p) => fin(p).relations.voisins).toFixed(0)}`).join(', '));
    // Le joueur simulé fait rentrer les groupes bruyants dès l'alerte : un joueur distrait finit bien plus bas (−88 en moyenne).
    console.log('laxiste en mauvais termes', laxiste.filter((p) => fin(p).relations.voisins <= B.RELATIONS.mauvais).length, 'pétitions', laxiste.filter((p) => evenements(p, EVENEMENTS_MAUVAIS).includes('petition')).length);
    expect(laxiste.filter((p) => fin(p).relations.voisins <= B.RELATIONS.mauvais).length).toBeGreaterThanOrEqual(5);
    expect(laxiste.filter((p) => evenements(p, EVENEMENTS_MAUVAIS).includes('petition')).length).toBeGreaterThanOrEqual(4);
  });

  it('un portier garde les voisins de bonne humeur', () => {
    expect(moyenne('stricte', (p) => fin(p).relations.voisins)).toBeGreaterThanOrEqual(20);
    expect(parties.get('stricte')!.every((p) => !evenements(p, EVENEMENTS_MAUVAIS).includes('petition'))).toBe(true);
  });

  it('la maison classique reste entre les deux', () => {
    const v = moyenne('classique', (p) => fin(p).relations.voisins);
    expect(v).toBeGreaterThan(moyenne('laxiste', (p) => fin(p).relations.voisins) + 15);
    expect(v).toBeLessThan(moyenne('stricte', (p) => fin(p).relations.voisins));
  });
});

describe('soigner ses relations coûte, mais ouvre des portes', () => {
  it('le joueur qui soigne le quartier obtient des services, pour quelques milliers d’euros', () => {
    const soigneur = parties.get('soigneur')!;
    const bons = soigneur.map((p) => evenements(p, EVENEMENTS_BONS).length);
    console.log('soigneur : mairie nuit 56', moyenne('soigneur', (p) => fin(p).relations.mairie).toFixed(0), 'opportunités', bons.join(','),
      'avoir', moyenne('soigneur', (p) => p.etat.tresorerie + p.etat.reserve).toFixed(0), 'contre', moyenne('classique', (p) => p.etat.tresorerie + p.etat.reserve).toFixed(0));
    expect(soigneur.filter((p) => fin(p).relations.mairie >= B.RELATIONS.bons).length).toBeGreaterThanOrEqual(5);
    expect(bons.reduce((a, b) => a + b, 0) / GRAINES.length).toBeGreaterThanOrEqual(1);
    const cout = moyenne('classique', (p) => p.etat.tresorerie + p.etat.reserve) - moyenne('soigneur', (p) => p.etat.tresorerie + p.etat.reserve);
    expect(cout).toBeGreaterThan(500);
    expect(cout).toBeLessThan(5000);
  });

  // La presse, elle, suit les choix des cartes : le joueur simulé, qui dit toujours oui aux journalistes, finit adoré.
  it('sans rien faire, la mairie et la police restent dans la zone neutre', () => {
    for (const a of ['mairie', 'police'] as const) {
      const v = moyenne('classique', (p) => fin(p).relations[a]);
      expect(v, a).toBeGreaterThan(B.RELATIONS.mauvais);
      expect(v, a).toBeLessThan(B.RELATIONS.bons);
    }
  });
});
