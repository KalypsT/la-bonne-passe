import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { avoirNet } from './banque';
import { creerEtatInitial, creerEmploye, type EtatJeu } from './etat';
import { MILA, JONAS, INES } from '../content/candidats';
import { partReglee, patienceAccueil } from './equipes';
import { facteurMenage, fourchettePlacement, prixConfort, prochainConfort, qualiteGamme } from './gamme';
import { accorderPalier, verifierPaliers } from './paliers';
import { prochainClient } from './regles';
import { modeleClient } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function auPalier(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 61 }), jour: 44, minuteDuJour: h(10), briefingJour: 44, nuitsBouclees: 43, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  if (palier >= 4) {
    etat.systemes.formations = true;
    etat.systemes.placement = true;
  }
  return { ...etat, annonces: [], visites: [], candidats: [], tresorerie: 20000, ...champs };
}
/** Une candidate scénarisée, telle qu'embauchée (part, moral et loyauté ordinaires). */
const embauche = (def: typeof MILA) => creerEmploye({ ...def, part: 0.5, moral: 70, loyaute: 60, fatigue: 0 });
const ordre = (e: EtatJeu, o: Parameters<typeof appliquerOrdres>[1][number]) => appliquerOrdres(e, [o]);

describe('palier 4, « Monter en gamme »', () => {
  it('s’atteint avec 50 de réputation et 4 personnes ; VIP et couples partent de la réputation acquise', () => {
    const e = auPalier(3);
    e.reputation = 52;
    const sorties: { type: string }[] = [];
    verifierPaliers(e, sorties);
    expect(e.palier).toBe(3);
    e.personnel = [e.personnel[0]!, embauche(MILA), embauche(JONAS), embauche(INES)];
    e.reputation = 52;
    verifierPaliers(e, sorties);
    expect(e.palier).toBe(4);
    expect(e.systemes).toMatchObject({ vip: true, couples: true, confort: true, renommer: true, formations: false });
    expect(e.clientele.satisfaction.vip).toBeCloseTo(e.clientele.satisfaction.couple, 5);
    expect(e.clientele.satisfaction.vip).toBeGreaterThan(40);
  });

  it('les formations s’ouvrent au lundi qui suit, le placement au lundi d’après', () => {
    const e = auPalier(4);
    e.systemes.formations = false;
    e.systemes.placement = false;
    const lundi1 = tick({ ...e, jour: 49, minuteDuJour: h(4, 55), briefingJour: 49 }).etat;
    expect(lundi1.systemes).toMatchObject({ formations: true, placement: false });
    const lundi2 = tick({ ...lundi1, jour: 56, minuteDuJour: h(4, 55), briefingJour: 56, bilanAVoir: false, bilanMoisAVoir: false }).etat;
    expect(lundi2.systemes.placement).toBe(true);
    expect(lundi2.bilanSemaine?.ouvertures).toContain('placement');
  });
});

