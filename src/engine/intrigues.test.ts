import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INTRIGUES, trouverIntrigue } from '../content/intrigues';
import { MILA } from '../content/candidats';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { declencherImprevu } from './imprevus';
import { avancerIntrigues, demarrerSuite, instantDe, matinDesIntrigues } from './intrigues';
import { accorderPalier } from './paliers';
import { bruitDuSoir, matinDuQuartier } from './quartier';
import { candidatDepuis } from './recrutement';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';
import { instant } from './temps';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 2, un mardi à midi, quartier calme. */
function maison(champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 3 }), jour: 9, minuteDuJour: h(12), briefingJour: 9, nuitsBouclees: 8 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  return { ...etat, annonces: [], visites: [], tresorerie: 5_000, ...champs };
}

const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);

/** Avance pas à pas jusqu'à une carte d'intrigue (ou un nombre de pas), en validant les briefings. */
function jusquACarte(etat: EtatJeu, pasMax = 2000): { etat: EtatJeu; evenements: EvenementMoteur[] } {
  let courant = etat;
  const tous: EvenementMoteur[] = [];
  for (let i = 0; i < pasMax; i++) {
    const briefing = courant.minuteDuJour === B.HEURE_BRIEFING && courant.briefingJour !== courant.jour;
    const r = tick(courant, briefing ? [{ type: 'validerBriefing' }] : []);
    courant = r.etat;
    tous.push(...r.evenements);
    // Les imprévus sont tranchés au plus simple, pour ne pas bloquer.
    if (courant.imprevu) courant = ordonner(courant, { type: 'choixImprevu', choix: 0 }).etat;
    if (courant.intrigues.carte) break;
  }
  return { etat: courant, evenements: tous };
}

/** Un matin à 5 h, après une nuit bruyante. */
function lendemainDeFete(tapage: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  return maison({ minuteDuJour: h(4, 55), quartier: { tapage, insonorise: false }, ...champs });
}

describe('le quartier et son tapage', () => {
  it('les groupes font plus de bruit que les autres, la porte laxiste plus que la stricte', () => {
    const avecClients = (modele: string, selection: 'laxiste' | 'normale' | 'stricte') => {
      const etat = maison({ file: [{ id: 1, modele, patience: 30 }] });
      etat.regles.selection = selection;
      bruitDuSoir(etat, 1);
      return etat.quartier.tapage;
    };
    expect(avecClients('fetard', 'normale')).toBeCloseTo(B.TAPAGE.parGroupeParHeure);
    expect(avecClients('touriste-egare', 'normale')).toBeCloseTo(B.TAPAGE.parClientParHeure);
    expect(avecClients('fetard', 'laxiste')).toBeGreaterThan(avecClients('fetard', 'normale'));
    expect(avecClients('fetard', 'stricte')).toBeLessThan(avecClients('fetard', 'normale'));
  });

  it('une maison insonorisée fait moitié moins de bruit, et le quartier oublie chaque matin', () => {
    const etat = maison({ file: [{ id: 1, modele: 'fetard', patience: 30 }], quartier: { tapage: 0, insonorise: true } });
    bruitDuSoir(etat, 1);
    expect(etat.quartier.tapage).toBeCloseTo(B.TAPAGE.parGroupeParHeure * B.TAPAGE.insonorise);
    etat.quartier.tapage = 50;
    matinDuQuartier(etat);
    expect(etat.quartier.tapage).toBeCloseTo(50 * B.TAPAGE.decroissance);
  });
});

