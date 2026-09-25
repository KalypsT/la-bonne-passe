import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import {
  attraitSegment,
  changerSatisfaction,
  fixerReputation,
  frequentation,
  gainReputation,
  reputationPonderee,
} from './clientele';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { arrivee, modeleClient } from './soiree';
import { appliquerOrdres, tick, tickSurPlace } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Une soirée en cours, au palier voulu. */
function soiree(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 5, minuteDuJour: h(22), briefingJour: 5, nuitsBouclees: 4 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], ...champs };
}

const rdvQuiFinit = (modele: string) => ({ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele, duree: 60, restant: 5 });

describe('satisfaction par segment', () => {
  it('la réputation est la moyenne pondérée des segments ouverts', () => {
    const etat = soiree(1);
    etat.clientele.satisfaction = { touriste: 10, habitue: 30, affaires: 90, groupe: 90 };
    const P = B.POIDS_REPUTATION;
    // Avant le palier 2, Affaires et Groupes ne comptent pas.
    expect(reputationPonderee(etat)).toBeCloseTo((10 * P.touriste + 30 * P.habitue) / (P.touriste + P.habitue));
    const deux = soiree(2);
    deux.clientele.satisfaction = { touriste: 10, habitue: 30, affaires: 90, groupe: 50 };
    const attendu = (10 * P.touriste + 30 * P.habitue + 90 * P.affaires + 50 * P.groupe) / (P.touriste + P.habitue + P.affaires + P.groupe);
    expect(reputationPonderee(deux)).toBeCloseTo(attendu);
  });

  it('les habitués pèsent plus que les autres dans la réputation', () => {
    const touriste = soiree(1);
    changerSatisfaction(touriste, 'touriste', 10);
    const habitue = soiree(1);
    changerSatisfaction(habitue, 'habitue', 10);
    expect(habitue.reputation).toBeGreaterThan(touriste.reputation);
  });

  it('un rendez-vous ne touche que le segment du client', () => {
    const avant = soiree(1, { rendezVous: [rdvQuiFinit('retraite')] });
    const apres = tick(avant).etat;
    expect(apres.clientele.satisfaction.habitue).toBeGreaterThan(avant.clientele.satisfaction.habitue);
    expect(apres.clientele.satisfaction.touriste).toBe(avant.clientele.satisfaction.touriste);
    expect(apres.reputation).toBeCloseTo(reputationPonderee(apres));
    expect(apres.reputation).toBeGreaterThan(avant.reputation);
  });

  it('les gains ralentissent avec la satisfaction du segment, pas avec la réputation globale', () => {
    const gainSur = (satisfaction: number) => {
      const avant = soiree(1, { rendezVous: [rdvQuiFinit('retraite')] });
      avant.clientele.satisfaction.habitue = satisfaction;
      return tick(avant).etat.clientele.satisfaction.habitue - satisfaction;
    };
    expect(gainSur(10)).toBeGreaterThan(gainSur(60));
    expect(gainReputation(20, 0.9)).toBeGreaterThan(gainReputation(50, 0.9));
  });

  it('un client d’affaires qui repart las d’attendre coûte plus qu’un touriste', () => {
    const perte = (modele: string) => {
      const avant = soiree(2, { file: [{ id: 1, modele, patience: 5 }], personnel: [] });
      const segment = modeleClient(modele).segment;
      return avant.clientele.satisfaction[segment] - tick(avant).etat.clientele.satisfaction[segment];
    };
    expect(perte('banquier')).toBeCloseTo(perte('touriste-egare') * B.SENSIBILITE_ATTENTE.affaires, 5);
    expect(perte('touriste-egare')).toBeCloseTo(B.REPUTATION_CLIENT_PERDU * B.SATISFACTION_PAR_CLIENT, 5);
  });

  it('un client refoulé par un quai plein pèse sur son segment', () => {
    const plein = [1, 2, 3, 4].map((id) => ({ id, modele: 'etudiant', patience: 50 }));
    const etat = soiree(1, { file: plein.slice(0, B.PLACES_FILE) });
    const avant = structuredClone(etat.clientele.satisfaction);
    const evenements: { type: string }[] = [];
    arrivee(etat, creerTirage(3), evenements);
    expect(evenements).toEqual([{ type: 'filePleine' }]);
    const baisse = (['touriste', 'habitue'] as const).filter((s) => etat.clientele.satisfaction[s] < avant[s]);
    expect(baisse).toHaveLength(1);
  });

  it('une dispute qui dégénère fait baisser tous les segments', () => {
    const etat = soiree(2, { dispute: { expire: 0 } });
    fixerReputation(etat, 30);
    const apres = tick(etat).etat;
    for (const s of ['touriste', 'habitue', 'affaires', 'groupe'] as const) {
      expect(apres.clientele.satisfaction[s]).toBeCloseTo(30 - B.DISPUTE_REPUTATION);
    }
    expect(apres.reputation).toBeCloseTo(30 - B.DISPUTE_REPUTATION);
  });

  it('un segment content revient plus souvent', () => {
    const etat = soiree(1);
    etat.clientele.satisfaction.habitue = 70;
    etat.clientele.satisfaction.touriste = 10;
    expect(attraitSegment(etat, 'habitue')).toBeGreaterThan(attraitSegment(etat, 'touriste'));
    const tirage = creerTirage(2);
    let habitues = 0;
    for (let i = 0; i < 300; i++) {
      const copie: EtatJeu = { ...structuredClone(etat), file: [] };
      arrivee(copie, tirage, { push: () => 0 });
      if (modeleClient(copie.file[0]!.modele).segment === 'habitue') habitues += 1;
    }
    // Sans cet effet, ils seraient environ 3 sur 7 (3 modèles d'habitués contre 4 de touristes).
    expect(habitues / 300).toBeGreaterThan(0.6);
  });
});

