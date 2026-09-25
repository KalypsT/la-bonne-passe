import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { demandePrix, prochainClient, quotaAtteint } from './regles';
import { arrivee, employeDisponible, facteurDispute, facteurDemande, modeleClient } from './soiree';
import { appliquerOrdres, tick, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function soiree(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 7 }), jour: 5, minuteDuJour: h(22), briefingJour: 5, nuitsBouclees: 4 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], ...champs };
}

const regle = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]).etat;
const rdv = (modele: string, formule: B.IdFormule = 'standard') => ({ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele, formule, duree: 60, restant: 5 });

describe('règles de la maison : ouverture', () => {
  it('fermées avant le palier 2, ouvertes après, et notées au journal', () => {
    const ordre: Ordre = { type: 'regle', regle: 'tarif', valeur: 2 };
    expect(regle(soiree(1), ordre).regles.tarif).toBe(1);
    const { etat, evenements } = appliquerOrdres(soiree(2), [ordre]);
    expect(etat.regles.tarif).toBe(2);
    expect(evenements).toEqual([{ type: 'regle', regle: 'tarif', valeur: 2 }]);
    expect(regle(soiree(2), { type: 'regle', regle: 'tarif', valeur: 7 }).regles.tarif).toBe(1);
    expect(regle(soiree(2), { type: 'regle', regle: 'selection', valeur: 'stricte' }).regles.selection).toBe('stricte');
  });
});

describe('tarif général', () => {
  it('+20 % se paie 20 % plus cher, −20 % 20 % moins cher', () => {
    const encaisse = (tarif: number) => {
      const avant = regle(soiree(2, { rendezVous: [rdv('banquier')] }), { type: 'regle', regle: 'tarif', valeur: tarif });
      return tick(avant).etat.tresorerie - avant.tresorerie;
    };
    const normal = encaisse(1);
    expect(encaisse(2) / normal).toBeCloseTo(1.2, 1);
    expect(encaisse(0) / normal).toBeCloseTo(0.8, 1);
  });

  it('effet inverse sur la demande, plus fort chez les touristes que chez les affaires', () => {
    const cher = regle(soiree(2), { type: 'regle', regle: 'tarif', valeur: 2 });
    expect(demandePrix(cher, 'touriste')).toBeCloseTo(1 - B.ELASTICITE_PRIX.touriste * 0.2);
    expect(demandePrix(cher, 'affaires')).toBeGreaterThan(demandePrix(cher, 'touriste'));
    expect(facteurDemande(cher)).toBeLessThan(1);
    const bradé = regle(soiree(2), { type: 'regle', regle: 'tarif', valeur: 0 });
    expect(facteurDemande(bradé)).toBeGreaterThan(1);
  });

  it('le prix se sent dans la satisfaction des segments sensibles', () => {
    const gain = (tarif: number) => {
      const avant = regle(soiree(2, { rendezVous: [rdv('touriste-egare')] }), { type: 'regle', regle: 'tarif', valeur: tarif });
      return tick(avant).etat.clientele.satisfaction.touriste - avant.clientele.satisfaction.touriste;
    };
    expect(gain(2)).toBeLessThan(gain(1));
    expect(gain(0)).toBeGreaterThan(gain(1));
  });

  it('à bas prix, on patiente plus longtemps sur le quai', () => {
    const patience = (tarif: number) => {
      const etat = regle(soiree(2, { file: [] }), { type: 'regle', regle: 'tarif', valeur: tarif });
      arrivee(etat, creerTirage(1), { push: () => 0 });
      const c = etat.file[0]!;
      return c.patience / (modeleClient(c.modele).patience ?? B.PATIENCE_CLIENT);
    };
    expect(patience(0)).toBeGreaterThan(patience(1));
    expect(patience(2)).toBeLessThan(patience(1));
  });
});

