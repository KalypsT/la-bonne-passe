import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { alertes } from './alertes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { qualiteRdv } from './soiree';
import { instant } from './temps';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie briefée, à une heure donnée. */
function partieA(minuteDuJour: number, modifs: Partial<EtatJeu> = {}): EtatJeu {
  return { ...creerEtatInitial({ graine: 7 }), minuteDuJour, briefingJour: 1, ...modifs };
}

/** Enchaîne des ticks jusqu'à une heure, en validant les briefings. */
function jusqua(etat: EtatJeu, minute: number, ordresBriefing: Ordre[] = [{ type: 'validerBriefing' }]) {
  const evenements: EvenementMoteur[] = [];
  let courant = etat;
  let garde = 0;
  do {
    const r = tick(courant);
    evenements.push(...r.evenements);
    courant = r.evenements.some((e) => e.type === 'briefing') ? appliquerOrdres(r.etat, ordresBriefing).etat : r.etat;
  } while (courant.minuteDuJour !== minute && ++garde < 2000);
  return { etat: courant, evenements };
}

function ordre(etat: EtatJeu, o: Ordre) {
  return appliquerOrdres(etat, [o]);
}

describe('ouverture de la nuit', () => {
  it('prépare la nuit : comptes à zéro et linge commandé livré', () => {
    const avant = partieA(h(19, 55), { lingeCommande: 50 });
    const { etat } = tick(avant);
    expect(etat.nuit).toMatchObject({ numero: 1, recettes: 0, servis: 0, perdus: 0 });
    expect(etat.linge).toBe(B.LINGE_INITIAL + 50);
    expect(etat.lingeCommande).toBe(0);
  });

  it('le briefing fixe l’offre du soir et commande le linge', () => {
    const { etat } = ordre(creerEtatInitial(), { type: 'validerBriefing', offre: 'happy', commanderLinge: true });
    expect(etat.offre).toBe('happy');
    expect(etat.lingeCommande).toBe(B.COMMANDE_LINGE.draps);
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.COMMANDE_LINGE.prix);
  });
});

