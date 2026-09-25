import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import type { Offre } from '../content/clientele';
import { creerEtatInitial, type EtatJeu } from './etat';
import { gainReputation, heureDeInstant, instant, jourProchaineMensualite, NOMBRE_MENSUALITES } from './soiree';
import { appliquerOrdres, tick, TAILLE_JOURNAL, type EvenementMoteur, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie à une heure donnée, briefing du jour déjà validé. */
function partieA(minuteDuJour: number, champs: Partial<EtatJeu> = {}, jour = 1): EtatJeu {
  return { ...creerEtatInitial({ graine: 7 }), jour, minuteDuJour, briefingJour: jour, ...champs };
}

/** Partie arrivée au palier 1, en pleine journée. */
function auPalier1(champs: Partial<EtatJeu> = {}): EtatJeu {
  const base = creerEtatInitial({ graine: 7 });
  return partieA(h(10), {
    palier: 1,
    nuitsBouclees: 1,
    systemes: { ...base.systemes, recrutement: true, renovation: true, planning: true, reserve: true },
    ...champs,
  }, 2);
}

function ordonner(etat: EtatJeu, ordre: Ordre) {
  return appliquerOrdres(etat, [ordre]);
}

/** Enchaîne n ticks en validant le briefing dès qu'il est demandé. */
function avancer(etat: EtatJeu, n: number, briefing: Ordre = { type: 'validerBriefing' }) {
  const evenements: EvenementMoteur[] = [];
  let courant = etat;
  for (let i = 0; i < n; i++) {
    const r = tick(courant);
    evenements.push(...r.evenements);
    courant = r.evenements.some((e) => e.type === 'briefing') ? appliquerOrdres(r.etat, [briefing]).etat : r.etat;
  }
  return { etat: courant, evenements };
}

describe('paliers', () => {
  it('le palier 1 tombe à la fermeture de la première nuit, après le bilan', () => {
    const { etat, evenements } = tick(partieA(h(3, 55)));
    expect(etat.palier).toBe(1);
    expect(etat.systemes).toMatchObject({ recrutement: true, renovation: true, planning: true, reserve: true });
    expect(etat.annonces).toEqual([1]);
    const types = evenements.map((e) => e.type);
    expect(types.indexOf('palier')).toBeGreaterThan(types.indexOf('bilan'));
  });

  it('rien ne s’ouvre avant la fin de la première nuit', () => {
    const { etat } = avancer(partieA(h(20)), 12 * 5);
    expect(etat.palier).toBe(0);
    expect(etat.systemes.recrutement).toBe(false);
    expect(etat.annonces).toEqual([]);
  });

  it('le palier 1 n’est accordé qu’une fois', () => {
    const premier = tick(partieA(h(3, 55))).etat;
    const vue = ordonner(premier, { type: 'annonceVue' }).etat;
    const second = tick({ ...vue, jour: 3, minuteDuJour: h(3, 55), briefingJour: 3 });
    expect(second.etat.palier).toBe(1);
    expect(second.etat.annonces).toEqual([]);
    expect(second.evenements.some((e) => e.type === 'palier')).toBe(false);
  });

  it('une annonce vue quitte la file d’attente', () => {
    const etat = ordonner(partieA(h(10), { annonces: [1] }), { type: 'annonceVue' }).etat;
    expect(etat.annonces).toEqual([]);
  });
});

describe('rénovation des chambres', () => {
  it('reste fermée avant le palier 1', () => {
    const avant = partieA(h(10));
    const { etat } = ordonner(avant, { type: 'renover', chambreId: 'orientale' });
    expect(etat.tresorerie).toBe(avant.tresorerie);
    expect(etat.chambres.find((c) => c.id === 'orientale')?.travaux).toBeNull();
  });

  it('coûte 900 € et dure 8 h, puis la chambre rouvre propre', () => {
    const avant = auPalier1();
    const { etat, evenements } = ordonner(avant, { type: 'renover', chambreId: 'orientale' });
    expect(etat.tresorerie).toBe(avant.tresorerie - B.RENOVATION.prix);
    const chambre = etat.chambres.find((c) => c.id === 'orientale')!;
    expect(chambre.travaux).toBe(instant(avant) + B.RENOVATION.heures * 60);
    expect(evenements).toContainEqual({ type: 'debutTravaux', chambreId: 'orientale', montant: 900, fin: h(18) });

    const presque = avancer(etat, (B.RENOVATION.heures * 60) / B.MINUTES_PAR_TICK - 1).etat;
    expect(presque.chambres.find((c) => c.id === 'orientale')?.ouverte).toBe(false);
    const fini = tick(presque);
    const rouverte = fini.etat.chambres.find((c) => c.id === 'orientale')!;
    expect(rouverte).toMatchObject({ ouverte: true, travaux: null, proprete: B.PROPRETE_APRES_TRAVAUX, etat: B.ETAT_APRES_TRAVAUX });
    expect(fini.evenements).toContainEqual({ type: 'finTravaux', chambreId: 'orientale' });
  });

  it('refuse sans assez d’argent, sur une chambre déjà ouverte ou déjà en travaux', () => {
    const pauvre = auPalier1({ tresorerie: B.RENOVATION.prix - 1 });
    expect(ordonner(pauvre, { type: 'renover', chambreId: 'velours' }).etat.tresorerie).toBe(pauvre.tresorerie);
    const riche = auPalier1();
    expect(ordonner(riche, { type: 'renover', chambreId: 'boudoir' }).etat.tresorerie).toBe(riche.tresorerie);
    const enTravaux = ordonner(riche, { type: 'renover', chambreId: 'velours' }).etat;
    expect(ordonner(enTravaux, { type: 'renover', chambreId: 'velours' }).etat.tresorerie).toBe(enTravaux.tresorerie);
  });

  it('une chambre en travaux ne reçoit personne et n’est pas nettoyée', () => {
    const chambres = creerEtatInitial().chambres.map((c) =>
      c.id === 'boudoir' ? { ...c, ouverte: false, travaux: 99999, proprete: 10 } : c,
    );
    const { etat } = tick(partieA(h(21), { chambres, file: [{ id: 1, modele: 'poete', patience: 50 }] }));
    expect(etat.rendezVous).toHaveLength(0);
    expect(etat.chambres.find((c) => c.id === 'boudoir')?.proprete).toBe(10);
  });

  it('donne l’heure de fin des travaux', () => {
    expect(heureDeInstant(0)).toBe(h(5));
    expect(heureDeInstant(24 * 60 + h(2))).toBe(h(7));
  });
});

describe('équipe de ménage', () => {
  it('passe à 2 personnes au palier 1, pas avant, et jamais au-delà du maximum', () => {
    expect(ordonner(partieA(h(10)), { type: 'equipeMenage', effectif: 2 }).etat.equipes.menage).toBe(1);
    const deux = ordonner(auPalier1(), { type: 'equipeMenage', effectif: 2 }).etat;
    expect(deux.equipes.menage).toBe(2);
    expect(ordonner(deux, { type: 'equipeMenage', effectif: B.MENAGE_MAX + 1 }).etat.equipes.menage).toBe(2);
    expect(ordonner(deux, { type: 'equipeMenage', effectif: 0 }).etat.equipes.menage).toBe(2);
  });

  it('deux personnes nettoient deux fois plus, et coûtent deux salaires', () => {
    const sale = (menage: number) =>
      auPalier1({
        minuteDuJour: h(11, 55),
        equipes: { menage },
        chambres: creerEtatInitial().chambres.map((c) => ({ ...c, ouverte: true, proprete: 20 })),
      });
    const un = tick(sale(1)).etat;
    const deux = tick(sale(2)).etat;
    const total = (e: EtatJeu) => e.chambres.reduce((s, c) => s + c.proprete, 0) - 80;
    expect(total(deux)).toBeCloseTo(2 * total(un));
    expect(sale(2).tresorerie - deux.tresorerie).toBe(2 * B.SALAIRE_MENAGE);
  });
});

describe('réserve de sécurité', () => {
  const nuit = { numero: 2, recettes: 500, partPersonnel: 500, depenses: 0, servis: 3, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0 };

  it('ne se règle pas avant le palier 1', () => {
    expect(ordonner(partieA(h(10)), { type: 'tauxReserve', taux: 0.2 }).etat.tauxReserve).toBe(0);
  });

  it('refuse un taux hors des crans prévus', () => {
    expect(ordonner(auPalier1(), { type: 'tauxReserve', taux: 0.5 }).etat.tauxReserve).toBe(0);
  });

  it('met de côté une part de la recette du soir à la fermeture', () => {
    const regle = ordonner(auPalier1(), { type: 'tauxReserve', taux: 0.2 }).etat;
    const avant = { ...regle, minuteDuJour: h(3, 55), briefingJour: 2, nuit };
    const { etat, evenements } = tick(avant);
    expect(etat.reserve).toBe(100);
    expect(etat.tresorerie).toBe(avant.tresorerie - 100);
    expect(evenements).toContainEqual({ type: 'miseEnReserve', montant: 100 });
    const bilan = evenements.find((e) => e.type === 'bilan');
    expect(bilan && bilan.type === 'bilan' ? bilan.nuit.reserve : 0).toBe(100);
  });

  it('ne met rien de côté à 0 %', () => {
    const avant = auPalier1({ minuteDuJour: h(3, 55), nuit });
    expect(tick(avant).etat.reserve).toBe(0);
  });

  it('reprendre la réserve hors urgence vaut une remarque, pas en cas de découvert', () => {
    const horsUrgence = ordonner(auPalier1({ reserve: 300, tresorerie: 1000 }), { type: 'retirerReserve' });
    expect(horsUrgence.etat).toMatchObject({ reserve: 0, tresorerie: 1300 });
    expect(horsUrgence.evenements).toContainEqual({ type: 'retraitReserve', montant: 300, urgence: false });
    const urgence = ordonner(auPalier1({ reserve: 300, tresorerie: -50 }), { type: 'retirerReserve' });
    expect(urgence.evenements).toContainEqual({ type: 'retraitReserve', montant: 300, urgence: true });
  });
});

describe('mensualité de l’emprunt', () => {
  it('tombe le jour 28, puis tous les 28 jours', () => {
    expect(jourProchaineMensualite(creerEtatInitial())).toBe(28);
    expect(jourProchaineMensualite({ ...creerEtatInitial(), mensualitesPayees: 1 })).toBe(56);
    expect(jourProchaineMensualite({ ...creerEtatInitial(), mensualitesPayees: NOMBRE_MENSUALITES })).toBeNull();
  });

  it('se paie d’abord avec la réserve, puis avec la trésorerie', () => {
    const avant = partieA(h(4, 55), { reserve: 1000, tresorerie: 5000 }, 27);
    const { etat, evenements } = tick(avant);
    expect(etat.jour).toBe(28);
    expect(etat.reserve).toBe(0);
    expect(etat.tresorerie).toBe(5000 - (B.MENSUALITE - 1000));
    expect(etat.mensualitesPayees).toBe(1);
    expect(evenements).toContainEqual({
      type: 'mensualite',
      montant: B.MENSUALITE,
      depuisReserve: 1000,
      restantes: NOMBRE_MENSUALITES - 1,
    });
  });

  it('une grosse réserve garde le reste', () => {
    const { etat } = tick(partieA(h(4, 55), { reserve: 3000, tresorerie: 100 }, 27));
    expect(etat.reserve).toBe(500);
    expect(etat.tresorerie).toBe(100);
  });

  it('ne se paie pas les autres jours', () => {
    const { etat } = tick(partieA(h(4, 55), { reserve: 1000 }, 26));
    expect(etat.reserve).toBe(1000);
    expect(etat.mensualitesPayees).toBe(0);
  });
});

describe('journal sauvegardé', () => {
  it('garde les événements dans l’état, du plus récent au plus ancien', () => {
    const { etat } = avancer(partieA(h(19, 55)), 2);
    expect(etat.journal[0]?.evenement.type).not.toBe('ouverture');
    expect(etat.journal.map((e) => e.evenement.type)).toContain('ouverture');
    expect(etat.journal[etat.journal.length - 1]?.minuteDuJour).toBe(h(20));
  });

  it('garde aussi les ordres du joueur, sans le bilan', () => {
    const { etat } = ordonner(partieA(h(21)), { type: 'livraisonLinge' });
    expect(etat.journal[0]?.evenement).toEqual({ type: 'livraisonLinge', montant: B.LIVRAISON_EXPRESS_LINGE.prix });
    const fermeture = tick(partieA(h(3, 55))).etat;
    expect(fermeture.journal.some((e) => e.evenement.type === 'bilan')).toBe(false);
  });

  it(`ne dépasse pas ${TAILLE_JOURNAL} lignes`, () => {
    const { etat } = avancer(partieA(h(20)), 12 * 30);
    expect(etat.journal.length).toBeLessThanOrEqual(TAILLE_JOURNAL);
  });

  it('n’inscrit pas deux fois un briefing en attente', () => {
    const arrive = tick(partieA(h(18, 55), { briefingJour: 0 })).etat;
    const bloque = tick(tick(arrive).etat).etat;
    expect(bloque.journal.filter((e) => e.evenement.type === 'briefing')).toHaveLength(1);
  });
});

describe('réputation', () => {
  it('les gains ralentissent quand la réputation monte, pas les pertes', () => {
    expect(gainReputation(20, 0.9)).toBeGreaterThan(gainReputation(50, 0.9));
    expect(gainReputation(50, 0.9)).toBeGreaterThan(0);
    expect(gainReputation(20, 0.2)).toBeCloseTo(gainReputation(80, 0.2));
    expect(gainReputation(20, 0.2)).toBeLessThan(0);
  });

  /** Joue n nuits avec Sanne seule, nettoyage express dès l'alerte, et renvoie la réputation à chaque fermeture. */
  function nuits(graine: number, offre: Offre, n: number): number[] {
    let etat = creerEtatInitial({ graine });
    const reputations: number[] = [];
    while (reputations.length < n) {
      const sale = etat.chambres.some((c) => c.id === 'boudoir' && c.proprete < B.SEUIL_CHAMBRE_SALE);
      const r = tick(etat, sale ? [{ type: 'nettoyageExpress', chambreId: 'boudoir' }] : []);
      etat = r.etat;
      if (r.evenements.some((e) => e.type === 'briefing')) {
        etat = appliquerOrdres(etat, [{ type: 'validerBriefing', offre, commanderLinge: true }]).etat;
      }
      if (r.evenements.some((e) => e.type === 'bilan')) reputations.push(etat.reputation);
    }
    return reputations;
  }

  it('avec Sanne seule, même en soirée feutrée, la réputation 25 n’arrive pas avant la nuit 4', () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const r = nuits(graine, 'feutree', 3);
      expect(r[2]).toBeLessThan(25);
    }
  });

  it('une maison bien tenue gagne en réputation sur la première semaine', () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const r = nuits(graine, 'feutree', 7);
      expect(r[6]).toBeGreaterThan(B.REPUTATION_INITIALE + 5);
    }
  });
});
