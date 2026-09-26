import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { chambreEnService, facteurRecuperation, plafondMoralNaturel, qualiteDecor } from './amenagement';
import { creerEtatInitial, type EtatJeu } from './etat';
import { manqueAuto } from './linge';
import { accorderPalier } from './paliers';
import { chambreDisponible, qualiteRdv } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 51 }), jour: 30, minuteDuJour: h(10), briefingJour: 30, nuitsBouclees: 29, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], candidats: [], tresorerie: 5000, ...champs };
}

const ordre = (e: EtatJeu, o: Parameters<typeof appliquerOrdres>[1][number]) => appliquerOrdres(e, [o]);
const jusqua = (e: EtatJeu, minute: number) => {
  let x = e;
  for (let i = 0; i < 400 && x.minuteDuJour !== minute; i++) x = tick(x).etat;
  return x;
};

describe('rafraîchir la déco', () => {
  it('ferme la chambre le temps des travaux, puis lui rend son état', () => {
    const base = partie(1);
    base.chambres[0]!.etat = 40;
    const { etat, evenements } = ordre(base, { type: 'rafraichir', chambreId: 'boudoir' });
    expect(etat.tresorerie).toBe(5000 - B.RAFRAICHIR.prix);
    expect(evenements).toContainEqual({ type: 'rafraichir', chambreId: 'boudoir', montant: B.RAFRAICHIR.prix });
    expect(chambreEnService(etat.chambres[0]!)).toBe(false);
    expect(chambreDisponible(etat, 'boudoir')).toBe(false);
    const fini = jusqua(etat, h(16, 5));
    expect(fini.chambres[0]!.etat).toBe(B.ETAT_APRES_TRAVAUX);
    expect(chambreEnService(fini.chambres[0]!)).toBe(true);
  });

  it('pas avant le palier 1, ni dans une chambre occupée ou sous les draps, ni sans le sou', () => {
    expect(ordre({ ...creerEtatInitial(), minuteDuJour: h(10) }, { type: 'rafraichir', chambreId: 'boudoir' }).evenements).toEqual([]);
    const occupee = partie(1, { rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard', duree: 60, restant: 30 }] });
    expect(ordre(occupee, { type: 'rafraichir', chambreId: 'boudoir' }).evenements).toEqual([]);
    expect(ordre(partie(1), { type: 'rafraichir', chambreId: 'velours' }).evenements).toEqual([]);
    expect(ordre(partie(1, { tresorerie: 100 }), { type: 'rafraichir', chambreId: 'boudoir' }).evenements).toEqual([]);
  });
});

describe('le décor', () => {
  it('un décor d’origine ne donne rien ; refait à neuf, il plaît à sa clientèle', () => {
    const base = partie(2);
    expect(qualiteDecor(base, 'boudoir', 'touriste')).toBe(0);
    const { etat } = ordre(base, { type: 'changerDecor', chambreId: 'boudoir', decor: 'miroirs' });
    expect(etat.tresorerie).toBe(5000 - B.CHANGER_DECOR.prix);
    expect(etat.chambres[0]!.decorAVenir).toBe('miroirs');
    const fini = jusqua(etat, h(18, 5));
    const c = fini.chambres[0]!;
    expect(c).toMatchObject({ decor: 'miroirs', decorRefait: true, decorAVenir: null });
    expect(qualiteDecor(fini, 'boudoir', 'affaires')).toBe(B.DECORS_EFFETS.qualite);
    expect(qualiteDecor(fini, 'boudoir', 'touriste')).toBe(0);
    const avant = qualiteRdv({ ...fini, chambres: fini.chambres.map((x) => ({ ...x, decorRefait: false })) }, 'boudoir', 'sanne', 'banquier');
    expect(qualiteRdv(fini, 'boudoir', 'sanne', 'banquier')).toBeCloseTo(avant + B.DECORS_EFFETS.qualite, 5);
  });

  it('on peut refaire à neuf le décor d’origine, mais pas deux fois le même', () => {
    const { etat } = ordre(partie(1), { type: 'changerDecor', chambreId: 'boudoir', decor: 'rose' });
    const fini = jusqua(etat, h(18, 5));
    expect(fini.chambres[0]!.decorRefait).toBe(true);
    expect(ordre(fini, { type: 'changerDecor', chambreId: 'boudoir', decor: 'rose' }).evenements).toEqual([]);
  });
});

describe('fermer une chambre', () => {
  it('une chambre fermée ne reçoit plus et ne donne plus l’alerte ; elle rouvre à la demande', () => {
    const { etat } = ordre(partie(1), { type: 'fermerChambre', chambreId: 'boudoir', fermee: true });
    expect(etat.chambres[0]!.fermee).toBe(true);
    expect(chambreDisponible(etat, 'boudoir')).toBe(false);
    const rouverte = ordre(etat, { type: 'fermerChambre', chambreId: 'boudoir', fermee: false }).etat;
    expect(chambreDisponible(rouverte, 'boudoir')).toBe(true);
    expect(ordre(partie(1), { type: 'fermerChambre', chambreId: 'velours', fermee: true }).evenements).toEqual([]);
  });
});

describe('les loges', () => {
  it('s’aménagent au palier 3, puis doublent la récupération en service et relèvent le plafond du moral', () => {
    expect(ordre(partie(2), { type: 'renoverAnnexe', annexe: 'loges' }).evenements).toEqual([]);
    const base = partie(3);
    expect(facteurRecuperation(base, true)).toBe(1);
    const { etat } = ordre(base, { type: 'renoverAnnexe', annexe: 'loges' });
    expect(etat.tresorerie).toBe(5000 - B.LOGES.prix);
    const fini = jusqua(etat, h(20, 5));
    expect(fini.annexes.loges.ouverte).toBe(true);
    expect(facteurRecuperation(fini, true)).toBe(B.LOGES.recuperationEnService);
    expect(facteurRecuperation(fini, false)).toBe(B.LOGES.recuperationAuRepos);
    expect(plafondMoralNaturel(fini)).toBe(B.MORAL_PLAFOND_NATUREL + B.LOGES.moralPlafond);
  });
});

describe('la buanderie', () => {
  function avecBuanderie(champs: Partial<EtatJeu> = {}): EtatJeu {
    const e = partie(2, champs);
    e.annexes.buanderie.ouverte = true;
    return e;
  }

  it('s’aménage au palier 2', () => {
    expect(ordre(partie(1), { type: 'renoverAnnexe', annexe: 'buanderie' }).evenements).toEqual([]);
    const { etat } = ordre(partie(2), { type: 'renoverAnnexe', annexe: 'buanderie' });
    expect(etat.tresorerie).toBe(5000 - B.BUANDERIE.prix);
    expect(jusqua(etat, h(18, 5)).annexes.buanderie.ouverte).toBe(true);
  });

  it('une parure utilisée part au lavage au lieu de disparaître', () => {
    const rdv = { chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 };
    const soir = avecBuanderie({ minuteDuJour: h(22), briefingJour: 30, linge: 5, rendezVous: [rdv] });
    const { etat } = tick(soir);
    expect(etat.linge).toBe(4);
    expect(etat.annexes.buanderie.sale).toBe(1);
  });

  it('le ménage relave, plus vite maison fermée, contre un peu de lessive', () => {
    const jourCalme = avecBuanderie({ linge: 0 });
    jourCalme.annexes.buanderie.sale = 10;
    jourCalme.equipes.menage = 1;
    const apres = tick(tick(tick(jourCalme).etat).etat).etat;
    // Trois pas de 5 minutes, maison fermée : 2 parures par heure.
    expect(apres.linge + apres.annexes.buanderie.sale).toBe(10);
    let e = jourCalme;
    for (let i = 0; i < 12; i++) e = tick(e).etat;
    expect(e.linge).toBe(2);
    expect(e.semaine.comptes.depenses.linge).toBe(2 * B.BUANDERIE.lessive);
  });

  it('chaque passage use : une parure sur vingt-cinq finit en chiffon, sans hasard', () => {
    const e = avecBuanderie({ linge: 30 });
    let usees = 0;
    const sortie = { push: (x: { type: string }) => x.type === 'parureUsee' && usees++ };
    return import('./amenagement').then(({ utiliserParure }) => {
      for (let i = 0; i < 25; i++) utiliserParure(e, sortie);
      expect(usees).toBe(1);
      expect(e.linge).toBe(5);
      expect(e.annexes.buanderie.sale).toBe(24);
    });
  });

  it('la commande automatique compte le linge au lavage', () => {
    const e = avecBuanderie({ linge: 3, lingeAuto: 10 });
    e.annexes.buanderie.sale = 5;
    expect(manqueAuto(e)).toBe(2);
    expect(manqueAuto({ ...e, annexes: { ...e.annexes, buanderie: { ...e.annexes.buanderie, ouverte: false } } })).toBe(7);
  });
});
