import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { TEXTES_ALERTES } from '../content/alertes';
import { IMPREVUS, trouverImprevu } from '../content/imprevus';
import { IMPREVUS_QUARTIER } from '../content/imprevusQuartier';
import { TEXTES_VISIBILITES } from '../content/regles';
import { creerEtatInitial, type EtatJeu } from './etat';
import { concernes, favorise } from './imprevus';
import { vivreMinuteries } from './minuteries';
import { accorderPalier } from './paliers';
import { visibiliteActive } from './regles';
import { matinDesRelations } from './relations';
import { facteurDemande, poidsSegment } from './soiree';
import { appliquerOrdres, tick, type EvenementMoteur } from './tick';
import { comptesVides } from './comptes';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 3, un mardi soir, visibilité ouverte. */
function maison(champs: Partial<EtatJeu> = {}, palier = 3): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 13 }), jour: 37, minuteDuJour: h(22), briefingJour: 37, nuitsBouclees: 36, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  etat.systemes.assurance = palier >= 3;
  etat.systemes.visibilite = palier >= 3;
  return { ...etat, annonces: [], visites: [], tresorerie: 5_000, ...champs };
}

const avecVisibilite = (etat: EtatJeu, v: B.IdVisibilite): EtatJeu => ({ ...etat, regles: { ...etat.regles, visibilite: v } });

describe('la visibilité', () => {
  it('s’ouvre au deuxième lundi après le palier 3, un lundi après l’assurance, présentée au bilan', () => {
    const premier = maison({ jour: 28, minuteDuJour: h(4, 55), briefingJour: 28 });
    premier.systemes.assurance = false;
    premier.systemes.visibilite = false;
    const lundi1 = tick(premier).etat;
    expect(lundi1.systemes.assurance).toBe(true);
    expect(lundi1.systemes.visibilite).toBe(false);
    const lundi2 = tick({ ...lundi1, jour: 35, minuteDuJour: h(4, 55), briefingJour: 35 }).etat;
    expect(lundi2.systemes.visibilite).toBe(true);
    expect(lundi2.bilanSemaine?.ouvertures).toEqual(['visibilite']);
  });

  it('se règle dans les règles de la maison, une fois ouverte seulement', () => {
    const fermee = maison({}, 2);
    expect(appliquerOrdres(fermee, [{ type: 'regle', regle: 'visibilite', valeur: 'influenceurs' }]).etat.regles.visibilite).toBe('bouche');
    expect(visibiliteActive(avecVisibilite(fermee, 'influenceurs')).affluence).toBe(1);
    const ouverte = appliquerOrdres(maison(), [{ type: 'regle', regle: 'visibilite', valeur: 'influenceurs' }]);
    expect(ouverte.etat.regles.visibilite).toBe('influenceurs');
    expect(ouverte.evenements).toContainEqual({ type: 'regle', regle: 'visibilite', valeur: 'influenceurs' });
    for (const id of Object.keys(B.VISIBILITES)) expect(TEXTES_VISIBILITES[id as B.IdVisibilite]?.josee, id).toBeTruthy();
  });

  it('se paie à chaque ouverture et fait venir plus de monde, pas le même', () => {
    const soir = avecVisibilite(maison({ minuteDuJour: h(19, 55), briefingJour: 37 }), 'concierges');
    const r = tick(soir);
    expect(r.evenements).toContainEqual({ type: 'visibilite', montant: B.VISIBILITES.concierges.cout });
    expect(r.etat.semaine.comptes.depenses.visibilite).toBe(B.VISIBILITES.concierges.cout);
    const bouche = maison();
    const influenceurs = avecVisibilite(maison(), 'influenceurs');
    expect(poidsSegment(influenceurs, 'touriste')).toBeGreaterThan(poidsSegment(bouche, 'touriste'));
    expect(poidsSegment(avecVisibilite(maison(), 'site'), 'affaires')).toBeGreaterThan(poidsSegment(bouche, 'affaires'));
    expect(facteurDemande(influenceurs)).toBeCloseTo(facteurDemande(bouche), 5);
    expect(visibiliteActive(influenceurs).affluence).toBeGreaterThan(1);
  });

  it('les influenceurs plaisent à la presse et agacent les voisins, chaque matin après une soirée', () => {
    const matin = avecVisibilite(maison({ jour: 38, minuteDuJour: h(5) }), 'influenceurs');
    matin.nuit = {
      numero: matin.nuitsBouclees, comptes: comptesVides(), tresorerieAvant: 0, tresorerieApres: 0, retraitReserve: 0, servis: 0, perdus: 0, reputationDebut: 50,
      meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0,
    };
    const avant = { ...matin.relations.jauges };
    matin.quartier.tapage = B.RELATIONS.voisins.neutre;
    matinDesRelations(matin, []);
    expect(matin.relations.jauges.presse).toBeGreaterThan(avant.presse - 1);
    expect(matin.relations.jauges.voisins).toBeLessThan(avant.voisins);
  });
});