describe('ce que veulent VIP et couples', () => {
  it('les VIP veulent le prestige : chambre premium, décor refait, jacuzzi', () => {
    const e = auPalier(4);
    const boudoir = e.chambres.find((c) => c.id === 'boudoir')!;
    const velours = { ...e.chambres.find((c) => c.id === 'velours')!, ouverte: true };
    expect(qualiteGamme(boudoir, 'vip')).toBeCloseTo(B.GAMME.vip.pasPremium, 5);
    expect(qualiteGamme(velours, 'vip')).toBeCloseTo(B.GAMME.vip.premium, 5);
    const luxe = { ...velours, confort: 3, decorRefait: true };
    expect(qualiteGamme(luxe, 'vip')).toBeCloseTo(B.GAMME.vip.premium + B.GAMME.vip.decorRefait + B.CONFORT.jacuzzi.vip + 2 * B.CONFORT.qualiteParNiveau, 5);
    expect(qualiteGamme(boudoir, 'touriste')).toBe(0);
  });

  it('les couples veulent un décor refait et une chambre impeccable', () => {
    const c = { ...auPalier(4).chambres[0]!, proprete: 90 };
    expect(qualiteGamme(c, 'couple')).toBe(0);
    expect(qualiteGamme({ ...c, decorRefait: true }, 'couple')).toBeCloseTo(B.GAMME.couple.decorRefait, 5);
    expect(qualiteGamme({ ...c, proprete: 50 }, 'couple')).toBeCloseTo(-B.GAMME.couple.malusProprete, 5);
  });

  it('une dispute qui dégénère fait fuir les VIP', () => {
    const e = auPalier(4, { minuteDuJour: h(22), briefingJour: 44 });
    e.dispute = { depuis: 0 } as unknown as EtatJeu['dispute'];
    const avant = e.clientele.satisfaction.vip;
    let x = e;
    for (let i = 0; i < 40 && x.dispute; i++) x = tick(x).etat;
    if (x.journal.some((j) => j.evenement.type === 'disputeDegeneree')) expect(x.clientele.satisfaction.vip).toBeLessThan(avant);
  });

  it('« VIP d’abord » fait passer le VIP devant, une fois les VIP ouverts', () => {
    const e = auPalier(4, { file: [{ id: 1, modele: 'retraite', patience: 50 }, { id: 2, modele: 'armateur', patience: 30 }] });
    const regle = ordre(e, { type: 'regle', regle: 'priorite', valeur: 'vip' }).etat;
    expect(regle.regles.priorite).toBe('vip');
    expect(prochainClient(regle, (c) => modeleClient(c.modele).segment)?.id).toBe(2);
    expect(ordre(auPalier(3), { type: 'regle', regle: 'priorite', valeur: 'vip' }).etat.regles.priorite).toBe('arrivee');
  });
});

describe('confort des chambres', () => {
  it('un niveau de plus : travaux, puis qualité et prix en hausse', () => {
    const e = auPalier(4);
    const { etat } = ordre(e, { type: 'ameliorerConfort', chambreId: 'boudoir' });
    expect(etat.tresorerie).toBe(20000 - B.CONFORT.niveaux[0]!.prix);
    expect(etat.chambres[0]!.confortAVenir).toBe(2);
    let x = etat;
    for (let i = 0; i < 12 * 12 + 2; i++) x = tick({ ...x, briefingJour: x.jour }).etat;
    const c = x.chambres[0]!;
    expect(c.confort).toBe(2);
    expect(prixConfort(c)).toBeCloseTo(1 + B.CONFORT.prixParNiveau, 5);
    expect(qualiteGamme(c, 'touriste')).toBeCloseTo(B.CONFORT.qualiteParNiveau, 5);
  });

  it('le jacuzzi n’entre que dans une chambre premium ; rien avant le palier 4', () => {
    const e = auPalier(4);
    expect(prochainConfort({ ...e.chambres[0]!, confort: 2 })).toBeNull();
    expect(prochainConfort({ ...e.chambres.find((c) => c.id === 'velours')!, confort: 2 })?.niveau).toBe(3);
    expect(ordre(auPalier(3), { type: 'ameliorerConfort', chambreId: 'boudoir' }).evenements).toEqual([]);
  });
});

describe('formations des équipes', () => {
  it('un niveau de plus par journée de stage : le ménage va plus vite, le bar vend mieux, l’accueil et la sécurité règlent davantage', () => {
    let e = auPalier(4, { equipes: { menage: 1, bar: 1, accueil: 1, securite: 1 } });
    e = ordre(e, { type: 'former', equipe: 'menage' }).etat;
    expect(e.tresorerie).toBe(20000 - B.FORMATIONS.prix[0]!);
    expect(e.niveauxEquipes.menage).toBe(2);
    expect(facteurMenage(e)).toBeCloseTo(1 + B.FORMATIONS.menage, 5);
    const avant = partReglee(e, 'securite');
    e = ordre(e, { type: 'former', equipe: 'securite' }).etat;
    expect(partReglee(e, 'securite')).toBeCloseTo(avant + B.FORMATIONS.regle, 5);
    const patience = patienceAccueil(e);
    e = ordre(e, { type: 'former', equipe: 'accueil' }).etat;
    expect(patienceAccueil(e)).toBeCloseTo(patience * (1 + B.FORMATIONS.patience), 5);
    e = ordre(ordre(e, { type: 'former', equipe: 'menage' }).etat, { type: 'former', equipe: 'menage' }).etat;
    expect(e.niveauxEquipes.menage).toBe(3);
    // Une équipe sans personne ne règle rien, même formée.
    expect(partReglee({ ...e, equipes: { ...e.equipes, securite: 0 } }, 'securite')).toBe(0);
  });
});

