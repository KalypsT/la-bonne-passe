import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { AMBITIONS_DU_MARCHE, trouverAmbition } from '../content/ambitions';
import { INES, JONAS, MILA } from '../content/candidats';
import { INTRIGUES, trouverIntrigue } from '../content/intrigues';
import { TRAITS_D_ARC, TRAITS_DU_MARCHE } from '../content/personnel';
import { creerEtatInitial, type Employe, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { appliquerEffet } from './effets';
import { avancerIntrigues, conditionRemplie, matinDesIntrigues } from './intrigues';
import { accorderPalier } from './paliers';
import { ambitionDuMarche, candidatDepuis, genererCandidat } from './recrutement';
import { poidsSegment } from './soiree';
import { appliquerOrdres, type EvenementMoteur, type Ordre } from './tick';
import { instant } from './temps';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 2 avec Mila et Jonas confirmés, un mardi à midi. */
function maison(champs: Partial<EtatJeu> = {}): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 3 }), jour: 16, minuteDuJour: h(12), briefingJour: 16, nuitsBouclees: 15 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  etat = { ...etat, annonces: [], visites: [], tresorerie: 5_000 };
  for (const def of [MILA, JONAS]) {
    etat = { ...etat, candidats: [{ ...candidatDepuis(def, 'visite', 30), questionPosee: 0 }] };
    etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: def.id, part: 0.5 }]).etat;
  }
  for (const e of etat.personnel) {
    e.finEssai = null;
    e.nuitsTravaillees = 10;
  }
  return { ...etat, ...champs };
}

const perso = (etat: EtatJeu, id: string) => etat.personnel.find((e) => e.id === id)!;
const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);

/** Place une intrigue à une étape, due maintenant, et sort sa carte. */
function aLEtape(etat: EtatJeu, id: string, etape: string, employeId: string | null, points = 0): EtatJeu {
  etat.intrigues.actives = [{ id, etape, echeance: instant(etat), employeId, debut: etat.jour, points }];
  avancerIntrigues(etat, []);
  return etat;
}

const outils = { ajouterClient: () => {}, demarrerSuite: () => {} };

describe('les ambitions', () => {
  it('chaque personnage scénarisé a la sienne, chaque candidat du marché aussi', () => {
    expect([MILA.ambition, JONAS.ambition, INES.ambition]).toEqual(['affiche', 'etudes', 'ibiza']);
    expect(creerEtatInitial().personnel[0]!.ambition).toBe('gerante');
    const etat = maison();
    const tirage = creerTirage(8);
    for (let i = 0; i < 20; i++) {
      const c = genererCandidat(etat, tirage, 20);
      expect(AMBITIONS_DU_MARCHE).toContain(c.ambition);
      expect(trouverAmbition(c.ambition)).toBeDefined();
      expect(c.ambition).toBe(ambitionDuMarche(c.id));
    }
    // L'ambition suit la personne à l'embauche.
    expect(perso(maison(), 'jonas').ambition).toBe('etudes');
  });

  it('les traits gagnés au bout d’un arc ne sont jamais tirés pour un candidat', () => {
    for (const t of TRAITS_D_ARC) expect(TRAITS_DU_MARCHE).not.toContain(t);
  });
});