describe('formules', () => {
  it('un rendez-vous court est plus bref, moins cher et compte moins dans le maximum du soir', () => {
    const court = regle(soiree(2, { file: [{ id: 1, modele: 'banquier', patience: 30 }] }), { type: 'regle', regle: 'formule', valeur: 'court' });
    const r = tick(court).etat.rendezVous[0]!;
    expect(r.formule).toBe('court');
    expect(r.duree).toBeLessThanOrEqual(Math.ceil(B.DUREE_RDV_MAX * B.FORMULES.court.duree / 5) * 5);
    const fini = tick({ ...court, file: [], rendezVous: [rdv('banquier', 'court')] }).etat;
    expect(fini.personnel[0]!.chargeCeSoir).toBeCloseTo(B.FORMULES.court.charge);
    expect(fini.personnel[0]!.rdvCeSoir).toBe(1);
  });

  it('le maximum du soir se compte en charge : 4 courts ou 2 soirées complètes pour un maximum de 3', () => {
    const base = soiree(2, { rdvMax: 3 });
    const avecCharge = (formule: B.IdFormule, charge: number) => {
      const etat = regle(base, { type: 'regle', regle: 'formule', valeur: formule });
      etat.personnel[0]!.chargeCeSoir = charge;
      return etat;
    };
    expect(quotaAtteint(avecCharge('court', 3 * 0.75), avecCharge('court', 3 * 0.75).personnel[0]!)).toBe(false);
    expect(quotaAtteint(avecCharge('court', 4 * 0.75), avecCharge('court', 4 * 0.75).personnel[0]!)).toBe(true);
    expect(employeDisponible(avecCharge('complete', 1.5), 'sanne')).toBe(true);
    expect(employeDisponible(avecCharge('complete', 3), 'sanne')).toBe(false);
  });

  it('un rendez-vous garde sa formule si la règle change en cours de route', () => {
    const avant = regle(soiree(2, { rendezVous: [rdv('retraite', 'complete')] }), { type: 'regle', regle: 'formule', valeur: 'court' });
    const tresorerie = avant.tresorerie;
    const apres = tick(avant).etat;
    expect(apres.personnel[0]!.chargeCeSoir).toBeCloseTo(B.FORMULES.complete.charge);
    expect(apres.tresorerie - tresorerie).toBeGreaterThan(100);
  });
});

describe('sélection à l’entrée', () => {
  it('stricte : une partie des groupes est refusée à la porte, et le portier se paie à l’ouverture', () => {
    const stricte = regle(soiree(2), { type: 'regle', regle: 'selection', valeur: 'stricte' });
    const tirage = creerTirage(5);
    let refus = 0;
    for (let i = 0; i < 300; i++) {
      const copie: EtatJeu = { ...structuredClone(stricte), file: [] };
      const evenements: { type: string }[] = [];
      arrivee(copie, tirage, evenements);
      if (evenements.some((e) => e.type === 'refuse')) refus += 1;
    }
    expect(refus).toBeGreaterThan(20);
    const ouverture = regle({ ...stricte, minuteDuJour: h(19, 55), briefingJour: 5 }, { type: 'regle', regle: 'selection', valeur: 'stricte' });
    const { etat, evenements } = tick(ouverture);
    expect(evenements).toContainEqual({ type: 'portier', montant: B.SELECTIONS.stricte.cout });
    expect(etat.nuit?.depenses).toBe(B.SELECTIONS.stricte.cout);
  });

  it('les disputes : trois fois moins en stricte, plus nombreuses en laxiste', () => {
    const file = [{ id: 1, modele: 'fetard', patience: 50 }, { id: 2, modele: 'temoin', patience: 50 }];
    const facteur = (valeur: B.IdSelection) => facteurDispute(regle(soiree(2, { file }), { type: 'regle', regle: 'selection', valeur }));
    expect(facteur('stricte')).toBeCloseTo(facteur('normale') * B.SELECTIONS.stricte.dispute);
    expect(facteur('laxiste')).toBeGreaterThan(facteur('normale'));
  });
});

describe('priorité d’accueil', () => {
  const file = [
    { id: 1, modele: 'etudiant', patience: 50 },
    { id: 2, modele: 'retraite', patience: 45 },
    { id: 3, modele: 'banquier', patience: 20 },
  ];
  const segment = (c: { modele: string }) => modeleClient(c.modele).segment;
  it('ordre d’arrivée, habitués d’abord ou pressés d’abord', () => {
    const avec = (valeur: B.IdPriorite) => regle(soiree(2, { file }), { type: 'regle', regle: 'priorite', valeur });
    expect(prochainClient(avec('arrivee'), segment)?.id).toBe(1);
    expect(prochainClient(avec('habitues'), segment)?.id).toBe(2);
    expect(prochainClient(avec('presses'), segment)?.id).toBe(3);
  });

  it('le client choisi entre en chambre le premier', () => {
    const etat = regle(soiree(2, { file, prochainClient: 10 }), { type: 'regle', regle: 'priorite', valeur: 'habitues' });
    const apres = tick(etat).etat;
    expect(apres.rendezVous[0]?.modele).toBe('retraite');
    expect(apres.file.map((c) => c.id).slice(0, 2)).toEqual([1, 3]);
  });
});
