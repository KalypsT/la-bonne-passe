import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { DEFIS_SEMAINE, trouverDefi } from '../content/defis';
import { creerEtatInitial, type EtatJeu } from './etat';
import { choisirDefi, conclureDefi, defiReussi, objectifReussi, prochainObjectif, valeurDefi, valeurObjectif } from './bilans';
import { accorderPalier } from './paliers';
import { prelevementsDuMatin } from './soiree';
import { cloreSemaine } from './semaine';
import { creerTirage } from './hasard';
import { tick, type EvenementMoteur } from './tick';

const h = (heures: number) => heures * 60;

/** Palier 2, tendances ouvertes, un dimanche à 12 h. */
function maison(champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 7 }), jour: 14, minuteDuJour: h(12), briefingJour: 14, nuitsBouclees: 13 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  etat.systemes.tendances = true;
  etat.systemes.themes = true;
  etat.systemes.defis = true;
  return { ...etat, annonces: [], visites: [], ...champs };
}

describe('le défi de la semaine', () => {
  it('un défi lié à la tendance de la semaine est plus probable, jamais deux fois de suite le même', () => {
    let lies = 0;
    for (let n = 1; n <= 60; n++) {
      const etat = maison();
      etat.semaine.numero = n;
      etat.semaine.tendances = ['congres'];
      etat.defi = 'congres';
      const id = choisirDefi(etat);
      expect(id).not.toBe('congres');
      etat.defi = null;
      if (choisirDefi(etat) === 'congres') lies += 1;
    }
    // Poids 3 contre 1 pour chacun des défis ordinaires possibles : environ une fois sur trois.
    expect(lies).toBeGreaterThan(10);
    expect(lies).toBeLessThan(40);
  });

  it('un défi n’est proposé que si ses conditions tiennent (bar, tendance, segment)', () => {
    const etat = maison();
    etat.semaine.tendances = [];
    for (let n = 1; n <= 40; n++) {
      etat.semaine.numero = n;
      const def = trouverDefi(choisirDefi(etat)!)!;
      expect(def.condition?.tendance).toBeUndefined();
      expect(def.condition?.bar).not.toBe(true);
    }
  });

  it('chaque mesure suit la semaine en cours', () => {
    const etat = maison();
    etat.semaine.stats.servis.affaires = 9;
    etat.semaine.servis = 30;
    etat.semaine.perdus = 10;
    etat.semaine.comptes.recettes.bar = 420;
    etat.semaine.stats.disputes = 2;
    etat.semaine.stats.alertesManquees = 4;
    etat.clientele.satisfaction.habitue = etat.semaine.satisfactionDebut.habitue + 6;
    const v = (id: string) => valeurDefi(etat, trouverDefi(id)!);
    expect(v('congres')).toBe(9);
    expect(v('affluence')).toBe(30);
    expect(v('fidelite')).toBe(25);
    expect(v('bar')).toBe(420);
    expect(v('match')).toBe(2);
    expect(v('attentive')).toBe(4);
    expect(v('habitues')).toBe(6);
    expect(defiReussi(trouverDefi('match')!, 2)).toBe(true);
    expect(defiReussi(trouverDefi('attentive')!, 4)).toBe(false);
  });

  it('le lundi, le défi est jugé et sa récompense tombe ; le suivant est annoncé au bilan', () => {
    const etat = maison({ jour: 15, minuteDuJour: h(5) });
    etat.defi = 'congres';
    etat.semaine.stats.servis.affaires = B.DEFIS.congres;
    const affaires = etat.clientele.satisfaction.affaires;
    const evenements: EvenementMoteur[] = [];
    cloreSemaine(etat, [], creerTirage(3), evenements);
    expect(etat.bilanSemaine?.defi).toEqual({ id: 'congres', valeur: B.DEFIS.congres, cible: B.DEFIS.congres, reussi: true });
    expect(etat.clientele.satisfaction.affaires).toBeGreaterThan(affaires);
    expect(evenements).toContainEqual({ type: 'defiConclu', id: 'congres', reussi: true });
    expect(etat.defi).not.toBeNull();
    expect(etat.bilanSemaine?.nouveauDefi).toBe(etat.defi);
    expect(etat.semaine.stats.servis.affaires).toBe(0);
  });

  it('raté, il ne rapporte rien', () => {
    const etat = maison();
    etat.defi = 'bar';
    etat.semaine.comptes.recettes.bar = 10;
    const stock = etat.bar.stock;
    expect(conclureDefi(etat, [])).toMatchObject({ id: 'bar', reussi: false });
    expect(etat.bar.stock).toBe(stock);
  });

  it('les défis s’ouvrent avec les tendances, au premier lundi après le palier 2', () => {
    // Dimanche à 4 h 55 : le pas suivant ouvre le lundi 8.
    const etat = { ...creerEtatInitial({ graine: 2 }), jour: 7, minuteDuJour: h(4) + 55, briefingJour: 7, palier: 2 };
    etat.systemes = { ...etat.systemes, affaires: true, groupes: true };
    const apres = tick(etat).etat;
    expect(apres.systemes.defis).toBe(true);
    expect(apres.defi).not.toBeNull();
  });

  it('les cibles et les textes tiennent debout', () => {
    for (const d of DEFIS_SEMAINE) {
      expect(d.texte.includes('{cible}') || d.auPlus || d.cible === 0 || d.id === 'match', d.id).toBe(true);
      expect([d.titre, d.texte, d.reussite, d.echec, d.recompenseTexte].join(' '), d.id).not.toContain("'");
    }
  });
});

