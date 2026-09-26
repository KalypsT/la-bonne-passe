import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { apercuEmprunt, capaciteEmprunt, echeancesEmprunts, mensualiteEmprunt, prochaineEcheanceApres, refusEmprunt, tauxPropose } from './banque';
import { creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { projeter } from './semaine';
import { NOMBRE_MENSUALITES } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Une partie au palier 3, emprunt ouvert, au jour et à l'heure dits. */
function partie(jour: number, minuteDuJour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 12 }), jour, minuteDuJour, briefingJour: jour, nuitsBouclees: jour - 1, mensualitesPayees: 1 };
  for (const p of [1, 2, 3]) accorderPalier(etat, p);
  etat.systemes.emprunt = true;
  etat.banque.echeances = 1;
  return { ...etat, annonces: [], visites: [], candidats: [], reputation: 50, ...champs };
}

describe('nouvel emprunt : les conditions', () => {
  it('le taux va de 9 % (réputation 20) à 4 % (80), au demi-point, plus 2 points par mensualité impayée', () => {
    expect(tauxPropose(partie(40, h(10), { reputation: 10 }))).toBe(9);
    expect(tauxPropose(partie(40, h(10), { reputation: 20 }))).toBe(9);
    expect(tauxPropose(partie(40, h(10), { reputation: 50 }))).toBe(6.5);
    expect(tauxPropose(partie(40, h(10), { reputation: 90 }))).toBe(4);
    const retard = partie(40, h(10));
    retard.banque.impayees = 1;
    expect(tauxPropose(retard)).toBe(8.5);
  });

  it('mensualité d’un prêt amortissable, et l’effet affiché avant de signer', () => {
    expect(mensualiteEmprunt(10000, 6, 12)).toBe(861);
    expect(mensualiteEmprunt(10000, 6, 24)).toBe(443);
    const a = apercuEmprunt(partie(40, h(10)), 10000, 12);
    expect(a.taux).toBe(6.5);
    expect(a.premiere).toBe(56);
    expect(a.derniere).toBe(56 + 11 * 28);
    expect(a.cout).toBe(a.mensualite * 12 - 10000);
    expect(prochaineEcheanceApres(10)).toBe(28);
    expect(prochaineEcheanceApres(28)).toBe(56);
  });

  it('la banque refuse : outil fermé, échéance en retard, montant hors tranches ou au-delà de 40 000 €, durée hors crans', () => {
    const e = partie(40, h(10));
    expect(refusEmprunt(e, 10000, 12)).toBeNull();
    expect(refusEmprunt({ ...e, systemes: { ...e.systemes, emprunt: false } }, 10000, 12)).toBe('ferme');
    expect(refusEmprunt({ ...e, banque: { ...e.banque, retard: 2500 } }, 10000, 12)).toBe('retard');
    expect(refusEmprunt(e, 7000, 12)).toBe('montant');
    expect(refusEmprunt(e, 45000, 12)).toBe('montant');
    expect(refusEmprunt(e, 10000, 9)).toBe('duree');
  });
});

