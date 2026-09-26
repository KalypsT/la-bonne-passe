import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { ACTEURS, ACTEURS_ORDRE, TEXTES_ACTIONS_RELATIONS, TEXTES_SEUILS_RELATIONS, humeurRelation } from '../content/relations';
import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { IMPREVUS } from '../content/imprevus';
import { trouverIntrigue } from '../content/intrigues';
import { creerEtatInitial, type EtatJeu } from './etat';
import { concernes } from './imprevus';
import { accorderPalier } from './paliers';
import { facteurTapage } from './quartier';
import {
  actionPossible,
  demandeRelations,
  disputeSansReputation,
  equilibre,
  matinDesRelations,
  relationsDeDepart,
  termes,
} from './relations';
import { appliquerOrdres, tick, type EvenementMoteur } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 3 (relations ouvertes), un mardi à midi. */
function quartier(champs: Partial<EtatJeu> = {}, palier = 3): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 30, minuteDuJour: h(12), briefingJour: 30, nuitsBouclees: 29, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], tresorerie: 5_000, ...champs };
}

const avecJauges = (etat: EtatJeu, jauges: Partial<EtatJeu['relations']['jauges']>): EtatJeu => ({
  ...etat,
  relations: { ...etat.relations, jauges: { ...etat.relations.jauges, ...jauges } },
});

describe('le palier 3 : tenir la maison', () => {
  it('s’ouvre le matin de la première mensualité, après le bilan du mois, avec l’onglet Relations', () => {
    const etat = quartier({ jour: 27, minuteDuJour: h(4, 55), briefingJour: 27, mensualitesPayees: 0 }, 2);
    expect(etat.systemes.relations).toBe(false);
    const { etat: apres, evenements } = tick(etat);
    expect(apres.jour).toBe(28);
    expect(apres.palier).toBe(3);
    expect(apres.systemes.relations).toBe(true);
    expect(apres.annonces).toEqual([3]);
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('bilanMois')).toBeLessThan(types.indexOf('palier'));
  });

  it('attend le palier 2 : une maison encore anonyme ne s’occupe pas du quartier', () => {
    const etat = quartier({ jour: 27, minuteDuJour: h(4, 55), briefingJour: 27, mensualitesPayees: 0, reputation: 20 }, 1);
    expect(tick(etat).etat.palier).toBe(1);
  });
});

describe('les jauges bougent avec la vie de la maison', () => {
  it('part des valeurs de départ, et n’évolue pas avant le palier 3', () => {
    const r = relationsDeDepart();
    expect(r.jauges).toEqual(B.RELATIONS.depart);
    const avant = quartier({ quartier: { tapage: 80, insonorise: false } }, 2);
    matinDesRelations(avant, []);
    expect(avant.relations.jauges.voisins).toBe(B.RELATIONS.depart.voisins);
  });

  it('les voisins jugent la nuit : une nuit bruyante les agace, une nuit calme les apaise jusqu’au plafond', () => {
    const V = B.RELATIONS.voisins;
    const bruyante = quartier({ quartier: { tapage: 50, insonorise: false } });
    matinDesRelations(bruyante, []);
    expect(bruyante.relations.jauges.voisins).toBeCloseTo(B.RELATIONS.depart.voisins! + (V.neutre - 50) * V.pente, 1);
    const calme = quartier({ quartier: { tapage: 0, insonorise: false } });
    matinDesRelations(calme, []);
    expect(calme.relations.jauges.voisins).toBeGreaterThan(B.RELATIONS.depart.voisins!);
    const auPlafond = avecJauges(quartier({ quartier: { tapage: 0, insonorise: false } }), { voisins: V.plafondCalme });
    matinDesRelations(auPlafond, []);
    expect(auPlafond.relations.jauges.voisins).toBe(V.plafondCalme);
  });

  it('une nuit très bruyante fait venir la police ; des voisins fâchés écrivent à la mairie', () => {
    const etat = avecJauges(quartier({ quartier: { tapage: B.RELATIONS.police.tapageAppel, insonorise: false } }), { voisins: -60, police: 5, mairie: 10 });
    matinDesRelations(etat, []);
    expect(etat.relations.jauges.police).toBeLessThan(5);
    expect(etat.relations.jauges.mairie).toBeLessThan(10);
  });

  it('les autres reviennent vers leur équilibre ; la presse suit la réputation', () => {
    const etat = avecJauges(quartier(), { mairie: 60, police: -60 });
    matinDesRelations(etat, []);
    expect(etat.relations.jauges.mairie).toBeLessThan(60);
    expect(etat.relations.jauges.police).toBeGreaterThan(-60);
    expect(equilibre({ ...etat, reputation: 65 }, 'presse')).toBeGreaterThan(equilibre({ ...etat, reputation: 35 }, 'presse'));
  });

  it('le journal note le passage en bons ou en mauvais termes', () => {
    const etat = avecJauges(quartier(), { mairie: 35 });
    const { etat: apres, evenements } = appliquerOrdres(etat, [{ type: 'actionRelation', action: 'festivalCanal' }]);
    expect(termes(apres.relations.jauges.mairie)).toBe('bons');
    expect(evenements).toContainEqual({ type: 'seuilRelation', acteur: 'mairie', termes: 'bons' });
  });
});

