import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { barSert, qualiteBar } from './bar';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { formuleActive } from './regles';
import { arrivee, modeleClient } from './soiree';
import { appliquerOrdres, tick, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 9 }), jour: 5, minuteDuJour: h(22), briefingJour: 5, nuitsBouclees: 4, tresorerie: 5000 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  return { ...etat, annonces: [], visites: [], ...champs };
}

/** Une soirée au palier 2 avec le bar rouvert, tenu par une personne. */
function avecBar(champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat = partie(2, champs);
  etat.bar = { ouvert: true, travaux: null, stock: 30, commande: 0 };
  etat.equipes.bar = 1;
  return etat;
}

const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);
const rdv = (modele: string, formule: B.IdFormule = 'standard') => ({ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele, formule, duree: 60, restant: 5 });
const nuit = () => ({ numero: 5, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 15, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0, bar: 0 });

/** Avance jusqu'à l'heure dite, en validant les briefings. */
function jusqua(etat: EtatJeu, jour: number, minute: number) {
  const evenements: string[] = [];
  let e = etat;
  while (e.jour < jour || e.minuteDuJour !== minute) {
    const r = tick(e, e.minuteDuJour === h(19) && e.briefingJour !== e.jour ? [{ type: 'validerBriefing' }] : []);
    e = r.etat;
    evenements.push(...r.evenements.map((x) => x.type));
  }
  return { etat: e, evenements };
}

describe('rénovation du bar', () => {
  it('possible au palier 2 : 1 200 €, 8 h de travaux, puis quelques bouteilles de la cave', () => {
    expect(ordonner(partie(1, { minuteDuJour: h(9) }), { type: 'renoverBar' }).etat.bar.travaux).toBeNull();
    const { etat, evenements } = ordonner(partie(2, { minuteDuJour: h(9) }), { type: 'renoverBar' });
    expect(etat.tresorerie).toBe(5000 - B.RENOVATION_BAR.prix);
    expect(evenements[0]).toMatchObject({ type: 'debutTravauxBar', fin: h(17) });
    const fini = jusqua(etat, 5, h(17, 5));
    expect(fini.evenements).toContain('finTravauxBar');
    expect(fini.etat.bar).toMatchObject({ ouvert: true, travaux: null, stock: B.BAR_STOCK_REOUVERTURE });
  });

  it('refusée sans les moyens, ou si le bar est déjà ouvert', () => {
    expect(ordonner(partie(2, { tresorerie: 500 }), { type: 'renoverBar' }).etat.bar.travaux).toBeNull();
    const ouvert = avecBar();
    expect(ordonner(ouvert, { type: 'renoverBar' }).evenements).toEqual([]);
  });
});

describe('équipe Bar', () => {
  it('0 à 2 personnes, une fois le bar rouvert, payées à midi avec le ménage', () => {
    expect(ordonner(partie(2), { type: 'equipeBar', effectif: 1 }).etat.equipes.bar).toBe(0);
    const etat = avecBar({ minuteDuJour: h(11, 55) });
    expect(ordonner(etat, { type: 'equipeBar', effectif: 3 }).etat.equipes.bar).toBe(1);
    const deux = ordonner(etat, { type: 'equipeBar', effectif: 2 }).etat;
    const { evenements } = tick(deux);
    expect(evenements).toContainEqual({ type: 'salaires', montant: B.SALAIRE_MENAGE + 2 * B.SALAIRE_BAR });
  });

  it('sans personne derrière le comptoir, le bar ne sert pas', () => {
    const etat = avecBar();
    etat.equipes.bar = 0;
    expect(barSert(etat)).toBe(false);
    expect(qualiteBar(etat, 'groupe')).toBe(0);
  });
});

