import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES, JONAS, MILA } from '../content/candidats';
import { TRAITS } from '../content/personnel';
import { creerEtatInitial, type Candidat, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { candidatDepuis, genererCandidat, tailleDuMarche } from './recrutement';
import { instant } from './temps';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 1, un jour et une heure donnés (briefing du jour validé). */
function auPalier1(jour: number, minuteDuJour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat = { ...creerEtatInitial({ graine: 11 }), jour, minuteDuJour, briefingJour: jour, nuitsBouclees: 1 };
  accorderPalier(etat, 1);
  return { ...etat, annonces: [], ...champs };
}

/** Partie avec un candidat qui attend, question déjà posée si demandé. */
function avecCandidat(candidat: Candidat, question: number | null = 0, champs: Partial<EtatJeu> = {}): EtatJeu {
  return auPalier1(2, h(12), { visites: [], candidats: [{ ...candidat, questionPosee: question }], ...champs });
}

function ordonner(etat: EtatJeu, ordre: Ordre) {
  return appliquerOrdres(etat, [ordre]);
}

/** Enchaîne n ticks en validant les briefings. */
function avancer(etat: EtatJeu, n: number) {
  const evenements: EvenementMoteur[] = [];
  let courant = etat;
  for (let i = 0; i < n; i++) {
    const r = tick(courant);
    evenements.push(...r.evenements);
    courant = r.evenements.some((e) => e.type === 'briefing') ? appliquerOrdres(r.etat, [{ type: 'validerBriefing' }]).etat : r.etat;
  }
  return { etat: courant, evenements };
}

const mila = candidatDepuis(MILA, 'visite', 5);
const jonas = candidatDepuis(JONAS, 'visite', 5);

describe('visites des candidats scénarisés', () => {
  it('le palier 1 prévoit Mila (jour 2, 11 h), Jonas (jour 2, 15 h) et Inès (jour 3, 11 h)', () => {
    const { etat } = tick({ ...creerEtatInitial(), minuteDuJour: h(3, 55), briefingJour: 1 });
    const jour = (j: number, heure: number) => (j - 1) * 24 * 60 + heure - B.HEURE_DEBUT_JOURNEE;
    expect(etat.visites.map((v) => [v.candidat.id, v.instant])).toEqual([
      ['mila', jour(2, h(11))],
      ['jonas', jour(2, h(15))],
      ['ines', jour(3, h(11))],
    ]);
  });

  it('une visite dont l’heure est passée est repoussée au lendemain, dans l’ordre', () => {
    const etat = { ...creerEtatInitial(), jour: 4, minuteDuJour: h(12), palier: 0 };
    accorderPalier(etat, 1);
    const [a, b, c] = etat.visites.map((v) => v.instant);
    expect(a!).toBeGreaterThan(instant(etat));
    expect(b!).toBeGreaterThan(a!);
    expect(c!).toBeGreaterThan(b!);
  });

  it('à l’heure dite, le candidat entre et attend ta réponse 3 jours', () => {
    const etat = auPalier1(2, h(10, 55));
    const { etat: apres, evenements } = tick(etat);
    expect(evenements).toContainEqual({ type: 'visite', candidatId: 'mila', prenom: 'Mila' });
    expect(apres.candidats.map((c) => c.id)).toEqual(['mila']);
    expect(apres.candidats[0]?.expire).toBe(2 + B.JOURS_REFLEXION);
    expect(apres.visites.map((v) => v.candidat.id)).toEqual(['jonas', 'ines']);
  });

  it('un candidat qu’on laisse attendre finit par partir', () => {
    const etat = avecCandidat(mila, null, { jour: 4, minuteDuJour: h(4, 55), briefingJour: 4 });
    const { etat: apres, evenements } = tick(etat);
    expect(apres.jour).toBe(5);
    expect(apres.candidats).toEqual([]);
    expect(evenements).toContainEqual({ type: 'candidatParti', prenom: 'Mila' });
  });
});

describe('entretien d’embauche', () => {
  it('une question révèle un trait, une seule fois', () => {
    const etat = avecCandidat(mila, null);
    const une = ordonner(etat, { type: 'questionCandidat', candidatId: 'mila', question: 1 }).etat;
    expect(une.candidats[0]?.questionPosee).toBe(1);
    const deux = ordonner(une, { type: 'questionCandidat', candidatId: 'mila', question: 0 }).etat;
    expect(deux.candidats[0]?.questionPosee).toBe(1);
  });

  it('pas de proposition avant d’avoir posé une question', () => {
    const etat = ordonner(avecCandidat(jonas, null), { type: 'proposer', candidatId: 'jonas', part: 0.5 }).etat;
    expect(etat.personnel).toHaveLength(1);
  });

  it('une proposition acceptée embauche la personne, en période d’essai', () => {
    const { etat, evenements } = ordonner(avecCandidat(jonas, 1), { type: 'proposer', candidatId: 'jonas', part: 0.5 });
    const recrue = etat.personnel.find((e) => e.id === 'jonas')!;
    expect(recrue).toMatchObject({
      prenom: 'Jonas',
      age: 28,
      genre: 'm',
      part: 0.5,
      traitsConnus: ['Fidèle'],
      finEssai: 2 + B.DUREE_ESSAI,
      moral: B.RECRUE.moral,
      loyaute: B.RECRUE.loyaute,
    });
    expect(recrue.traits).toEqual(['Solitaire', 'Fidèle']);
    expect(etat.candidats).toEqual([]);
    expect(evenements).toContainEqual({ type: 'embauche', employeId: 'jonas', prenom: 'Jonas', part: 0.5 });
  });

  it('proposer 55 % rend la recrue plus loyale', () => {
    const { etat } = ordonner(avecCandidat(jonas), { type: 'proposer', candidatId: 'jonas', part: 0.55 });
    expect(etat.personnel.find((e) => e.id === 'jonas')?.loyaute).toBe(B.RECRUE.loyaute + B.BONUS_LOYAUTE_PART_HAUTE);
  });

  it('trop bas, le candidat négocie ; accepter sa demande l’embauche', () => {
    const premiere = ordonner(avecCandidat(mila), { type: 'proposer', candidatId: 'mila', part: 0.45 });
    expect(premiere.etat.personnel).toHaveLength(1);
    expect(premiere.etat.candidats[0]?.contreOffre).toBe(MILA.partMin);
    expect(premiere.evenements).toContainEqual({ type: 'contreOffre', candidatId: 'mila', prenom: 'Mila', part: MILA.partMin });
    const accord = ordonner(premiere.etat, { type: 'proposer', candidatId: 'mila', part: MILA.partMin }).etat;
    expect(accord.personnel.find((e) => e.id === 'mila')?.part).toBe(MILA.partMin);
  });

  it('insister plus bas après la contre-proposition fait partir le candidat', () => {
    const premiere = ordonner(avecCandidat(mila), { type: 'proposer', candidatId: 'mila', part: 0.45 }).etat;
    const { etat, evenements } = ordonner(premiere, { type: 'proposer', candidatId: 'mila', part: 0.45 });
    expect(etat.candidats).toEqual([]);
    expect(etat.personnel).toHaveLength(1);
    expect(evenements).toContainEqual({ type: 'candidatVexe', prenom: 'Mila' });
  });

  it('refuse les parts hors des trois crans', () => {
    const { etat } = ordonner(avecCandidat(jonas), { type: 'proposer', candidatId: 'jonas', part: 0.9 });
    expect(etat.personnel).toHaveLength(1);
  });

  it('refuser poliment : le candidat s’en va', () => {
    const { etat, evenements } = ordonner(avecCandidat(mila), { type: 'refuserCandidat', candidatId: 'mila' });
    expect(etat.candidats).toEqual([]);
    expect(evenements).toContainEqual({ type: 'candidatRefuse', prenom: 'Mila' });
  });

  it('réfléchir laisse le candidat en attente', () => {
    const { etat, evenements } = ordonner(avecCandidat(mila), { type: 'reflechir', candidatId: 'mila' });
    expect(etat.candidats.map((c) => c.id)).toEqual(['mila']);
    expect(evenements).toContainEqual({ type: 'reflexion', prenom: 'Mila' });
  });

  it(`pas plus de ${B.PERSONNEL_MAX} personnes dans la maison`, () => {
    let etat = auPalier1(3, h(12), { visites: [] });
    for (const def of [MILA, JONAS, INES]) {
      etat = { ...etat, candidats: [{ ...candidatDepuis(def, 'visite', 9), questionPosee: 0 }] };
      etat = ordonner(etat, { type: 'proposer', candidatId: def.id, part: 0.55 }).etat;
    }
    expect(etat.personnel.map((e) => e.id)).toEqual(['sanne', 'mila', 'jonas', 'ines']);
    const cinquieme = { ...candidatDepuis(MILA, 'annonce', 9), id: 'c9', questionPosee: 0 };
    const plein = ordonner({ ...etat, candidats: [cinquieme] }, { type: 'proposer', candidatId: 'c9', part: 0.55 }).etat;
    expect(plein.personnel).toHaveLength(B.PERSONNEL_MAX);
  });

  it('une recrue reçoit des clients dès le soir même', () => {
    const embauche = ordonner(avecCandidat(jonas), { type: 'proposer', candidatId: 'jonas', part: 0.5 }).etat;
    const chambres = embauche.chambres.map((c) => ({ ...c, ouverte: true, proprete: 90 }));
    const soir = {
      ...embauche,
      minuteDuJour: h(21),
      briefingJour: embauche.jour,
      chambres,
      file: [
        { id: 1, modele: 'retraite', patience: 50 },
        { id: 2, modele: 'poete', patience: 50 },
      ],
    };
    const { etat } = tick(soir);
    expect(etat.rendezVous.map((r) => r.employeId).sort()).toEqual(['jonas', 'sanne']);
  });
});

describe('marché du lundi', () => {
  it('amène des candidats chaque lundi, selon la réputation', () => {
    expect(tailleDuMarche(15)).toBe(1);
    expect(tailleDuMarche(25)).toBe(2);
    expect(tailleDuMarche(100)).toBe(B.MARCHE_MAX);
    const { etat, evenements } = tick(auPalier1(7, h(4, 55), { visites: [], reputation: 45 }));
    expect(etat.jour).toBe(8);
    expect(etat.candidats).toHaveLength(tailleDuMarche(45));
    expect(evenements).toContainEqual({ type: 'marche', nombre: tailleDuMarche(45) });
    expect(etat.candidats.every((c) => c.expire === 15)).toBe(true);
  });

  it('se renouvelle : les candidats du lundi précédent partent', () => {
    const lundi = tick(auPalier1(7, h(4, 55), { visites: [] })).etat;
    const ids = lundi.candidats.map((c) => c.id);
    const suivant = tick({ ...lundi, jour: 14, minuteDuJour: h(4, 55), briefingJour: 14 }).etat;
    expect(suivant.candidats.length).toBeGreaterThan(0);
    expect(suivant.candidats.some((c) => ids.includes(c.id))).toBe(false);
  });

  it('rien avant le palier 1', () => {
    const { etat } = tick({ ...creerEtatInitial(), jour: 7, minuteDuJour: h(4, 55), briefingJour: 7 });
    expect(etat.candidats).toEqual([]);
  });

  it('compose des candidats adultes, uniques et complets', () => {
    const etat = auPalier1(8, h(6));
    const tirage = creerTirage(3);
    const vus = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const c = genererCandidat(etat, tirage, 15);
      expect(vus.has(c.id)).toBe(false);
      vus.add(c.id);
      expect(c.age).toBeGreaterThanOrEqual(18);
      expect(c.age).toBeLessThanOrEqual(45);
      expect(Object.values(c.talents).every((n) => n >= 1 && n <= 5)).toBe(true);
      expect(new Set(c.traits).size).toBe(2);
      expect(c.traits.every((t) => t in TRAITS)).toBe(true);
      expect(c.questions.map((q) => q.trait)).toEqual(c.traits);
      expect((B.PARTS_PROPOSEES as readonly number[]).includes(c.partMin)).toBe(true);
      expect(c.intro).toContain(c.prenom);
    }
  });

  it('le même hasard donne les mêmes candidats', () => {
    const a = genererCandidat(auPalier1(8, h(6)), creerTirage(5), 15);
    const b = genererCandidat(auPalier1(8, h(6)), creerTirage(5), 15);
    expect(a).toEqual(b);
  });
});

