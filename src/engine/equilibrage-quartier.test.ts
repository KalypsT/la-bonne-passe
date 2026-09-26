import { beforeAll, describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { ACTEURS, ACTEURS_ORDRE } from '../content/relations';
import { evenementsExterieurs, mesurerRenouvellement, simuler, type OptionsSimulation } from './simulation';

// Le quartier vit-il ? (v0.5) Les relations réagissent au style de la maison, et les soigner coûte, mais rapporte.
// La rivale frappe plus fort la maison qui lui prend sa clientèle, et une trêve la calme.
// Joueur actif, classique à 3 rendez-vous, 56 nuits (le palier 3 tombe le jour 28), 10 graines.
// v0.5, partie 5 : le joueur tranche les cartes au hasard et laisse filer une alerte sur quatre. Le joueur prudent, qui
// prend toujours le premier choix, disait oui à toutes les bonnes causes du quartier : avec deux imprévus par soirée,
// sa réputation, sa presse et l'agressivité de la rivale saturaient toutes (voir docs/EQUILIBRAGE.md).

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
type Partie = ReturnType<typeof simuler>;
const parties = new Map<string, Partie[]>();

function jouer(nom: string, options: Partial<OptionsSimulation>) {
  parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...options })));
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
  jouer('feutree', { offre: 'feutree', rdvMax: 4 });
  jouer('treve', { rivale: 'treve' });
  jouer('accueil', { accueil: 1 });
  jouer('equipes', { accueil: 1, securite: 1 });
  jouer('assurance', { assurance: 2 });
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

describe('le Chat Noir', () => {
  const coups = (p: Partie) => p.nuits.slice(28).flatMap((n) => n.rivale.actions).filter((a) => a !== 'visite').length;

  it('se présente dans chaque partie, puis frappe deux à trois fois au deuxième mois', () => {
    for (const p of parties.get('classique')!) expect(p.nuits.some((n) => n.rivale.actions.includes('visite'))).toBe(true);
    const c = moyenne('classique', coups);
    console.log('coups au mois 2', ['classique', 'laxiste', 'stricte', 'feutree', 'treve'].map((n) => `${n} ${moyenne(n, coups).toFixed(1)}`).join(', '));
    expect(c).toBeGreaterThanOrEqual(1.5);
    expect(c).toBeLessThanOrEqual(4);
  });

  it('en veut surtout à la maison qui lui prend ses habitués', () => {
    const agressivite = (nom: string) => moyenne(nom, (p) => fin(p).rivale.agressivite);
    console.log('agressivité', ['classique', 'laxiste', 'stricte', 'feutree', 'treve'].map((n) => `${n} ${agressivite(n).toFixed(0)}`).join(', '));
    expect(agressivite('feutree')).toBeGreaterThan(agressivite('laxiste') + 15);
  });

  it('une trêve la calme, et limite ses coups', () => {
    expect(moyenne('treve', (p) => fin(p).rivale.agressivite)).toBeLessThan(moyenne('classique', (p) => fin(p).rivale.agressivite) - 5);
    expect(moyenne('treve', coups)).toBeLessThan(moyenne('classique', coups));
  });
});

