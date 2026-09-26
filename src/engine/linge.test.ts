import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { creerEtatInitial, type EtatJeu } from './etat';
import { alertes } from './alertes';
import { manqueAuto, prixLinge } from './linge';
import { appliquerOrdres, tick, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Le briefing de 19 h du jour 1, stock de linge au choix. */
function briefing(champs: Partial<EtatJeu> = {}): EtatJeu {
  return { ...creerEtatInitial({ graine: 3 }), minuteDuJour: h(19), ...champs };
}

const valider = (etat: EtatJeu, o: Omit<Extract<Ordre, { type: 'validerBriefing' }>, 'type'> = {}) =>
  appliquerOrdres(etat, [{ type: 'validerBriefing', ...o }]);

describe('le linge en parures', () => {
  it('le départ équivaut à l’ancien stock : 4 parures, une par rendez-vous', () => {
    expect(B.LINGE_INITIAL).toBe(4);
    expect(B.LINGE_PAR_RDV).toBe(1);
    expect(creerEtatInitial().linge).toBe(4);
  });

  it('les gros packs coûtent moins cher par parure, sur la base de 12 € la parure', () => {
    const unitaires = B.PACKS_LINGE.map((p) => p.prix / p.parures);
    expect(unitaires[0]).toBe(12);
    for (let i = 1; i < unitaires.length; i++) expect(unitaires[i]).toBeLessThan(unitaires[i - 1]!);
    // L'express reste le plus cher.
    expect(B.LIVRAISON_EXPRESS_LINGE.prix / B.LIVRAISON_EXPRESS_LINGE.parures).toBeGreaterThan(unitaires[0]!);
  });

  it('le prix d’une quantité suit le tarif du plus gros pack qu’elle atteint', () => {
    expect(prixLinge(0)).toBe(0);
    expect(prixLinge(3)).toBe(36);
    expect(prixLinge(5)).toBe(60);
    expect(prixLinge(7)).toBe(84);
    expect(prixLinge(10)).toBe(110);
    expect(prixLinge(12)).toBe(132);
    expect(prixLinge(20)).toBe(200);
    expect(prixLinge(25)).toBe(250);
  });

  it('un pack commandé au briefing se paie tout de suite et arrive à l’ouverture', () => {
    const { etat } = valider(briefing(), { packLinge: 10 });
    expect(etat.lingeCommande).toBe(10);
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - 110);
    expect(etat.journee.comptes.depenses.linge).toBe(110);
    const ouverte = tick({ ...etat, minuteDuJour: h(19, 55) }).etat;
    expect(ouverte.linge).toBe(B.LINGE_INITIAL + 10);
    // Un pack qui n'existe pas ne se commande pas.
    expect(valider(briefing(), { packLinge: 7 }).etat.lingeCommande).toBe(0);
  });

  it('la commande automatique complète le stock jusqu’à la cible, après le pack', () => {
    const { etat, evenements } = valider(briefing({ linge: 3 }), { lingeAuto: 10 });
    expect(etat.lingeAuto).toBe(10);
    expect(etat.lingeCommande).toBe(7);
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - prixLinge(7));
    expect(evenements).toContainEqual({ type: 'commandeLingeAuto', parures: 7, montant: prixLinge(7) });
    // Avec un pack de 5, il ne manque plus que 2 parures.
    const avecPack = valider(briefing({ linge: 3 }), { packLinge: 5, lingeAuto: 10 }).etat;
    expect(avecPack.lingeCommande).toBe(7);
    expect(avecPack.tresorerie).toBe(B.TRESORERIE_INITIALE - 60 - prixLinge(2));
    // Stock déjà plein : rien.
    expect(valider(briefing({ linge: 12 }), { lingeAuto: 10 }).etat.lingeCommande).toBe(0);
  });

  it('la cible reste d’un soir à l’autre ; 0 l’arrête ; une cible hors des crans est ignorée', () => {
    const regle = valider(briefing({ linge: 0 }), { lingeAuto: 5 }).etat;
    const lendemain = { ...regle, jour: 2, briefingJour: 1, linge: 1, lingeCommande: 0 };
    expect(valider(lendemain).etat.lingeCommande).toBe(4);
    expect(valider(lendemain, { lingeAuto: 0 }).etat.lingeCommande).toBe(0);
    expect(valider(lendemain, { lingeAuto: 7 }).etat.lingeAuto).toBe(5);
    expect(manqueAuto({ linge: 2, lingeCommande: 1, lingeAuto: 5 }, 1)).toBe(1);
  });

  it('la livraison express reste possible en soirée, plus chère, et se range à part', () => {
    const soir = { ...briefing({ linge: 0 }), minuteDuJour: h(22), briefingJour: 1 };
    const { etat } = appliquerOrdres(soir, [{ type: 'livraisonLinge' }]);
    expect(etat.linge).toBe(B.LIVRAISON_EXPRESS_LINGE.parures);
    expect(etat.semaine.comptes.depenses.express).toBe(B.LIVRAISON_EXPRESS_LINGE.prix);
  });

  it('sans linge, l’alerte sonne ; avec une parure, elle se tait', () => {
    const soir = (linge: number) => ({ ...briefing({ linge }), minuteDuJour: h(22), briefingJour: 1 });
    expect(alertes(soir(0))).toContainEqual({ type: 'linge' });
    expect(alertes(soir(1))).not.toContainEqual({ type: 'linge' });
  });
});