describe('ventes et stock', () => {
  it('chaque client reçu passe au bar : recette selon son segment, bouteilles bues', () => {
    const avant = avecBar({ rendezVous: [rdv('fetard')], nuit: nuit() });
    const apres = tick(avant).etat;
    expect(apres.nuit?.bar).toBe(B.BAR_RECETTE.groupe);
    expect(apres.bar.stock).toBeCloseTo(30 - B.BAR_CONSO.groupe);
    const sansBar = tick(partie(2, { rendezVous: [rdv('fetard')], nuit: nuit() })).etat;
    expect(apres.tresorerie - sansBar.tresorerie).toBeGreaterThanOrEqual(B.BAR_RECETTE.groupe);
    expect(sansBar.nuit?.bar).toBe(0);
  });

  it('un bar qui sert plaît, surtout aux groupes ; un bar vide les fâche et donne l’alerte', () => {
    const etat = avecBar();
    expect(qualiteBar(etat, 'groupe')).toBeGreaterThan(qualiteBar(etat, 'habitue'));
    etat.equipes.bar = 2;
    expect(qualiteBar(etat, 'groupe')).toBeCloseTo(B.BAR_QUALITE.groupe + B.BAR_DEUXIEME);
    const presqueVide = avecBar({ rendezVous: [rdv('fetard')], nuit: nuit() });
    presqueVide.bar.stock = 1;
    const { etat: vide, evenements } = tick(presqueVide);
    expect(vide.bar.stock).toBe(0);
    expect(evenements).toContainEqual({ type: 'barVide' });
    expect(qualiteBar(vide, 'groupe')).toBeLessThan(0);
  });

  it('commande au briefing livrée à l’ouverture, livraison express en soirée', () => {
    const briefing = avecBar({ minuteDuJour: h(19), briefingJour: 4 });
    const commande = ordonner(briefing, { type: 'validerBriefing', commanderBar: true }).etat;
    expect(commande.tresorerie).toBe(5000 - B.COMMANDE_BAR.prix);
    expect(commande.bar.commande).toBe(B.COMMANDE_BAR.bouteilles);
    const ouverture = jusqua(commande, 5, h(20, 5)).etat;
    expect(ouverture.bar).toMatchObject({ stock: 30 + B.COMMANDE_BAR.bouteilles, commande: 0 });
    const express = ordonner(avecBar(), { type: 'livraisonBar' }).etat;
    expect(express.bar.stock).toBe(30 + B.LIVRAISON_EXPRESS_BAR.bouteilles);
    expect(express.tresorerie).toBe(5000 - B.LIVRAISON_EXPRESS_BAR.prix);
  });

  it('sur le quai, on patiente mieux quand le bar sert', () => {
    const patience = (etat: EtatJeu) => {
      const copie: EtatJeu = { ...structuredClone(etat), file: [] };
      arrivee(copie, creerTirage(2), { push: () => 0 });
      const c = copie.file[0]!;
      return c.patience - (modeleClient(c.modele).patience ?? B.PATIENCE_CLIENT);
    };
    expect(patience(avecBar()) - patience(partie(2))).toBe(B.BAR_PATIENCE);
  });
});

describe('formule champagne', () => {
  it('seulement avec un bar qui sert ; sinon, un rendez-vous classique', () => {
    const choisir = (etat: EtatJeu) => ordonner(etat, { type: 'regle', regle: 'formule', valeur: 'champagne' }).etat;
    expect(choisir(partie(2)).regles.formule).toBe('standard');
    const etat = choisir(avecBar());
    expect(formuleActive(etat)).toBe('champagne');
    etat.bar.stock = 0;
    expect(formuleActive(etat)).toBe('standard');
  });

  it('la bouteille sort du bar, et le rendez-vous se paie plus cher', () => {
    const encaisse = (formule: B.IdFormule) => {
      const avant = avecBar({ rendezVous: [rdv('banquier', formule)], nuit: nuit() });
      const apres = tick(avant).etat;
      return { gain: apres.tresorerie - avant.tresorerie, stock: apres.bar.stock };
    };
    const classique = encaisse('standard');
    const champagne = encaisse('champagne');
    expect(champagne.gain).toBeGreaterThan(classique.gain);
    expect(classique.stock - champagne.stock).toBeCloseTo(B.CHAMPAGNE_BOUTEILLES);
  });
});

describe('avance du grossiste', () => {
  /** Le bar vient de rouvrir : le grossiste passe le lendemain à 11 h. */
  function barRouvert(): EtatJeu {
    const etat = partie(2, { minuteDuJour: h(9) });
    const travaux = ordonner(etat, { type: 'renoverBar' }).etat;
    return jusqua(travaux, 5, h(18)).etat;
  }

  it('le grossiste passe le lendemain de la réouverture, à 11 h, une seule fois', () => {
    const { etat, evenements } = jusqua(barRouvert(), 6, B.AVANCE_FOURNISSEUR.heure);
    expect(evenements.filter((e) => e === 'grossiste')).toHaveLength(1);
    expect(etat.avance.statut).toBe('proposee');
  });

  it('accepter : du stock sans payer, remboursé avec 10 % au bout de 14 jours', () => {
    const offre = jusqua(barRouvert(), 6, B.AVANCE_FOURNISSEUR.heure).etat;
    const stock = offre.bar.stock;
    const tresorerie = offre.tresorerie;
    const { etat } = ordonner(offre, { type: 'avanceFournisseur', accepter: true });
    expect(etat.bar.stock).toBe(stock + B.AVANCE_FOURNISSEUR.bouteilles);
    expect(etat.tresorerie).toBe(tresorerie);
    expect(etat.avance).toMatchObject({ statut: 'acceptee', echeance: 6 + B.AVANCE_FOURNISSEUR.jours, montant: 1650 });
    const veille = { ...etat, jour: 19, minuteDuJour: h(4, 55), briefingJour: 19 };
    const r = tick(veille);
    expect(r.evenements).toContainEqual({ type: 'remboursementAvance', montant: 1650 });
    expect(r.etat.avance.statut).toBe('remboursee');
  });

  it('refuser : rien ne change, et il ne repasse pas', () => {
    const offre = jusqua(barRouvert(), 6, B.AVANCE_FOURNISSEUR.heure).etat;
    const { etat } = ordonner(offre, { type: 'avanceFournisseur', accepter: false });
    expect(etat.avance.statut).toBe('refusee');
    expect(etat.bar.stock).toBe(offre.bar.stock);
    expect(jusqua(etat, 8, h(12)).evenements).not.toContain('grossiste');
  });
});
