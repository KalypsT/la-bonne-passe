import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { refusEmprunt } from './banque';
import { creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { jourProchaineMensualite, NOMBRE_MENSUALITES } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(jour: number, minuteDuJour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 31 }), jour, minuteDuJour, briefingJour: jour, nuitsBouclees: jour - 1 };
  for (const p of [1, 2]) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], candidats: [], ...champs };
}

const confier = (e: EtatJeu) => appliquerOrdres(e, [{ type: 'gestionJosee', active: true }]).etat;

describe('confier la gestion à Josée', () => {
  it('s’ouvre avec la réserve ; réserve à 10 %, fixée tant qu’elle tient les comptes', () => {
    const avant = creerEtatInitial();
    expect(confier(avant).gestionJosee).toBe(false);
    const e = confier(partie(10, h(10)));
    expect(e.gestionJosee).toBe(true);
    expect(e.tauxReserve).toBe(B.GESTION_JOSEE.reserve);
    expect(appliquerOrdres(e, [{ type: 'tauxReserve', taux: 0.2 }]).etat.tauxReserve).toBe(0.1);
    const reprise = appliquerOrdres(e, [{ type: 'gestionJosee', active: false }]).etat;
    expect(appliquerOrdres(reprise, [{ type: 'tauxReserve', taux: 0.2 }]).etat.tauxReserve).toBe(0.2);
  });

  it('jamais d’emprunt tant que Josée tient les comptes', () => {
    const e = confier(partie(50, h(10)));
    e.systemes.emprunt = true;
    expect(refusEmprunt(e, 5000, 12)).toBe('josee');
  });

  it('chaque lundi, sa commission sur la recette de la maison de la semaine', () => {
    const avant = confier(partie(7, h(4, 55)));
    avant.semaine.comptes.recettes.rendezVous = 4000;
    avant.semaine.comptes.recettes.bar = 400;
    avant.semaine.comptes.depenses.partPersonnel = 2000;
    const { etat, evenements } = tick(avant);
    const montant = Math.round(2400 * B.GESTION_JOSEE.commission);
    expect(evenements).toContainEqual({ type: 'commissionJosee', montant });
    expect(etat.semaine.comptes.depenses.gestion).toBe(montant);
    // Sans Josée, rien.
    const seul = { ...avant, gestionJosee: false };
    expect(tick(seul).evenements.some((x) => x.type === 'commissionJosee')).toBe(false);
  });

  it('une fois dans la partie, son sursis évite la faillite : l’échéance en retard passe en fin de prêt', () => {
    const base = confier(partie(55, h(4, 55), { tresorerie: 0, reserve: 0, mensualitesPayees: 0 }));
    base.banque = { ...base.banque, echeances: 1, retard: B.MENSUALITE, retardRachat: true, impayees: 1 };
    const { etat, evenements } = tick(base);
    expect(etat.finDePartie).toBeNull();
    expect(evenements).toContainEqual({ type: 'sursis', montant: B.MENSUALITE });
    expect(etat.banque.sursis).toBe(true);
    expect(etat.banque.supplement).toBe(B.MENSUALITE);
    // La mensualité du jour, elle, n'a pas pu être payée non plus : nouveau retard, et plus de sursis.
    expect(etat.banque.retard).toBe(B.MENSUALITE);
    const suivante = tick({ ...etat, jour: 83, minuteDuJour: h(4, 55), briefingJour: 83, bilanMoisAVoir: false });
    expect(suivante.etat.finDePartie).not.toBeNull();
  });

  it('l’échéance reportée tombe après la dernière mensualité du rachat', () => {
    const e = partie(300, h(10));
    e.banque = { ...e.banque, echeances: NOMBRE_MENSUALITES, supplement: 2500 };
    const jour = jourProchaineMensualite(e);
    expect(jour).toBe(B.JOUR_PREMIERE_MENSUALITE + NOMBRE_MENSUALITES * B.JOURS_PAR_MOIS);
    const { etat } = tick({ ...e, jour: jour! - 1, minuteDuJour: h(4, 55), briefingJour: jour! - 1, tresorerie: 5000 });
    expect(etat.banque.supplement).toBe(0);
    expect(etat.tresorerie).toBe(2500);
    expect(jourProchaineMensualite(etat)).toBeNull();
  });
});