describe('l’objectif du mois et le bilan de fin de mois', () => {
  it('le premier mois vise une réputation ; le jour de la mensualité, il est jugé', () => {
    const etat = maison({ jour: B.JOUR_PREMIERE_MENSUALITE, minuteDuJour: h(5), tresorerie: 6_000, reputation: B.OBJECTIFS.reputationMois1 });
    expect(etat.mois).toMatchObject({ numero: 1, objectif: 'reputation', cible: B.OBJECTIFS.reputationMois1 });
    // La réputation affichée suit les segments : on les aligne sur la cible.
    for (const s of Object.keys(etat.clientele.satisfaction) as (keyof typeof etat.clientele.satisfaction)[]) etat.clientele.satisfaction[s] = B.OBJECTIFS.reputationMois1;
    const evenements: EvenementMoteur[] = [];
    prelevementsDuMatin(etat, evenements);
    expect(etat.mensualitesPayees).toBe(1);
    expect(etat.bilanMois).toMatchObject({ numero: 1, objectif: 'reputation', reussi: true, decouvert: false, mensualite: B.MENSUALITE });
    expect(etat.bilanMoisAVoir).toBe(true);
    expect(etat.mois.numero).toBe(2);
    expect(evenements).toContainEqual({ type: 'bilanMois', numero: 1, reussi: true });
  });

  it('une mensualité payée à découvert se voit au bilan (la lettre de la banque) ; l’objectif raté ne rapporte rien', () => {
    const etat = maison({ jour: B.JOUR_PREMIERE_MENSUALITE, minuteDuJour: h(5), tresorerie: 1_000, reserve: 0 });
    const moral = etat.personnel[0]!.moral;
    prelevementsDuMatin(etat, []);
    expect(etat.bilanMois).toMatchObject({ decouvert: true, reussi: false, avoir: 1_000 - B.MENSUALITE });
    expect(etat.personnel[0]!.moral).toBe(moral);
  });

  it('les mois suivants tournent : fidéliser la clientèle principale, garder une réserve, la réputation, l’équipe', () => {
    const etat = maison();
    etat.clientele.historique = [{ servis: { touriste: 1, habitue: 6, affaires: 2, groupe: 1 }, perdus: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 } }];
    const m2 = prochainObjectif(etat, 2);
    expect(m2).toMatchObject({ objectif: 'satisfaction', segment: 'habitue' });
    expect(m2.cible).toBe(Math.floor(etat.clientele.satisfaction.habitue) + B.OBJECTIFS.satisfactionEnPlus);
    expect(prochainObjectif(etat, 3)).toMatchObject({ objectif: 'avoir', cible: B.OBJECTIFS.avoir });
    expect(prochainObjectif(etat, 4).objectif).toBe('reputation');
    const equipe = prochainObjectif(etat, 5);
    expect(equipe.objectif).toBe('equipe');
    expect(objectifReussi(equipe, 0)).toBe(true);
    expect(objectifReussi(equipe, 1)).toBe(false);
    etat.mois = equipe;
    expect(valeurObjectif(etat, equipe)).toBe(0);
  });
});
