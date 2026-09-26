import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { TEXTES_ALERTES } from '../content/alertes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { disputeSecurite, equipeDe, indemniser, partReglee, patienceAccueil, primeAssurance, qualiteEquipes } from './equipes';
import { vivreMinuteries } from './minuteries';
import { accorderPalier } from './paliers';
import { facteurDispute } from './soiree';
import { appliquerOrdres, tick, type EvenementMoteur } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 3, un mardi à 22 h, maison ouverte. */
function maison(champs: Partial<EtatJeu> = {}, palier = 3): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 11 }), jour: 30, minuteDuJour: h(22), briefingJour: 30, nuitsBouclees: 29, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], tresorerie: 5_000, ...champs };
}

const avecEquipes = (etat: EtatJeu, accueil: number, securite: number): EtatJeu => ({ ...etat, equipes: { ...etat.equipes, accueil, securite } });

describe('les équipes Accueil et Sécurité', () => {
  it('s’ouvrent au palier 3, de 0 au maximum, et se paient chaque midi', () => {
    expect(maison({}, 2).systemes.accueil).toBe(false);
    const avant = appliquerOrdres(maison({}, 2), [{ type: 'equipeQuartier', equipe: 'accueil', effectif: 1 }]).etat;
    expect(avant.equipes.accueil).toBe(0);
    let etat = maison({ minuteDuJour: h(11, 55) });
    etat = appliquerOrdres(etat, [
      { type: 'equipeQuartier', equipe: 'accueil', effectif: 1 },
      { type: 'equipeQuartier', equipe: 'securite', effectif: 2 },
      { type: 'equipeQuartier', equipe: 'securite', effectif: 3 },
    ]).etat;
    expect(etat.equipes).toMatchObject({ accueil: 1, securite: 2 });
    const { evenements } = tick(etat);
    const salaires = evenements.find((e) => e.type === 'salaires') as Extract<EvenementMoteur, { type: 'salaires' }>;
    expect(salaires.montant).toBe(etat.equipes.menage * B.SALAIRE_MENAGE + B.EQUIPES.accueil.salaire + 2 * B.EQUIPES.securite.salaire);
  });

  it('l’accueil fait patienter, la sécurité calme le quai et rassure les clients d’affaires', () => {
    const etat = avecEquipes(maison(), 2, 2);
    expect(patienceAccueil(etat)).toBe(2 * B.EQUIPES.accueil.patience);
    expect(qualiteEquipes(etat, 'affaires')).toBeCloseTo(2 * B.EQUIPES.securite.qualiteAffaires);
    expect(qualiteEquipes(etat, 'touriste')).toBe(0);
    expect(disputeSecurite(etat)).toBeCloseTo(1 - 2 * B.EQUIPES.securite.dispute);
    const groupes = { ...maison(), file: [{ id: 1, modele: 'fetard', patience: 40 }, { id: 2, modele: 'fetard', patience: 40 }] };
    expect(facteurDispute(avecEquipes(groupes, 0, 1))).toBeLessThan(facteurDispute(groupes));
  });

  it('chacune règle seule une part des alertes de son domaine, sans bulle', () => {
    expect(equipeDe('presse')).toBe('accueil');
    expect(equipeDe('sabotage')).toBe('securite');
    expect(equipeDe('pause')).toBeUndefined();
    for (const id of ['presse', 'bruit', 'ivre', 'photographe', 'sabotage'] as const) expect(TEXTES_ALERTES[id].reglee, id).toBeTruthy();
    expect(partReglee(avecEquipes(maison(), 2, 1), 'accueil')).toBeCloseTo(2 * B.EQUIPES.accueil.regle);

    // Des faux clients, cent soirs de suite : la sécurité en règle une partie, sans rien coûter.
    let regles = 0;
    let bulles = 0;
    for (let g = 1; g <= 100; g++) {
      const etat = avecEquipes(maison({ hasardAlertes: g }), 0, 1);
      etat.rivale.sabotage = true;
      const evenements: EvenementMoteur[] = [];
      for (let i = 0; i < 300 && etat.rivale.sabotage; i++) vivreMinuteries(etat, evenements);
      if (evenements.some((e) => e.type === 'alerteReglee')) regles += 1;
      if (etat.minuteries.some((m) => m.id === 'sabotage')) bulles += 1;
      expect(etat.tresorerie).toBe(5_000);
    }
    expect(regles + bulles).toBe(100);
    expect(regles).toBeGreaterThan(15);
    expect(regles).toBeLessThan(45);
  });

  it('sans équipe, le hasard des alertes ne change pas', () => {
    const a = maison({ hasardAlertes: 3 });
    const b = maison({ hasardAlertes: 3 });
    a.rivale.sabotage = true;
    b.rivale.sabotage = true;
    for (let i = 0; i < 20; i++) {
      vivreMinuteries(a, []);
      vivreMinuteries(b, []);
    }
    expect(a.hasardAlertes).toBe(b.hasardAlertes);
  });

  it('avec la sécurité, la porte stricte ne coûte plus de portier', () => {
    const ouverture = (securite: number) => {
      const etat = avecEquipes(maison({ minuteDuJour: h(19, 55), briefingJour: 30 }), 0, securite);
      etat.regles = { ...etat.regles, selection: 'stricte' };
      return tick(etat).evenements.some((e) => e.type === 'portier');
    };
    expect(ouverture(0)).toBe(true);
    expect(ouverture(1)).toBe(false);
  });
});