describe('période d’essai', () => {
  function avecRecrue(jour: number) {
    const embauche = ordonner(avecCandidat(jonas), { type: 'proposer', candidatId: 'jonas', part: 0.5 }).etat;
    return { ...embauche, jour, minuteDuJour: h(4, 55), briefingJour: jour };
  }

  it('au bout d’une semaine, la décision t’attend', () => {
    const { etat, evenements } = tick(avecRecrue(2 + B.DUREE_ESSAI - 1));
    expect(etat.essaisATrancher).toEqual(['jonas']);
    expect(evenements).toContainEqual({ type: 'finEssai', employeId: 'jonas', prenom: 'Jonas' });
    expect(tick(avecRecrue(2 + B.DUREE_ESSAI - 2)).etat.essaisATrancher).toEqual([]);
  });

  it('garder la personne met fin à l’essai', () => {
    const fin = tick(avecRecrue(2 + B.DUREE_ESSAI - 1)).etat;
    const { etat, evenements } = ordonner(fin, { type: 'trancherEssai', employeId: 'jonas', garder: true });
    expect(etat.personnel.find((e) => e.id === 'jonas')?.finEssai).toBeNull();
    expect(etat.essaisATrancher).toEqual([]);
    expect(evenements).toContainEqual({ type: 'essaiConfirme', employeId: 'jonas', prenom: 'Jonas' });
  });

  it('se séparer pendant l’essai ne coûte rien au reste de l’équipe', () => {
    const fin = tick(avecRecrue(2 + B.DUREE_ESSAI - 1)).etat;
    const { etat } = ordonner(fin, { type: 'trancherEssai', employeId: 'jonas', garder: false });
    expect(etat.personnel.map((e) => e.id)).toEqual(['sanne']);
    expect(etat.personnel[0]?.moral).toBe(fin.personnel[0]?.moral);
  });

  it('Sanne n’a pas de période d’essai', () => {
    expect(creerEtatInitial().personnel[0]?.finEssai).toBeNull();
  });
});

describe('traits cachés', () => {
  it('le second trait se révèle après quelques nuits de travail', () => {
    const embauche = ordonner(avecCandidat(jonas, 1), { type: 'proposer', candidatId: 'jonas', part: 0.5 }).etat;
    const { etat, evenements } = avancer({ ...embauche, minuteDuJour: h(19), briefingJour: 0 }, 12 * 24 * B.NUITS_POUR_REVELER_TRAIT);
    const recrue = etat.personnel.find((e) => e.id === 'jonas')!;
    expect(recrue.nuitsTravaillees).toBe(B.NUITS_POUR_REVELER_TRAIT);
    expect(recrue.traitsConnus).toEqual(['Fidèle', 'Solitaire']);
    expect(evenements).toContainEqual({ type: 'traitRevele', employeId: 'jonas', prenom: 'Jonas', trait: 'Solitaire' });
  });
});
