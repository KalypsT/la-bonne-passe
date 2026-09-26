import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { IMPREVUS, trouverImprevu, type DefinitionImprevu } from '../content/imprevus';
import { trouverIntrigue } from '../content/intrigues';
import { MILA } from '../content/candidats';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { reputationPonderee } from './clientele';
import { circonstances, concernes, declencherImprevu, favorise, poidsImprevus } from './imprevus';
import { accorderPalier } from './paliers';
import { candidatDepuis } from './recrutement';
import { appliquerOrdres, type EvenementMoteur, type Ordre } from './tick';
import { comptesVides } from './comptes';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;
const def = (id: string) => trouverImprevu(id)!;

/** Soirée ouverte au palier 2, un mardi à 22 h, avec Sanne et Mila en service et le bar qui sert. */
function soiree(champs: Partial<EtatJeu> = {}): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 4 }), jour: 9, minuteDuJour: h(22), briefingJour: 9, nuitsBouclees: 8 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  etat = { ...etat, annonces: [], visites: [], tresorerie: 5_000, reputation: 32 };
  etat = { ...etat, candidats: [{ ...candidatDepuis(MILA, 'visite', 20), questionPosee: 0 }] };
  etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: 'mila', part: 0.55 }]).etat;
  for (const e of etat.personnel) e.enServiceCeSoir = true;
  etat.bar = { ouvert: true, travaux: null, stock: 40, commande: 0 };
  etat.equipes.bar = 1;
  etat.nuit = { numero: 9, comptes: comptesVides(), tresorerieAvant: 0, tresorerieApres: 0, retraitReserve: 0, servis: 0, perdus: 0, reputationDebut: 32, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 };
  etat.imprevusVus = ['touriste'];
  return { ...etat, ...champs };
}

const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);
const avecImprevu = (etat: EtatJeu, id: string) => ({ ...etat, imprevu: concernes(etat, def(id))! });

describe('les imprévus suivent l’état de la maison', () => {
  it('la semaine, le thème, le bar, les règles, la clientèle et le palier ouvrent ou ferment des cartes', () => {
    const etat = soiree();
    expect(concernes(etat, def('prolongations'))).toBeNull();
    etat.systemes.tendances = true;
    etat.semaine.tendances = ['match'];
    expect(concernes(etat, def('prolongations'))).not.toBeNull();

    expect(concernes(etat, def('loup'))).toBeNull();
    etat.themeDuSoir = 'masquee';
    expect(concernes(etat, def('loup'))).not.toBeNull();

    expect(concernes(etat, def('tireuse'))).not.toBeNull();
    etat.bar.stock = 0;
    expect(concernes(etat, def('tireuse'))).toBeNull();

    expect(concernes(etat, def('refoule'))).toBeNull();
    etat.regles.selection = 'stricte';
    expect(concernes(etat, def('refoule'))).not.toBeNull();

    expect(concernes(etat, def('addition'))).toBeNull();
    etat.regles.tarif = 2;
    expect(concernes(etat, def('addition'))).not.toBeNull();

    expect(concernes(etat, def('anniversaire'))).toBeNull();
    etat.file = [{ id: 1, modele: 'retraite', patience: 30 }];
    expect(concernes(etat, def('anniversaire'))).not.toBeNull();

    expect(circonstances({ ...etat, palier: 1 }, { palierMin: 2 })).toBe(false);
    expect(circonstances({ ...etat, reputation: 20 }, def('critique').condition!)).toBe(false);
  });

  it('la candidate remarquable ne vient que s’il reste une place dans l’équipe', () => {
    const etat = soiree();
    expect(concernes(etat, def('vedette'))).not.toBeNull();
    while (etat.personnel.length < B.PERSONNEL_MAX) etat.personnel.push({ ...etat.personnel[0]!, id: `x${etat.personnel.length}` });
    expect(concernes(etat, def('vedette'))).toBeNull();
  });

  it('une tendance, un thème ou une règle rendent certaines cartes plus probables', () => {
    const etat = soiree();
    expect(favorise(etat, def('evg'))).toBe(false);
    etat.regles.selection = 'laxiste';
    expect(favorise(etat, def('evg'))).toBe(true);
    const [normal] = poidsImprevus({ ...etat, regles: { ...etat.regles, selection: 'normale' } }, [{ id: 'evg', employeId: null, employe2Id: null }]);
    const [favorisé] = poidsImprevus(etat, [{ id: 'evg', employeId: null, employe2Id: null }]);
    expect(favorisé).toBeCloseTo(normal! * B.IMPREVU_POIDS_BONUS);
  });
});

