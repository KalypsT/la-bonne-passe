import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { creerEtatInitial, type EtatJeu } from './etat';
import { lundiModeLibre, objectifsPossibles, tirerObjectifLibre, type ObjectifLibre } from './modeLibre';
import { accorderPalier } from './paliers';
import { tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Palier 5 passé, avec un historique de semaines. Le chapitre bouclé si `libre`. */
function partie(libre = true, champs: Partial<EtatJeu> = {}): EtatJeu {
  const e: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 49, briefingJour: 49, nuitsBouclees: 48, mensualitesPayees: 1, reputation: 80 };
  for (let p = 1; p <= 5; p++) accorderPalier(e, p);
  e.systemes.tendances = true;
  e.systemes.defis = true;
  e.systemes.modeLibre = libre;
  e.modeLibre.historique = [
    { recette: 9000, servis: 80 },
    { recette: 10000, servis: 90 },
    { recette: 11000, servis: 85 },
    { recette: 10000, servis: 70 },
  ];
  e.clientele.satisfaction = { touriste: 90, habitue: 90, affaires: 90, groupe: 90, vip: 90, couple: 90 };
  return { ...e, annonces: [], ...champs };
}
/** Le lundi suivant (jour 50) à 5 h. */
const lundi = (e: EtatJeu) => tick({ ...e, minuteDuJour: h(4, 55), bilanAVoir: false, bilanMoisAVoir: false });

describe('mode libre : les objectifs possibles', () => {
  it('la semaine calme toujours ; la recette, 5 % au-dessus de la moyenne des 4 dernières semaines ; le record, la meilleure recette + 100 €', () => {
    const e = partie();
    const types = Object.fromEntries(objectifsPossibles(e).map((o) => [o.type, o]));
    expect(types.calme?.cible).toBe(0);
    expect(types.recette?.cible).toBe(Math.round((10000 * B.MODE_LIBRE.recetteHausse) / 100) * 100);
    // Le record : la meilleure recette des deux derniers mois, plus 100 €.
    expect(types.record?.cible).toBe(11100);
    // Tous les segments sont contents : rien à reconquérir.
    expect(types.segment).toBeUndefined();
  });

  it('le segment ouvert le moins content, s’il est sous 85 ; pas de recette ni de record sans historique', () => {
    const e = partie(true);
    e.clientele.satisfaction.affaires = 60;
    e.clientele.satisfaction.touriste = 70;
    const s = objectifsPossibles(e).find((o) => o.type === 'segment');
    expect(s).toMatchObject({ segment: 'affaires', cible: B.MODE_LIBRE.segmentGain });
    e.modeLibre.historique = [{ recette: 9000, servis: 80 }];
    expect(objectifsPossibles(e).map((o) => o.type).sort()).toEqual(['calme', 'segment']);
  });

  it('jamais deux fois le même d’affilée, quand il y a le choix', () => {
    for (let g = 1; g <= 20; g++) {
      const e = partie(true, { hasardModeLibre: g });
      expect(tirerObjectifLibre(e, 'calme').type).not.toBe('calme');
    }
  });
});

