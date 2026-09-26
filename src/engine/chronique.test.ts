import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES, JONAS, MILA } from '../content/candidats';
import { resumer } from '../save/emplacements';
import { chroniqueDeDepart, chapitreBoucle, momentsMarquants, noterChronique, recettesTotales, titreDuStyle, type Moment } from './chronique';
import { creerEmploye, creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;
const embauche = (def: typeof MILA, nuits = 40) => ({ ...creerEmploye({ ...def, part: 0.5, moral: 70, loyaute: 60, fatigue: 0 }), nuitsTravaillees: nuits });

/** Palier 5, la deuxième maison ouverte chez Margot, juste avant la fermeture de la nuit. */
function avantLaFermeture(champs: Partial<EtatJeu> = {}): EtatJeu {
  let e: EtatJeu = { ...creerEtatInitial({ graine: 9 }), jour: 120, briefingJour: 120, nuitsBouclees: 119, mensualitesPayees: 4 };
  for (let p = 1; p <= 5; p++) accorderPalier(e, p);
  e.systemes.maison2 = true;
  e.etablissement = { offres: [{ id: 'club', achat: 40000, travaux: 12000, jours: 8 }], lieu: 'club', statut: 'pret', fin: 110 };
  e.personnel = [{ ...e.personnel[0]!, nuitsTravaillees: 119 }, embauche(MILA), embauche(JONAS, 10), embauche(INES)];
  e = { ...e, annonces: [], visites: [], candidats: [], tresorerie: 20000, reputation: 75, minuteDuJour: h(10) };
  e = appliquerOrdres(e, [{ type: 'confierMaison', employeId: 'externe' }, { type: 'inaugurer' }]).etat;
  return { ...e, minuteDuJour: h(3, 55), jour: 121, briefingJour: 121, ...champs };
}
const fermer = (e: EtatJeu) => tick(e);

describe('la chronique de la partie', () => {
  it('compte les soirées par offre, les thèmes, les arrivées et les départs, et retient les moments', () => {
    const e = creerEtatInitial();
    e.offre = 'feutree';
    e.themeDuSoir = 'jazz';
    noterChronique(e, [
      { type: 'ouverture', jour: 1 },
      { type: 'embauche', employeId: 'mila', prenom: 'Mila', part: 0.5 },
      { type: 'depart', prenom: 'Mila' },
      { type: 'palier', numero: 1 },
      { type: 'palier', numero: 2 },
      { type: 'disputeDegeneree' } as never,
    ]);
    const c = e.chronique;
    expect(c.soirees).toEqual({ classique: 0, happy: 0, feutree: 1 });
    expect(c.themes).toBe(1);
    expect(c.embauches).toBe(1);
    expect(c.departs).toBe(1);
    expect(c.incidents).toBe(1);
    // Le palier 1 (la première nuit) ne compte pas parmi les moments marquants.
    expect(c.moments.map((m) => m.type)).toEqual(['embauche', 'depart', 'palier']);
  });

  it('les recettes de chaque semaine s’ajoutent le lundi ; la semaine en cours compte à l’affichage', () => {
    let e = creerEtatInitial();
    e.semaine.comptes.recettes.rendezVous = 4000;
    e = tick({ ...e, jour: 7, minuteDuJour: h(4, 55), briefingJour: 7 }).etat;
    expect(e.chronique.recettes).toBe(4000);
    e.semaine.comptes.recettes.bar = 300;
    expect(recettesTotales(e)).toBe(4300);
  });

  it('ne retient que les histoires des personnages et du Chat Noir, pas les petites chaînes du quartier', () => {
    const e = creerEtatInitial();
    noterChronique(e, [
      { type: 'intrigueFinie', id: 'mila', fin: 'tete', prenom: 'Mila' },
      { type: 'intrigueFinie', id: 'jonas', fin: 'ecartee' },
      { type: 'intrigueFinie', id: 'costume', fin: 'pourboire' },
    ]);
    expect(e.chronique.moments).toEqual([{ jour: 1, type: 'intrigue', id: 'mila', fin: 'tete', prenom: 'Mila' }]);
  });

  it('compte le temps réel que lui envoie l’interface', () => {
    const e = appliquerOrdres(creerEtatInitial(), [{ type: 'tempsJoue', secondes: 90 }]).etat;
    expect(e.chronique.tempsJoue).toBe(90);
  });

  it('les moments marquants : les grands tournants d’abord, racontés dans l’ordre des jours', () => {
    const moments: Moment[] = [
      { jour: 2, type: 'embauche', prenom: 'Mila' },
      { jour: 3, type: 'chambre', chambreId: 'orientale' },
      { jour: 28, type: 'palier', numero: 3 },
      { jour: 40, type: 'intrigue', id: 'mila', fin: 'tete' },
      { jour: 90, type: 'achatLieu', lieu: 'club' },
      { jour: 100, type: 'inauguration', prenom: 'Margot' },
    ];
    expect(momentsMarquants(moments, 3).map((m) => m.jour)).toEqual([40, 90, 100]);
    expect(momentsMarquants(moments)).toHaveLength(Math.min(moments.length, B.FIN_CHAPITRE.moments));
  });
});

describe('le titre selon le style de jeu', () => {
  const avec = (champs: Partial<EtatJeu['chronique']>, etat: Partial<EtatJeu> = {}) => {
    const e = { ...creerEtatInitial(), reputation: 70, ...etat };
    e.chronique = { ...chroniqueDeDepart(), soirees: { classique: 10, happy: 0, feutree: 0 }, ...champs };
    return titreDuStyle(e);
  };
  it('discrétion, fête, famille, funambule, velours, quartier', () => {
    expect(avec({ departs: 1 }, { reputation: B.FIN_CHAPITRE.titres.velours })).toBe('velours');
    // Le style passe avant la réputation : une maison feutrée au sommet reste « discrétion ».
    expect(avec({ soirees: { classique: 4, happy: 0, feutree: 6 } }, { reputation: 95 })).toBe('discretion');
    expect(avec({ soirees: { classique: 4, happy: 0, feutree: 6 } })).toBe('discretion');
    expect(avec({ soirees: { classique: 5, happy: 3, feutree: 2 }, themes: 2 })).toBe('fete');
    expect(avec({ embauches: 3, departs: 0 })).toBe('famille');
    expect(avec({ embauches: 3, departs: 1, impayees: 1 })).toBe('funambule');
    expect(avec({ embauches: 3, departs: 2 })).toBe('quartier');
  });
  it('bâtisseuse : le bâtiment voisin et une grande équipe', () => {
    const e = { ...creerEtatInitial(), reputation: 70 };
    e.chronique.soirees.classique = 10;
    e.chronique.departs = 1;
    e.agrandissement.achete = ['batiment'];
    e.personnel = Array.from({ length: 6 }, (_, i) => ({ ...e.personnel[0]!, id: `p${i}` }));
    expect(titreDuStyle(e)).toBe('batisseuse');
  });
});

describe('la fin du chapitre 1', () => {
  it('se boucle à la fermeture, la deuxième maison ouverte et la maison d’origine à 70', () => {
    const { etat, evenements } = fermer(avantLaFermeture());
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'finChapitre', jour: 121 }));
    const f = etat.finChapitre!;
    expect(f.jour).toBe(121);
    expect(f.lieu).toBe('club');
    expect(f.gerante).toBe('Margot');
    // Jonas n'a que 10 nuits : pas encore parmi les fidèles.
    expect(f.fideles).toEqual(['Sanne', 'Mila', 'Inès']);
    expect(f.moments.some((m) => m.type === 'inauguration')).toBe(true);
    expect(etat.finChapitreAVoir).toBe(true);
    // Le mode libre commence : dès lundi, un objectif par semaine.
    expect(etat.systemes.modeLibre).toBe(true);
  });

  it('pas avant l’inauguration, ni sous 70 de réputation ; une seule fois', () => {
    const sous = avantLaFermeture({ reputation: B.FIN_CHAPITRE.reputation - 1 });
    expect(chapitreBoucle(sous)).toBe(false);
    expect(fermer(sous).etat.finChapitre).toBeNull();
    const fermee = avantLaFermeture();
    fermee.etablissement.statut = 'pret';
    expect(fermer(fermee).etat.finChapitre).toBeNull();
    const fini = fermer(avantLaFermeture()).etat;
    expect(chapitreBoucle(fini)).toBe(false);
  });

  it('le jeu continue ensuite, et l’écran titre dit que le chapitre est bouclé', () => {
    const fini = fermer(avantLaFermeture()).etat;
    const lu = appliquerOrdres(fini, [{ type: 'finChapitreVue' }]).etat;
    expect(lu.finChapitreAVoir).toBe(false);
    const suite = tick(lu).etat;
    expect(suite.minuteDuJour).not.toBe(lu.minuteDuJour);
    expect(resumer(lu, 0).chapitreFini).toBe(true);
    expect(resumer(creerEtatInitial(), 0).chapitreFini).toBeUndefined();
  });

  it('une réputation retombée sous 70 fait attendre : le chapitre se boucle le premier soir où elle remonte', () => {
    const e = avantLaFermeture({ reputation: 69 });
    expect(fermer(e).etat.finChapitre).toBeNull();
    expect(fermer({ ...e, reputation: 72 }).etat.finChapitre).not.toBeNull();
  });
});
