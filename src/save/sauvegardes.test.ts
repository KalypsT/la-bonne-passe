import { describe, expect, it } from 'vitest';
import { RELATIONS, TAPAGE, TRESORERIE_INITIALE } from '../content/balance';
import { trouverNouveaute } from '../content/nouveautes';
import { creerEtatInitial, VERSION_ETAT } from '../engine/etat';
import { tick } from '../engine/tick';
import { charger, lireEcriture, lireEmplacements, NOMBRE_EMPLACEMENTS, sauvegarder, supprimer } from './emplacements';
import { migrer } from './migrations';
import { ambitionDuMarche } from '../engine/recrutement';
import { creerStockageMemoire, type Stockage } from './stockage';

/** Les nouveautés apportées par la migration testée, sans celles des mises à jour suivantes (v0.6 : parures, crans, banque, emprunt, impôt, gestion, fournisseurs). */
const propres = (nouveautes?: string[]) => nouveautes?.filter((n) => !['parures', 'crans', 'banque', 'emprunt', 'impot', 'gestionJosee', 'fournisseurs', 'amenagement', 'buanderie', 'loges', 'entretien', 'chronique', 'conseils'].includes(n));

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

describe('solidité des sauvegardes', () => {
  it('numérote chaque écriture, pour repérer celles d’un autre onglet', () => {
    const stockage = creerStockageMemoire();
    expect(lireEcriture(0, stockage)).toBe(0);
    expect(sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage)).toBe(1);
    expect(sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage)).toBe(2);
    expect(lireEcriture(0, stockage)).toBe(2);
    expect(lireEcriture(1, stockage)).toBe(0);
  });

  it('lit comme écriture 0 une sauvegarde d’avant le compteur', () => {
    const stockage = creerStockageMemoire();
    const etat = creerEtatInitial();
    stockage.setItem('la-bonne-passe:partie:0', JSON.stringify({ version: etat.version, etat }));
    expect(lireEcriture(0, stockage)).toBe(0);
    expect(charger(0, stockage)).toEqual(etat);
    expect(sauvegarder(0, etat, MAINTENANT, stockage)).toBe(1);
  });

  it('renvoie le numéro inchangé si le stockage refuse l’écriture', () => {
    const stockage = creerStockageMemoire();
    sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage);
    const plein: Stockage = { ...stockage, setItem: () => {} };
    expect(sauvegarder(0, creerEtatInitial(), MAINTENANT, plein)).toBe(1);
  });

  it('garde une copie de secours et la reprend si la sauvegarde principale est abîmée', () => {
    const stockage = creerStockageMemoire();
    const etat = tick(creerEtatInitial()).etat;
    sauvegarder(0, etat, MAINTENANT, stockage);
    stockage.setItem('la-bonne-passe:partie:0', '{pas du json');
    expect(charger(0, stockage)).toEqual(etat);
    expect(lireEmplacements(stockage)[0]?.statut).toBe('partie');
  });

  it('n’écrase pas la copie de secours avec une partie qui ne se recharge pas', () => {
    const stockage = creerStockageMemoire();
    const saine = creerEtatInitial({ nomMaison: 'Saine' });
    sauvegarder(0, saine, MAINTENANT, stockage);
    // Un bogue produit une valeur non finie : JSON l'écrit « null » et la partie ne passe plus la validation.
    const abimee = { ...creerEtatInitial({ nomMaison: 'Abîmée' }), tresorerie: Number.NaN };
    sauvegarder(0, abimee, MAINTENANT, stockage);
    expect(charger(0, stockage)?.maison.nom).toBe('Saine');
  });

  it('retrouve la partie par sa copie de secours si seule la principale a disparu', () => {
    const stockage = creerStockageMemoire();
    sauvegarder(0, creerEtatInitial({ nomMaison: 'Le Velours' }), MAINTENANT, stockage);
    stockage.removeItem('la-bonne-passe:partie:0');
    const [premier] = lireEmplacements(stockage);
    expect(premier?.statut === 'partie' && premier.resume.nomMaison).toBe('Le Velours');
  });

  it('efface aussi la copie de secours à la suppression', () => {
    const stockage = creerStockageMemoire();
    sauvegarder(0, creerEtatInitial(), MAINTENANT, stockage);
    supprimer(0, stockage);
    expect([...stockage.donnees.keys()].filter((k) => k.startsWith('la-bonne-passe:partie'))).toEqual([]);
    expect(lireEmplacements(stockage)[0]).toEqual({ statut: 'vide' });
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

  it('migre une sauvegarde v9 : pas de didacticiel pour une partie déjà commencée', () => {
    const { didacticiel: _d, ...etat } = creerEtatInitial({ didacticiel: true });
    const migre = migrer({ ...etat, version: 9 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.didacticiel).toBeNull();
  });

  it('migre une sauvegarde v10 : chaque segment part de la réputation acquise, sans nouveauté de clientèle avant le palier 2', () => {
    const { clientele: _c, nouveautes: _n, ...etat } = creerEtatInitial();
    const migre = migrer({ ...etat, version: 10, palier: 1, reputation: 21.5 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.clientele.satisfaction).toMatchObject({ touriste: 21.5, habitue: 21.5, affaires: 21.5, groupe: 21.5 });
    expect(migre?.clientele.historique).toEqual([]);
    expect(migre?.systemes.clientele).toBe(false);
    // Les nouveautés des versions suivantes s'ajoutent ; celles de la clientèle, non.
    expect(migre?.nouveautes).toEqual(expect.arrayContaining(['ambitions']));
    expect(migre?.nouveautes).not.toContain('clientele');
    expect(migre?.reputation).toBe(21.5);
  });

  it('migre une sauvegarde v10 au palier 2 : l’onglet Clientèle s’ouvre, présenté par Josée', () => {
    const { clientele: _c, nouveautes: _n, ...etat } = creerEtatInitial();
    const systemes = { ...etat.systemes, affaires: true, groupes: true };
    const migre = migrer({ ...etat, version: 10, palier: 2, reputation: 33, systemes });
    expect(migre?.systemes).toMatchObject({ clientele: true, affaires: true, groupes: true, bar: true });
    expect(migre?.nouveautes.slice(0, 3)).toEqual(['clientele', 'regles', 'bar']);
    expect(trouverNouveaute('clientele')?.palier).toBe(2);
    expect(migre?.clientele.satisfaction.affaires).toBe(33);
  });

  it('migre une sauvegarde v11 : règles par défaut, charge du soir, formule standard pour les rendez-vous en cours', () => {
    const { regles: _r, ...etat } = creerEtatInitial();
    const { tarifs: _t, porte: _p, ...systemes } = { ...etat.systemes, affaires: true, groupes: true, clientele: true };
    const personnel = etat.personnel.map(({ chargeCeSoir: _c, ...e }) => ({ ...e, rdvCeSoir: 2 }));
    const rendezVous = [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'poete', duree: 60, restant: 20 }];
    const migre = migrer({ ...etat, version: 11, palier: 2, systemes, personnel, rendezVous, nouveautes: ['clientele'] });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.regles).toEqual({ tarif: 1, formule: 'standard', selection: 'normale', priorite: 'arrivee', visibilite: 'bouche' });
    expect(migre?.systemes).toMatchObject({ tarifs: true, porte: true });
    expect(migre?.personnel[0]?.chargeCeSoir).toBe(2);
    expect(migre?.rendezVous[0]?.formule).toBe('standard');
    expect(migre?.nouveautes.slice(0, 3)).toEqual(['clientele', 'regles', 'bar']);
    expect(trouverNouveaute('regles')?.palier).toBe(2);
    const avant = migrer({ ...etat, version: 11, palier: 1, systemes, personnel, rendezVous: [], nouveautes: [] });
    expect(avant?.systemes).toMatchObject({ tarifs: false, porte: false });
    expect(avant?.nouveautes).not.toContain('regles');
  });

  it('migre une sauvegarde v12 : bar sous ses draps, sans équipe, et nouveauté au palier 2', () => {
    const { bar: _b, avance: _a, ...etat } = creerEtatInitial();
    const nuit = { numero: 3, recettes: 100, partPersonnel: 100, depenses: 0, servis: 1, perdus: 0, reputationDebut: 20, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 };
    const migre = migrer({ ...etat, version: 12, palier: 2, equipes: { menage: 2 }, nuit, nouveautes: [] });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.bar).toEqual({ ouvert: false, travaux: null, stock: 0, commande: 0 });
    expect(migre?.avance.statut).toBe('aVenir');
    expect(migre?.equipes).toEqual({ menage: 2, bar: 0, accueil: 0, securite: 0 });
    expect(migre?.nuit?.comptes.recettes.bar).toBe(0);
    expect(migre?.systemes.bar).toBe(true);
    expect(migre?.nouveautes[0]).toBe('bar');
    expect(trouverNouveaute('bar')?.palier).toBe(2);
    const avant = migrer({ ...etat, version: 12, palier: 1, equipes: { menage: 1 }, nouveautes: [] });
    expect(avant?.systemes.bar).toBe(false);
    expect(avant?.nouveautes).not.toContain('bar');
  });

  it('migre une sauvegarde v13 : semaine en cours sans comptes, pas de bilan en attente, tendances au prochain lundi', () => {
    const { semaine: _s, bilanSemaine: _b, bilanAVoir: _a, ...etat } = creerEtatInitial();
    const { tendances: _t, ...systemes } = etat.systemes;
    const migre = migrer({ ...etat, version: 13, jour: 16, reputation: 31, palier: 2, systemes });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.semaine).toMatchObject({ numero: 3, tendances: [], reputationDebut: 31, servis: 0, perdus: 0 });
    expect(migre?.semaine.comptes.recettes.rendezVous).toBe(0);
    expect(migre?.bilanSemaine).toBeNull();
    expect(migre?.bilanAVoir).toBe(false);
    expect(migre?.systemes.tendances).toBe(false);
  });

  it('migre une sauvegarde v14 : soirées à thème ouvertes avec les tendances, nouveau poste dans les comptes', () => {
    const { themeDuSoir: _t, ...etat } = creerEtatInitial();
    const { themes: _th, ...systemes } = { ...etat.systemes, tendances: true };
    const { themes: _s, ...semaine } = etat.semaine;
    const { themes: _c, ...depenses } = semaine.comptes.depenses;
    const ancienne = { ...semaine, comptes: { ...semaine.comptes, depenses } };
    const migre = migrer({ ...etat, version: 14, palier: 2, systemes, semaine: ancienne, bilanSemaine: null, nouveautes: [] });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.systemes.themes).toBe(true);
    expect(migre?.themeDuSoir).toBeNull();
    expect(migre?.semaine.themes).toEqual([]);
    expect(migre?.semaine.comptes.depenses.themes).toBe(0);
    expect(migre?.nouveautes[0]).toBe('themes');
    const avant = migrer({ ...etat, version: 14, systemes: { ...systemes, tendances: false }, semaine: ancienne, nouveautes: [] });
    expect(avant?.systemes.themes).toBe(false);
    expect(propres(avant?.nouveautes)).toEqual([]);
  });

  it('migre une sauvegarde v15 : aucune intrigue en cours, quartier calme', () => {
    const { intrigues: _i, quartier: _q, ...etat } = creerEtatInitial();
    const migre = migrer({ ...etat, version: 15, palier: 2, nouveautes: [] });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.intrigues).toEqual({ actives: [], finies: [], carte: null });
    expect(migre?.quartier).toEqual({ tapage: 0, insonorise: false });
    // Une sauvegarde v16 sans intrigues est abîmée.
    expect(migrer({ ...etat, version: 16 })).toBeNull();
  });

  it('migre une sauvegarde v16 : une ambition pour chacun, présentée par Josée', () => {
    const base = creerEtatInitial();
    const sansAmbition = <T extends { ambition: string }>({ ambition: _a, ...x }: T) => x;
    const mila = { ...base.personnel[0]!, id: 'mila', prenom: 'Mila' };
    const candidat = { ...base.personnel[0]!, id: 'c7', prenom: 'Noor' };
    const migre = migrer({
      ...base,
      version: 16,
      palier: 2,
      personnel: [sansAmbition(base.personnel[0]!), sansAmbition(mila)],
      candidats: [sansAmbition(candidat)],
      nouveautes: [],
    });
    expect(migre?.personnel.map((e) => e.ambition)).toEqual(['gerante', 'affiche']);
    expect(migre?.candidats[0]?.ambition).toBe(ambitionDuMarche('c7'));
    expect(migre?.nouveautes.slice(0, 2)).toEqual(['ambitions', 'voisinage']);
    expect(propres(migrer({ ...base, version: 16, palier: 0, personnel: [sansAmbition(base.personnel[0]!)], nouveautes: [] })?.nouveautes)).toEqual([]);
    // Une sauvegarde v17 sans ambition est abîmée.
    expect(migrer({ ...base, personnel: [sansAmbition(base.personnel[0]!)] })).toBeNull();
  });

  it('migre une sauvegarde v17 : les anciens imprévus peuvent revenir', () => {
    const { imprevusNuit: _i, ...etat } = creerEtatInitial();
    const migre = migrer({ ...etat, version: 17, imprevusVus: ['touriste', 'pluie'] });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.imprevusNuit).toEqual({});
    expect(migre?.imprevusVus).toEqual(['touriste', 'pluie']);
    expect(migrer({ ...etat, version: 18 })).toBeNull();
  });

  it('migre une sauvegarde v18 : aucune alerte minutée, un générateur à part pour elles', () => {
    const { minuteries: _m, hasardAlertes: _h, ...etat } = creerEtatInitial();
    const migre = migrer({ ...etat, version: 18, hasard: 5 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.minuteries).toEqual([]);
    expect(migre?.hasardAlertes).toBe(48);
    expect(migrer({ ...etat, version: 19 })).toBeNull();
  });

  it('migre une sauvegarde v19 : défis ouverts avec les tendances, objectif du mois fixé', () => {
    const base = creerEtatInitial();
    const { defi: _d, mois: _m, bilanMois: _b, bilanMoisAVoir: _v, ...etat } = base;
    const { defis: _s, ...systemes } = { ...base.systemes, tendances: true };
    const { stats: _st, ...semaine } = base.semaine;
    const avant = migrer({ ...etat, version: 19, palier: 2, systemes, semaine, mensualitesPayees: 0, nouveautes: [] });
    expect(avant?.version).toBe(VERSION_ETAT);
    expect(avant?.systemes.defis).toBe(true);
    expect(avant?.defi).toBeNull();
    expect(avant?.mois).toMatchObject({ numero: 1, objectif: 'reputation' });
    expect(avant?.semaine.stats.disputes).toBe(0);
    expect(propres(avant?.nouveautes)).toEqual(['objectifs', 'defis']);
    const apres = migrer({ ...etat, version: 19, palier: 2, systemes: { ...systemes, tendances: false }, semaine, mensualitesPayees: 1, nouveautes: [] });
    expect(apres?.systemes.defis).toBe(false);
    expect(apres?.mois).toMatchObject({ numero: 2, objectif: 'satisfaction' });
    expect(propres(apres?.nouveautes)).toEqual(['objectifs']);
    expect(migrer({ ...etat, version: 20, systemes, semaine })).toBeNull();
  });

  it('migre une sauvegarde v20 : relations du quartier, souvenir du voisin, et palier 3 après la première mensualité', () => {
    const base = creerEtatInitial();
    const { relations: _r, hasardQuartier: _h, ...etat } = base;
    const { relations: _s, ...systemes } = base.systemes;
    const depenses = { ...base.semaine.comptes.depenses } as Record<string, number>;
    delete depenses.relations;
    const semaine = { ...base.semaine, comptes: { ...base.semaine.comptes, depenses } };
    const intrigues = { ...base.intrigues, finies: [{ id: 'voisin', fin: 'invite', jour: 12 }] };
    const v20 = { ...etat, version: 20, systemes, semaine, intrigues, quartier: { tapage: 45, insonorise: false } };

    const avant = migrer({ ...v20, palier: 2, mensualitesPayees: 0 });
    expect(avant?.version).toBe(VERSION_ETAT);
    expect(avant?.palier).toBe(2);
    expect(avant?.systemes.relations).toBe(false);
    expect(avant?.semaine.comptes.depenses.relations).toBe(0);
    // Invité chez soi, le voisin s'en souvient ; le tapage de la nuit passée, un peu moins bien.
    const souvenir = RELATIONS.depart.voisins! + RELATIONS.souvenirDuVoisin.invite! - Math.round((45 - TAPAGE.recidive) * RELATIONS.voisins.pente);
    expect(avant?.relations.jauges.voisins).toBe(souvenir);
    expect(avant?.relations.jauges.mairie).toBe(RELATIONS.depart.mairie);
    expect(typeof avant?.hasardQuartier).toBe('number');

    const apres = migrer({ ...v20, palier: 2, mensualitesPayees: 1, annonces: [] });
    expect(apres?.palier).toBe(3);
    expect(apres?.systemes.relations).toBe(true);
    // Josée présente le palier 3 au chargement.
    expect(apres?.annonces).toEqual([3]);
    expect(migrer({ ...etat, version: 21, systemes, semaine })).toBeNull();
  });

  it('migre une sauvegarde v21 : le Chat Noir, présenté par Josée à une partie déjà au palier 3', () => {
    const base = creerEtatInitial();
    const { rivale: _r, hasardRivale: _h, ...etat } = base;
    const { rivale: _s, ...systemes } = base.systemes;
    const avant = migrer({ ...etat, version: 21, systemes, palier: 2 });
    expect(avant?.version).toBe(VERSION_ETAT);
    expect(avant?.systemes.rivale).toBe(false);
    expect(avant?.rivale.derniereAction).toBeNull();
    expect(typeof avant?.hasardRivale).toBe('number');
    expect(propres(avant?.nouveautes)).toEqual([]);
    const apres = migrer({ ...etat, version: 21, systemes: { ...systemes, relations: true }, palier: 3, annonces: [] });
    expect(apres?.systemes.rivale).toBe(true);
    expect(propres(apres?.nouveautes)).toEqual(['rivale', 'equipes']);
    expect(trouverNouveaute('rivale')?.palier).toBe(3);
    // Le palier 3 encore à annoncer : sa carte présente déjà le Chat Noir.
    const annonce = migrer({ ...etat, version: 21, systemes, palier: 3, annonces: [3] });
    expect(propres(annonce?.nouveautes)).toEqual([]);
    expect(migrer({ ...etat, version: 22, systemes })).toBeNull();
  });

  it('migre une sauvegarde v22 : équipes Accueil et Sécurité vides, pas d’assurance, et Josée présente ce qui est ouvert', () => {
    const base = creerEtatInitial();
    const { assurance: _a, ...etat } = base;
    const { accueil: _ac, securite: _se, assurance: _as, ...systemes } = base.systemes;
    const recettes = { ...base.semaine.comptes.recettes } as Record<string, number>;
    const depenses = { ...base.semaine.comptes.depenses } as Record<string, number>;
    delete recettes.assurance;
    delete depenses.assurance;
    const v22 = { ...etat, version: 22, systemes, equipes: { menage: 1, bar: 0 }, semaine: { ...base.semaine, comptes: { recettes, depenses } } };

    const avant = migrer({ ...v22, palier: 2 });
    expect(avant?.version).toBe(VERSION_ETAT);
    expect(avant?.equipes).toEqual({ menage: 1, bar: 0, accueil: 0, securite: 0 });
    expect(avant?.systemes).toMatchObject({ accueil: false, securite: false, assurance: false });
    expect(avant?.assurance).toBe(0);
    expect(avant?.semaine.comptes.recettes.assurance).toBe(0);
    expect(propres(avant?.nouveautes)).toEqual([]);

    const lundiPasse = { ...base.rivale, derniereAction: { id: 'visite', jour: 29 } };
    const apres = migrer({ ...v22, palier: 3, annonces: [], rivale: lundiPasse });
    expect(apres?.systemes).toMatchObject({ accueil: true, securite: true, assurance: true });
    expect(propres(apres?.nouveautes)).toEqual(['equipes', 'assurance']);
    const juste = migrer({ ...v22, palier: 3, annonces: [] });
    expect(juste?.systemes.assurance).toBe(false);
    expect(propres(juste?.nouveautes)).toEqual(['equipes']);
    expect(migrer({ ...etat, version: 23, systemes })).toBeNull();
  });

  it('migre une sauvegarde v23 : la visibilité, ouverte au deuxième lundi après le palier 3', () => {
    const base = creerEtatInitial();
    const { visibilite: _v, ...regles } = base.regles;
    const { visibilite: _s, ...systemes } = base.systemes;
    const depenses = { ...base.semaine.comptes.depenses } as Record<string, number>;
    delete depenses.visibilite;
    const v23 = { ...base, version: 23, regles, semaine: { ...base.semaine, comptes: { ...base.semaine.comptes, depenses } } };
    const tot = migrer({ ...v23, systemes: { ...systemes, assurance: true }, jour: 30 });
    expect(tot?.version).toBe(VERSION_ETAT);
    expect(tot?.regles.visibilite).toBe('bouche');
    expect(tot?.systemes.visibilite).toBe(false);
    expect(tot?.semaine.comptes.depenses.visibilite).toBe(0);
    const tard = migrer({ ...v23, systemes: { ...systemes, assurance: true }, jour: 40, nouveautes: [] });
    expect(tard?.systemes.visibilite).toBe(true);
    expect(propres(tard?.nouveautes)).toEqual(['visibilite']);
    expect(migrer({ ...base, version: 24, regles })).toBeNull();
  });

  it('migre une sauvegarde v24 : comptes de la nuit par poste, part du personnel et livraisons express', () => {
    const base = creerEtatInitial();
    const sansPostes = (c: typeof base.semaine.comptes) => {
      const depenses = { ...c.depenses } as Record<string, number>;
      delete depenses.partPersonnel;
      delete depenses.express;
      return { ...c, depenses };
    };
    const { journee: _j, ...reste } = base;
    // Une nuit en cours : 300 € gardés par la maison (dont 60 € de bar), 240 € reversés, 50 € de dépenses.
    const nuit = { numero: 3, recettes: 300, partPersonnel: 240, depenses: 50, servis: 2, perdus: 0, reputationDebut: 20, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0, bar: 60 };
    const v24 = { ...reste, version: 24, nuitsBouclees: 2, tresorerie: 5000, nuit, semaine: { ...base.semaine, comptes: sansPostes(base.semaine.comptes) } };
    const migre = migrer(v24);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.semaine.comptes.depenses.partPersonnel).toBe(0);
    expect(migre?.semaine.comptes.depenses.express).toBe(0);
    expect(migre?.nuit?.comptes.recettes).toMatchObject({ rendezVous: 480, bar: 60 });
    expect(migre?.nuit?.comptes.depenses.partPersonnel).toBe(240);
    expect(migre?.journee.comptes.recettes.rendezVous).toBe(480);
    expect(migre?.journee.tresorerieAvant).toBe(4750);
    const fermee = migrer({ ...v24, nuitsBouclees: 3 });
    expect(fermee?.journee.comptes.recettes.rendezVous).toBe(0);
    expect(fermee?.journee.tresorerieAvant).toBe(5000);
    expect(migrer({ ...reste, version: 25 })).toBeNull();
  });

  it('migre une sauvegarde v25 : le linge en parures, arrondi au-dessus, et Josée le présente', () => {
    const { lingeAuto: _a, ...base } = creerEtatInitial();
    const v25 = { ...base, version: 25, linge: 35, lingeCommande: 50, nouveautes: [] };
    const migre = migrer(v25);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.linge).toBe(4);
    expect(migre?.lingeCommande).toBe(5);
    expect(migre?.lingeAuto).toBe(0);
    expect(propres(migre?.nouveautes)).toEqual([]);
    expect(migre?.nouveautes).toContain('parures');
    expect(trouverNouveaute('parures')).toBeDefined();
    expect(migrer({ ...v25, linge: 40 })?.linge).toBe(4);
    expect(migrer({ ...v25, linge: 1 })?.linge).toBe(1);
    expect(migrer({ ...v25, linge: 0 })?.linge).toBe(0);
    expect(migrer({ ...base, version: 26 })).toBeNull();
  });

  it('migre une sauvegarde v26 : le hasard des crans, et Josée les présente aux parties qui ont le planning', () => {
    const { hasardPlafond: _h, ...base } = creerEtatInitial({ graine: 8 });
    const v26 = { ...base, version: 26, nouveautes: [] };
    const avant = migrer({ ...v26, palier: 0 });
    expect(avant?.version).toBe(VERSION_ETAT);
    expect(typeof avant?.hasardPlafond).toBe('number');
    expect(avant?.nouveautes).not.toContain('crans');
    expect(migrer({ ...v26, palier: 1 })?.nouveautes).toContain('crans');
    expect(trouverNouveaute('crans')?.palier).toBe(1);
    expect(migrer({ ...base, version: 27 })).toBeNull();
  });

  it('migre une sauvegarde v27 : la banque, calée sur les mensualités déjà payées, et Josée la présente', () => {
    const { banque: _b, finDePartie: _f, ...base } = creerEtatInitial();
    const sansAgios = (c: typeof base.semaine.comptes) => {
      const depenses = { ...c.depenses } as Record<string, number>;
      delete depenses.agios;
      return { ...c, depenses };
    };
    const v27 = { ...base, version: 27, mensualitesPayees: 1, tresorerie: -500, nouveautes: [], semaine: { ...base.semaine, comptes: sansAgios(base.semaine.comptes) } };
    const migre = migrer(v27);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.banque).toMatchObject({ echeances: 1, retard: 0, impayees: 0, salairesDus: 0, joursImpayes: 0, alerte: 1 });
    expect(migre?.finDePartie).toBeNull();
    expect(migre?.semaine.comptes.depenses.agios).toBe(0);
    expect(migre?.nouveautes).toContain('banque');
    expect(trouverNouveaute('banque')).toBeDefined();
    expect(migrer({ ...base, version: 28 })).toBeNull();
  });

  it('migre une sauvegarde v28 : le nouvel emprunt, ouvert si la visibilité l’est, et Josée le présente', () => {
    const base = creerEtatInitial();
    const { emprunt: _e, ...systemes } = base.systemes;
    const { emprunts: _l, retardRachat: _r, ...banque } = base.banque;
    const v28 = { ...base, version: 28, systemes, banque: { ...banque, retard: 2500 }, nouveautes: [] };
    const ferme = migrer(v28);
    expect(ferme?.version).toBe(VERSION_ETAT);
    expect(ferme?.systemes.emprunt).toBe(false);
    expect(ferme?.banque.emprunts).toEqual([]);
    expect(ferme?.banque.retardRachat).toBe(true);
    expect(ferme?.semaine.comptes.depenses.emprunts).toBe(0);
    expect(ferme?.semaine.empruntRecu).toBe(0);
    expect(ferme?.journee.empruntRecu).toBe(0);
    const ouvert = migrer({ ...v28, systemes: { ...systemes, visibilite: true } });
    expect(ouvert?.systemes.emprunt).toBe(true);
    expect(ouvert?.nouveautes).toContain('emprunt');
  });

  it('migre une sauvegarde v29 : impôt, gestion par Josée et fournisseurs, présentés par Josée', () => {
    const base = creerEtatInitial();
    const { fisc: _f, gestionJosee: _g, ...reste } = base;
    const { fournisseurs: _s, ...systemes } = base.systemes;
    const sansFournisseurs = <T extends Record<string, number>>(r: T) => {
      const copie = { ...r } as Record<string, number>;
      delete copie.fournisseurs;
      return copie;
    };
    const relations = {
      ...base.relations,
      jauges: sansFournisseurs(base.relations.jauges),
      lundi: sansFournisseurs(base.relations.lundi),
      derniereAction: sansFournisseurs(base.relations.derniereAction),
      dernierEvenement: sansFournisseurs(base.relations.dernierEvenement),
    };
    const v29 = { ...reste, version: 29, systemes: { ...systemes, reserve: true, emprunt: true }, relations, nouveautes: [] };
    const migre = migrer(v29);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.fisc).toEqual({ benefice: 0, semaines: 0, du: 0, jourDu: 0 });
    expect(migre?.gestionJosee).toBe(false);
    expect(migre?.systemes.fournisseurs).toBe(true);
    expect(migre?.relations.jauges.fournisseurs).toBe(0);
    expect(migre?.semaine.comptes.depenses.impots).toBe(0);
    expect(migre?.banque).toMatchObject({ sursis: false, supplement: 0 });
    expect(migre?.nouveautes).toEqual(['impot', 'gestionJosee', 'fournisseurs', 'entretien', 'chronique', 'conseils']);
    const tot = migrer({ ...v29, systemes: { ...systemes, reserve: false, emprunt: false } });
    expect(tot?.systemes.fournisseurs).toBe(false);
    expect(tot?.nouveautes).toEqual(['impot', 'entretien', 'chronique', 'conseils']);
  });

  it('migre une sauvegarde v30 : décors d’origine, loges et buanderie à aménager, présentés par Josée', () => {
    const base = creerEtatInitial();
    const { annexes: _a, ...reste } = base;
    const { buanderie: _b, loges: _l, ...systemes } = base.systemes;
    const chambres = base.chambres.map(({ decor: _d, decorAVenir: _v, decorRefait: _r, fermee: _f, ...c }) => c);
    const v30 = { ...reste, version: 30, systemes, chambres, nouveautes: [] };
    const migre = migrer({ ...v30, palier: 3 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.chambres.map((c) => c.decor)).toEqual(['rose', 'orientale', 'velours', 'miroirs']);
    expect(migre?.chambres.every((c) => !c.fermee && !c.decorRefait && c.decorAVenir === null)).toBe(true);
    expect(migre?.annexes.buanderie).toMatchObject({ ouverte: false, sale: 0 });
    expect(migre?.systemes).toMatchObject({ buanderie: true, loges: true });
    expect(migre?.nouveautes).toEqual(['amenagement', 'buanderie', 'loges', 'entretien', 'chronique', 'conseils']);
    const debut = migrer({ ...v30, palier: 1 });
    expect(debut?.systemes).toMatchObject({ buanderie: false, loges: false });
    expect(debut?.nouveautes).toEqual(['amenagement', 'entretien', 'chronique', 'conseils']);
  });

  it('migre une sauvegarde v31 : VIP et couples partis de la réputation, confort 1, équipes au niveau 1', () => {
    const base = creerEtatInitial();
    const { niveauxEquipes: _n, placement: _p, hasardPlacement: _h, ...reste } = base;
    const { vip: _v, couples: _c, confort: _co, renommer: _r, formations: _f, placement: _pl, ...systemes } = base.systemes;
    const chambres = base.chambres.map(({ confort: _x, confortAVenir: _y, ...c }) => c);
    const { vip: _sv, couple: _sc, ...satisfaction } = base.clientele.satisfaction;
    const v31 = { ...reste, version: 31, reputation: 42, systemes, chambres, clientele: { ...base.clientele, satisfaction }, nouveautes: [] };
    const migre = migrer(v31);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.clientele.satisfaction).toMatchObject({ vip: 42, couple: 42 });
    expect(migre?.chambres.every((c) => c.confort === 1 && c.confortAVenir === null)).toBe(true);
    expect(migre?.niveauxEquipes).toEqual({ menage: 1, bar: 1, accueil: 1, securite: 1 });
    expect(migre?.placement).toBeNull();
    expect(typeof migre?.hasardPlacement).toBe('number');
    expect(migre?.systemes).toMatchObject({ vip: false, couples: false, confort: false, formations: false, placement: false });
    expect(migre?.journee.comptes.recettes.placement).toBe(0);
    expect(migre?.semaine.comptes.depenses.formations).toBe(0);
  });

  it('migre une sauvegarde v32 : palier 5 à venir, deux postes de dépenses de plus', () => {
    const base = creerEtatInitial();
    const { permis: _p, agrandissement: _a, gerante: _g, etablissement: _e, hasardEtablissement: _h, ...reste } = base;
    const { agrandissement: _sa, gerante: _sg, etablissement: _se, ...systemes } = base.systemes;
    const { etablissement: _de, caisse: _dc, ...depenses } = base.semaine.comptes.depenses;
    const v32 = { ...reste, version: 32, systemes, semaine: { ...base.semaine, comptes: { ...base.semaine.comptes, depenses } }, nouveautes: [] };
    const migre = migrer(v32);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.permis.statut).toBe('aucun');
    expect(migre?.agrandissement).toEqual({ achete: [], enCours: null });
    expect(migre?.gerante).toBeNull();
    expect(migre?.etablissement.statut).toBe('offres');
    expect(migre?.systemes).toMatchObject({ agrandissement: false, gerante: false, etablissement: false });
    expect(migre?.semaine.comptes.depenses).toMatchObject({ etablissement: 0, caisse: 0 });
    // Seule la présentation de l'entretien (v34) suit.
    expect(migre?.nouveautes).toEqual(['entretien', 'chronique', 'conseils']);
  });

  it('migre une sauvegarde v33 : aucun départ récent connu', () => {
    const { departsRecents: _d, ...reste } = creerEtatInitial();
    const migre = migrer({ ...reste, version: 33 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.departsRecents).toEqual([]);
    expect(migre?.nouveautes).toEqual(['entretien', 'chronique', 'conseils']);
  });

  it('migre une sauvegarde v34 : deuxième maison à ouvrir, deux postes de comptes de plus', () => {
    const base = creerEtatInitial();
    const { maison2: _m, hasardMaison2: _h, ...reste } = base;
    const { maison2: _s, ...systemes } = base.systemes;
    const { maison2: _r, ...recettes } = base.semaine.comptes.recettes;
    const { maison2: _d, ...depenses } = base.semaine.comptes.depenses;
    const v34 = { ...reste, version: 34, systemes, semaine: { ...base.semaine, comptes: { recettes, depenses } } };
    const migre = migrer(v34);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.systemes.maison2).toBe(false);
    expect(migre?.maison2).toMatchObject({ gerante: null, inauguration: null, bilans: [], annonces: [] });
    expect(typeof migre?.hasardMaison2).toBe('number');
    expect(migre?.semaine.comptes.recettes.maison2).toBe(0);
    expect(migre?.semaine.comptes.depenses.maison2).toBe(0);

    // Une maison déjà prête (fin de la v0.6) : le système s'ouvre, et Josée présente la suite.
    const prete = migrer({ ...v34, etablissement: { offres: [], lieu: 'pension', statut: 'pret', fin: 60 } });
    expect(prete?.systemes.maison2).toBe(true);
    expect(prete?.maison2.annonces).toEqual([{ id: 'prete' }]);
  });

  it('migre une sauvegarde v35 : la chronique commence aujourd’hui, avec les histoires déjà terminées', () => {
    const base = creerEtatInitial();
    const { chronique: _c, finChapitre: _f, finChapitreAVoir: _v, ...reste } = base;
    const v35 = {
      ...reste,
      version: 35,
      jour: 90,
      intrigues: { ...base.intrigues, finies: [{ id: 'mila', fin: 'tete', jour: 20 }, { id: 'voisin', fin: 'ecartee', jour: 0 }] },
      permis: { statut: 'accorde', jour: 85 },
    };
    const migre = migrer(v35);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.chronique.depuis).toBe(90);
    expect(migre?.chronique.recettes).toBe(0);
    expect(migre?.chronique.moments).toEqual([
      { jour: 20, type: 'intrigue', id: 'mila', fin: 'tete' },
      { jour: 85, type: 'palier', numero: 5 },
    ]);
    expect(migre?.finChapitre).toBeNull();
    expect(migre?.finChapitreAVoir).toBe(false);
    // Josée présente la chronique et l'objectif du chapitre.
    expect(migre?.nouveautes).toContain('chronique');
  });

  it('migre une sauvegarde v36 : le mode libre, ouvert si le chapitre est déjà bouclé', () => {
    const base = creerEtatInitial();
    const { modeLibre: _m, hasardModeLibre: _h, ...reste } = base;
    const { modeLibre: _s, ...systemes } = base.systemes;
    const v36 = { ...reste, version: 36, systemes };
    const migre = migrer(v36);
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.systemes.modeLibre).toBe(false);
    expect(migre?.modeLibre).toMatchObject({ objectif: null, historique: [], presente: false });
    expect(typeof migre?.hasardModeLibre).toBe('number');
    const fini = migrer({ ...v36, finChapitre: { jour: 200, titre: 'velours', recettes: 0, tempsJoue: 0, reputation: 90, fideles: [], partis: [], moments: [], lieu: 'club', gerante: 'Margot' } });
    expect(fini?.systemes.modeLibre).toBe(true);
  });

  it('migre une sauvegarde v37 : le dossier du permis ouvert au palier 4 dès 70, et Josée présente les étapes', () => {
    const base = creerEtatInitial();
    const { permis: _p, ...systemes } = base.systemes;
    const v37 = { ...base, version: 37, systemes };
    const debut = migrer(v37);
    expect(debut?.version).toBe(VERSION_ETAT);
    expect(debut?.systemes.permis).toBe(false);
    expect(debut?.nouveautes).not.toContain('permisEtapes');
    const quatre = migrer({ ...v37, palier: 4, reputation: 72 });
    expect(quatre?.systemes.permis).toBe(true);
    expect(quatre?.nouveautes).toContain('permisEtapes');
    expect(migrer({ ...v37, palier: 4, reputation: 60 })?.systemes.permis).toBe(false);
    expect(migrer({ ...v37, palier: 5, reputation: 85 })?.systemes.permis).toBe(true);
  });

  it('migre une sauvegarde v38 : les conseils de Josée, allumés et présentés', () => {
    const { conseils: _c, ...reste } = creerEtatInitial();
    const migre = migrer({ ...reste, version: 38 });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.conseils).toEqual({ actifs: true, vus: [], enCours: null });
    expect(migre?.nouveautes).toContain('conseils');
  });

  it('migre une sauvegarde v39 : les offres de la deuxième maison pas encore signées suivent les prix des baux', () => {
    const base = creerEtatInitial();
    const offres = [{ id: 'pension', achat: 33000, travaux: 9500, jours: 6 }];
    const migre = migrer({ ...base, version: 39, etablissement: { offres, lieu: null, statut: 'offres', fin: 0 } });
    expect(migre?.version).toBe(VERSION_ETAT);
    expect(migre?.etablissement.offres).toEqual([{ id: 'pension', achat: 14500, travaux: 4000, jours: 5 }]);
    expect(migre?.nouveautes).toContain('baux');
    // Déjà signé : rien ne change.
    const signe = migrer({ ...base, version: 39, etablissement: { offres, lieu: 'pension', statut: 'signe', fin: 0 } });
    expect(signe?.etablissement.offres).toEqual(offres);
    expect(signe?.nouveautes).not.toContain('baux');
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