describe('nouvel emprunt : la vie du prêt', () => {
  it('signé : l’argent arrive tout de suite, sans compter comme une recette ; la capacité baisse', () => {
    const avant = partie(40, h(10));
    const { etat, evenements } = appliquerOrdres(avant, [{ type: 'emprunter', montant: 15000, duree: 12 }]);
    expect(etat.tresorerie).toBe(avant.tresorerie + 15000);
    expect(etat.journee.empruntRecu).toBe(15000);
    expect(etat.semaine.empruntRecu).toBe(15000);
    expect(etat.semaine.comptes.recettes).toEqual(avant.semaine.comptes.recettes);
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'emprunt', montant: 15000, duree: 12 }));
    expect(capaciteEmprunt(etat)).toBe(25000);
    expect(etat.banque.emprunts[0]).toMatchObject({ restantes: 12, prochaine: 56, taux: 6.5 });
    // Refusé : rien ne bouge.
    expect(appliquerOrdres(avant, [{ type: 'emprunter', montant: 7000, duree: 12 }]).etat.tresorerie).toBe(avant.tresorerie);
  });

  it('ses échéances tombent avec la mensualité, sur leur propre poste', () => {
    const signe = appliquerOrdres(partie(40, h(10), { tresorerie: 1000 }), [{ type: 'emprunter', montant: 10000, duree: 6 }]).etat;
    const m = signe.banque.emprunts[0]!.mensualite;
    const { etat, evenements } = tick({ ...signe, jour: 55, minuteDuJour: h(4, 55), briefingJour: 55 });
    expect(etat.jour).toBe(56);
    expect(etat.tresorerie).toBe(11000 - B.MENSUALITE - m);
    expect(etat.semaine.comptes.depenses.emprunts).toBe(m);
    expect(etat.mensualitesPayees).toBe(2);
    expect(etat.banque.emprunts[0]!.restantes).toBe(5);
    expect(etat.banque.emprunts[0]!.prochaine).toBe(84);
    expect(evenements).toContainEqual({ type: 'echeanceEmprunts', montant: m });
    expect(etat.bilanMois?.mensualite).toBe(B.MENSUALITE + m);
  });

  it('après le rachat, les échéances continuent seules ; la dernière solde l’emprunt', () => {
    const e = partie(300, h(4, 55), { tresorerie: 5000 });
    e.banque.echeances = NOMBRE_MENSUALITES;
    e.banque.emprunts = [{ id: 1, montant: 5000, taux: 6, duree: 6, mensualite: 848, restantes: 1, prochaine: 301, jourSignature: 160 }];
    const { etat, evenements } = tick(e);
    expect(etat.tresorerie).toBe(5000 - 848);
    expect(etat.banque.emprunts).toEqual([]);
    expect(evenements).toContainEqual({ type: 'empruntRembourse', montant: 5000 });
    expect(evenements.some((x) => x.type === 'bilanMois')).toBe(false);
  });

  it('impayées ensemble : le retard compte le rachat, et sa régularisation le paie', () => {
    const signe = appliquerOrdres(partie(40, h(10), { tresorerie: -9000 }), [{ type: 'emprunter', montant: 5000, duree: 6 }]).etat;
    const m = signe.banque.emprunts[0]!.mensualite;
    const { etat, evenements } = tick({ ...signe, jour: 55, minuteDuJour: h(4, 55), briefingJour: 55 });
    expect(etat.banque.retard).toBe(B.MENSUALITE + m);
    expect(etat.banque.retardRachat).toBe(true);
    expect(etat.mensualitesPayees).toBe(1);
    expect(evenements).toContainEqual({ type: 'mensualiteImpayee', montant: B.MENSUALITE + m, limite: 84 });
    const regle = tick({ ...etat, jour: 60, minuteDuJour: h(4, 55), briefingJour: 60, tresorerie: 5000, bilanMoisAVoir: false }).etat;
    expect(regle.banque.retard).toBe(0);
    expect(regle.mensualitesPayees).toBe(2);
  });

  it('la trésorerie projetée compte les échéances des emprunts', () => {
    const signe = appliquerOrdres(partie(50, h(10)), [{ type: 'emprunter', montant: 10000, duree: 12 }]).etat;
    const m = signe.banque.emprunts[0]!.mensualite;
    const sans = projeter(signe, 0, 0, [], []);
    const avec = projeter(signe, 0, 0, [], echeancesEmprunts(signe));
    // L'échéance du jour 56 tombe dans la première semaine projetée.
    expect(avec[0]).toBe(sans[0]! - m);
    expect(avec[3]).toBe(sans[3]! - m);
  });

  it('s’ouvre au lundi qui suit la visibilité', () => {
    const base = partie(35, h(4, 55));
    base.systemes.emprunt = false;
    base.systemes.visibilite = false;
    base.systemes.assurance = true;
    // Lundi 36 : la visibilité s'ouvre, pas encore l'emprunt.
    const lundi36 = tick(base).etat;
    expect(lundi36.systemes.visibilite).toBe(true);
    expect(lundi36.systemes.emprunt).toBe(false);
    const lundi43 = tick({ ...lundi36, jour: 42, minuteDuJour: h(4, 55), briefingJour: 42, bilanAVoir: false }).etat;
    expect(lundi43.systemes.emprunt).toBe(true);
    expect(lundi43.bilanSemaine?.ouvertures).toContain('emprunt');
  });
});
