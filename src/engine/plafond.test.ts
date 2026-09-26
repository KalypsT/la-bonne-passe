import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { repliquePlafond } from '../content/plafond';
import { creerEtatInitial, type Employe, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { chanceReticence, fatigueFinDeNuit, fatigueLendemain, plafondDe, reponsePlafond } from './plafond';
import { quotaAtteint } from './regles';
import { simuler } from './simulation';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Briefing de 19 h au palier 1 (planning ouvert), Sanne seule, fatigue et moral au choix. */
function briefing(sanne: Partial<Employe> = {}, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 4, minuteDuJour: h(19), briefingJour: 3, nuitsBouclees: 3 };
  accorderPalier(etat, 1);
  etat.personnel = [{ ...etat.personnel[0]!, ...sanne }];
  return { ...etat, annonces: [], visites: [], ...champs };
}

/** Une personne fatiguée, avec ou sans traits : on cherche un jour où elle dit non ou négocie. */
function jourOu(sanne: Partial<Employe>, voulu: (r: string) => boolean): EtatJeu {
  for (let jour = 4; jour < 200; jour++) {
    const etat = briefing(sanne, { jour });
    if (voulu(reponsePlafond(etat, etat.personnel[0]!, 6))) return etat;
  }
  throw new Error('aucun jour trouvé');
}

describe('crans de rendez-vous', () => {
  it('le briefing propose 2 à 6 rendez-vous, 4 par défaut', () => {
    expect([...B.RDV_MAX_CRANS]).toEqual([2, 3, 4, 5, 6]);
    expect(creerEtatInitial().rdvMax).toBe(4);
    const { etat } = appliquerOrdres(briefing(), [{ type: 'validerBriefing', rdvMax: 5 }]);
    expect(etat.rdvMax).toBe(5);
    expect(appliquerOrdres(briefing(), [{ type: 'validerBriefing', rdvMax: 7 }]).etat.rdvMax).toBe(4);
  });

  it('fatigue attendue d’une personne reposée : environ 54 % à 4, 70 % à 5, au-delà de 80 % à 6', () => {
    const sanne = briefing({ fatigue: 0 }).personnel[0]!;
    expect(fatigueFinDeNuit(sanne, 4)).toBeCloseTo(54, 0);
    expect(fatigueFinDeNuit(sanne, 5)).toBeCloseTo(70, 0);
    expect(fatigueFinDeNuit(sanne, 6)).toBeGreaterThan(B.SEUIL_EPUISEMENT);
    // À 5, presque remise le lendemain ; à 6, pas du tout.
    expect(fatigueLendemain(fatigueFinDeNuit(sanne, 5), sanne)).toBeLessThan(10);
    expect(fatigueLendemain(fatigueFinDeNuit(sanne, 6), sanne)).toBeGreaterThan(15);
  });

  it('l’estimation tient compte de la fatigue déjà là, de la Fêtarde, de la formule et du thème', () => {
    const reposee = briefing({ fatigue: 0 }).personnel[0]!;
    const lasse = { ...reposee, fatigue: 30 };
    const fetarde = { ...reposee, traits: ['Fêtarde'] };
    expect(fatigueFinDeNuit(lasse, 4)).toBeCloseTo(fatigueFinDeNuit(reposee, 4) + 30, 5);
    expect(fatigueFinDeNuit(fetarde, 4)).toBeGreaterThan(fatigueFinDeNuit(reposee, 4) + 10);
    expect(fatigueFinDeNuit(reposee, 4, 'complete')).toBeLessThan(fatigueFinDeNuit(reposee, 4));
    expect(fatigueFinDeNuit(reposee, 4, 'standard', 'burlesque')).toBeGreaterThan(fatigueFinDeNuit(reposee, 4));
    expect(fatigueFinDeNuit({ ...reposee, fatigue: 90 }, 6)).toBe(100);
  });

  it('sur une vraie nuit à 6, une personne reposée finit bien au-delà de 80, comme annoncé', () => {
    // Une nuit où les clients ne manquent pas : Sanne fait ses 6 rendez-vous.
    let etat = appliquerOrdres(briefing({ fatigue: 0, moral: 90 }), [{ type: 'validerBriefing', rdvMax: 6 }]).etat;
    let garde = 0;
    while (etat.minuteDuJour !== h(4) && ++garde < 200) {
      if (etat.file.length < 3) etat.file.push({ id: 900 + garde, modele: 'retraite', patience: 200 });
      etat = tick(etat).etat;
    }
    const sanne = etat.personnel[0]!;
    expect(sanne.rdvCeSoir).toBeGreaterThanOrEqual(5);
    if (sanne.rdvCeSoir === 6) expect(sanne.fatigue).toBeGreaterThan(B.SEUIL_EPUISEMENT - 5);
  });

  it('au-delà de 4 rendez-vous, chacun coûte du moral en plus', () => {
    const rdv = { chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 };
    const soir = (faits: number) => {
      const e = briefing({ rdvCeSoir: faits, chargeCeSoir: faits, moral: 80 }, { minuteDuJour: h(23), briefingJour: 4, rendezVous: [rdv] });
      return tick(e).etat.personnel[0]!.moral;
    };
    expect(soir(3) - soir(4)).toBeCloseTo(B.PLAFOND.moralAuDela, 0);
    expect(soir(2)).toBeCloseTo(soir(3), 5);
  });
});