describe('les équipes Accueil et Sécurité, et l’assurance', () => {
  /** Alertes par soirée, des nuits 36 à 56 (les équipes sont engagées dès le jour 28). */
  const alertes = (nom: string) => moyenne(nom, (p) => mesurerRenouvellement(p.nuits.slice(35)).alertes);
  const avoir = (nom: string) => moyenne(nom, (p) => p.etat.tresorerie + p.etat.reserve);

  it('règlent une partie des alertes, sans vider la soirée', () => {
    console.log('alertes par soirée', ['classique', 'accueil', 'equipes'].map((n) => `${n} ${alertes(n).toFixed(1)}`).join(', '));
    expect(alertes('equipes')).toBeLessThan(alertes('classique') - 0.5);
    expect(alertes('equipes')).toBeGreaterThan(alertes('classique') * 0.6);
  });

  it('se paient : une équipe coûte 1 500 à 4 000 € sur le deuxième mois, deux davantage', () => {
    const une = avoir('classique') - avoir('accueil');
    const deux = avoir('classique') - avoir('equipes');
    console.log('coût sur le mois 2', `une équipe ${une.toFixed(0)} €`, `deux ${deux.toFixed(0)} €`, `avoir classique ${avoir('classique').toFixed(0)} €`);
    expect(une).toBeGreaterThan(1500);
    expect(une).toBeLessThan(4000);
    expect(deux).toBeGreaterThan(une);
  });

  it('l’assurance ne rapporte pas à un joueur prudent : les primes dépassent les remboursements', () => {
    const assurance = parties.get('assurance')!;
    const primes = assurance.reduce((t, p) => t + p.bilans.reduce((s, b) => s + b.comptes.depenses.assurance, 0), 0);
    const rembourse = assurance.reduce((t, p) => t + p.bilans.reduce((s, b) => s + b.comptes.recettes.assurance, 0), 0);
    console.log('assurance casse et amendes, 10 parties', `primes ${primes} €`, `remboursés ${rembourse} €`);
    expect(rembourse).toBeGreaterThan(0);
    expect(rembourse).toBeLessThan(primes);
  });
});

describe('les soirées du deuxième mois (v0.5, partie 5)', () => {
  /** Nuits 36 à 56 : le quartier, la rivale et la visibilité sont tous en place. */
  const mois2 = (nom: string) => parties.get(nom)!.map((p) => mesurerRenouvellement(p.nuits.slice(35)));
  const moy = (nom: string, f: (m: ReturnType<typeof mesurerRenouvellement>) => number) => mois2(nom).reduce((t, m) => t + f(m), 0) / GRAINES.length;

  it('environ deux imprévus par soirée', () => {
    console.log('imprévus', ['classique', 'feutree', 'stricte', 'laxiste'].map((n) => `${n} ${moy(n, (m) => m.imprevus).toFixed(2)}`).join(', '));
    for (const nom of ['classique', 'feutree', 'stricte']) expect(moy(nom, (m) => m.imprevus), nom).toBeGreaterThanOrEqual(1.8);
  });

  it('la soirée feutrée et la porte stricte ne sont plus des soirées creuses', () => {
    console.log('décisions', ['classique', 'feutree', 'stricte', 'laxiste'].map((n) => `${n} ${moy(n, (m) => m.decisions).toFixed(1)} (calmes ${(moy(n, (m) => m.soireesCalmes) * 100).toFixed(0)} %)`).join(', '));
    for (const nom of ['feutree', 'stricte']) {
      expect(moy(nom, (m) => m.decisions), nom).toBeGreaterThanOrEqual(5.5);
      expect(moy(nom, (m) => m.soireesCalmes), nom).toBeLessThanOrEqual(0.3);
    }
    // Et la maison la plus animée ne déborde pas.
    expect(moy('laxiste', (m) => m.alertes)).toBeLessThanOrEqual(10);
  });
});

describe('le quartier vit-il ? (v0.5, partie 6)', () => {
  /** Événements venus de dehors, par semaine du deuxième mois (nuits 29 à 56). */
  const semaines = (nom: string) =>
    parties.get(nom)!.flatMap((p) => [0, 1, 2, 3].map((k) => p.nuits.slice(28 + 7 * k, 35 + 7 * k).reduce((t, n) => t + evenementsExterieurs(n), 0)));

  it('chaque semaine, le quartier, la rivale ou la presse frappent à la porte', () => {
    for (const nom of ['classique', 'feutree', 'stricte', 'laxiste']) {
      const s = semaines(nom);
      const moyenne = s.reduce((a, b) => a + b, 0) / s.length;
      console.log('dehors', nom, moyenne.toFixed(1), 'par semaine,', s.filter((x) => x === 0).length, 'semaines sans');
      expect(moyenne, nom).toBeGreaterThanOrEqual(5);
      expect(s.filter((x) => x === 0).length, nom).toBe(0);
    }
  });
});