describe('clients et rendez-vous', () => {
  it('la première soirée amène un premier client, reçu par Sanne au Boudoir', () => {
    const { etat, evenements } = jusqua(partieA(h(19, 55)), h(20, B.PREMIER_CLIENT_APRES));
    expect(evenements.some((e) => e.type === 'arrivee')).toBe(true);
    expect(evenements.find((e) => e.type === 'debutRdv')).toMatchObject({ chambreId: 'boudoir', employeId: 'sanne' });
    expect(etat.rendezVous).toHaveLength(1);
    expect(etat.file).toHaveLength(0);
  });

  it('un rendez-vous terminé rapporte la part de la maison et use la chambre, le linge et Sanne', () => {
    const avant = partieA(h(21), {
      rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 5 }],
      nuit: { numero: 1, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    });
    const { etat, evenements } = tick(avant);
    const fin = evenements.find((e) => e.type === 'finRdv');
    expect(fin).toBeDefined();
    const montant = fin && fin.type === 'finRdv' ? fin.montant : 0;
    expect(montant).toBeGreaterThan(0);
    expect(etat.tresorerie).toBe(avant.tresorerie + montant);
    expect(etat.nuit?.recettes).toBe(montant);
    // Sanne garde 50 %, à l'arrondi près.
    expect(Math.abs((etat.nuit?.partPersonnel ?? 0) - montant)).toBeLessThanOrEqual(1);
    expect(etat.nuit?.servis).toBe(1);
    expect(etat.linge).toBe(avant.linge - B.LINGE_PAR_RDV);
    const boudoir = etat.chambres.find((c) => c.id === 'boudoir')!;
    expect(boudoir.proprete).toBeLessThan(B.PROPRETE_CHAMBRE_OUVERTE - B.SALISSURE_MIN + 1);
    const sanne = etat.personnel[0]!;
    expect(sanne.fatigue).toBeGreaterThan(avant.personnel[0]!.fatigue);
    expect(sanne.rdvCeSoir).toBe(1);
    expect(sanne.chargeCeSoir).toBe(1);
    expect(etat.nuit?.meilleurAvis?.client).toBe('Le retraité fidèle');
  });

  it('un client trop longtemps sur le quai repart, et la réputation baisse', () => {
    const etat0 = partieA(h(21), {
      file: [{ id: 9, modele: 'poete', patience: 5 }],
      rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 60 }],
      nuit: { numero: 1, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    });
    const { etat, evenements } = tick(etat0);
    expect(evenements).toContainEqual({ type: 'clientParti', client: 'Le poète fauché' });
    expect(etat.file.find((c) => c.id === 9)).toBeUndefined();
    expect(etat.nuit?.perdus).toBe(1);
    expect(etat.reputation).toBeLessThan(etat0.reputation);
  });

  it('une chambre trop sale ne reçoit plus personne', () => {
    const chambres = creerEtatInitial().chambres.map((c) =>
      c.id === 'boudoir' ? { ...c, proprete: B.SEUIL_CHAMBRE_INUTILISABLE - 5 } : c,
    );
    const { etat } = tick(partieA(h(21), { chambres, equipes: { menage: 0 }, file: [{ id: 3, modele: 'etudiant', patience: 50 }] }));
    expect(etat.rendezVous).toHaveLength(0);
    expect(etat.file.map((c) => c.id)).toContain(3);
  });

  it('Sanne au repos ou à son maximum de rendez-vous ne reçoit plus', () => {
    const file = [{ id: 3, modele: 'etudiant', patience: 50 }];
    const auRepos = partieA(h(21), { file, personnel: creerEtatInitial().personnel.map((e) => ({ ...e, repos: true })) });
    expect(tick(auRepos).etat.rendezVous).toHaveLength(0);
    const auMax = partieA(h(21), {
      file,
      personnel: creerEtatInitial().personnel.map((e) => ({ ...e, rdvCeSoir: B.RDV_MAX_PAR_SOIR, chargeCeSoir: B.RDV_MAX_PAR_SOIR })),
    });
    expect(tick(auMax).etat.rendezVous).toHaveLength(0);
  });

  it('aucun rendez-vous ne commence juste avant la fermeture', () => {
    const { etat } = tick(partieA(h(3, 30), { file: [{ id: 3, modele: 'etudiant', patience: 50 }] }));
    expect(etat.rendezVous).toHaveLength(0);
  });

  it('au-delà de 4 personnes sur le quai, le client repart aussitôt', () => {
    const file = [1, 2, 3, 4].map((id) => ({ id, modele: ['etudiant', 'poete', 'retraite', 'influenceur'][id - 1]!, patience: 50 }));
    let etat = partieA(h(21), {
      file,
      personnel: creerEtatInitial().personnel.map((e) => ({ ...e, repos: true })),
      nuit: { numero: 1, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    });
    let pleine = false;
    for (let i = 0; i < 40 && !pleine; i++) {
      const r = tick({ ...etat, file, dispute: null });
      pleine = r.evenements.some((e) => e.type === 'filePleine');
      etat = r.etat;
    }
    expect(pleine).toBe(true);
    expect(etat.nuit?.perdus).toBeGreaterThan(0);
  });
});

describe('qualité d’un rendez-vous', () => {
  it('baisse avec la fatigue, la saleté et le manque de linge', () => {
    const base = partieA(h(21));
    const q = qualiteRdv(base, 'boudoir', 'sanne', 'retraite');
    const fatiguee = { ...base, personnel: base.personnel.map((e) => ({ ...e, fatigue: 90 })) };
    const sale = { ...base, chambres: base.chambres.map((c) => ({ ...c, proprete: 20 })) };
    const sansLinge = { ...base, linge: 0 };
    expect(qualiteRdv(fatiguee, 'boudoir', 'sanne', 'retraite')).toBeLessThan(q);
    expect(qualiteRdv(sale, 'boudoir', 'sanne', 'retraite')).toBeLessThan(q);
    expect(qualiteRdv(sansLinge, 'boudoir', 'sanne', 'retraite')).toBeLessThan(q);
  });

  it('Sanne, excellente en conversation, plaît davantage à qui en cherche', () => {
    const base = partieA(h(21));
    // Le retraité attend de la conversation (5), le poète du charme (3).
    expect(qualiteRdv(base, 'boudoir', 'sanne', 'retraite')).toBeGreaterThan(qualiteRdv(base, 'boudoir', 'sanne', 'poete'));
  });
});