describe('les actions de relations', () => {
  it('coûtent, rapportent, et ne se répètent pas avant une semaine auprès du même acteur', () => {
    const etat = quartier();
    const def = B.ACTIONS_RELATIONS.bouteilleVoisins!;
    const { etat: apres, evenements } = appliquerOrdres(etat, [{ type: 'actionRelation', action: 'bouteilleVoisins' }]);
    expect(apres.tresorerie).toBe(5_000 - def.cout);
    expect(apres.relations.jauges.voisins).toBe(B.RELATIONS.depart.voisins! + def.gain);
    expect(apres.semaine.comptes.depenses.relations).toBe(def.cout);
    expect(evenements.some((e) => e.type === 'actionRelation')).toBe(true);
    expect(actionPossible(apres, 'associationQuartier')).toBe(false);
    expect(actionPossible(apres, 'cafeCommissariat')).toBe(true);
    expect(actionPossible({ ...apres, jour: apres.jour + B.RELATIONS.actionRepit }, 'associationQuartier')).toBe(true);
  });

  it('sont fermées avant le palier 3, et sans argent', () => {
    expect(actionPossible(quartier({}, 2), 'bouteilleVoisins')).toBe(false);
    expect(actionPossible(quartier({ tresorerie: 10 }), 'bouteilleVoisins')).toBe(false);
  });

  it('une action risquée se retourne parfois, avec son propre hasard', () => {
    const def = B.ACTIONS_RELATIONS.soireePresse!;
    let ratees = 0;
    for (let graine = 1; graine <= 60; graine++) {
      const etat = quartier({ hasardQuartier: graine });
      const apres = appliquerOrdres(etat, [{ type: 'actionRelation', action: 'soireePresse' }]).etat;
      // Le hasard de la partie n'a pas bougé.
      expect(apres.hasard).toBe(etat.hasard);
      if (apres.relations.jauges.presse < etat.relations.jauges.presse) {
        ratees += 1;
        expect(apres.relations.jauges.presse).toBe(etat.relations.jauges.presse + def.risque!.effet.presse!);
      } else expect(apres.relations.jauges.presse).toBe(etat.relations.jauges.presse + def.gain);
    }
    expect(ratees).toBeGreaterThan(5);
    expect(ratees).toBeLessThan(25);
  });
});

describe('les événements du quartier', () => {
  it('un acteur en mauvais termes finit par se manifester, puis laisse du répit', () => {
    let etat = avecJauges(quartier(), { voisins: -70 });
    let jour = 0;
    for (let i = 0; i < 30 && !jour; i++) {
      etat = { ...etat, jour: etat.jour + 1, quartier: { tapage: 28, insonorise: false } };
      matinDesRelations(etat, []);
      if (etat.intrigues.actives.some((a) => a.id === 'petition')) jour = etat.jour;
    }
    expect(jour).toBeGreaterThan(0);
    expect(etat.relations.dernierEvenement.voisins).toBe(jour);
    // Pas de deuxième pétition pendant le répit.
    etat.intrigues.actives = [];
    for (let i = 1; i < B.RELATIONS.evenementRepit; i++) {
      etat = { ...etat, jour: jour + i };
      matinDesRelations(etat, []);
    }
    expect(etat.intrigues.actives).toEqual([]);
  });

  it('en bons termes, une opportunité ; et chaque acteur a ses deux cartes', () => {
    for (const a of ACTEURS_ORDRE) {
      const bons = trouverIntrigue(ACTEURS[a].evenementBons);
      const mauvais = trouverIntrigue(ACTEURS[a].evenementMauvais);
      expect(bons?.genre, a).toBe('suite');
      expect(mauvais?.genre, a).toBe('suite');
    }
    let etat = avecJauges(quartier(), { presse: 60 });
    for (let i = 0; i < 40 && !etat.intrigues.actives.length; i++) {
      etat = { ...etat, jour: etat.jour + 1 };
      matinDesRelations(etat, []);
    }
    expect(etat.intrigues.actives.map((a) => a.id)).toContain('portrait');
  });

  it('ne décale pas le hasard de la partie', () => {
    const etat = avecJauges(quartier(), { voisins: -70, presse: 60 });
    const hasard = etat.hasard;
    for (let i = 0; i < 20; i++) matinDesRelations({ ...etat, jour: etat.jour + i }, []);
    expect(etat.hasard).toBe(hasard);
  });

  it('la carte ne sort pas si la relation s’est réparée entre-temps', () => {
    for (const d of EVENEMENTS_QUARTIER) {
      const etape = d.etapes[d.premiere]!;
      expect(etape.condition?.relationMin ?? etape.condition?.relationMax, d.id).toBeDefined();
      expect(etape.sinon, d.id).toEqual({ fin: 'oubliee' });
    }
  });

  it('le contrôle de police vide la soirée, jusqu’au lendemain matin', () => {
    const soir = avecJauges(quartier({ minuteDuJour: h(21, 30) }), { police: -60 });
    soir.intrigues.actives.push({ id: 'controle', etape: 'barrage', echeance: 0, employeId: null, debut: soir.jour });
    soir.intrigues.carte = 'controle';
    const apres = appliquerOrdres(soir, [{ type: 'choixIntrigue', choix: 0 }]).etat;
    expect(apres.relations.affluenceSoir).toBe(B.RELATIONS.controleAffluence);
    expect(apres.relations.jauges.police).toBeGreaterThan(-60);
    matinDesRelations(apres, []);
    expect(apres.relations.affluenceSoir).toBe(1);
  });
});

