import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { MILA, JONAS, INES } from '../content/candidats';
import {
  accepteGerance,
  fatigueGerante,
  nuitDeLaGerante,
  optionsAgrandissement,
  ouvertureGerante,
  peutDemanderPermis,
  personnelMax,
  type EvenementAgrandir,
} from './agrandir';
import { beneficeImposable } from './fisc';
import { comptesVides } from './comptes';
import { creerEtatInitial, creerEmploye, type EtatJeu } from './etat';
import { partReglee } from './equipes';
import { accorderPalier } from './paliers';
import { employeDisponible } from './soiree';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;
const embauche = (def: typeof MILA, champs: Partial<ReturnType<typeof creerEmploye>> = {}) => ({
  ...creerEmploye({ ...def, part: 0.5, moral: 70, loyaute: 60, fatigue: 0 }),
  nuitsTravaillees: 20,
  ...champs,
});

function auPalier(palier: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 71 }), jour: 44, minuteDuJour: h(10), briefingJour: 44, nuitsBouclees: 43, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  // v1.0 : le dossier du permis est ouvert (il s'ouvre au lundi où la maison du palier 4 a 70 de réputation).
  if (palier >= 4) etat.systemes.permis = true;
  etat.personnel = [{ ...etat.personnel[0]!, nuitsTravaillees: 40 }, embauche(MILA), embauche(JONAS), embauche(INES)];
  return { ...etat, annonces: [], visites: [], candidats: [], tresorerie: 30000, reputation: 82, ...champs };
}
const ordre = (e: EtatJeu, o: Parameters<typeof appliquerOrdres>[1][number]) => appliquerOrdres(e, [o]);
/** Le lundi suivant (jour 50), à 5 h. */
const lundi = (e: EtatJeu, jour = 49) =>
  tick({ ...e, jour, minuteDuJour: h(4, 55), briefingJour: jour, bilanAVoir: false, bilanMoisAVoir: false }).etat;
/** Avance jusqu'à la fin de travaux (heures de jeu), briefing validé au passage. */
function attendre(e: EtatJeu, heures: number): EtatJeu {
  let x = e;
  for (let i = 0; i < heures * 12 + 2; i++) x = tick({ ...x, briefingJour: x.jour, bilanAVoir: false, bilanMoisAVoir: false }).etat;
  return x;
}

