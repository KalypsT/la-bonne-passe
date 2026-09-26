import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES, JONAS, MILA } from '../content/candidats';
import { GERANTE_EXTERNE } from '../content/maison2';
import { creerEmploye, creerEtatInitial, type EtatJeu } from './etat';
import { facteurGerante, peutConfier, peutEngagerExterne, peutRappeler, semaineMaison2 } from './maison2';
import { accorderPalier } from './paliers';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;
const embauche = (def: typeof MILA, champs: Partial<ReturnType<typeof creerEmploye>> = {}) => ({
  ...creerEmploye({ ...def, part: 0.5, moral: 70, loyaute: 60, fatigue: 0 }),
  nuitsTravaillees: 20,
  ...champs,
});

/** Palier 5, la deuxième maison (l'ancienne pension de De Pijp) prête à ouvrir. */
function maisonPrete(champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 71 }), jour: 44, minuteDuJour: h(10), briefingJour: 44, nuitsBouclees: 43, mensualitesPayees: 1 };
  for (let p = 1; p <= 5; p++) accorderPalier(etat, p);
  etat.systemes.gerante = true;
  etat.systemes.etablissement = true;
  etat.systemes.maison2 = true;
  etat.etablissement = { offres: [{ id: 'pension', achat: 32000, travaux: 9000, jours: 6 }], lieu: 'pension', statut: 'pret', fin: 40 };
  etat.personnel = [{ ...etat.personnel[0]!, nuitsTravaillees: 40 }, embauche(MILA), embauche(JONAS), embauche(INES)];
  return { ...etat, annonces: [], visites: [], candidats: [], tresorerie: 30000, reputation: 70, ...champs };
}
const ordre = (e: EtatJeu, o: Parameters<typeof appliquerOrdres>[1][number]) => appliquerOrdres(e, [o]);
/** Le lundi suivant (jour 50) à 5 h, la maison ouverte toute la semaine écoulée. */
const lundi = (e: EtatJeu, jour = 49) =>
  tick({ ...e, jour, minuteDuJour: h(4, 55), briefingJour: jour, bilanAVoir: false, bilanMoisAVoir: false, maison2: { ...e.maison2, nuitsSemaine: 6 } }).etat;
/** La maison confiée à Margot et inaugurée. */
const ouverte = (champs: Partial<EtatJeu> = {}) => {
  const e = ordre(maisonPrete(champs), { type: 'confierMaison', employeId: 'externe' }).etat;
  return ordre(e, { type: 'inaugurer' }).etat;
};

describe('deuxième maison : la gérante', () => {
  it('une personne de l’équipe qui accepte quitte le salon pour la tenir', () => {
    const e = maisonPrete();
    e.gerante = 'sanne';
    const { etat, evenements } = ordre(e, { type: 'confierMaison', employeId: 'sanne' });
    expect(etat.personnel.map((x) => x.id)).not.toContain('sanne');
    expect(etat.maison2.gerante).toMatchObject({ externe: false, salaire: B.GERANTE.salaire });
    // Sanne rêvait de gérer : sa loyauté monte ; elle n'est plus gérante de la maison d'origine.
    expect(etat.maison2.gerante?.employe.loyaute).toBe(e.personnel[0]!.loyaute + B.MAISON2.loyauteAmbition);
    expect(etat.gerante).toBeNull();
    expect(Object.keys(etat.affinites).some((k) => k.includes('sanne'))).toBe(false);
    expect(evenements).toContainEqual({ type: 'maisonConfiee', prenom: 'Sanne', genre: 'f', externe: false, accepte: true });
  });

  it('elle peut refuser : sans l’ambition, ni loyauté ni moral suffisants', () => {
    const e = maisonPrete();
    e.personnel[2] = { ...e.personnel[2]!, loyaute: 30, moral: 40, ambition: 'etudes' };
    const { etat, evenements } = ordre(e, { type: 'confierMaison', employeId: 'jonas' });
    expect(etat.personnel.map((x) => x.id)).toContain('jonas');
    expect(etat.maison2.gerante).toBeNull();
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'maisonConfiee', accepte: false }));
  });

  it('il faut une personne confirmée, avec 10 nuits, et qui ne laisse pas le salon vide', () => {
    const e = maisonPrete();
    e.personnel[1] = { ...e.personnel[1]!, nuitsTravaillees: B.GERANTE.nuitsMin - 1 };
    e.personnel[2] = { ...e.personnel[2]!, finEssai: 50 };
    expect(peutConfier(e, 'mila')).toBe(false);
    expect(peutConfier(e, 'jonas')).toBe(false);
    expect(peutConfier(e, 'ines')).toBe(true);
    expect(peutConfier({ ...e, personnel: [e.personnel[0]!] }, 'sanne')).toBe(false);
    // Pas avant que les travaux soient finis.
    expect(peutConfier({ ...e, etablissement: { ...e.etablissement, statut: 'travaux' } }, 'ines')).toBe(false);
  });

  it('la gérante venue d’ailleurs accepte toujours, plus chère et moins attachée', () => {
    const { etat } = ordre(maisonPrete(), { type: 'confierMaison', employeId: 'externe' });
    expect(etat.personnel).toHaveLength(4);
    expect(etat.maison2.gerante).toMatchObject({ externe: true, salaire: B.MAISON2.salaireExterne });
    expect(etat.maison2.gerante?.employe).toMatchObject({ prenom: GERANTE_EXTERNE.prenom, loyaute: B.MAISON2.loyauteExterne });
  });

  it('le facteur de la gérante va de 0,85 à 1,05 selon ses talents', () => {
    expect(facteurGerante({ talents: { charme: 1, conversation: 1, audace: 1, discretion: 1 } })).toBeCloseTo(0.85);
    expect(facteurGerante({ talents: { charme: 5, conversation: 5, audace: 5, discretion: 5 } })).toBeCloseTo(1.05);
  });
});

