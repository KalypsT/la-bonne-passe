import { describe, expect, it } from 'vitest';
import { TRESORERIE_INITIALE } from '../content/balance';
import { creerEtatInitial, VERSION_ETAT } from '../engine/etat';
import { tick } from '../engine/tick';
import { charger, lireEmplacements, NOMBRE_EMPLACEMENTS, sauvegarder, supprimer } from './emplacements';
import { migrer } from './migrations';
import { creerStockageMemoire, type Stockage } from './stockage';

const MAINTENANT = Date.UTC(2026, 8, 25, 20, 0);

describe('emplacements de sauvegarde', () => {
  it('propose 3 emplacements, vides au départ', () => {
    const stockage = creerStockageMemoire();
    expect(NOMBRE_EMPLACEMENTS).toBe(3);
    expect(lireEmplacements(stockage)).toEqual([{ statut: 'vide' }, { statut: 'vide' }, { statut: 'vide' }]);
  });

  it('sauvegarde puis recharge une partie à l’identique', () => {
    const stockage = creerStockageMemoire();
    const etat = tick(creerEtatInitial()).etat;
    sauvegarder(1, etat, MAINTENANT, stockage);
    expect(charger(1, stockage)).toEqual(etat);
    expect(charger(0, stockage)).toBeNull();
  });

  it('résume chaque partie pour l’écran titre', () => {
    const stockage = creerStockageMemoire();
    const etat = creerEtatInitial({ nomMaison: 'Le Velours' });
    sauvegarder(2, etat, MAINTENANT, stockage);
    const [a, b, c] = lireEmplacements(stockage);
    expect(a).toEqual({ statut: 'vide' });
    expect(b).toEqual({ statut: 'vide' });
    expect(c).toEqual({
      statut: 'partie',
      resume: {
        avatar: etat.joueur.avatar,
        tenue: 0,
        prenom: etat.joueur.prenom,
        nomMaison: 'Le Velours',
        chapitre: 1,
        jour: 1,
        minuteDuJour: etat.minuteDuJour,
        tresorerie: TRESORERIE_INITIALE,
        dernierePartie: MAINTENANT,
      },
    });
  });

  it('garde les 3 parties indépendantes', () => {
    const stockage = creerStockageMemoire();
    for (const i of [0, 1, 2]) sauvegarder(i, creerEtatInitial({ nomMaison: `Maison ${i}` }), MAINTENANT, stockage);
    expect(lireEmplacements(stockage).map((e) => (e.statut === 'partie' ? e.resume.nomMaison : null))).toEqual([
      'Maison 0',
      'Maison 1',
      'Maison 2',
    ]);
  });

  it('supprime une partie sans toucher aux autres', () => {
    const stockage = creerStockageMemoire();
    sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage);
    sauvegarder(1, creerEtatInitial(), MAINTENANT, stockage);
    supprimer(0, stockage);
    expect(charger(0, stockage)).toBeNull();
    expect(lireEmplacements(stockage).map((e) => e.statut)).toEqual(['vide', 'partie', 'vide']);
  });

  it('reconstruit l’index s’il a disparu', () => {
    const stockage = creerStockageMemoire();
    sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage);
    stockage.removeItem('la-bonne-passe:index');
    const [premier] = lireEmplacements(stockage);
    expect(premier?.statut).toBe('partie');
  });

  it('signale une sauvegarde abîmée comme illisible', () => {
    const stockage = creerStockageMemoire();
    stockage.setItem('la-bonne-passe:partie:0', '{pas du json');
    expect(lireEmplacements(stockage)[0]).toEqual({ statut: 'illisible' });
    expect(charger(0, stockage)).toBeNull();
  });

  it('ne plante pas si le stockage refuse tout accès', () => {
    const casse: Stockage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    expect(() => sauvegarder(0, creerEtatInitial(), MAINTENANT, casse)).not.toThrow();
    expect(lireEmplacements(casse).map((e) => e.statut)).toEqual(['vide', 'vide', 'vide']);
  });
});