describe('placement de l’excédent', () => {
  it('prudent : bloqué 4 semaines, compté dans l’avoir, rendu avec 2 %', () => {
    const e = auPalier(4);
    const place = ordre(e, { type: 'placer', montant: 5000, profil: 'prudent' }).etat;
    expect(place.tresorerie).toBe(15000);
    expect(place.placement).toEqual({ montant: 5000, profil: 'prudent', echeance: 72 });
    expect(avoirNet(place)).toBe(avoirNet(e));
    expect(place.journee.placement).toBe(-5000);
    const retour = tick({ ...place, jour: 71, minuteDuJour: h(4, 55), briefingJour: 71, bilanAVoir: false }).etat;
    expect(retour.placement).toBeNull();
    expect(retour.semaine.comptes.recettes.placement).toBe(100);
    expect(retour.tresorerie).toBeGreaterThanOrEqual(15000 + 5100 - 20);
  });

  it('risqué : dans la fourchette annoncée, avec son propre hasard ; pas deux à la fois ; jamais avec Josée', () => {
    const e = auPalier(4);
    const f = fourchettePlacement(e, 10000);
    const place = ordre(e, { type: 'placer', montant: 10000, profil: 'risque' }).etat;
    expect(ordre(place, { type: 'placer', montant: 2000, profil: 'prudent' }).etat.tresorerie).toBe(10000);
    const retour = tick({ ...place, jour: 71, minuteDuJour: h(4, 55), briefingJour: 71, bilanAVoir: false });
    const fin = retour.evenements.find((x) => x.type === 'finPlacement');
    expect(fin && fin.type === 'finPlacement' ? fin.gain : NaN).toBeGreaterThanOrEqual(f.min - 1);
    expect(fin && fin.type === 'finPlacement' ? fin.gain : NaN).toBeLessThanOrEqual(f.max + 1);
    expect(retour.etat.hasard).toBe(tick({ ...place, jour: 71, minuteDuJour: h(4, 55), briefingJour: 71, bilanAVoir: false }).etat.hasard);
    expect(ordre({ ...e, gestionJosee: true }, { type: 'placer', montant: 2000, profil: 'prudent' }).etat.placement).toBeNull();
    expect(ordre(e, { type: 'placer', montant: 3000, profil: 'prudent' }).etat.placement).toBeNull();
  });
});

describe('changer le nom de la maison', () => {
  it('une nouvelle enseigne, un nom propre, au palier 4', () => {
    const e = auPalier(4);
    const { etat, evenements } = ordre(e, { type: 'renommerMaison', nom: '  Le Velours Bleu ' });
    expect(etat.maison.nom).toBe('Le Velours Bleu');
    expect(etat.tresorerie).toBe(20000 - B.NOUVELLE_ENSEIGNE);
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'renommerMaison', nom: 'Le Velours Bleu' }));
    expect(ordre(e, { type: 'renommerMaison', nom: '' }).etat.maison.nom).toBe(e.maison.nom);
    // Une seule fois : l'enseigne ne se change plus ensuite.
    expect(etat.systemes.renommer).toBe(false);
    expect(ordre(etat, { type: 'renommerMaison', nom: 'Le Second Souffle' }).etat.maison.nom).toBe('Le Velours Bleu');
    expect(ordre(auPalier(3), { type: 'renommerMaison', nom: 'Chez Josée' }).etat.maison.nom).toBe(e.maison.nom);
  });
});