describe('refus et négociation au cran 6', () => {
  it('une personne reposée et de bon moral ne discute jamais', () => {
    for (let jour = 4; jour < 60; jour++) {
      const etat = briefing({ fatigue: 10, moral: 80 }, { jour });
      expect(reponsePlafond(etat, etat.personnel[0]!, 6)).toBe('accepte');
    }
    expect(chanceReticence(briefing({ fatigue: 10, moral: 80 }).personnel[0]!)).toBe(0);
  });

  it('personne ne discute sous le cran 6, même épuisée', () => {
    const etat = briefing({ fatigue: 90, moral: 10 });
    for (const cran of [2, 3, 4, 5]) expect(reponsePlafond(etat, etat.personnel[0]!, cran)).toBe('accepte');
  });

  it('fatiguée ou au moral bas, elle refuse ou négocie parfois ; les traits pèsent', () => {
    const reponses = (sanne: Partial<Employe>) => {
      const compte: Record<string, number> = {};
      for (let jour = 4; jour < 404; jour++) {
        const etat = briefing(sanne, { jour });
        const r = reponsePlafond(etat, etat.personnel[0]!, 6);
        compte[r] = (compte[r] ?? 0) + 1;
      }
      return compte;
    };
    const lasse = reponses({ fatigue: 40, moral: 70, traits: [] });
    expect(lasse.accepte).toBeGreaterThan(150);
    expect((lasse.refuse ?? 0) + (lasse.negociePrime ?? 0) + (lasse.negocieRepos ?? 0)).toBeGreaterThan(120);
    const diva = reponses({ fatigue: 40, moral: 70, traits: ['Diva'] });
    const fetarde = reponses({ fatigue: 40, moral: 70, traits: ['Fêtarde'] });
    expect(diva.accepte ?? 0).toBeLessThan(lasse.accepte!);
    expect(fetarde.accepte ?? 0).toBeGreaterThan(lasse.accepte!);
    // Épuisée et au moral bas : presque toujours.
    expect(reponses({ fatigue: 60, moral: 30, traits: [] }).accepte ?? 0).toBeLessThan(60);
  });

  it('la réponse montrée au briefing est celle qu’on retrouve à la validation, et le tirage ne décale pas le reste', () => {
    const etat = jourOu({ fatigue: 50, moral: 60, traits: [] }, (r) => r === 'refuse');
    const { etat: apres, evenements } = appliquerOrdres(etat, [{ type: 'validerBriefing', rdvMax: 6 }]);
    expect(apres.personnel[0]!.plafondCeSoir).toBe(5);
    expect(plafondDe(apres, apres.personnel[0]!)).toBe(5);
    expect(evenements).toContainEqual({ type: 'plafondRefuse', employeId: 'sanne', prenom: 'Sanne' });
    expect(apres.hasard).toBe(etat.hasard);
    expect(apres.hasardPlafond).not.toBe(etat.hasardPlafond);
    // À 5 rendez-vous, son quota est atteint.
    expect(quotaAtteint(apres, { ...apres.personnel[0]!, chargeCeSoir: 5 })).toBe(true);
  });

  it('une négociation acceptée : prime payée, ou soir de repos promis ; refusée, la personne s’arrête à 5', () => {
    const prime = jourOu({ fatigue: 50, moral: 60, traits: ['Ambitieuse'], loyaute: 100 }, (r) => r === 'negociePrime');
    const payee = appliquerOrdres(prime, [{ type: 'validerBriefing', rdvMax: 6, accords: { sanne: 'accepter' } }]).etat;
    expect(payee.tresorerie).toBe(prime.tresorerie - B.PLAFOND.prime);
    expect(payee.semaine.comptes.depenses.personnel).toBe(B.PLAFOND.prime);
    expect(payee.personnel[0]!.plafondCeSoir).toBeUndefined();
    const sansAccord = appliquerOrdres(prime, [{ type: 'validerBriefing', rdvMax: 6 }]).etat;
    expect(sansAccord.personnel[0]!.plafondCeSoir).toBe(5);
    expect(sansAccord.tresorerie).toBe(prime.tresorerie);

    const repos = jourOu({ fatigue: 50, moral: 60, traits: ['Mère poule'], loyaute: 100 }, (r) => r === 'negocieRepos');
    const promis = appliquerOrdres(repos, [{ type: 'validerBriefing', rdvMax: 6, accords: { sanne: 'accepter' } }]).etat;
    expect(promis.personnel[0]!.promesseRepos).toBe(repos.jour + B.ENTRETIEN.delaiPromesse);
    expect(promis.personnel[0]!.plafondCeSoir).toBeUndefined();
  });

  it('le plafond d’un soir s’efface au briefing suivant', () => {
    const etat = jourOu({ fatigue: 50, moral: 60, traits: [] }, (r) => r === 'refuse');
    const refuse = appliquerOrdres(etat, [{ type: 'validerBriefing', rdvMax: 6 }]).etat;
    const lendemain = appliquerOrdres({ ...refuse, jour: refuse.jour + 1 }, [{ type: 'validerBriefing', rdvMax: 4 }]).etat;
    expect(lendemain.personnel[0]!.plafondCeSoir).toBeUndefined();
  });

  it('chaque réplique a son texte, accordé, et dépend des traits', () => {
    const sanne = { prenom: 'Sanne', genre: 'f' as const, traits: ['Diva'] };
    const jonas = { prenom: 'Jonas', genre: 'm' as const, traits: [] };
    for (const r of ['refuse', 'negociePrime', 'negocieRepos'] as const) {
      for (let j = 0; j < 4; j++) {
        expect(repliquePlafond(r, sanne, j)).toContain('Sanne');
        expect(repliquePlafond(r, jonas, j)).not.toMatch(/fatiguée|sûre|vidée/);
      }
    }
    expect(repliquePlafond('refuse', sanne, 0)).not.toBe(repliquePlafond('refuse', { ...sanne, traits: [] }, 0));
  });
});