describe('l’assurance', () => {
  it('s’ouvre au premier lundi après le palier 3, présentée au bilan du lundi', () => {
    const dimanche = maison({ jour: 35, minuteDuJour: h(4, 55), briefingJour: 35 });
    expect(dimanche.systemes.assurance).toBe(false);
    const lundi = tick(dimanche).etat;
    expect(lundi.systemes.assurance).toBe(true);
    expect(lundi.bilanSemaine?.ouvertures).toEqual(['assurance']);
    const palier2 = tick(maison({ jour: 35, minuteDuJour: h(4, 55), briefingJour: 35 }, 2)).etat;
    expect(palier2.systemes.assurance).toBe(false);
  });

  it('prélève sa prime le lundi, et rembourse la casse et les amendes selon le niveau', () => {
    const etat = maison({ systemes: { ...maison().systemes, assurance: true } });
    const casse = appliquerOrdres(etat, [{ type: 'assurance', niveau: 1 }]).etat;
    expect(primeAssurance(casse)).toBe(B.ASSURANCES[1].prime);
    const lundi = tick({ ...casse, jour: 35, minuteDuJour: h(4, 55), briefingJour: 35 });
    expect(lundi.evenements).toContainEqual({ type: 'primeAssurance', montant: B.ASSURANCES[1].prime });
    expect(lundi.etat.semaine.comptes.depenses.assurance).toBe(B.ASSURANCES[1].prime);

    const t0 = casse.tresorerie;
    indemniser(casse, 100, 'casse');
    expect(casse.tresorerie).toBe(t0 + Math.round(100 * B.ASSURANCES[1].casse));
    indemniser(casse, 100, 'amende');
    expect(casse.tresorerie).toBe(t0 + Math.round(100 * B.ASSURANCES[1].casse));

    const tout = appliquerOrdres(etat, [{ type: 'assurance', niveau: 2 }]).etat;
    indemniser(tout, 250, 'amende');
    expect(tout.tresorerie).toBe(5_000 + 250);
    expect(tout.semaine.comptes.recettes.assurance).toBe(250);
  });

  it('rembourse la casse d’une dispute qui dégénère, et une amende d’inspection', () => {
    const etat = maison({ systemes: { ...maison().systemes, assurance: true }, assurance: 2, dispute: { expire: 0 } });
    const apres = tick(etat);
    expect(apres.evenements).toContainEqual({ type: 'indemnisation', montant: B.DISPUTE_CASSE, sinistre: 'casse' });

    const carte = maison({ minuteDuJour: h(11), systemes: { ...maison().systemes, assurance: true }, assurance: 2 });
    carte.relations.jauges.mairie = -60;
    carte.intrigues.actives.push({ id: 'inspectionSurprise', etape: 'visite', echeance: 0, employeId: null, debut: carte.jour });
    carte.intrigues.carte = 'inspectionSurprise';
    let indemnisee = false;
    for (let g = 1; g <= 20 && !indemnisee; g++) {
      const r = appliquerOrdres({ ...carte, hasard: g }, [{ type: 'choixIntrigue', choix: 0 }]);
      if (r.evenements.some((e) => e.type === 'indemnisation' && e.sinistre === 'amende')) {
        indemnisee = true;
        expect(r.etat.tresorerie).toBe(5_000);
      }
    }
    expect(indemnisee).toBe(true);
  });

  it('refuse un niveau inconnu, ou avant son ouverture', () => {
    expect(appliquerOrdres(maison(), [{ type: 'assurance', niveau: 2 }]).etat.assurance).toBe(0);
    const ouverte = maison({ systemes: { ...maison().systemes, assurance: true } });
    expect(appliquerOrdres(ouverte, [{ type: 'assurance', niveau: 5 }]).etat.assurance).toBe(0);
  });
});