describe('le moteur d’intrigues', () => {
  it('le voisin ne descend ni avant le palier 2, ni si le quartier est calme', () => {
    const calme = lendemainDeFete(B.TAPAGE.plainte - 1);
    expect(tick(calme).etat.intrigues.actives).toEqual([]);
    const tot = { ...lendemainDeFete(80), palier: 1 };
    expect(tick(tot).etat.intrigues.actives).toEqual([]);
  });

  it('après une nuit bruyante, le voisin sonne à 11 h : la carte met le jeu en pause', () => {
    const matin = tick(lendemainDeFete(B.TAPAGE.plainte)).etat;
    expect(matin.intrigues.actives).toMatchObject([{ id: 'voisin', etape: 'plainte', echeance: instantDe(10, h(11)) }]);
    // Le quartier a déjà un peu oublié : le déclencheur, lui, a vu la nuit passée.
    expect(matin.quartier.tapage).toBeLessThan(B.TAPAGE.plainte);
    const { etat, evenements } = jusquACarte(matin);
    expect(etat.minuteDuJour).toBe(h(11));
    expect(etat.intrigues.carte).toBe('voisin');
    expect(evenements).toContainEqual({ type: 'intrigue', id: 'voisin', etape: 'plainte', employeId: null });
  });

  it('un choix applique son effet et programme l’étape suivante, des jours plus tard, à son heure', () => {
    const { etat } = jusquACarte(tick(lendemainDeFete(60)).etat);
    const tapage = etat.quartier.tapage;
    const { etat: apres, evenements } = ordonner(etat, { type: 'choixIntrigue', choix: 0 });
    expect(apres.tresorerie).toBe(etat.tresorerie - B.VOISIN.bouteille);
    expect(apres.semaine.comptes.depenses.incidents).toBe(etat.semaine.comptes.depenses.incidents + B.VOISIN.bouteille);
    expect(apres.quartier.tapage).toBeCloseTo(Math.max(0, tapage - 15));
    expect(apres.intrigues.carte).toBeNull();
    expect(apres.intrigues.actives[0]).toMatchObject({ etape: 'sonometre', echeance: instantDe(etat.jour + 3, h(23)) });
    expect(evenements).toContainEqual({ type: 'intrigueTranchee', id: 'voisin', etape: 'plainte', choix: 0, reussite: true, prenom: undefined });
  });

  it('une carte de soirée attend que la maison soit ouverte', () => {
    const etat = maison({ minuteDuJour: h(23), briefingJour: 8, quartier: { tapage: 50, insonorise: false } });
    etat.intrigues.actives = [{ id: 'voisin', etape: 'sonometre', echeance: instant(etat) - 60, employeId: null, debut: 5 }];
    avancerIntrigues(etat, []);
    expect(etat.intrigues.carte).toBeNull();
    etat.briefingJour = 9;
    avancerIntrigues(etat, []);
    expect(etat.intrigues.carte).toBe('voisin');
  });

  it('si le quartier s’est calmé entre-temps, la suite n’a pas lieu : l’histoire se dénoue d’elle-même', () => {
    const etat = maison({ quartier: { tapage: B.TAPAGE.recidive - 1, insonorise: false } });
    etat.intrigues.actives = [{ id: 'voisin', etape: 'avocat', echeance: instant(etat), employeId: null, debut: 5 }];
    const evenements: EvenementMoteur[] = [];
    avancerIntrigues(etat, evenements);
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.actives).toEqual([]);
    expect(etat.intrigues.finies).toEqual([{ id: 'voisin', fin: 'apaise', jour: 9 }]);
    expect(evenements).toContainEqual({ type: 'intrigueFinie', id: 'voisin', fin: 'apaise', prenom: undefined });
  });

  it('insonoriser demande de quoi payer les travaux, puis le bruit porte moitié moins', () => {
    const avocat = (tresorerie: number) => {
      const etat = maison({ tresorerie, quartier: { tapage: 60, insonorise: false } });
      etat.intrigues.actives = [{ id: 'voisin', etape: 'avocat', echeance: instant(etat), employeId: null, debut: 5 }];
      avancerIntrigues(etat, []);
      return etat;
    };
    const pauvre = avocat(B.VOISIN.insonorisation - 1);
    expect(ordonner(pauvre, { type: 'choixIntrigue', choix: 1 }).etat).toEqual(pauvre);
    const riche = avocat(5_000);
    const apres = ordonner(riche, { type: 'choixIntrigue', choix: 1 }).etat;
    expect(apres.quartier.insonorise).toBe(true);
    expect(apres.tresorerie).toBe(5_000 - B.VOISIN.insonorisation);
    expect(apres.semaine.comptes.depenses.travaux).toBe(B.VOISIN.insonorisation);
    expect(apres.intrigues.finies).toEqual([{ id: 'voisin', fin: 'insonorise', jour: 9 }]);
  });

  it('un choix risqué suit l’issue de réussite ou d’échec, selon le hasard de la partie', () => {
    const issues = new Set<string>();
    for (let graine = 1; graine <= 30; graine++) {
      const etat = maison({ hasard: graine, quartier: { tapage: 60, insonorise: false } });
      etat.intrigues.actives = [{ id: 'voisin', etape: 'avocat', echeance: instant(etat), employeId: null, debut: 5 }];
      avancerIntrigues(etat, []);
      const apres = ordonner(etat, { type: 'choixIntrigue', choix: 2 }).etat;
      const fin = apres.intrigues.finies[0]!.fin;
      issues.add(fin);
      if (fin === 'condamne') expect(apres.tresorerie).toBe(5_000 - B.VOISIN.amende);
      else expect(apres.tresorerie).toBe(5_000);
    }
    expect([...issues].sort()).toEqual(['bluff', 'condamne']);
  });

  it('une intrigue terminée ne revient pas', () => {
    const finie = lendemainDeFete(80);
    finie.intrigues.finies = [{ id: 'voisin', fin: 'apaise', jour: 2 }];
    expect(tick(finie).etat.intrigues.actives).toEqual([]);
  });

  it('deux intrigues au plus à la fois, une par matin, et un peu de calme entre deux', () => {
    // Des intrigues de test, toujours prêtes à démarrer.
    const factice = (id: string) => ({ ...trouverIntrigue('voisin')!, id, declencheur: {} });
    INTRIGUES.push(factice('t1'), factice('t2'), factice('t3'));
    try {
      // Quartier calme : le voisin ne descend pas, les intrigues de test si.
      const etat = maison();
      matinDesIntrigues(etat);
      expect(etat.intrigues.actives.map((a) => a.id)).toEqual(['t1']);
      matinDesIntrigues(etat);
      matinDesIntrigues(etat);
      expect(etat.intrigues.actives.map((a) => a.id)).toEqual(['t1', 't2']);
      // Une suite ne compte pas dans le plafond.
      demarrerSuite(etat, 'costume', 1, null);
      expect(etat.intrigues.actives).toHaveLength(3);
      const recente = maison();
      recente.intrigues.finies = [{ id: 't3', fin: 'x', jour: 9 - B.INTRIGUES_ECART_JOURS + 1 }];
      matinDesIntrigues(recente);
      expect(recente.intrigues.actives).toEqual([]);
      recente.jour += 1;
      matinDesIntrigues(recente);
      expect(recente.intrigues.actives.map((a) => a.id)).toEqual(['t1']);
    } finally {
      INTRIGUES.splice(-3, 3);
    }
  });

  it('refuser le client généreux le fait revenir trois jours plus tard, pour la même personne', () => {
    let etat = maison({ minuteDuJour: h(21), briefingJour: 9 });
    etat = { ...etat, candidats: [{ ...candidatDepuis(MILA, 'visite', 20), questionPosee: 0 }] };
    etat = ordonner(etat, { type: 'proposer', candidatId: 'mila', part: 0.55 }).etat;
    etat.imprevu = { id: 'genereux', employeId: 'mila', employe2Id: null };
    etat = ordonner(etat, { type: 'choixImprevu', choix: 2 }).etat;
    expect(etat.intrigues.actives).toMatchObject([{ id: 'costume', etape: 'retour', employeId: 'mila', echeance: instantDe(12, h(21, 30)) }]);
    // La suite est une intrigue courte : elle ne bloque pas les vraies intrigues.
    expect(trouverIntrigue('costume')?.genre).toBe('suite');
    etat.intrigues.actives[0]!.echeance = instant(etat);
    avancerIntrigues(etat, []);
    expect(etat.intrigues.carte).toBe('costume');
    const apres = ordonner(etat, { type: 'choixIntrigue', choix: 1 }).etat;
    expect(apres.intrigues.finies).toEqual([{ id: 'costume', fin: 'econduit', jour: 9 }]);
  });

  it('si la personne concernée est partie, la suite s’éteint sans carte', () => {
    const etat = maison({ minuteDuJour: h(22) });
    demarrerSuite(etat, 'costume', 0, 'fantome');
    avancerIntrigues(etat, []);
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.finies).toEqual([{ id: 'costume', fin: 'depart', jour: 9 }]);
  });

  it('un imprévu et une carte d’intrigue ne sortent jamais en même temps', () => {
    const etat = maison({ minuteDuJour: h(22), nuit: null });
    etat.intrigues.carte = 'voisin';
    etat.nuit = { numero: 9, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 25, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0, bar: 0 };
    for (let g = 0; g < 50; g++) declencherImprevu(etat, creerTirage(g), []);
    expect(etat.imprevu).toBeNull();
    const avecImprevu = maison({ minuteDuJour: h(11), imprevu: { id: 'pluie', employeId: null, employe2Id: null } });
    avecImprevu.intrigues.actives = [{ id: 'voisin', etape: 'plainte', echeance: 0, employeId: null, debut: 9 }];
    avancerIntrigues(avecImprevu, []);
    expect(avecImprevu.intrigues.carte).toBeNull();
  });

  it('toutes les intrigues sont cohérentes : étapes et fins existent, textes présents', () => {
    for (const def of INTRIGUES) {
      expect(def.etapes[def.premiere], def.id).toBeDefined();
      for (const [id, etape] of Object.entries(def.etapes)) {
        expect(etape.choix.length, `${def.id}.${id}`).toBeGreaterThanOrEqual(2);
        expect(etape.choix.length).toBeLessThanOrEqual(3);
        const issues = [etape.sinon, ...etape.choix.flatMap((c) => [c.suite, c.suiteEchec])].filter((x) => x !== undefined);
        for (const issue of issues) {
          if ('fin' in issue) expect(def.fins[issue.fin], `${def.id}: fin ${issue.fin}`).toBeDefined();
          else expect(def.etapes[issue.etape], `${def.id}: étape ${issue.etape}`).toBeDefined();
        }
        for (const c of etape.choix) if (c.chance !== undefined) expect(c.journalEchec, `${def.id}.${id}`).toBeTruthy();
      }
    }
  });
});