describe('les effets des arcs', () => {
  it('part minimale, talents bornés, traits gagnés et perdus, promesse de repos', () => {
    const etat = maison();
    appliquerEffet(
      etat,
      { partMin: 0.55, talent: { charme: 3, conversation: 1 }, ajouterTrait: 'Tête d’affiche', retirerTrait: 'Diva', promesseRepos: true },
      { employeId: 'mila' },
      outils,
    );
    const mila = perso(etat, 'mila');
    expect(mila.part).toBe(0.55);
    expect(mila.talents.charme).toBe(5);
    expect(mila.talents.conversation).toBe(MILA.talents.conversation + 1);
    expect(mila.traits).toContain('Tête d’affiche');
    expect(mila.traitsConnus).toContain('Tête d’affiche');
    expect(mila.traits).not.toContain('Diva');
    expect(mila.promesseRepos).toBe(etat.jour + B.ENTRETIEN.delaiPromesse);
    // Une part déjà plus haute ne baisse pas.
    appliquerEffet(etat, { partMin: 0.5 }, { employeId: 'mila' }, outils);
    expect(perso(etat, 'mila').part).toBe(0.55);
  });

  it('un départ fait partir la personne, avec sa carte d’adieu', () => {
    const etat = maison();
    const evenements: EvenementMoteur[] = [];
    appliquerEffet(etat, { depart: true }, { employeId: 'mila' }, { ...outils, evenements });
    expect(etat.personnel.some((e) => e.id === 'mila')).toBe(false);
    expect(etat.adieux).toContain('Mila');
    expect(evenements).toContainEqual({ type: 'depart', prenom: 'Mila' });
  });

  it('une personne Juriste dans l’équipe divise par deux les frais de justice, et eux seulement', () => {
    const payer = (juriste: boolean, juridique: boolean) => {
      const etat = maison();
      if (juriste) perso(etat, 'jonas').traits.push('Juriste');
      appliquerEffet(etat, { argent: -800, juridique }, { employeId: null }, outils);
      return 5_000 - etat.tresorerie;
    };
    expect(payer(false, true)).toBe(800);
    expect(payer(true, true)).toBe(800 * B.TRAITS_EFFETS.juristeRemise);
    expect(payer(true, false)).toBe(800);
  });

  it('une Tête d’affiche en service attire les habitués', () => {
    const etat = maison();
    for (const e of etat.personnel) e.enServiceCeSoir = true;
    const avant = poidsSegment(etat, 'habitue');
    perso(etat, 'mila').traits.push('Tête d’affiche');
    expect(poidsSegment(etat, 'habitue')).toBeCloseTo(avant * B.TRAITS_EFFETS.teteDAfficheHabitues);
    perso(etat, 'mila').repos = true;
    expect(poidsSegment(etat, 'habitue')).toBeCloseTo(avant);
  });
});

describe('les conditions d’une intrigue', () => {
  it('se lisent pour la personne concernée : moral, nuits, période d’essai, points gardés', () => {
    const etat = maison();
    const mila = perso(etat, 'mila') as Employe;
    mila.moral = 50;
    expect(conditionRemplie(etat, { moralMin: 45 }, 'mila')).toBe(true);
    expect(conditionRemplie(etat, { moralMax: 40 }, 'mila')).toBe(false);
    expect(conditionRemplie(etat, { employe: 'mila', nuitsMin: 11 })).toBe(false);
    mila.finEssai = 20;
    expect(conditionRemplie(etat, { employe: 'mila', confirme: true })).toBe(false);
    expect(conditionRemplie(etat, { pointsMin: 3 }, null, 2)).toBe(false);
    expect(conditionRemplie(etat, { pointsMax: 0 }, null, 0)).toBe(true);
    // Une condition personnelle sans la personne n'est jamais remplie.
    expect(conditionRemplie(etat, { moralMin: 0 }, 'fantome')).toBe(false);
  });
});

