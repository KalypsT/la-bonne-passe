import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { comptesVides } from './comptes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { beneficeImposable, fiscDeDepart, impotEstime, jourClotureTrimestre, jourProchainImpot } from './fisc';
import { accorderPalier } from './paliers';
import { projeter } from './semaine';
import { tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(jour: number, minuteDuJour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 21 }), jour, minuteDuJour, briefingJour: jour, nuitsBouclees: jour - 1 };
  for (const p of [1, 2]) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], candidats: [], ...champs };
}

describe('impôt trimestriel', () => {
  it('le trimestre se clôt le lundi qui suit ses 84 jours ; l’impôt tombe deux semaines plus tard', () => {
    expect(jourClotureTrimestre(1)).toBe(85);
    expect(jourClotureTrimestre(85)).toBe(85);
    expect(jourClotureTrimestre(86)).toBe(169);
    expect((85 - 1) % 7).toBe(0);
    expect((99 - 1) % 7).toBe(0);
    expect(jourProchainImpot({ jour: 10, fisc: fiscDeDepart() })).toBe(99);
  });

  it('le bénéfice imposable ignore les mensualités, les échéances d’emprunt et l’impôt lui-même', () => {
    const c = comptesVides();
    c.recettes.rendezVous = 10000;
    c.depenses.partPersonnel = 5000;
    c.depenses.charges = 1350;
    c.depenses.mensualite = 2500;
    c.depenses.emprunts = 800;
    c.depenses.impots = 400;
    expect(beneficeImposable(c)).toBe(10000 - 5000 - 1350);
  });

  it('chaque semaine close s’ajoute au trimestre ; l’estimation extrapole sur 12 semaines', () => {
    const avant = partie(7, h(4, 55));
    avant.semaine.comptes.recettes.rendezVous = 3000;
    avant.semaine.comptes.depenses.partPersonnel = 1500;
    const { etat } = tick(avant);
    expect(etat.fisc).toMatchObject({ benefice: 1500, semaines: 1 });
    expect(impotEstime(etat)).toBe(Math.round(1500 * 12 * B.IMPOT.taux));
  });

  it('à la clôture du trimestre, Josée annonce le montant exact, au bilan du lundi ; le trimestre suivant repart de zéro', () => {
    const avant = partie(84, h(4, 55), { fisc: { ...fiscDeDepart(), benefice: 12000, semaines: 11 } });
    const { etat, evenements } = tick(avant);
    expect(etat.jour).toBe(85);
    const montant = Math.round((12000 + beneficeImposable(avant.semaine.comptes)) * B.IMPOT.taux);
    expect(evenements).toContainEqual({ type: 'impotAnnonce', jour: 99, estimation: montant });
    expect(etat.bilanSemaine?.impot).toEqual({ jour: 99, montant, paye: false });
    expect(etat.fisc).toEqual({ benefice: 0, semaines: 0, du: montant, jourDu: 99 });
    expect(etat.semaine.comptes.depenses.impots).toBe(0);
    expect(impotEstime(etat)).toBe(montant);
  });

  it('prélevé seul deux semaines plus tard, même à découvert ; une perte ne coûte rien', () => {
    const avant = partie(98, h(4, 55), { tresorerie: 500, fisc: { benefice: 3000, semaines: 1, du: 2400, jourDu: 99 } });
    const { etat, evenements } = tick(avant);
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'impot', montant: 2400 }));
    expect(etat.semaine.comptes.depenses.impots).toBe(2400);
    expect(etat.fisc.du).toBe(0);
    expect(etat.fisc.benefice).toBeGreaterThan(0);
    expect(etat.bilanSemaine?.impot?.paye).toBe(true);
    const perte = tick(partie(84, h(4, 55), { fisc: { ...fiscDeDepart(), benefice: -30000, semaines: 11 } }));
    expect(perte.etat.fisc.du).toBe(0);
    expect(perte.evenements).toContainEqual({ type: 'impotAnnonce', jour: 99, estimation: 0 });
  });

  it('la trésorerie projetée compte l’impôt qui tombe dans les 4 semaines', () => {
    const e = partie(85, h(10), { fisc: { benefice: 0, semaines: 0, du: 2400, jourDu: 99 } });
    const p = projeter(e, 0, 0, [], []);
    // Du jour 85 : semaines 85–91, 92–98, puis 99–105, celle de l'impôt.
    expect(p[1]).toBe(0);
    expect(p[2]).toBe(-2400);
  });
});
