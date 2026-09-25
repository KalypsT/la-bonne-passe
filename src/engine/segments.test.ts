import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { CLIENTS, trouverOffre } from '../content/clientele';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { fixerReputation } from './clientele';
import { accorderPalier } from './paliers';
import { arrivee, facteurDispute, modeleClient, segmentOuvert } from './soiree';
import { tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function soiree(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 3 }), jour: 5, minuteDuJour: h(22), briefingJour: 5, nuitsBouclees: 4 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], ...champs };
}

/** Fait arriver n clients (en vidant le quai à chaque fois) et renvoie leurs modèles. */
function arrivees(etat: EtatJeu, n: number): string[] {
  const tirage = creerTirage(9);
  const vus: string[] = [];
  for (let i = 0; i < n; i++) {
    const copie: EtatJeu = { ...structuredClone(etat), file: [] };
    arrivee(copie, tirage, { push: () => 0 });
    vus.push(...copie.file.map((c) => c.modele));
  }
  return vus;
}

describe('palier 2 : se faire un nom', () => {
  it('tombe à la fermeture quand la réputation atteint 25, et ouvre Affaires et Groupes', () => {
    const avant = { ...soiree(1), minuteDuJour: h(3, 55), reputation: B.REPUTATION_PALIER_2 + 0.5 };
    const { etat, evenements } = tick(avant);
    expect(etat.palier).toBe(2);
    expect(etat.systemes).toMatchObject({ affaires: true, groupes: true, bar: false, clientele: true });
    expect(etat.annonces).toEqual([2]);
    expect(evenements).toContainEqual({ type: 'palier', numero: 2 });
  });

  it('pas en dessous de 25, ni sans le palier 1', () => {
    expect(tick({ ...soiree(1), minuteDuJour: h(3, 55), reputation: 24 }).etat.palier).toBe(1);
    // Palier 0 : la première fermeture accorde d'abord le palier 1, puis le 2 si la réputation suffit.
    const deDepart = tick({ ...creerEtatInitial(), minuteDuJour: h(3, 55), briefingJour: 1, reputation: 30 }).etat;
    expect(deDepart.palier).toBe(2);
    expect(deDepart.annonces).toEqual([1, 2]);
  });
});

describe('segments Affaires et Groupes', () => {
  it('aucun client d’affaires ni de groupe avant le palier 2', () => {
    const modeles = arrivees(soiree(1, { reputation: 40 }), 200).map((id) => modeleClient(id).segment);
    expect(new Set(modeles)).toEqual(new Set(['touriste', 'habitue']));
    expect(segmentOuvert(soiree(1), 'affaires')).toBe(false);
  });

  it('après le palier 2, les quatre segments se présentent', () => {
    const segments = new Set(arrivees(soiree(2, { reputation: 40 }), 300).map((id) => modeleClient(id).segment));
    expect(segments).toEqual(new Set(['touriste', 'habitue', 'affaires', 'groupe']));
  });

  it('les clients d’affaires ont de gros budgets et peu de patience', () => {
    const affaires = CLIENTS.filter((c) => c.segment === 'affaires');
    const autres = CLIENTS.filter((c) => c.segment === 'touriste' || c.segment === 'habitue');
    expect(Math.min(...affaires.map((c) => c.budget))).toBeGreaterThan(Math.max(...autres.map((c) => c.budget)));
    for (const c of affaires) expect(c.patience).toBeLessThan(B.PATIENCE_CLIENT);
    const etat = soiree(2);
    arrivee(etat, creerTirage(1), { push: () => 0 });
    for (const client of etat.file) expect(client.patience).toBe(modeleClient(client.modele).patience ?? B.PATIENCE_CLIENT);
  });

  it('un client de groupe arrive souvent accompagné', () => {
    const etat = soiree(2, { reputation: 40 });
    let accompagnes = 0;
    let groupes = 0;
    const tirage = creerTirage(4);
    for (let i = 0; i < 300; i++) {
      const copie: EtatJeu = { ...structuredClone(etat), file: [] };
      arrivee(copie, tirage, { push: () => 0 });
      if (modeleClient(copie.file[0]!.modele).segment !== 'groupe') continue;
      groupes += 1;
      if (copie.file.length === 2) accompagnes += 1;
    }
    expect(groupes).toBeGreaterThan(10);
    expect(accompagnes / groupes).toBeGreaterThan(B.GROUPE_CHANCE_ACCOMPAGNE - 0.2);
    expect(accompagnes / groupes).toBeLessThan(B.GROUPE_CHANCE_ACCOMPAGNE + 0.2);
  });

  it('les groupes font monter le ton sur le quai', () => {
    const calme = soiree(2, { file: [{ id: 1, modele: 'retraite', patience: 50 }] });
    const bruyant = soiree(2, { file: [{ id: 1, modele: 'fetard', patience: 50 }, { id: 2, modele: 'temoin', patience: 50 }] });
    expect(facteurDispute(calme)).toBe(1);
    expect(facteurDispute(bruyant)).toBeCloseTo(B.GROUPE_DISPUTE ** 2);
  });
});

describe('offres et moral', () => {
  it('le happy hour fait monter la réputation plus vite, la soirée feutrée soigne la qualité', () => {
    expect(trouverOffre('happy').reputation).toBeGreaterThan(1);
    expect(trouverOffre('feutree').qualite).toBeGreaterThan(0);
    const rdv = { chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 };
    const gain = (offre: 'classique' | 'happy') => {
      const avant = soiree(1, { offre, rendezVous: [rdv] });
      fixerReputation(avant, 20);
      return tick(avant).etat.reputation - 20;
    };
    expect(gain('happy')).toBeGreaterThan(gain('classique'));
  });

  it('chaque rendez-vous use un peu le moral', () => {
    const rdv = { chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 };
    const avant = soiree(1, { rendezVous: [rdv] });
    const apres = tick(avant).etat;
    expect(apres.personnel[0]!.moral).toBeCloseTo(avant.personnel[0]!.moral - B.MORAL_PAR_RDV, 0);
  });

  it('le moral remonte seul, mais pas au-delà de son plafond naturel', () => {
    const bas = soiree(1, { minuteDuJour: h(12), personnel: creerEtatInitial().personnel.map((e) => ({ ...e, moral: 40, fatigue: 0 })) });
    expect(tick(bas).etat.personnel[0]!.moral).toBeGreaterThan(40);
    const plafond = soiree(1, { minuteDuJour: h(12), personnel: creerEtatInitial().personnel.map((e) => ({ ...e, moral: B.MORAL_PLAFOND_NATUREL, fatigue: 0 })) });
    expect(tick(plafond).etat.personnel[0]!.moral).toBe(B.MORAL_PLAFOND_NATUREL);
  });
});