describe('actions du joueur', () => {
  it('le nettoyage express remet la chambre à neuf pour 30 €', () => {
    const chambres = creerEtatInitial().chambres.map((c) => (c.id === 'boudoir' ? { ...c, proprete: 30 } : c));
    const { etat, evenements } = ordre(partieA(h(22), { chambres }), { type: 'nettoyageExpress', chambreId: 'boudoir' });
    expect(etat.chambres.find((c) => c.id === 'boudoir')?.proprete).toBe(100);
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.NETTOYAGE_EXPRESS);
    expect(evenements).toEqual([{ type: 'nettoyage', chambreId: 'boudoir', montant: B.NETTOYAGE_EXPRESS }]);
  });

  it('pas de nettoyage pendant un rendez-vous ni dans une chambre fermée', () => {
    const rdv = [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 30 }];
    const occupee = partieA(h(22), { rendezVous: rdv });
    expect(ordre(occupee, { type: 'nettoyageExpress', chambreId: 'boudoir' }).etat.tresorerie).toBe(B.TRESORERIE_INITIALE);
    expect(ordre(partieA(h(22)), { type: 'nettoyageExpress', chambreId: 'velours' }).etat.tresorerie).toBe(B.TRESORERIE_INITIALE);
  });

  it('la livraison express apporte 50 draps pour 90 €', () => {
    const { etat } = ordre(partieA(h(22), { linge: 0 }), { type: 'livraisonLinge' });
    expect(etat.linge).toBe(B.LIVRAISON_EXPRESS_LINGE.draps);
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.LIVRAISON_EXPRESS_LINGE.prix);
  });

  it('mettre Sanne au repos pour la nuit', () => {
    const { etat } = ordre(partieA(h(22)), { type: 'repos', employeId: 'sanne' });
    expect(etat.personnel[0]?.repos).toBe(true);
  });
});

describe('dispute sur le quai', () => {
  it('dégénère si on l’ignore : casse et réputation', () => {
    const debut = partieA(h(22));
    const etat0 = { ...debut, dispute: { expire: instant(debut) + 5 } };
    const { etat, evenements } = tick(etat0);
    expect(evenements).toContainEqual({ type: 'disputeDegeneree', montant: B.DISPUTE_CASSE });
    expect(etat.dispute).toBeNull();
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.DISPUTE_CASSE);
    expect(etat.reputation).toBeCloseTo(B.REPUTATION_INITIALE - B.DISPUTE_REPUTATION);
  });

  it('un verre offert calme tout le monde pour 40 €', () => {
    const debut = partieA(h(22));
    const { etat } = ordre({ ...debut, dispute: { expire: instant(debut) + 30 } }, { type: 'regleDispute', choix: 'verre' });
    expect(etat.dispute).toBeNull();
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.DISPUTE_VERRE_OFFERT);
  });

  it('descendre calmer le jeu est gratuit, mais peut coûter un point de réputation', () => {
    const debut = partieA(h(22));
    const { etat, evenements } = ordre({ ...debut, dispute: { expire: instant(debut) + 30 } }, { type: 'regleDispute', choix: 'calmer' });
    expect(etat.dispute).toBeNull();
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE);
    const r = evenements[0];
    expect(r?.type).toBe('disputeReglee');
    if (r?.type === 'disputeReglee' && !r.reussite) expect(etat.reputation).toBe(B.REPUTATION_INITIALE - 1);
  });
});