describe('l’arc de Mila', () => {
  it('démarre une fois son essai fini et assez de nuits travaillées, jamais sans elle', () => {
    const tot = maison();
    perso(tot, 'mila').nuitsTravaillees = B.ARC_MILA.nuits - 1;
    perso(tot, 'jonas').nuitsTravaillees = 0;
    matinDesIntrigues(tot);
    expect(tot.intrigues.actives).toEqual([]);
    const pret = maison();
    matinDesIntrigues(pret);
    expect(pret.intrigues.actives).toMatchObject([{ id: 'mila', etape: 'affiche', employeId: 'mila' }]);
    const sansElle = maison();
    sansElle.personnel = sansElle.personnel.filter((e) => e.id !== 'mila' && e.id !== 'jonas');
    matinDesIntrigues(sansElle);
    expect(sansElle.intrigues.actives).toEqual([]);
  });

  it('la mettre en avant mène à la tête d’affiche : elle perd son caprice de Diva', () => {
    let etat = aLEtape(maison(), 'mila', 'affiche', 'mila');
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'magazine', points: 1 });
    perso(etat, 'mila').moral = 70;
    etat.minuteDuJour = h(22);
    etat = aLEtape(etat, 'mila', 'sacre', 'mila', 1);
    expect(etat.intrigues.carte).toBe('mila');
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(perso(etat, 'mila').traits).toEqual(['Ambitieuse', 'Tête d’affiche']);
    expect(etat.intrigues.finies).toEqual([{ id: 'mila', fin: 'tete', jour: 16 }]);
  });

  it('jamais mise en avant puis refusée, elle fait sa valise ; la laisser partir, c’est la perdre', () => {
    let etat = aLEtape(maison({ minuteDuJour: h(11) }), 'mila', 'valise', 'mila', -1);
    expect(etat.intrigues.carte).toBe('mila');
    const { etat: apres, evenements } = ordonner(etat, { type: 'choixIntrigue', choix: 1 });
    expect(apres.personnel.some((e) => e.id === 'mila')).toBe(false);
    expect(evenements).toContainEqual({ type: 'depart', prenom: 'Mila' });
    expect(apres.intrigues.finies).toEqual([{ id: 'mila', fin: 'partie', jour: 16 }]);
    // Si la maison l'a mise en avant au moins une fois, elle range sa valise d'elle-même.
    etat = aLEtape(maison({ minuteDuJour: h(11) }), 'mila', 'valise', 'mila', 1);
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.finies).toEqual([{ id: 'mila', fin: 'rentree', jour: 16 }]);
  });
});

describe('l’arc de Jonas', () => {
  it('une avance sort de la caisse, et revient quand il réussit', () => {
    let etat = aLEtape(maison({ minuteDuJour: h(11) }), 'jonas', 'inscription', 'jonas', 2);
    etat = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(etat.tresorerie).toBe(5_000 - B.ARC_JONAS.inscription);
    expect(etat.semaine.comptes.depenses.personnel).toBe(B.ARC_JONAS.inscription);
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'resultats', avance: B.ARC_JONAS.inscription, points: 4 });
    perso(etat, 'jonas').moral = 60;
    etat.minuteDuJour = h(21);
    etat.briefingJour = etat.jour;
    etat.intrigues.actives[0]!.echeance = instant(etat);
    avancerIntrigues(etat, []);
    expect(etat.intrigues.carte).toBe('jonas');
    const { etat: apres, evenements } = ordonner(etat, { type: 'choixIntrigue', choix: 1 });
    expect(apres.tresorerie).toBe(5_000);
    expect(evenements).toContainEqual({ type: 'remboursement', prenom: 'Jonas', montant: B.ARC_JONAS.inscription });
    expect(perso(apres, 'jonas').traits).toContain('Juriste');
    expect(perso(apres, 'jonas').talents.discretion).toBe(5);
  });

  it('sans révisions ni inscription payée, il rate son examen : une carte de plus le lendemain', () => {
    const etat = maison({ minuteDuJour: h(21) });
    perso(etat, 'jonas').moral = 90;
    aLEtape(etat, 'jonas', 'resultats', 'jonas', 1);
    expect(etat.intrigues.carte).toBeNull();
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'rate' });
  });

  it('avec un moral en berne, même bien préparé, il échoue', () => {
    const etat = maison({ minuteDuJour: h(21) });
    perso(etat, 'jonas').moral = B.ARC_JONAS.moralReussite - 1;
    aLEtape(etat, 'jonas', 'resultats', 'jonas', 4);
    expect(etat.intrigues.actives[0]).toMatchObject({ etape: 'rate' });
  });
});

describe('contenu des arcs', () => {
  it('un départ ne tombe jamais en soirée (personne n’est en rendez-vous)', () => {
    for (const def of INTRIGUES) {
      for (const [id, etape] of Object.entries(def.etapes)) {
        const depart = etape.choix.some((c) => c.effet.depart || c.echec?.depart);
        if (depart) expect(etape.heure, `${def.id}.${id}`).toBeLessThan(B.HEURE_BRIEFING);
      }
    }
  });

  it('les arcs portent sur leur personnage', () => {
    expect(trouverIntrigue('mila')?.declencheur?.employe).toBe('mila');
    expect(trouverIntrigue('jonas')?.declencheur?.employe).toBe('jonas');
  });
});
