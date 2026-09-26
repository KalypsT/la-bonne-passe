import { beforeAll, describe, expect, it } from 'vitest';
import { simuler, type OptionsSimulation } from './simulation';

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
}, 30_000);

describe('le voisin du dessus', () => {
  it('une porte laxiste le fait descendre vite ; un portier le laisse dormir', () => {
    const laxiste = parties.get('laxiste')!.map(nuitDuVoisin);
    expect(laxiste.filter((n) => n !== null && n <= 14).length).toBeGreaterThanOrEqual(8);
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