describe('deuxième maison : l’inauguration', () => {
  it('coûte 1 500 € une fois, ouvre la maison et Josée la présente', () => {
    const avant = ordre(maisonPrete(), { type: 'confierMaison', employeId: 'externe' }).etat;
    const { etat, evenements } = ordre(avant, { type: 'inaugurer' });
    expect(etat.etablissement.statut).toBe('ouvert');
    expect(etat.tresorerie).toBe(avant.tresorerie - B.MAISON2.inauguration);
    expect(etat.semaine.comptes.depenses.maison2).toBe(B.MAISON2.inauguration);
    expect(etat.maison2.inauguration).toBe(etat.jour);
    expect(etat.maison2.reputation).toBe(B.MAISON2.reputationOuverture);
    expect(etat.maison2.annonces).toContainEqual({ id: 'inauguree', prenom: 'Margot' });
    expect(evenements).toContainEqual({ type: 'inauguration', montant: B.MAISON2.inauguration });
  });

  it('pas sans gérante, ni sans la caisse ; la presse en bons termes donne une meilleure réputation de départ', () => {
    expect(ordre(maisonPrete(), { type: 'inaugurer' }).etat.etablissement.statut).toBe('pret');
    const pauvre = ordre(maisonPrete({ tresorerie: 1000 }), { type: 'confierMaison', employeId: 'externe' }).etat;
    expect(ordre(pauvre, { type: 'inaugurer' }).etat.etablissement.statut).toBe('pret');
    const e = maisonPrete();
    e.relations.jauges.presse = B.RELATIONS.bons;
    expect(ouverte({ relations: e.relations }).maison2.reputation).toBe(B.MAISON2.reputationOuverture + B.MAISON2.bonusPresse);
  });
});