describe('mode libre : le lundi', () => {
  it('avant la fin du chapitre : le défi continue, l’historique se remplit, pas d’objectif', () => {
    const l = lundi(partie(false)).etat;
    expect(l.modeLibre.objectif).toBeNull();
    expect(l.modeLibre.historique).toHaveLength(5);
    expect(l.defi).not.toBeNull();
  });

  it('après : l’objectif remplace le défi, et Josée présente le mode libre une seule fois', () => {
    const { etat: l, evenements } = lundi(partie());
    expect(l.defi).toBeNull();
    expect(l.modeLibre.objectif).not.toBeNull();
    expect(l.bilanSemaine?.modeLibre?.nouveau).toEqual(l.modeLibre.objectif);
    expect(l.bilanSemaine?.ouvertures).toContain('modeLibre');
    expect(evenements).toContainEqual({ type: 'objectifLibre', objectif: l.modeLibre.objectif!.type });
    const l2 = lundi({ ...l, jour: 56, briefingJour: 56 }).etat;
    expect(l2.bilanSemaine?.ouvertures ?? []).not.toContain('modeLibre');
  });

  it('une recette atteinte : réussi, série, réputation ; manquée : la série retombe', () => {
    const objectif: ObjectifLibre = { type: 'recette', cible: 10500, segment: null, incidentsDebut: 0 };
    const e = partie(true, { modeLibre: { ...partie().modeLibre, objectif, serie: 2 } });
    e.semaine.comptes.recettes.rendezVous = 11000;
    const { etat: l, evenements } = lundi(e);
    expect(l.bilanSemaine?.modeLibre?.resultat).toMatchObject({ type: 'recette', valeur: 11000, reussi: true });
    expect(l.modeLibre).toMatchObject({ reussis: 1, serie: 3, meilleureSerie: 3 });
    expect(evenements).toContainEqual({ type: 'objectifLibreConclu', objectif: 'recette', reussi: true });

    const rate = partie(true, { modeLibre: { ...partie().modeLibre, objectif, serie: 2 } });
    rate.semaine.comptes.recettes.rendezVous = 9000;
    expect(lundi(rate).etat.modeLibre).toMatchObject({ reussis: 0, rates: 1, serie: 0 });
  });

  it('la recette ne compte ni la deuxième maison, ni l’assurance, ni les placements', () => {
    const objectif: ObjectifLibre = { type: 'recette', cible: 10500, segment: null, incidentsDebut: 0 };
    const e = partie(true, { modeLibre: { ...partie().modeLibre, objectif } });
    e.semaine.comptes.recettes.rendezVous = 8000;
    e.semaine.comptes.recettes.maison2 = 3000;
    e.semaine.comptes.recettes.assurance = 1000;
    expect(lundi(e).etat.bilanSemaine?.modeLibre?.resultat?.reussi).toBe(false);
  });

  it('une semaine calme se perd au premier incident', () => {
    const objectif: ObjectifLibre = { type: 'calme', cible: 0, segment: null, incidentsDebut: 3 };
    const calme = partie(true, { modeLibre: { ...partie().modeLibre, objectif } });
    calme.chronique.incidents = 3;
    expect(lundi(calme).etat.bilanSemaine?.modeLibre?.resultat?.reussi).toBe(true);
    const agitee = partie(true, { modeLibre: { ...partie().modeLibre, objectif } });
    agitee.chronique.incidents = 4;
    expect(lundi(agitee).etat.bilanSemaine?.modeLibre?.resultat).toMatchObject({ valeur: 1, reussi: false });
  });

  it('un segment reconquis gagne sa récompense', () => {
    const objectif: ObjectifLibre = { type: 'segment', cible: 5, segment: 'affaires', incidentsDebut: 0 };
    const e = partie(true, { modeLibre: { ...partie().modeLibre, objectif } });
    e.semaine.satisfactionDebut = { ...e.semaine.satisfactionDebut, affaires: 60 };
    e.clientele.satisfaction.affaires = 66;
    const l = lundi(e).etat;
    expect(l.bilanSemaine?.modeLibre?.resultat).toMatchObject({ valeur: 6, reussi: true });
    expect(l.clientele.satisfaction.affaires).toBeGreaterThanOrEqual(66 + B.MODE_LIBRE.recompenses.segment.satisfaction - 1);
  });

  it('son hasard est à part : la maison tire la même semaine avec ou sans mode libre', () => {
    const avec = lundi(partie(true)).etat;
    const sans = lundi(partie(false)).etat;
    expect(avec.hasard).toBe(sans.hasard);
    expect(avec.semaine.tendances).toEqual(sans.semaine.tendances);
  });

  it('sans bilan de la semaine, rien ne se passe', () => {
    const e = partie();
    e.bilanSemaine = null;
    lundiModeLibre(e, []);
    expect(e.modeLibre.objectif).toBeNull();
  });
});