describe('les imprévus du quartier', () => {
  it('une quinzaine de cartes, qui attendent leur système', () => {
    expect(IMPREVUS_QUARTIER.length).toBeGreaterThanOrEqual(14);
    for (const d of IMPREVUS_QUARTIER) expect(IMPREVUS.some((x) => x.id === d.id), d.id).toBe(true);
    const ronde = trouverImprevu('agentRonde')!;
    expect(concernes(maison({}, 2), ronde)).toBeNull();
    expect(concernes(maison(), ronde)).not.toBeNull();
    const espion = trouverImprevu('espionChatNoir')!;
    expect(concernes({ ...maison(), systemes: { ...maison().systemes, rivale: false } }, espion)).toBeNull();
  });

  it('certaines dépendent des relations ou de la visibilité', () => {
    const violoncelle = trouverImprevu('violoncelle')!;
    const froids = maison();
    froids.relations.jauges.voisins = 0;
    expect(concernes(froids, violoncelle)).toBeNull();
    froids.relations.jauges.voisins = 30;
    expect(concernes(froids, violoncelle)).not.toBeNull();
    const live = trouverImprevu('liveQuai')!;
    expect(concernes(maison(), live)).toBeNull();
    expect(concernes(avecVisibilite(maison(), 'influenceurs'), live)).not.toBeNull();
  });

  it('les soirées feutrées ont leurs cartes favorites', () => {
    const feutree = { ...maison(), offre: 'feutree' as const };
    expect(favorise(feutree, trouverImprevu('pianiste')!)).toBe(true);
    expect(favorise(maison(), trouverImprevu('pianiste')!)).toBe(false);
  });
});

describe('les alertes du quartier', () => {
  it('une journaliste sur le quai, plus souvent chez les maisons chic ; l’accueil s’en charge parfois', () => {
    const compter = (etat: () => EtatJeu) => {
      let n = 0;
      for (let g = 1; g <= 60; g++) {
        const e = { ...etat(), hasardAlertes: g };
        for (let i = 0; i < 24; i++) vivreMinuteries(e, []);
        if (e.minuteries.some((m) => m.id === 'journaliste')) n += 1;
      }
      return n;
    };
    expect(compter(() => ({ ...maison(), offre: 'feutree' }))).toBeGreaterThan(compter(() => maison()));
    expect(compter(() => maison({}, 2))).toBe(0);
    expect(TEXTES_ALERTES.journaliste.reglee).toBeTruthy();
  });

  it('répondre à la journaliste plaît à la presse ; la laisser filer, non', () => {
    const etat = maison();
    etat.minuteries = [{ id: 'journaliste', cle: 'journaliste', cible: null, debut: 0, expire: 99_999_999 }];
    const apres = appliquerOrdres(etat, [{ type: 'traiterAlerte', cle: 'journaliste', action: 0 }]).etat;
    expect(apres.relations.jauges.presse).toBe(etat.relations.jauges.presse + B.ALERTES_QUARTIER.journaliste.presse);
    const filee = maison();
    filee.minuteries = [{ id: 'journaliste', cle: 'journaliste', cible: null, debut: 0, expire: 0 }];
    const evenements: EvenementMoteur[] = [];
    vivreMinuteries(filee, evenements);
    expect(filee.relations.jauges.presse).toBeLessThan(etat.relations.jauges.presse);
  });

  it('un voisin à sa fenêtre, seulement les soirs de bruit et quand les voisins sont froids', () => {
    const F = B.ALERTES_QUARTIER.fenetre;
    const calme = maison();
    calme.relations.jauges.voisins = -30;
    calme.quartier.tapage = F.seuilTapage - 5;
    const bruit = maison();
    bruit.relations.jauges.voisins = -30;
    bruit.quartier.tapage = F.seuilTapage + 10;
    const amis = maison();
    amis.relations.jauges.voisins = 20;
    amis.quartier.tapage = F.seuilTapage + 10;
    const vu = (e: EtatJeu) => {
      for (let i = 0; i < 200; i++) vivreMinuteries(e, []);
      return e.minuteries.some((m) => m.id === 'fenetre') || e.semaine.stats.alertesManquees > 0;
    };
    expect(vu(calme)).toBe(false);
    expect(vu(amis)).toBe(false);
    expect(vu(bruit)).toBe(true);
  });
});