describe('ouverture des segments au palier 2', () => {
  it('Affaires et Groupes partent de la réputation acquise : la moyenne ne chute pas', () => {
    const etat = soiree(1);
    etat.clientele.satisfaction.touriste = 22;
    etat.clientele.satisfaction.habitue = 28;
    changerSatisfaction(etat, 'touriste', 0);
    const avant = etat.reputation;
    accorderPalier(etat, 2);
    expect(etat.clientele.satisfaction.affaires).toBeCloseTo(avant);
    expect(etat.clientele.satisfaction.groupe).toBeCloseTo(avant);
    changerSatisfaction(etat, 'touriste', 0);
    expect(etat.reputation).toBeCloseTo(avant);
    expect(etat.systemes.clientele).toBe(true);
  });
});

describe('fréquentation', () => {
  it('chaque ouverture ouvre une ligne, les 7 dernières nuits sont gardées', () => {
    let etat: EtatJeu = { ...creerEtatInitial(), minuteDuJour: h(19, 55), briefingJour: 1 };
    etat.clientele.historique = Array.from({ length: 7 }, () => ({
      servis: { touriste: 1, habitue: 0, affaires: 0, groupe: 0 },
      perdus: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 },
    }));
    etat = tick(etat).etat;
    expect(etat.clientele.historique).toHaveLength(B.NUITS_HISTORIQUE_CLIENTELE);
    expect(etat.clientele.historique[0]!.servis.touriste).toBe(0);
    expect(frequentation(etat).servis.touriste).toBe(6);
    expect(etat.clientele.satisfactionOuverture).toEqual(etat.clientele.satisfaction);
  });

  it('compte les clients reçus et repartis par segment', () => {
    const avant = soiree(2, {
      rendezVous: [rdvQuiFinit('banquier')],
      file: [{ id: 2, modele: 'fetard', patience: 5 }],
      personnel: creerEtatInitial().personnel.map((e) => ({ ...e, repos: true })),
    });
    avant.clientele.historique = [{ servis: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 }, perdus: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 } }];
    const apres = tick(avant).etat;
    expect(apres.clientele.historique[0]!.servis.affaires).toBe(1);
    expect(apres.clientele.historique[0]!.perdus.groupe).toBe(1);
  });

  it('une partie reprise en pleine soirée compte quand même ses clients', () => {
    const avant = soiree(1, { rendezVous: [rdvQuiFinit('retraite')] });
    avant.clientele.historique = [];
    expect(tick(avant).etat.clientele.historique[0]!.servis.habitue).toBe(1);
  });
});

describe('moteur', () => {
  it('le pas sur place de la simulation donne exactement le même état que le pas pur', () => {
    let pur: EtatJeu = { ...creerEtatInitial({ graine: 11 }), briefingJour: 1 };
    const surPlace = structuredClone(pur);
    for (let i = 0; i < 400; i++) {
      pur = tick(pur).etat;
      tickSurPlace(surPlace);
    }
    expect(surPlace).toEqual(pur);
  });

  it('les nouveautés vues disparaissent', () => {
    const etat = { ...creerEtatInitial(), nouveautes: ['clientele'] };
    expect(appliquerOrdres(etat, [{ type: 'nouveautesVues' }]).etat.nouveautes).toEqual([]);
  });
});
