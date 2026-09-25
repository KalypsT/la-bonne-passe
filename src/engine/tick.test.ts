import { describe, expect, it } from 'vitest';
import { MINUTES_PAR_TICK } from '../content/balance';
import { creerEtatInitial } from './etat';
import { tirer } from './hasard';
import { tick } from './tick';

describe('tick du moteur', () => {
  it('avance le temps de 5 minutes', () => {
    const avant = creerEtatInitial();
    const { etat: apres } = tick(avant);
    expect(MINUTES_PAR_TICK).toBe(5);
    expect(apres.minuteDuJour - avant.minuteDuJour).toBe(5);
    expect(apres.jour).toBe(avant.jour);
  });

  it("ne modifie pas l'état reçu", () => {
    const avant = creerEtatInitial();
    const copie = structuredClone(avant);
    tick(avant);
    expect(avant).toEqual(copie);
  });

  it('passe au jour suivant à minuit', () => {
    const etat = { ...creerEtatInitial(), minuteDuJour: 23 * 60 + 55 };
    const { etat: apres, evenements } = tick(etat);
    expect(apres.jour).toBe(2);
    expect(apres.minuteDuJour).toBe(0);
    expect(evenements).toEqual([{ type: 'nouveauJour', jour: 2 }]);
  });
});

describe('hasard à graine fixe', () => {
  it('rejoue la même suite avec la même graine', () => {
    const suite = (graine: number) => {
      let etat = graine;
      return Array.from({ length: 5 }, () => {
        const r = tirer(etat);
        etat = r.etat;
        return r.valeur;
      });
    };
    expect(suite(42)).toEqual(suite(42));
    expect(suite(42)).not.toEqual(suite(43));
    for (const v of suite(7)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
