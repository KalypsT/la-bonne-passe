import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { TENDANCES } from '../content/tendances';
import { totalDepenses, totalRecettes } from './comptes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { demandeTendance, projeter, tirerTendances } from './semaine';
import { simuler } from './simulation';
import { arrivee, facteurDemande, facteurDispute, modeleClient } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 4 }), jour: 5, minuteDuJour: h(22), briefingJour: 5, nuitsBouclees: 4 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], ...champs };
}

/** Dimanche soir, juste avant 5 h le lundi du jour 8. */
const veilleDeLundi = (palier: number, champs: Partial<EtatJeu> = {}) =>
  partie(palier, { jour: 7, minuteDuJour: h(4, 55), briefingJour: 7, ...champs });

describe('comptes par poste', () => {
  it('chaque dépense et chaque recette tombe dans son poste', () => {
    let etat = partie(2, { rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard', duree: 60, restant: 5 }] });
    etat = tick(etat).etat;
    expect(etat.semaine.comptes.recettes.rendezVous).toBeGreaterThan(0);
    etat = appliquerOrdres(etat, [{ type: 'nettoyageExpress', chambreId: 'boudoir' }, { type: 'livraisonLinge' }]).etat;
    expect(etat.semaine.comptes.depenses.menage).toBe(B.NETTOYAGE_EXPRESS);
    expect(etat.semaine.comptes.depenses.linge).toBe(B.LIVRAISON_EXPRESS_LINGE.prix);
    const midi = tick({ ...etat, minuteDuJour: h(11, 55) }).etat;
    expect(midi.semaine.comptes.depenses.salaires).toBe(B.SALAIRE_MENAGE);
  });

  it('la mensualité compte en entier, même quand la réserve en paie une partie', () => {
    const etat = partie(1, { jour: 27, minuteDuJour: h(4, 55), briefingJour: 27, reserve: 1000 });
    const apres = tick(etat).etat;
    expect(apres.jour).toBe(28);
    expect(apres.semaine.comptes.depenses.mensualite).toBe(B.MENSUALITE);
  });

  it('le résultat de chaque semaine égale exactement ce qu’ont gagné trésorerie et réserve', () => {
    const { bilans } = simuler({ graine: 3, offre: 'classique', rdvMax: 3, nuits: 35 });
    expect(bilans.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < bilans.length; i++) {
      expect(bilans[i]!.resultat).toBeCloseTo(bilans[i]!.avoir - bilans[i - 1]!.avoir, 6);
      expect(bilans[i]!.resultat).toBeCloseTo(totalRecettes(bilans[i]!.comptes) - totalDepenses(bilans[i]!.comptes), 6);
    }
  });
});

describe('bilan du lundi', () => {
  it('le lundi à 5 h, la semaine se referme en bilan et la suivante commence', () => {
    const avant = veilleDeLundi(1);
    avant.semaine.comptes.recettes.rendezVous = 3000;
    const { etat, evenements } = tick(avant);
    expect(etat.jour).toBe(8);
    expect(evenements).toContainEqual({ type: 'bilanSemaine', numero: 1 });
    expect(etat.bilanAVoir).toBe(true);
    expect(etat.bilanSemaine).toMatchObject({ numero: 1, resultat: 3000 });
    expect(etat.semaine.numero).toBe(2);
    // Les charges du lundi appartiennent déjà à la nouvelle semaine.
    expect(etat.semaine.comptes.depenses.charges).toBe(B.CHARGES_FIXES);
    expect(etat.bilanSemaine?.comptes.depenses.charges).toBe(0);
    expect(appliquerOrdres(etat, [{ type: 'bilanSemaineVu' }]).etat.bilanAVoir).toBe(false);
  });

  it('la projection compte des charges fixes pleines, même après la première semaine qui n’en a pas', () => {
    const avant = veilleDeLundi(1);
    avant.semaine.comptes.recettes.rendezVous = 3000;
    avant.semaine.comptes.depenses.travaux = 900;
    const { etat } = tick(avant);
    expect(etat.bilanSemaine?.resultat).toBe(2100);
    expect(etat.bilanSemaine?.resultatCourant).toBe(3000 - B.CHARGES_FIXES);
  });

  it('pas de bilan un autre jour que le lundi', () => {
    const { evenements } = tick(partie(1, { jour: 3, minuteDuJour: h(4, 55), briefingJour: 3 }));
    expect(evenements.some((e) => e.type === 'bilanSemaine')).toBe(false);
  });

  it('projette l’avoir sur 4 semaines, mensualités et avance comprises', () => {
    const etat = partie(1, { jour: 22 });
    etat.avance = { statut: 'acceptee', jourOffre: 10, echeance: 30, montant: 1650 };
    const projection = projeter(etat, 5000, 1000, [28, 49]);
    // Semaine 1 : jours 22 à 28 (mensualité le 28) ; semaine 2 : jours 29 à 35 (avance le 30) ; semaine 4 : jours 43 à 49.
    expect(projection).toEqual([5000 + 1000 - 2500, 3500 + 1000 - 1650, 2850 + 1000, 3850 + 1000 - 2500]);
  });
});

describe('tendances', () => {
  it('pas de tendance avant le palier 2 ; elles s’ouvrent au premier lundi qui suit, présentées par Josée', () => {
    expect(tick(veilleDeLundi(1)).etat.semaine.tendances).toEqual([]);
    const { etat, evenements } = tick(veilleDeLundi(2));
    expect(etat.systemes.tendances).toBe(true);
    expect(etat.bilanSemaine?.premieresTendances).toBe(true);
    expect(etat.semaine.tendances.length).toBeGreaterThanOrEqual(1);
    expect(etat.semaine.tendances.length).toBeLessThanOrEqual(2);
    expect(evenements.filter((e) => e.type === 'tendance')).toHaveLength(etat.semaine.tendances.length);
    const suivante = tick({ ...etat, jour: 14, minuteDuJour: h(4, 55), briefingJour: 14 }).etat;
    expect(suivante.bilanSemaine?.premieresTendances).toBe(false);
  });

  it('une tendance ne touche que des segments ouverts, et chacune a son texte', () => {
    const tirage = creerTirage(1);
    const unSeul = partie(1);
    for (let i = 0; i < 50; i++) {
      for (const id of tirerTendances(unSeul, tirage)) expect(B.TENDANCES_EFFETS[id]!.segments.every((s) => s === 'touriste' || s === 'habitue')).toBe(true);
    }
    for (const id of Object.keys(B.TENDANCES_EFFETS)) expect(TENDANCES.some((t) => t.id === id)).toBe(true);
  });

  it('un congrès fait venir les clients d’affaires, et plus de monde en tout', () => {
    const calme = partie(2);
    const congres = partie(2);
    congres.semaine.tendances = ['congres'];
    expect(demandeTendance(congres, 'affaires')).toBeGreaterThan(2);
    expect(facteurDemande(congres)).toBeGreaterThan(facteurDemande(calme));
    const part = (etat: EtatJeu) => {
      const tirage = creerTirage(6);
      let affaires = 0;
      for (let i = 0; i < 300; i++) {
        const copie: EtatJeu = { ...structuredClone(etat), file: [] };
        arrivee(copie, tirage, { push: () => 0 });
        if (modeleClient(copie.file[0]?.modele ?? '').segment === 'affaires') affaires += 1;
      }
      return affaires;
    };
    expect(part(congres)).toBeGreaterThan(part(calme) * 1.5);
  });

  it('un soir de match, le quai s’échauffe', () => {
    const file = [{ id: 1, modele: 'fetard', patience: 50 }];
    const calme = partie(2, { file });
    const match = partie(2, { file });
    match.semaine.tendances = ['match'];
    expect(facteurDispute(match)).toBeCloseTo(facteurDispute(calme) * B.TENDANCES_EFFETS.match!.dispute!);
  });
});