describe('ce que les relations changent', () => {
  it('des voisins en bons termes tolèrent le bruit', () => {
    const neutre = quartier();
    const amis = avecJauges(quartier(), { voisins: 50 });
    expect(facteurTapage(amis)).toBeCloseTo(facteurTapage(neutre) * B.RELATIONS.voisinsTolerants);
  });

  it('la presse fait venir ou fuir les touristes', () => {
    expect(demandeRelations(avecJauges(quartier(), { presse: 100 }), 'touriste')).toBeCloseTo(1 + B.RELATIONS.presseTouristes);
    expect(demandeRelations(avecJauges(quartier(), { presse: -100 }), 'touriste')).toBeCloseTo(1 - B.RELATIONS.presseTouristes);
    expect(demandeRelations(avecJauges(quartier(), { presse: 100 }), 'affaires')).toBe(1);
    expect(demandeRelations(avecJauges(quartier({}, 2), { presse: 100 }), 'touriste')).toBe(1);
  });

  it('la police en bons termes se contente d’un avertissement après une dispute', () => {
    const amie = avecJauges(quartier({ minuteDuJour: h(23) }), { police: 50 });
    expect(disputeSansReputation(amie)).toBe(true);
    const dispute = { ...amie, dispute: { expire: 0 } };
    const apres = tick(dispute).etat;
    expect(apres.reputation).toBeCloseTo(dispute.reputation, 5);
    expect(apres.relations.jauges.police).toBeLessThan(50);
  });

  it('une mairie amie n’envoie plus d’inspecteur sanitaire à l’improviste', () => {
    const inspection = IMPREVUS.find((d) => d.id === 'inspection')!;
    expect(concernes(quartier(), inspection)).not.toBeNull();
    expect(concernes(avecJauges(quartier(), { mairie: B.RELATIONS.bons }), inspection)).toBeNull();
  });

  it('les cartes font bouger les relations, même avant le palier 3', () => {
    const etat = quartier({ minuteDuJour: h(11) }, 2);
    etat.intrigues.actives.push({ id: 'critiqueFlatteuse', etape: 'article', echeance: 0, employeId: null, debut: etat.jour });
    etat.intrigues.carte = 'critiqueFlatteuse';
    const apres = appliquerOrdres(etat, [{ type: 'choixIntrigue', choix: 0 }]);
    expect(apres.etat.relations.jauges.presse).toBeGreaterThan(etat.relations.jauges.presse);
    // Avant le palier 3, pas de ligne au journal.
    expect(apres.evenements.some((e: EvenementMoteur) => e.type === 'seuilRelation')).toBe(false);
  });
});

describe('les textes du quartier', () => {
  it('chaque action a son texte, son détail et l’avis de Josée ; chaque acteur, ses trois messages de seuil', () => {
    for (const id of Object.keys(B.ACTIONS_RELATIONS)) {
      const t = TEXTES_ACTIONS_RELATIONS[id];
      expect(t?.texte, id).toBeTruthy();
      expect(t?.josee, id).toBeTruthy();
      if (B.ACTIONS_RELATIONS[id]!.risque) expect(t?.journalEchec, id).toBeTruthy();
    }
    for (const a of ACTEURS_ORDRE) {
      expect(Object.values(B.ACTIONS_RELATIONS).filter((x) => x.acteur === a).length, a).toBe(2);
      expect(Object.values(TEXTES_SEUILS_RELATIONS[a]).every(Boolean)).toBe(true);
    }
  });

  it('l’humeur suit la jauge', () => {
    expect(humeurRelation(-50)).toBe(0);
    expect(humeurRelation(0)).toBe(2);
    expect(humeurRelation(50)).toBe(4);
  });
});