describe('deuxième maison : le lundi', () => {
  it('compte les nuits ouvertes, et ses comptes entrent dans ceux de la semaine écoulée', () => {
    const e = ouverte();
    const l = lundi(e);
    const b = l.bilanSemaine?.maison2;
    expect(b).toBeDefined();
    expect(b!.nuits).toBe(7);
    expect(b!.rendezVous).toBeGreaterThan(0);
    expect(l.bilanSemaine!.comptes.recettes.maison2).toBe(b!.recette);
    expect(l.bilanSemaine!.comptes.depenses.maison2).toBe(b!.frais + B.MAISON2.inauguration);
    // Frais d'une semaine pleine : les charges et le salaire de Margot (7 nuits), plus un éventuel incident.
    expect(b!.frais).toBeGreaterThanOrEqual(B.MAISON2.charges + 7 * B.MAISON2.salaireExterne);
    expect(l.maison2.total).toBe(b!.resultat);
    expect(l.maison2.bilans).toHaveLength(1);
    expect(l.maison2.nuitsSemaine).toBe(0);
    // La réputation monte vers celle de la maison d'origine.
    expect(l.maison2.reputation).toBeGreaterThan(e.maison2.reputation - B.MAISON2.incidentReputation);
  });

  it('chaque matin où elle est ouverte compte une nuit ; fermée, rien', () => {
    const e = ouverte();
    const matin = tick({ ...e, jour: 45, minuteDuJour: h(4, 55), briefingJour: 45 }).etat;
    expect(matin.maison2.nuitsSemaine).toBe(1);
    const fermee = tick({ ...maisonPrete(), jour: 45, minuteDuJour: h(4, 55), briefingJour: 45 }).etat;
    expect(fermee.maison2.nuitsSemaine).toBe(0);
    expect(fermee.bilanSemaine?.maison2).toBeUndefined();
  });

  it('la consigne vaut au lundi suivant : l’ambitieuse attire plus de monde et use la loyauté', () => {
    const e = ouverte();
    const changee = ordre(e, { type: 'consigneMaison', consigne: 'ambitieuse' }).etat;
    expect(changee.maison2).toMatchObject({ consigne: 'ambitieuse', consigneSemaine: 'equilibree' });
    const l1 = lundi(changee);
    expect(l1.maison2.bilans[0]!.consigne).toBe('equilibree');
    expect(l1.maison2.consigneSemaine).toBe('ambitieuse');

    const prudente = { ...e, maison2: { ...e.maison2, consigneSemaine: 'prudente' as const } };
    const ambitieuse = { ...e, maison2: { ...e.maison2, consigneSemaine: 'ambitieuse' as const } };
    const rdv = (x: EtatJeu) => lundi(x).maison2.bilans[0]!.rendezVous;
    expect(rdv(ambitieuse)).toBeGreaterThan(rdv(prudente));
    const loyaute = (x: EtatJeu) => lundi(x).maison2.gerante!.employe.loyaute;
    expect(loyaute(prudente)).toBe(B.MAISON2.loyauteExterne + B.MAISON2.consignes.prudente.loyaute);
    expect(loyaute(ambitieuse)).toBe(B.MAISON2.loyauteExterne + B.MAISON2.consignes.ambitieuse.loyaute);
  });

  it('peu loyale, la gérante se sert dans la caisse ; trop peu, elle s’en va et la maison ferme', () => {
    const e = ouverte();
    const g = e.maison2.gerante!;
    const tiede = { ...e, maison2: { ...e.maison2, gerante: { ...g, employe: { ...g.employe, loyaute: 30 } } } };
    const b = lundi(tiede).maison2.bilans[0]!;
    expect(b.caisse).toBe(Math.round(b.recette * B.MAISON2.caisse));

    const froide = { ...e, maison2: { ...e.maison2, gerante: { ...g, employe: { ...g.employe, loyaute: 20 } } } };
    const l = lundi({ ...froide, maison2: { ...froide.maison2, consigneSemaine: 'ambitieuse' } });
    expect(l.maison2.gerante).toBeNull();
    expect(l.etablissement.statut).toBe('pret');
    expect(l.maison2.annonces).toContainEqual({ id: 'demission', prenom: 'Margot', genre: 'f' });
    // Margot partie ne revient pas : on ne remet pas sa loyauté à neuf en la réengageant.
    expect(peutEngagerExterne(l)).toBe(false);
  });

  it('son hasard est à part : la maison d’origine tire la même semaine', () => {
    const avec = lundi(ouverte());
    const sans = lundi(maisonPrete({ tresorerie: 30000 - B.MAISON2.inauguration }));
    expect(avec.hasard).toBe(sans.hasard);
    expect(avec.semaine.tendances).toEqual(sans.semaine.tendances);
  });

  it('sans nuit ouverte, pas de bilan', () => {
    const e = ouverte();
    const bilan = semaineMaison2({ ...structuredClone(e), maison2: { ...e.maison2, nuitsSemaine: 0 } }, []);
    expect(bilan).toBeNull();
  });
});

describe('deuxième maison : rappeler la gérante', () => {
  it('une personne de l’équipe revient au salon, un peu déçue ; la maison ferme, puis rouvre sans nouvelle inauguration', () => {
    const e = maisonPrete();
    const confiee = ordre(e, { type: 'confierMaison', employeId: 'ines' }).etat;
    const inauguree = ordre(confiee, { type: 'inaugurer' }).etat;
    const { etat } = ordre(inauguree, { type: 'rappelerGeranteMaison' });
    const ines = etat.personnel.find((x) => x.id === 'ines');
    expect(ines?.moral).toBe(e.personnel[3]!.moral + B.MAISON2.moralRappel);
    expect(etat.etablissement.statut).toBe('pret');
    const rouverte = ordre(ordre(etat, { type: 'confierMaison', employeId: 'externe' }).etat, { type: 'inaugurer' });
    expect(rouverte.etat.etablissement.statut).toBe('ouvert');
    expect(rouverte.etat.tresorerie).toBe(etat.tresorerie);
    expect(rouverte.evenements).toContainEqual({ type: 'maisonRouverte' });
  });

  it('pas de retour si le salon est complet ; la gérante venue d’ailleurs, elle, s’en va toujours', () => {
    const e = ordre(maisonPrete(), { type: 'confierMaison', employeId: 'ines' }).etat;
    e.personnel.push(embauche(INES, { id: 'autre' }));
    expect(peutRappeler(e)).toBe(false);
    const externe = ouverte();
    expect(peutRappeler(externe)).toBe(true);
    const { etat } = ordre(externe, { type: 'rappelerGeranteMaison' });
    expect(etat.personnel).toHaveLength(4);
    expect(etat.maison2.gerante).toBeNull();
    expect(peutEngagerExterne(etat)).toBe(false);
  });
});
