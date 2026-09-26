import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { prixEtat } from './amenagement';
import { comptesVides } from './comptes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { depart } from './personnel';
import { accorderPalier } from './paliers';
import { departsRecents, exigenceDuQuartier, genererCandidat, tailleDuMarche } from './recrutement';
import { tick } from './tick';

// Rééquilibrage de la v0.6 (partie 8) : entretenir la maison et son équipe doit se voir dans la caisse.

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Un rendez-vous qui se termine au prochain pas, au Boudoir, avec Sanne (50 %). */
function finDeRdv(modifs: Partial<EtatJeu> = {}) {
  const avant: EtatJeu = {
    ...creerEtatInitial({ graine: 7 }),
    minuteDuJour: h(21),
    briefingJour: 1,
    rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 }],
    nuit: { numero: 1, comptes: comptesVides(), tresorerieAvant: 0, tresorerieApres: 0, retraitReserve: 0, empruntRecu: 0, placement: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    ...modifs,
  };
  const c = tick(avant).etat.journee.comptes;
  return { recette: c.recettes.rendezVous, part: c.depenses.partPersonnel };
}

describe('entretenir la maison', () => {
  it('une chambre défraîchie (sous 30 % d’état) se paie 15 % de moins', () => {
    const c = creerEtatInitial().chambres[0]!;
    expect(prixEtat({ ...c, etat: 29 })).toBe(B.CHAMBRE_DEFRAICHIE.prix);
    expect(prixEtat({ ...c, etat: 30 })).toBe(1);
    expect(prixEtat(undefined)).toBe(1);
    // La remise touche tout le rendez-vous : la personne garde toujours sa part du prix payé.
    const use = finDeRdv({ chambres: creerEtatInitial().chambres.map((x) => (x.id === 'boudoir' ? { ...x, etat: 10 } : x)) });
    expect(Math.abs(use.part / use.recette - 0.5)).toBeLessThan(0.03);
  });

  it('sans linge propre, le client marchande, et la maison qui fournit les draps en fait seule les frais', () => {
    const avec = finDeRdv();
    const sans = finDeRdv({ linge: 0 });
    expect(sans.recette).toBeLessThan(avec.recette);
    expect(Math.abs(avec.part / avec.recette - 0.5)).toBeLessThan(0.03);
    // La part de Sanne est comptée sur le prix plein : elle dépasse la moitié de ce que le client a payé.
    expect(sans.part / sans.recette).toBeGreaterThan(0.5 / B.PRIX_SANS_LINGE - 0.03);
  });

  it('une chambre rafraîchie tient environ un mois à trois rendez-vous par nuit', () => {
    const usureMoyenne = (B.USURE_MIN + B.USURE_MAX) / 2;
    const nuits = (B.ETAT_APRES_TRAVAUX - B.CHAMBRE_DEFRAICHIE.seuil) / usureMoyenne / 3;
    expect(nuits).toBeGreaterThan(20);
    expect(nuits).toBeLessThan(35);
  });
});

describe('le quartier sait comment la maison traite son monde', () => {
  function auLundi(departs: number[]): EtatJeu {
    const e: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 14, minuteDuJour: h(4, 55), briefingJour: 14, reputation: 45, visites: [], candidats: [], departsRecents: departs };
    accorderPalier(e, 1);
    return { ...e, visites: [], candidats: [] };
  }

  it('un départ se retient quatre semaines', () => {
    const e = creerEtatInitial();
    e.jour = 20;
    depart(e, e.personnel[0]!, []);
    expect(e.departsRecents).toEqual([20]);
    expect(departsRecents({ ...e, jour: 47 })).toBe(1);
    expect(departsRecents({ ...e, jour: 48 })).toBe(0);
  });

  it('après un départ, le marché du lundi compte deux candidats de moins, et chacun demande 5 points de plus', () => {
    const normal = tick(auLundi([])).etat;
    const apres = tick(auLundi([10])).etat;
    expect(normal.candidats).toHaveLength(tailleDuMarche(45));
    expect(apres.candidats).toHaveLength(Math.max(0, tailleDuMarche(45) - B.DEPARTS_RECENTS.marcheMoins));
    const e = auLundi([10, 12, 13]);
    e.jour = 15;
    expect(exigenceDuQuartier(e)).toBe(B.DEPARTS_RECENTS.partMax);
    const sansDepart = genererCandidat({ ...e, departsRecents: [] }, creerTirage(3), 20);
    const avecDeparts = genererCandidat(e, creerTirage(3), 20);
    expect(avecDeparts.partMin).toBeCloseTo(sansDepart.partMin + B.DEPARTS_RECENTS.partMax, 5);
  });
});
