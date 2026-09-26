import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { comptesVides, gagneNuit, recetteMaison, totalDepenses, totalRecettes } from './comptes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { simuler } from './simulation';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';
import type { Nuit } from './etat';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Enchaîne des ticks jusqu'à une heure, en validant les briefings avec ces ordres. */
function jusqua(etat: EtatJeu, minute: number, briefing: Ordre = { type: 'validerBriefing' }) {
  const evenements: EvenementMoteur[] = [];
  let courant = etat;
  let garde = 0;
  do {
    const r = tick(courant);
    evenements.push(...r.evenements);
    courant = r.evenements.some((e) => e.type === 'briefing') ? appliquerOrdres(r.etat, [briefing]).etat : r.etat;
  } while (courant.minuteDuJour !== minute && ++garde < 2000);
  return { etat: courant, evenements };
}

const bilanDe = (evenements: EvenementMoteur[]): Nuit => {
  const e = evenements.find((x) => x.type === 'bilan');
  if (!e || e.type !== 'bilan') throw new Error('pas de bilan');
  return e.nuit;
};

/** Une partie au palier 1, le matin du jour 2 à 5 h, la première nuit bouclée. */
function matinDuJour2(): EtatJeu {
  const { etat } = jusqua(creerEtatInitial({ graine: 5 }), h(5));
  accorderPalier(etat, 1);
  return { ...etat, annonces: [], visites: [] };
}

describe('comptes de la nuit', () => {
  it('tient chaque poste de sa journée : salaires de midi, commandes du briefing, rendez-vous pleins et part du personnel', () => {
    const matin = matinDuJour2();
    const { etat, evenements } = jusqua(matin, h(5), { type: 'validerBriefing', packLinge: 5 });
    const nuit = bilanDe(evenements);
    const c = nuit.comptes;
    expect(c.depenses.salaires).toBe(matin.equipes.menage * B.SALAIRE_MENAGE);
    expect(c.depenses.linge).toBe(B.PACKS_LINGE[0].prix);
    expect(nuit.servis).toBeGreaterThan(0);
    expect(c.recettes.rendezVous).toBeGreaterThan(0);
    // Sanne garde la moitié de chaque rendez-vous.
    expect(c.depenses.partPersonnel / c.recettes.rendezVous).toBeCloseTo(0.5, 1);
    // La semaine a les mêmes postes, et les a reçus aussi.
    expect(etat.semaine.comptes.depenses.linge).toBeGreaterThanOrEqual(c.depenses.linge);
    expect(etat.semaine.comptes.depenses.partPersonnel).toBeGreaterThanOrEqual(c.depenses.partPersonnel);
  });

  it('le compte tombe juste : trésorerie avant, plus le gagné, moins la réserve, donne la trésorerie après', () => {
    const matin = matinDuJour2();
    const regle = appliquerOrdres(matin, [{ type: 'tauxReserve', taux: 0.2 }]).etat;
    const { evenements } = jusqua(regle, h(5));
    const nuit = bilanDe(evenements);
    expect(nuit.reserve).toBe(Math.round(recetteMaison(nuit.comptes) * 0.2));
    expect(nuit.tresorerieAvant).toBe(matin.tresorerie);
    expect(nuit.tresorerieApres).toBe(nuit.tresorerieAvant + gagneNuit(nuit.comptes) - nuit.reserve);
    expect(gagneNuit(nuit.comptes)).toBe(totalRecettes(nuit.comptes) - totalDepenses(nuit.comptes));
  });

  it('un retrait de la réserve dans la journée se lit à part, sans compter comme une recette', () => {
    const matin = { ...matinDuJour2(), reserve: 400 };
    const retire = appliquerOrdres(matin, [{ type: 'retirerReserve' }]).etat;
    const { evenements } = jusqua(retire, h(5));
    const nuit = bilanDe(evenements);
    expect(nuit.retraitReserve).toBe(400);
    expect(nuit.tresorerieApres).toBe(nuit.tresorerieAvant + 400 + gagneNuit(nuit.comptes) - nuit.reserve);
  });

  it('les charges du lundi et la mensualité restent au bilan de la semaine', () => {
    const base = matinDuJour2();
    // Dimanche soir, juste avant 5 h le lundi du jour 8 ; puis la veille de la première mensualité.
    const veille = { ...base, jour: 7, minuteDuJour: h(4, 55), briefingJour: 7, nuitsBouclees: 7, nuit: null };
    const lundi = tick(veille).etat;
    expect(lundi.semaine.comptes.depenses.charges).toBe(B.CHARGES_FIXES);
    expect(lundi.journee.comptes).toEqual(comptesVides());
    expect(lundi.journee.tresorerieAvant).toBe(lundi.tresorerie);

    const veilleMensualite = { ...base, jour: 27, minuteDuJour: h(4, 55), briefingJour: 27, nuitsBouclees: 27, nuit: null };
    const jour28 = tick(veilleMensualite).etat;
    expect(jour28.semaine.comptes.depenses.mensualite).toBe(B.MENSUALITE);
    expect(jour28.journee.comptes.depenses.mensualite).toBe(0);
    expect(jour28.journee.tresorerieAvant).toBe(jour28.tresorerie);
  });

  it('sur un mois de jeu, chaque bilan de nuit explique toute la trésorerie', () => {
    for (const graine of [2, 9]) {
      const { nuits } = simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 35 });
      for (const n of nuits) expect(n.ecartCaisse).toBe(0);
    }
  });
});