describe('garde d’équilibrage : le cran 6 en permanence', () => {
  const GRAINES = [1, 2, 3, 4, 5, 6];
  const moyenne = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;

  it('Sanne seule, sans repos : épuisée et le moral en berne en quelques nuits', () => {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 6, nuits: 7, recruter: false, renover: false, reposFatigue: 101 }));
    const epuisees = parties.filter((p) => p.nuits.slice(0, 5).some((n) => n.fatigueMax > B.SEUIL_EPUISEMENT)).length;
    expect(epuisees).toBeGreaterThanOrEqual(GRAINES.length - 1);
    expect(moyenne(parties.map((p) => p.nuits[6]!.moralMoyen))).toBeLessThan(30);
  });

  it('sur deux mois, le 6 permanent use l’équipe et ne rapporte pas plus que le 4 bien géré', () => {
    const dix = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const jouer = (rdvMax: number, reposFatigue?: number) => dix.map((graine) => simuler({ graine, offre: 'classique', rdvMax, nuits: 56, reposFatigue }));
    const six = jouer(6, 101);
    const quatre = jouer(4);
    const semaine8 = (ps: typeof six) => moyenne(ps.map((p) => moyenne(p.nuits.slice(49).map((n) => n.moralMoyen))));
    expect(semaine8(six)).toBeLessThan(35);
    expect(semaine8(six)).toBeLessThan(semaine8(quatre) - 30);
    expect(moyenne(six.map((p) => p.departs))).toBeGreaterThan(moyenne(quatre.map((p) => p.departs)) + 1);
    // Pas la stratégie dominante en argent : à peine au niveau du 4 au bout d'un mois, loin derrière au bout de deux.
    const tresorerie = (ps: typeof six, n: number) => moyenne(ps.map((p) => p.nuits[n - 1]!.tresorerie));
    expect(tresorerie(six, 35)).toBeLessThan(tresorerie(quatre, 35) * 1.15);
    expect(tresorerie(six, 56)).toBeLessThan(tresorerie(quatre, 56) * 0.75);
  }, 120_000);
});
