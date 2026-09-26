import { beforeAll, describe, expect, it } from 'vitest';
import { mesurerRenouvellement, simuler, type OptionsSimulation, type Renouvellement } from './simulation';

// Les soirées se renouvellent-elles ? (v0.4) Gardes de l'intrigue du voisin et de la mesure du renouvellement.
// Joueur actif, classique à 3 rendez-vous, 28 nuits, 10 graines.

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
type Partie = ReturnType<typeof simuler>;
const parties = new Map<string, Partie[]>();

function jouer(nom: string, options: Partial<OptionsSimulation>) {
  parties.set(nom, GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 28, ...options })));
}

/** Nuit où le voisin a sonné pour la première fois, ou null. */
const nuitDuVoisin = (p: Partie) => p.nuits.find((n) => n.intrigues.includes('voisin:plainte'))?.numero ?? null;

beforeAll(() => {
  jouer('classique', {});
  jouer('laxiste', { regles: { selection: 'laxiste' } });
  jouer('stricte', { regles: { selection: 'stricte' } });
  jouer('laxiste-hasard', { regles: { selection: 'laxiste' }, politique: 'hasard' });
  jouer('classique-hasard', { politique: 'hasard' });
  jouer('sans-intrigue', { intrigues: false });
}, 30_000);

/** Nuit où un arc a sorti sa première carte, ou null. */
const debutArc = (p: Partie, id: string) => p.nuits.find((n) => n.intrigues.some((x) => x.startsWith(`${id}:`)))?.numero ?? null;

describe('le voisin du dessus', () => {
  it('une porte laxiste le fait descendre vite ; un portier le laisse dormir', () => {
    // Il descend presque toujours dans le mois, et en médiane avant la nuit 14. Quand Mila et Jonas occupent
    // les deux places d'intrigue (dès la nuit 10), il attend son tour.
    const laxiste = parties.get('laxiste')!.map(nuitDuVoisin);
    expect(laxiste.filter((n) => n !== null).length).toBeGreaterThanOrEqual(8);
    const triees = laxiste.map((n) => n ?? 99).sort((a, b) => a - b);
    expect(triees[Math.floor(triees.length / 2)]).toBeLessThanOrEqual(14);
    expect(parties.get('stricte')!.map(nuitDuVoisin).every((n) => n === null)).toBe(true);
  });

  it('la plupart des joueurs le rencontrent dans le mois, même sans excès', () => {
    expect(parties.get('classique')!.filter((p) => nuitDuVoisin(p) !== null).length).toBeGreaterThanOrEqual(6);
  });

  it('les choix mènent à des dénouements différents', () => {
    const fins = new Set(parties.get('laxiste-hasard')!.flatMap((p) => p.intrigues.filter((f) => f.id === 'voisin').map((f) => f.fin)));
    expect(fins.size).toBeGreaterThanOrEqual(3);
  });
});

describe('les arcs de Mila et de Jonas', () => {
  it('le joueur qui les embauche vit leurs histoires dans le mois', () => {
    for (const id of ['mila', 'jonas']) {
      const debuts = parties.get('classique')!.map((p) => debutArc(p, id));
      expect(debuts.filter((n) => n !== null && n <= 20).length, id).toBeGreaterThanOrEqual(8);
    }
  });

  it('les choix mènent à des dénouements différents', () => {
    for (const id of ['mila', 'jonas']) {
      const fins = new Set(parties.get('classique-hasard')!.flatMap((p) => p.intrigues.filter((f) => f.id === id).map((f) => f.fin)));
      expect(fins.size, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('les histoires ne ruinent pas un joueur raisonnable, ni ne le font perdre en réputation', () => {
    const avoir = (nom: string) => parties.get(nom)!.reduce((s, p) => s + p.etat.tresorerie + p.etat.reserve, 0) / GRAINES.length;
    const reputation = (nom: string) => parties.get(nom)!.reduce((s, p) => s + p.nuits[27]!.reputation, 0) / GRAINES.length;
    // L'argent d'une partie varie de 2 000 € d'une graine à l'autre : sur 10 graines, 1 000 € de tolérance.
    expect(avoir('classique')).toBeGreaterThan(avoir('sans-intrigue') - 1000);
    expect(reputation('classique')).toBeGreaterThan(reputation('sans-intrigue') - 3);
  });
});

describe('les imprévus se renouvellent', () => {
  it('une quinzaine de cartes différentes par mois, aucune deux fois dans la même semaine', () => {
    for (const nom of ['classique', 'laxiste', 'stricte']) {
      const mesures = parties.get(nom)!.map((p) => mesurerRenouvellement(p.nuits));
      const moy = (f: (m: Renouvellement) => number) => mesures.reduce((t, m) => t + f(m), 0) / mesures.length;
      expect(moy((m) => m.imprevusDifferents), nom).toBeGreaterThanOrEqual(12);
      expect(Math.max(...mesures.map((m) => m.repetitionMax)), nom).toBeLessThanOrEqual(5);
      expect(moy((m) => m.dejaVus7), nom).toBeLessThanOrEqual(0.1);
      expect(moy((m) => m.imprevus), nom).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('la porte, les tendances et les thèmes changent les cartes qui sortent', () => {
    const vues = (nom: string) => new Set(parties.get(nom)!.flatMap((p) => p.nuits.flatMap((n) => n.imprevus)));
    expect(vues('stricte').has('refoule')).toBe(true);
    expect(vues('laxiste').has('refoule')).toBe(false);
    expect(vues('laxiste').has('enceinte')).toBe(true);
    expect(vues('stricte').has('enceinte')).toBe(false);
  });
});

describe('la mesure du renouvellement', () => {
  it('chaque nuit compte ses décisions : imprévus, cartes d’intrigue en soirée et alertes apparues', () => {
    for (const p of parties.get('classique')!) {
      for (const n of p.nuits) {
        const alertes = Object.values(n.alertes).reduce((a, b) => a + b, 0);
        expect(n.decisions).toBe(n.imprevus.length + n.intriguesSoiree + alertes);
      }
    }
    const imprevus = parties.get('classique')!.flatMap((p) => p.nuits.flatMap((n) => n.imprevus));
    expect(imprevus.length).toBeGreaterThan(0);
  });

  it('la politique au hasard se rejoue à l’identique', () => {
    const a = simuler({ graine: 4, offre: 'classique', nuits: 10, politique: 'hasard' });
    const b = simuler({ graine: 4, offre: 'classique', nuits: 10, politique: 'hasard' });
    expect(a.nuits).toEqual(b.nuits);
  });
});