describe('les imprévus ne tournent plus en rond', () => {
  const possibles = [
    { id: 'pluie', employeId: null, employe2Id: null },
    { id: 'chat', employeId: null, employe2Id: null },
  ];

  it('une carte jamais vue sort plus souvent ; une carte vue il y a moins de 5 nuits ne sort pas', () => {
    const etat = soiree();
    expect(poidsImprevus(etat, possibles)).toEqual([B.IMPREVU_POIDS_NOUVEAU, B.IMPREVU_POIDS_NOUVEAU]);
    etat.imprevusNuit = { pluie: 9 - B.IMPREVU_REPOS_NUITS + 1, chat: 9 - B.IMPREVU_REPOS_NUITS };
    const [pluie, chat] = poidsImprevus(etat, possibles);
    expect(pluie).toBe(0);
    expect(chat).toBe(1);
  });

  it('mieux vaut une soirée sans imprévu qu’une répétition', () => {
    const etat = soiree({ minuteDuJour: h(22) });
    // Toutes les cartes possibles ce soir ont été vues hier.
    for (const d of IMPREVUS) etat.imprevusNuit[d.id] = 8;
    for (let g = 0; g < 200; g++) declencherImprevu(etat, creerTirage(g), []);
    expect(etat.imprevu).toBeNull();
  });

  it('une carte unique ne sort qu’une fois par partie, et la dernière nuit de chaque carte est notée', () => {
    const etat = soiree();
    etat.imprevusNuit = { chat: 1 };
    const evenements: EvenementMoteur[] = [];
    for (let g = 0; g < 400 && !etat.imprevu; g++) declencherImprevu(etat, creerTirage(g), evenements);
    expect(etat.imprevu).not.toBeNull();
    expect(etat.imprevu!.id).not.toBe('chat');
    expect(etat.imprevusNuit[etat.imprevu!.id]).toBe(9);
  });
});