describe('ménage, personnel et dépenses', () => {
  it('le ménage nettoie trois fois plus vite maison fermée', () => {
    // Sanne au repos : aucun rendez-vous ne vient salir la chambre pendant la mesure.
    const sale = (m: number) =>
      partieA(m, {
        chambres: creerEtatInitial().chambres.map((c) => (c.id === 'boudoir' ? { ...c, proprete: 50 } : c)),
        personnel: creerEtatInitial().personnel.map((e) => ({ ...e, repos: true })),
      });
    const gainOuvert = tick(sale(h(22))).etat.chambres[0]!.proprete - 50;
    const gainFerme = tick(sale(h(10))).etat.chambres[0]!.proprete - 50;
    expect(gainFerme / gainOuvert).toBeCloseTo(B.MENAGE_MAISON_FERMEE / B.MENAGE_MAISON_OUVERTE);
  });

  it('Sanne récupère au repos et perd du moral quand elle est épuisée', () => {
    const fatiguee = partieA(h(10), { personnel: creerEtatInitial().personnel.map((e) => ({ ...e, fatigue: 90 })) });
    const apres = tick(fatiguee).etat.personnel[0]!;
    expect(apres.fatigue).toBeLessThan(90);
    expect(apres.moral).toBeLessThan(fatiguee.personnel[0]!.moral);
  });

  it('les salaires du ménage tombent à midi', () => {
    const { etat, evenements } = tick(partieA(h(11, 55)));
    expect(evenements).toContainEqual({ type: 'salaires', montant: B.SALAIRE_MENAGE });
    expect(etat.tresorerie).toBe(B.TRESORERIE_INITIALE - B.SALAIRE_MENAGE);
  });

  it('les charges fixes tombent chaque lundi, pas le premier', () => {
    const lundi = tick({ ...partieA(h(4, 55)), jour: 7, briefingJour: 7 });
    expect(lundi.etat.jour).toBe(8);
    expect(lundi.evenements).toContainEqual({ type: 'charges', montant: B.CHARGES_FIXES });
    const mardi = tick(partieA(h(4, 55)));
    expect(mardi.evenements.some((e) => e.type === 'charges')).toBe(false);
  });
});

describe('fermeture et bilan', () => {
  it('termine les rendez-vous, vide le quai et produit le bilan', () => {
    const avant = partieA(h(3, 55), {
      file: [{ id: 5, modele: 'poete', patience: 40 }],
      rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 4, modele: 'retraite', formule: 'standard' as const, duree: 60, restant: 40 }],
      nuit: { numero: 1, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    });
    const { etat, evenements } = tick(avant);
    expect(etat.rendezVous).toHaveLength(0);
    expect(etat.file).toHaveLength(0);
    expect(etat.nuitsBouclees).toBe(1);
    const bilan = evenements.find((e) => e.type === 'bilan');
    expect(bilan && bilan.type === 'bilan' && bilan.nuit.servis).toBe(1);
  });

  it('une nuit complète se rejoue à l’identique avec la même graine', () => {
    const nuit = (graine: number) => jusqua(creerEtatInitial({ graine }), h(5)).etat;
    expect(nuit(11)).toEqual(nuit(11));
    const a = nuit(11);
    expect(a.nuitsBouclees).toBe(1);
    expect(a.nuit?.servis).toBeGreaterThan(0);
  });

  it('sur 20 graines, une première nuit de Sanne seule rapporte quelque chose sans l’épuiser', () => {
    for (let graine = 1; graine <= 20; graine++) {
      const { etat } = jusqua(creerEtatInitial({ graine }), h(5));
      const nuit = etat.nuit!;
      expect(nuit.servis).toBeGreaterThanOrEqual(1);
      expect(nuit.servis).toBeLessThanOrEqual(B.RDV_MAX_PAR_SOIR);
      expect(nuit.recettes).toBeGreaterThan(0);
    }
  });
});

describe('alertes', () => {
  it('signale chambre sale, linge épuisé, épuisement et dispute', () => {
    const debut = partieA(h(22));
    const etat: EtatJeu = {
      ...debut,
      linge: 0,
      chambres: debut.chambres.map((c) => (c.id === 'boudoir' ? { ...c, proprete: 10 } : c)),
      personnel: debut.personnel.map((e) => ({ ...e, fatigue: 85 })),
      dispute: { expire: instant(debut) + 20 },
    };
    expect(alertes(etat)).toEqual([
      { type: 'chambreSale', chambreId: 'boudoir', inutilisable: true },
      { type: 'linge' },
      { type: 'epuisement', employeId: 'sanne' },
      { type: 'dispute', restant: 20, total: B.DISPUTE_DELAI },
    ]);
  });

  it('aucune alerte au calme', () => {
    expect(alertes(partieA(h(22)))).toEqual([]);
  });
});