describe('palier 5 : le permis de la mairie, en trois étapes (v1.0)', () => {
  /** Le dossier arrivé devant la commission, qui répond au prochain lundi. */
  const enCommission = (champs: Partial<EtatJeu> = {}) => auPalier(4, { permis: { statut: 'commission', jour: 40 }, ...champs });

  it('le dossier s’ouvre au lundi où la maison du palier 4 a 70 de réputation, et Josée le présente', () => {
    const avant = auPalier(4, { reputation: B.PALIER_5.depot - 1 });
    avant.systemes.permis = false;
    expect(peutDemanderPermis(avant)).toBe(false);
    expect(lundi(avant).systemes.permis).toBe(false);
    const l = lundi({ ...avant, reputation: B.PALIER_5.depot + 1 });
    expect(l.systemes.permis).toBe(true);
    expect(l.bilanSemaine?.ouvertures).toContain('permis');
  });

  it('se dépose au palier 4 dès 70 de réputation, contre 300 € de dossier', () => {
    expect(peutDemanderPermis(auPalier(4, { reputation: B.PALIER_5.depot - 1 }))).toBe(false);
    expect(peutDemanderPermis(auPalier(4, { reputation: B.PALIER_5.depot }))).toBe(true);
    expect(peutDemanderPermis(auPalier(3))).toBe(false);
    const { etat, evenements } = ordre(auPalier(4), { type: 'demanderPermis' });
    expect(etat.permis.statut).toBe('depose');
    expect(etat.tresorerie).toBe(30000 - B.PALIER_5.fraisDossier);
    expect(evenements).toContainEqual({ type: 'permisDepose', montant: B.PALIER_5.fraisDossier });
    expect(ordre(etat, { type: 'demanderPermis' }).etat.tresorerie).toBe(etat.tresorerie);
  });

  it('déposé, le dossier part à l’enquête ; les voisins la font passer ou échouer', () => {
    const e = ordre(auPalier(4), { type: 'demanderPermis' }).etat;
    const enquete = lundi(e);
    expect(enquete.permis.statut).toBe('enquete');
    enquete.relations.jauges.voisins = B.PALIER_5.voisins;
    expect(lundi(enquete, 56).permis.statut).toBe('commission');
    const fache = structuredClone(enquete);
    fache.relations.jauges.voisins = B.PALIER_5.voisins - 20;
    const refuse = lundi(fache, 56);
    expect(refuse.permis).toMatchObject({ statut: 'refuse', motif: 'voisins' });
    expect(peutDemanderPermis(refuse)).toBe(true);
  });

  it('pendant l’enquête, une réunion de quartier, une fois, rassure les voisins', () => {
    const enquete = lundi(ordre(auPalier(4), { type: 'demanderPermis' }).etat);
    const voisins = enquete.relations.jauges.voisins;
    const { etat, evenements } = ordre(enquete, { type: 'reunionQuartier' });
    expect(etat.relations.jauges.voisins).toBeCloseTo(voisins + B.PALIER_5.reunion.voisins);
    expect(etat.tresorerie).toBe(enquete.tresorerie - B.PALIER_5.reunion.cout);
    expect(evenements).toContainEqual({ type: 'reunionQuartier', montant: B.PALIER_5.reunion.cout });
    expect(ordre(etat, { type: 'reunionQuartier' }).etat.tresorerie).toBe(etat.tresorerie);
    expect(ordre(auPalier(4), { type: 'reunionQuartier' }).evenements).toEqual([]);
  });

  it('la commission accorde avec la mairie en bons termes et 80 de réputation : palier 5 et bâtiment voisin', () => {
    const e = enCommission();
    e.relations.jauges.mairie = 50;
    const l = lundi(e);
    expect(l.permis.statut).toBe('accorde');
    expect(l.palier).toBe(5);
    expect(l.systemes.agrandissement).toBe(true);
    expect(l.systemes.gerante).toBe(false);
  });

  it('sous 80 de réputation, ou la mairie tiède, la commission ajourne d’une semaine', () => {
    const e = enCommission({ reputation: B.PALIER_5.reputation - 2 });
    e.relations.jauges.mairie = 50;
    const { etat: l, evenements } = tick({ ...e, jour: 49, minuteDuJour: h(4, 55), briefingJour: 49, bilanAVoir: false, bilanMoisAVoir: false });
    expect(l.permis.statut).toBe('commission');
    expect(l.palier).toBe(4);
    expect(evenements).toContainEqual({ type: 'permisEtape', etape: 'ajourne', motif: 'reputation' });
    const tiede = enCommission();
    tiede.relations.jauges.mairie = 20;
    const r = lundi(tiede);
    expect(r.permis).toMatchObject({ statut: 'commission', motif: 'mairie' });
    expect(r.palier).toBe(4);
    // La mairie revenue en bons termes, la commission accorde au lundi suivant.
    r.relations.jauges.mairie = 50;
    expect(lundi(r, 56).permis.statut).toBe('accorde');
  });

  it('la gérance et la deuxième maison, avec trois lieux, ouvrent au lundi suivant (v1.0, partie 6)', () => {
    const e = enCommission();
    e.relations.jauges.mairie = 50;
    const l1 = lundi(e);
    expect(l1.systemes).toMatchObject({ gerante: false, etablissement: false });
    const l3 = lundi(l1, 56);
    expect(l3.systemes).toMatchObject({ gerante: true, etablissement: true });
    expect(l3.etablissement.offres).toHaveLength(B.ETABLISSEMENT.offres);
    expect(new Set(l3.etablissement.offres.map((o) => o.id)).size).toBe(B.ETABLISSEMENT.offres);
    // Même graine, mêmes lieux.
    expect(lundi(lundi(e), 56).etablissement.offres).toEqual(l3.etablissement.offres);
  });
});