describe('les nouveaux effets des cartes', () => {
  it('un client invité vient du segment annoncé et passe la porte sans sélection', () => {
    const etat = soiree({ file: [] });
    etat.regles.selection = 'stricte';
    const apres = ordonner(avecImprevu(etat, 'evg'), { type: 'choixImprevu', choix: 0 }).etat;
    expect(apres.file.length).toBe(3);
    expect(apres.file.every((c) => ['fetard', 'temoin', 'collegues'].includes(c.modele))).toBe(true);
    expect(apres.quartier.tapage).toBe(10);
  });

  it('le bar, la fatigue de l’équipe, la réputation adoucie des imprévus', () => {
    const etat = soiree();
    etat.themeDuSoir = 'anneesFolles';
    const cave = ordonner(avecImprevu(etat, 'cave'), { type: 'choixImprevu', choix: 0 }).etat;
    expect(cave.bar.stock).toBe(40 + B.IMPREVU_ARGENT.caveBouteilles);
    expect(cave.tresorerie).toBe(5_000 - B.IMPREVU_ARGENT.caveNegociant);

    etat.systemes.tendances = true;
    etat.semaine.tendances = ['congres'];
    const fatigues = etat.personnel.map((e) => e.fatigue);
    const prive = ordonner(avecImprevu(etat, 'privatisation'), { type: 'choixImprevu', choix: 0 }).etat;
    expect(prive.personnel.map((e) => e.fatigue)).toEqual(fatigues.map((f) => f + 12));
    expect(prive.tresorerie).toBe(5_000 + B.IMPREVU_ARGENT.privatisation);

    const pluie = ordonner(avecImprevu(etat, 'pluie'), { type: 'choixImprevu', choix: 1 }).etat;
    expect(pluie.reputation).toBeCloseTo(reputationPonderee(etat) + 1.5 * B.IMPREVU_FORCE_SATISFACTION, 1);
  });

  it('la candidate remarquable attend au salon : deux talents hauts, une part exigeante', () => {
    const etat = soiree();
    const { etat: apres, evenements } = ordonner(avecImprevu(etat, 'vedette'), { type: 'choixImprevu', choix: 0 });
    const c = apres.candidats.at(-1)!;
    const talents = Object.values(c.talents).sort((a, b) => b - a);
    expect(talents[0]).toBe(B.CANDIDAT_VEDETTE.talentFort);
    expect(talents[1]).toBeGreaterThanOrEqual(B.CANDIDAT_VEDETTE.talentSecond);
    expect(c.partMin).toBe(B.CANDIDAT_VEDETTE.partMin);
    expect(evenements).toContainEqual({ type: 'candidatVedette', candidatId: c.id, prenom: c.prenom });
  });

  it('un choix peut revenir des jours plus tard, et l’issue du hasard choisit la suite', () => {
    const suites = new Set<string>();
    for (let g = 1; g <= 30; g++) {
      const etat = { ...soiree(), hasard: g };
      const apres = ordonner(avecImprevu(etat, 'critique'), { type: 'choixImprevu', choix: 0 }).etat;
      const suite = apres.intrigues.actives[0]!;
      suites.add(suite.id);
      expect(suite.echeance).toBeGreaterThan(0);
    }
    expect([...suites].sort()).toEqual(['critiqueAcide', 'critiqueFlatteuse']);
  });
});

describe('le contenu des imprévus', () => {
  const personnel = (d: DefinitionImprevu) => {
    const c = d.condition;
    return !!c && (c.rivalite !== undefined || c.fatigueMin !== undefined || c.trait !== undefined || c.partMax !== undefined || !!c.disponible);
  };

  it('au moins 24 cartes (39 avec le quartier), dont la moitié des nouvelles sont des opportunités', () => {
    expect(IMPREVUS.length).toBeGreaterThanOrEqual(24);
    const nouvelles = IMPREVUS.slice(6);
    expect(nouvelles.filter((d) => d.opportunite).length).toBeGreaterThanOrEqual(nouvelles.length / 2);
  });

  it('chaque carte a 2 ou 3 choix, un texte d’échec pour chaque pari, et ne parle d’une personne que si elle en désigne une', () => {
    for (const d of IMPREVUS) {
      expect(d.choix.length, d.id).toBeGreaterThanOrEqual(2);
      expect(d.choix.length, d.id).toBeLessThanOrEqual(3);
      for (const c of d.choix) if (c.chance !== undefined) expect(c.journalEchec, d.id).toBeTruthy();
      const textes = [d.titre, d.texte, ...d.choix.flatMap((c) => [c.texte, c.detail, c.journal, c.journalEchec ?? ''])].join(' ');
      if (/\{prenom\}|\{Il\}|\{e\}/.test(textes)) expect(personnel(d), d.id).toBe(true);
      expect(textes, d.id).not.toContain("'");
      for (const champ of textes.match(/\{[^}]*\}/g) ?? []) expect(['{prenom}', '{prenom2}', '{joueur}', '{maison}', '{e}', '{e2}', '{Il}']).toContain(champ);
    }
  });

  it('chaque suite annoncée existe, et c’est bien une suite', () => {
    for (const d of IMPREVUS) {
      for (const c of d.choix) {
        for (const effet of [c.effet, c.echec]) {
          if (!effet?.suite) continue;
          expect(trouverIntrigue(effet.suite.id)?.genre, `${d.id} → ${effet.suite.id}`).toBe('suite');
        }
      }
    }
  });
});