describe('migrations', () => {
  it('laisse intacte une sauvegarde de la version courante', () => {
    const etat = creerEtatInitial();
    expect(etat.version).toBe(VERSION_ETAT);
    expect(migrer(structuredClone(etat))).toEqual(etat);
  });

  it('migre une sauvegarde v1 en ajoutant joueur, maison, chapitre et trésorerie', () => {
    const v1 = {
      version: 1,
      jour: 4,
      minuteDuJour: 22 * 60,
      hasard: 123,
      paliers: { personnel: true, clientele: false, finances: false, relations: false },
    };
    const migre = migrer(v1);
    expect(migre).not.toBeNull();
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.jour).toBe(4);
    expect(migre?.minuteDuJour).toBe(22 * 60);
    expect(migre?.systemes.personnel).toBe(true);
    expect(migre?.chapitre).toBe(1);
    expect(migre?.tresorerie).toBe(TRESORERIE_INITIALE);
    expect(typeof migre?.joueur.prenom).toBe('string');
    expect(migre?.joueur.tenue).toBe(0);
  });

  it('migre une sauvegarde v2 en gardant le joueur et en ajoutant la tenue', () => {
    const v2 = {
      version: 2,
      joueur: { prenom: 'Bram', avatar: 'patron-2', genre: 'patron' },
      maison: { nom: 'Le Velours', ville: 'Amsterdam' },
      chapitre: 1,
      tresorerie: 2500,
      jour: 3,
      minuteDuJour: 10 * 60,
      hasard: 5,
      paliers: { personnel: false, clientele: false, finances: false, relations: false },
    };
    const migre = migrer(v2);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.joueur).toEqual({ prenom: 'Bram', avatar: 'patron-2', tenue: 0, genre: 'patron' });
    expect(migre?.maison.nom).toBe('Le Velours');
    expect(migre?.tresorerie).toBe(2500);
  });

  it('migre une sauvegarde v3 : chambres, réputation, systèmes et briefing', () => {
    const v3 = (minuteDuJour: number, jour: number) => ({
      version: 3,
      joueur: { prenom: 'Inès', avatar: 'patronne-3', tenue: 1, genre: 'patronne' },
      maison: { nom: 'Rouge & Or', ville: 'Amsterdam' },
      chapitre: 1,
      tresorerie: 3000,
      jour,
      minuteDuJour,
      hasard: 5,
      paliers: { personnel: false, clientele: false, finances: false, relations: false },
    });
    const aDixNeufHeures = migrer(v3(19 * 60, 1));
    expect(aDixNeufHeures?.version).toBe(VERSION_ETAT);
    expect(aDixNeufHeures?.briefingJour).toBe(0);
    expect(aDixNeufHeures?.chambres.filter((c) => c.ouverte).map((c) => c.id)).toEqual(['boudoir']);
    expect(aDixNeufHeures?.systemes.personnel).toBe(true);
    expect(aDixNeufHeures?.systemes.clientele).toBe(false);
    expect(aDixNeufHeures).not.toHaveProperty('paliers');

    // 21 h : le briefing est considéré comme fait.
    expect(migrer(v3(21 * 60, 1))?.briefingJour).toBe(1);
    // 1 h du matin, jour 2 à l'ancienne (minuit) : c'est encore la soirée du jour 1.
    const apresMinuit = migrer(v3(60, 2));
    expect(apresMinuit?.jour).toBe(1);
    expect(apresMinuit?.briefingJour).toBe(1);
  });

  it('migre une sauvegarde v4 : Sanne, le ménage, le linge et un quai vide', () => {
    const { personnel: _p, equipes: _e, linge: _l, lingeCommande: _lc, offre: _o, file: _f, rendezVous: _r, prochainClient: _pc, nuit: _n, nuitsBouclees: _nb, dispute: _d, ...v4 } =
      creerEtatInitial();
    const migre = migrer({ ...v4, version: 4, tresorerie: 1234 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.personnel.map((e) => e.id)).toEqual(['sanne']);
    expect(migre?.equipes.menage).toBe(1);
    expect(migre?.file).toEqual([]);
    expect(migre?.tresorerie).toBe(1234);
  });

  /** Une sauvegarde telle que la v0.1 l'écrivait (version 5). */
  function v5(champs: Record<string, unknown> = {}) {
    const { reserve: _r, tauxReserve: _t, mensualitesPayees: _m, annonces: _a, journal: _j, ...etat } = creerEtatInitial();
    const { planning: _p, reserve: _rs, ...systemes } = etat.systemes;
    const chambres = etat.chambres.map(({ travaux: _tr, ...c }) => c);
    return { ...etat, version: 5, systemes, chambres, ...champs };
  }

  it('migre une sauvegarde v5 : travaux, réserve, mensualités et journal vide', () => {
    const migre = migrer(v5({ tresorerie: 2222 }));
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.chambres.every((c) => c.travaux === null)).toBe(true);
    expect(migre).toMatchObject({ reserve: 0, tauxReserve: 0, mensualitesPayees: 0, annonces: [], journal: [], palier: 0 });
    expect(migre?.systemes).toMatchObject({ planning: false, reserve: false, recrutement: false });
    expect(migre?.tresorerie).toBe(2222);
  });

  it('accorde le palier 1, avec son annonce, à une partie v5 qui a bouclé une nuit', () => {
    const migre = migrer(v5({ nuitsBouclees: 2 }));
    expect(migre?.palier).toBe(1);
    expect(migre?.annonces).toEqual([1]);
    expect(migre?.systemes).toMatchObject({ recrutement: true, renovation: true, planning: true, reserve: true, bar: false });
  });

  /** Une sauvegarde de la partie 1 de la v0.2 (version 6) : Sanne sans identité dans l'état. */
  function v6(champs: Record<string, unknown> = {}) {
    const { candidats: _c, visites: _v, prochainCandidat: _p, essaisATrancher: _e, ...etat } = creerEtatInitial();
    const personnel = etat.personnel.map(({ prenom: _pr, age: _a, genre: _g, accroche: _ac, silhouette: _s, traitsConnus: _t, finEssai: _f, nuitsTravaillees: _n, ...e }) => e);
    return { ...etat, version: 6, personnel, ...champs };
  }

  it('migre une sauvegarde v6 : Sanne reçoit son identité, sans candidat avant le palier 1', () => {
    const migre = migrer(v6());
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.personnel[0]).toMatchObject({ id: 'sanne', prenom: 'Sanne', age: 29, genre: 'f', finEssai: null, traitsConnus: ['Mère poule', 'Fidèle'] });
    expect(migre?.personnel[0]?.moral).toBe(creerEtatInitial().personnel[0]?.moral);
    expect(migre).toMatchObject({ candidats: [], visites: [], essaisATrancher: [], prochainCandidat: 1 });
  });

  it('migre une sauvegarde v6 au palier 1 : Mila, Jonas et Inès sont attendus', () => {
    const migre = migrer(v6({ palier: 1, jour: 5, minuteDuJour: 12 * 60, nuitsBouclees: 4, personnel: [{ ...v6().personnel[0], moral: 33 }] }));
    expect(migre?.visites.map((v) => v.candidat.id)).toEqual(['mila', 'jonas', 'ines']);
    expect(migre?.personnel[0]).toMatchObject({ moral: 33, nuitsTravaillees: 4 });
  });

  it('migre une sauvegarde v7 : planning, affinités neutres, imprévus et suivi du personnel', () => {
    const { rdvMax: _r, affinites: _a, imprevu: _i, imprevusVus: _iv, prochainImprevu: _p, adieux: _ad, ...etat } = creerEtatInitial();
    const sanne = etat.personnel[0]!;
    const { reposPrevu: _rp, enServiceCeSoir: _es, menaceDepart: _m, dernierEntretien: _de, dernierePrime: _dp, promesseRepos: _pr, recadre: _rc, ...ancienne } = sanne;
    const mila = { ...ancienne, id: 'mila', prenom: 'Mila', moral: 44 };
    const nuit = { numero: 2, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0 };
    const migre = migrer({ ...etat, version: 7, personnel: [ancienne, mila], nuit });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.rdvMax).toBe(4);
    expect(migre?.affinites).toEqual({ 'mila|sanne': 0 });
    expect(migre?.personnel[1]).toMatchObject({ moral: 44, menaceDepart: null, promesseRepos: null, enServiceCeSoir: true });
    expect(migre?.nuit?.imprevus).toBe(0);
    expect(migre).toMatchObject({ imprevu: null, imprevusVus: [], adieux: [] });
  });

  it('migre une sauvegarde v8 : segments Affaires et Groupes fermés avant le palier 2', () => {
    const etat = creerEtatInitial();
    const { affaires: _a, groupes: _g, ...systemes } = etat.systemes;
    const migre = migrer({ ...etat, version: 8, systemes, palier: 1 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.systemes).toMatchObject({ affaires: false, groupes: false });
  });

  it('refuse une version future ou des données sans version', () => {
    expect(migrer({ ...creerEtatInitial(), version: VERSION_ETAT + 1 })).toBeNull();
    expect(migrer({ jour: 1 })).toBeNull();
    expect(migrer(null)).toBeNull();
    expect(migrer('texte')).toBeNull();
  });

  it('charge une ancienne sauvegarde v1 depuis un emplacement', () => {
    const stockage = creerStockageMemoire();
    const v1 = { version: 1, jour: 2, minuteDuJour: 300, hasard: 9, paliers: {} };
    stockage.setItem('la-bonne-passe:partie:0', JSON.stringify({ version: 1, etat: v1 }));
    expect(charger(0, stockage)?.jour).toBe(2);
    expect(lireEmplacements(stockage)[0]?.statut).toBe('partie');
  });
});
