import { describe, expect, it } from 'vitest';
import { DEFIS_SEMAINE, trouverDefi } from '../content/defis';
import { creerEtatInitial } from '../engine/etat';
import { texteEvenement } from './journal';
import { formaterMesure, texteDefi, texteObjectif } from './objectifs';

describe('textes des bilans', () => {
  const partie = creerEtatInitial({ nomMaison: 'Le Velours' });

  it('les défis affichent leur cible, les objectifs leur segment', () => {
    expect(texteDefi(trouverDefi('congres')!, partie)).toContain('12 clients d’affaires');
    expect(texteObjectif({ objectif: 'satisfaction', cible: 60, segment: 'affaires' })).toBe(
      'Porter la satisfaction des clients d’affaires, ta clientèle principale, à 60.',
    );
    expect(texteObjectif({ objectif: 'avoir', cible: 3000, segment: null })).toMatch(/^Avoir encore 3.000\s€/);
    expect(formaterMesure('perdus', 12)).toBe('12 %');
    for (const d of DEFIS_SEMAINE) expect(texteDefi(d, partie), d.id).not.toMatch(/\{/);
  });

  it('le journal raconte les défis et la fin du mois', () => {
    expect(texteEvenement({ type: 'defi', id: 'match' }, partie)).toBe('Défi de la semaine : pas une chaise cassée.');
    expect(texteEvenement({ type: 'defiConclu', id: 'bar', reussi: false }, partie)).toBe('Défi manqué : le bar à l’honneur.');
    expect(texteEvenement({ type: 'bilanMois', numero: 1, reussi: true }, partie)).toBe('Fin du mois 1 : objectif atteint.');
  });
});