describe('le bâtiment voisin', () => {
  it('les deux étages : 2 chambres meublées après 3 jours, puis le rez-de-chaussée seul', () => {
    const e = auPalier(5);
    expect(personnelMax(e)).toBe(B.PERSONNEL_MAX);
    expect(optionsAgrandissement(e)).toEqual(['etages', 'batiment']);
    const { etat } = ordre(e, { type: 'agrandir', option: 'etages' });
    expect(etat.tresorerie).toBe(30000 - B.AGRANDISSEMENT.etages.prix);
    expect(optionsAgrandissement(etat)).toEqual([]);
    const fini = attendre(etat, B.AGRANDISSEMENT.etages.heures);
    expect(fini.chambres.map((c) => c.id)).toEqual(['boudoir', 'orientale', 'velours', 'miroirs', 'atelier', 'canal']);
    expect(fini.chambres.find((c) => c.id === 'atelier')).toMatchObject({ ouverte: true, decorRefait: true, confort: 1 });
    expect(personnelMax(fini)).toBe(B.PERSONNEL_MAX_AGRANDI);
    expect(optionsAgrandissement(fini)).toEqual(['rez']);
  });

  it('tout le bâtiment : 3 chambres ; rien sans le palier 5 ni sans la caisse', () => {
    const fini = attendre(ordre(auPalier(5), { type: 'agrandir', option: 'batiment' }).etat, B.AGRANDISSEMENT.batiment.heures);
    expect(fini.chambres).toHaveLength(7);
    expect(optionsAgrandissement(fini)).toEqual([]);
    expect(ordre(auPalier(4), { type: 'agrandir', option: 'etages' }).etat.chambres).toHaveLength(4);
    expect(ordre(auPalier(5, { tresorerie: 5000 }), { type: 'agrandir', option: 'etages' }).etat.agrandissement.enCours).toBeNull();
  });

  it('un recrutement de plus passe une fois la maison agrandie', () => {
    const e = attendre(ordre(auPalier(5), { type: 'agrandir', option: 'etages' }).etat, B.AGRANDISSEMENT.etages.heures);
    expect(e.personnel.length).toBeLessThan(personnelMax(e));
  });
});

