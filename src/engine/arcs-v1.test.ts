// Les arcs d'Inès et de Sanne (v1.0, partie 4) et les traits qu'ils donnent.

import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES } from '../content/candidats';
import { creerEtatInitial, type EtatJeu } from './etat';
import { fatigueGerante, nuitDeLaGerante, partGerante } from './agrandir';
import { avancerIntrigues, matinDesIntrigues } from './intrigues';
import { facteurGerante } from './maison2';
import { accorderPalier } from './paliers';
import { candidatDepuis } from './recrutement';
import { appliquerOrdres, type Ordre } from './tick';
import { instant } from './temps';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Palier donné, Sanne et Inès confirmées, un mardi à midi. */
function maison(palier = 2, champs: Partial<EtatJeu> = {}): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 3 }), jour: 58, minuteDuJour: h(12), briefingJour: 58, nuitsBouclees: 57, mensualitesPayees: 2 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  etat = { ...etat, annonces: [], visites: [], tresorerie: 5_000 };
  etat = { ...etat, candidats: [{ ...candidatDepuis(INES, 'visite', 60), questionPosee: 0 }] };
  etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: 'ines', part: 0.5 }]).etat;
  for (const e of etat.personnel) {
    e.finEssai = null;
    e.nuitsTravaillees = 50;
    e.moral = 70;
  }
  return { ...etat, ...champs };
}
const perso = (etat: EtatJeu, id: string) => etat.personnel.find((e) => e.id === id)!;
const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);
function aLEtape(etat: EtatJeu, id: string, etape: string, employeId: string | null, points = 0): EtatJeu {
  etat.intrigues.actives = [{ id, etape, echeance: instant(etat), employeId, debut: etat.jour, points }];
  avancerIntrigues(etat, []);
  return etat;
}

describe('l’arc d’Inès, « Une saison à Ibiza »', () => {
  it('démarre après sa trentième nuit, une fois confirmée', () => {
    const tot = maison();
    for (const e of tot.personnel) e.nuitsTravaillees = B.ARC_INES.nuits - 1;
    matinDesIntrigues(tot);
    expect(tot.intrigues.actives.map((a) => a.id)).not.toContain('ines');
    const pret = maison();
    perso(pret, 'sanne').nuitsTravaillees = 0;
    perso(pret, 'ines').nuitsTravaillees = B.ARC_INES.nuits;
    matinDesIntrigues(pret);
    expect(pret.intrigues.actives).toContainEqual(expect.objectContaining({ id: 'ines', etape: 'flyer', employeId: 'ines' }));
  });

  it('libre et soutenue, elle reste : Oiseau de nuit, elle n’est plus Fêtarde', () => {
    let etat = aLEtape(maison(), 'ines', 'decision', 'ines', B.ARC_INES.pointsReste);
    expect(etat.intrigues.carte).toBe('ines');
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(perso(etat, 'ines').traits).toContain('Oiseau de nuit');
    expect(perso(etat, 'ines').traits).not.toContain('Fêtarde');
    expect(etat.intrigues.finies).toContainEqual({ id: 'ines', fin: 'oiseau', jour: 58 });
  });

  it('assagie : charme +1, elle n’est plus Tête brûlée', () => {
    let etat = aLEtape(maison(), 'ines', 'decision', 'ines', B.ARC_INES.pointsReste);
    const charme = perso(etat, 'ines').talents.charme;
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 1 }).etat;
    expect(perso(etat, 'ines').talents.charme).toBe(charme + 1);
    expect(perso(etat, 'ines').traits).not.toContain('Tête brûlée');
  });

  it('le moral en berne, elle part à Ibiza, libre : on peut la laisser partir', () => {
    const e = maison();
    perso(e, 'ines').moral = B.ARC_INES.moralReste - 10;
    let etat = aLEtape(e, 'ines', 'decision', 'ines', B.ARC_INES.pointsReste);
    // La condition manque : l'étape du départ vient à la place.
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'depart' });
    etat = aLEtape(etat, 'ines', 'depart', 'ines', 0);
    const { etat: apres, evenements } = ordonner(etat, { type: 'choixIntrigue', choix: 0 });
    expect(apres.personnel.some((x) => x.id === 'ines')).toBe(false);
    expect(evenements).toContainEqual({ type: 'depart', prenom: 'Inès' });
  });
});

describe('l’arc de Sanne, « La relève »', () => {
  it('démarre au palier 4, pas avant le jour 55', () => {
    const trois = maison(3);
    perso(trois, 'ines').nuitsTravaillees = 0;
    matinDesIntrigues(trois);
    expect(trois.intrigues.actives.map((a) => a.id)).not.toContain('sanne');
    const tot = maison(4, { jour: B.ARC_SANNE.jour - 1 });
    perso(tot, 'ines').nuitsTravaillees = 0;
    matinDesIntrigues(tot);
    expect(tot.intrigues.actives.map((a) => a.id)).not.toContain('sanne');
    const pret = maison(4);
    perso(pret, 'ines').nuitsTravaillees = 0;
    matinDesIntrigues(pret);
    expect(pret.intrigues.actives).toContainEqual(expect.objectContaining({ id: 'sanne', etape: 'carnet', employeId: 'sanne' }));
  });

  it('préparée et de bon moral, Josée la reconnaît : elle devient Pilier', () => {
    let etat = aLEtape(maison(4, { minuteDuJour: h(16) }), 'sanne', 'josee', 'sanne', B.ARC_SANNE.preparation);
    expect(etat.intrigues.carte).toBe('sanne');
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(perso(etat, 'sanne').traits).toContain('Pilier');
    expect(etat.intrigues.finies).toContainEqual({ id: 'sanne', fin: 'releve', jour: 58 });
  });

  it('sans préparation, elle doute : la relève attendra', () => {
    const etat = aLEtape(maison(4, { minuteDuJour: h(16) }), 'sanne', 'josee', 'sanne', 1);
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'doute' });
  });
});

describe('les traits d’arc de la v1.0', () => {
  it('Pilier : à la gérance, plus d’alertes réglées, des rotations plus douces, jamais de caisse qui manque', () => {
    const e = maison(5);
    e.systemes.gerante = true;
    e.gerante = 'sanne';
    const sanne = perso(e, 'sanne');
    expect(partGerante(e)).toBeCloseTo(B.GERANTE.regle);
    expect(fatigueGerante(e)).toBeCloseTo(1 - B.GERANTE.fatigue);
    sanne.traits = [...sanne.traits, 'Pilier'];
    expect(partGerante(e)).toBeCloseTo(B.GERANTE.regle + B.GERANTE.pilierRegle);
    expect(fatigueGerante(e)).toBeCloseTo(1 - B.GERANTE.fatigue - B.GERANTE.pilierFatigue);
    sanne.loyaute = 10;
    e.journee.comptes.recettes.rendezVous = 2000;
    const evenements: unknown[] = [];
    nuitDeLaGerante(e, evenements);
    expect(evenements).toEqual([]);
    expect(facteurGerante(sanne)).toBeCloseTo(0.8 + 0.05 * 3.25 + B.GERANTE.pilierMaison2);
  });
});