describe('la gérante', () => {
  const ouverte = () => ({ ...auPalier(5), systemes: { ...auPalier(5).systemes, gerante: true } });

  it('accepte par ambition, loyauté ou moral ; refuse sinon, librement', () => {
    expect(accepteGerance({ ambition: 'gerante', loyaute: 10, moral: 10 })).toBe(true);
    expect(accepteGerance({ ambition: 'ibiza', loyaute: 60, moral: 10 })).toBe(true);
    expect(accepteGerance({ ambition: 'ibiza', loyaute: 30, moral: 40 })).toBe(false);
    const e = ouverte();
    e.personnel[1] = { ...e.personnel[1]!, ambition: 'ibiza', loyaute: 30, moral: 40 };
    const refus = ordre(e, { type: 'promouvoir', employeId: e.personnel[1]!.id });
    expect(refus.etat.gerante).toBeNull();
    expect(refus.evenements).toContainEqual(expect.objectContaining({ type: 'gerance', accepte: false }));
  });

  it('il faut une personne confirmée, avec 10 nuits, et la gérance ouverte', () => {
    const e = ouverte();
    e.personnel[1] = { ...e.personnel[1]!, nuitsTravaillees: 3 };
    expect(ordre(e, { type: 'promouvoir', employeId: e.personnel[1]!.id }).etat.gerante).toBeNull();
    const ferme = auPalier(5);
    expect(ordre(ferme, { type: 'promouvoir', employeId: ferme.personnel[2]!.id }).etat.gerante).toBeNull();
  });

  it('elle ne reçoit plus, touche son salaire à midi et règle une part des alertes', () => {
    const e = ouverte();
    const id = e.personnel[2]!.id;
    const g = ordre(e, { type: 'promouvoir', employeId: id }).etat;
    expect(g.gerante).toBe(id);
    expect(employeDisponible(g, id)).toBe(false);
    expect(partReglee(g, 'accueil')).toBeCloseTo(B.GERANTE.regle, 5);
    expect(fatigueGerante(g)).toBeCloseTo(1 - B.GERANTE.fatigue, 5);
    expect(fatigueGerante(e)).toBe(1);
    const midiAvec = attendre({ ...g, minuteDuJour: h(11, 50) }, 0.2);
    const midiSans = attendre({ ...e, minuteDuJour: h(11, 50) }, 0.2);
    expect(midiAvec.semaine.comptes.depenses.salaires - midiSans.semaine.comptes.depenses.salaires).toBe(B.GERANTE.salaire);
    const retour = ordre(g, { type: 'retrograder' }).etat;
    expect(retour.gerante).toBeNull();
    expect(retour.personnel[2]!.moral).toBe(g.personnel[2]!.moral + B.GERANTE.moralRetour);
  });

  it('à l’ouverture, elle met au repos qui n’en peut plus ; à la fermeture, le moral remonte', () => {
    const e = ouverte();
    e.gerante = e.personnel[2]!.id;
    for (const p of e.personnel) p.enServiceCeSoir = true;
    e.personnel[1]!.fatigue = 80;
    e.personnel[3]!.moral = 50;
    const evenements: EvenementAgrandir[] = [];
    ouvertureGerante(e, evenements);
    expect(e.personnel[1]!.repos).toBe(true);
    expect(evenements).toContainEqual({ type: 'geranteRepos', employeId: e.personnel[1]!.id });
    nuitDeLaGerante(e, evenements);
    expect(e.personnel[3]!.moral).toBe(50 + B.GERANTE.moral);
    expect(evenements.some((x) => x.type === 'caisse')).toBe(false);
  });

  it('peu loyale, elle se sert dans la caisse, et ça se voit au bilan', () => {
    const e = ouverte();
    e.gerante = e.personnel[2]!.id;
    e.personnel[2]!.loyaute = 20;
    e.journee.comptes.recettes.rendezVous = 1000;
    const evenements: EvenementAgrandir[] = [];
    nuitDeLaGerante(e, evenements);
    expect(evenements).toContainEqual({ type: 'caisse', montant: 1000 * B.GERANTE.caisse });
    expect(e.journee.comptes.depenses.caisse).toBe(1000 * B.GERANTE.caisse);
  });

  it('si elle part, la gérance se libère', () => {
    const e = ouverte();
    e.gerante = 'personne';
    ouvertureGerante(e, []);
    expect(e.gerante).toBeNull();
  });
});

describe('la deuxième maison', () => {
  function avecOffres() {
    const e = auPalier(5);
    e.systemes.gerante = true;
    return lundi(e);
  }

  it('signer, lancer les travaux, attendre : la maison est prête', () => {
    const e = avecOffres();
    const offre = e.etablissement.offres[0]!;
    const t0 = { ...e, tresorerie: 100000 };
    const signe = ordre(t0, { type: 'signerLieu', lieu: offre.id }).etat;
    expect(signe.etablissement).toMatchObject({ statut: 'signe', lieu: offre.id });
    expect(signe.tresorerie).toBe(100000 - offre.achat);
    const travaux = ordre(signe, { type: 'lancerTravauxEtablissement' }).etat;
    expect(travaux.etablissement.statut).toBe('travaux');
    expect(travaux.etablissement.fin).toBe(travaux.jour + offre.jours);
    const pret = attendre(travaux, offre.jours * 24);
    expect(pret.etablissement.statut).toBe('pret');
    // v1.0 : la maison attend sa gérante, et Josée le dit.
    expect(pret.systemes.maison2).toBe(true);
    expect(pret.maison2.annonces).toEqual([{ id: 'prete' }]);
  });

  it('pas d’achat sans la caisse ; l’achat ne réduit pas l’impôt', () => {
    const e = avecOffres();
    expect(ordre({ ...e, tresorerie: 1000 }, { type: 'signerLieu', lieu: e.etablissement.offres[0]!.id }).etat.etablissement.statut).toBe('offres');
    const c = comptesVides();
    c.recettes.rendezVous = 5000;
    c.depenses.etablissement = 40000;
    expect(beneficeImposable(c)).toBe(5000);
  });
});
