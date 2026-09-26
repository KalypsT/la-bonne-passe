import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES, JONAS, MILA } from '../content/candidats';
import { INTRIGUE_CHAT_NOIR } from '../content/rivale';
import { creerEtatInitial, type EtatJeu } from './etat';
import { vivreMinuteries } from './minuteries';
import { accorderPalier } from './paliers';
import { candidatDepuis } from './recrutement';
import {
  chanceTreve,
  cibleAgressivite,
  cibleDebauchage,
  demandeRivale,
  lundiDeLaRivale,
  reponsePossible,
  rivaleDeDepart,
} from './rivale';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';
import { instant } from './temps';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 3, le lundi 36 à 12 h, avec Mila, Jonas et Inès confirmés. La rivale s'est déjà présentée. */
function maison(champs: Partial<EtatJeu> = {}, palier = 3): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 7 }), jour: 36, minuteDuJour: h(12), briefingJour: 36, nuitsBouclees: 35, mensualitesPayees: 1 };
  for (let p = 1; p <= palier; p++) accorderPalier(etat, p);
  etat = { ...etat, annonces: [], visites: [], tresorerie: 5_000, reputation: 45 };
  for (const def of [MILA, JONAS, INES]) {
    etat = { ...etat, candidats: [{ ...candidatDepuis(def, 'visite', 60), questionPosee: 0 }] };
    etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: def.id, part: 0.5 }]).etat;
  }
  for (const e of etat.personnel) {
    e.finEssai = null;
    e.nuitsTravaillees = 20;
  }
  // L'arc de Mila est fini ; la rivale s'est présentée il y a une semaine.
  etat.intrigues.finies.push({ id: 'mila', fin: 'tete', jour: 20 });
  etat.rivale.derniereAction = { id: 'visite', jour: 29 };
  return { ...etat, ...champs };
}

const ordonner = (etat: EtatJeu, ordre: Ordre) => appliquerOrdres(etat, [ordre]);
const perso = (etat: EtatJeu, id: string) => etat.personnel.find((e) => e.id === id)!;

describe('le Chat Noir entre en scène au palier 3', () => {
  it('s’ouvre avec le palier 3 et se présente au premier lundi, par une carte de visite', () => {
    const etat = maison({ jour: 29, minuteDuJour: h(4, 55), briefingJour: 28 });
    etat.rivale = rivaleDeDepart();
    expect(etat.systemes.rivale).toBe(true);
    const { etat: lundi, evenements } = tick(etat);
    expect(lundi.jour).toBe(30);
    // Le jour 30 n'est pas un lundi : rien. Le jour 29 l'est.
    expect(evenements.some((e) => e.type === 'rivaleAgit')).toBe(false);
    const vraiLundi = maison({ jour: 28, minuteDuJour: h(4, 55), briefingJour: 28 });
    vraiLundi.rivale = rivaleDeDepart();
    const r = tick(vraiLundi);
    expect(r.etat.jour).toBe(29);
    expect(r.evenements).toContainEqual({ type: 'rivaleAgit', action: 'visite' });
    expect(r.etat.intrigues.actives.map((a) => a.id)).toContain('chatNoirVisite');
  });

  it('reste dans l’ombre avant le palier 3', () => {
    const etat = maison({}, 2);
    etat.rivale = rivaleDeDepart();
    lundiDeLaRivale(etat, []);
    expect(etat.rivale.derniereAction).toBeNull();
  });
});

describe('elle réagit à ce que la maison lui prend', () => {
  it('sa cible monte avec la réputation et la part d’habitués et de clients d’affaires', () => {
    const basse = maison({ reputation: 30 });
    const haute = maison({ reputation: 60 });
    expect(cibleAgressivite(haute)).toBeGreaterThan(cibleAgressivite(basse));
    const habitues = maison();
    habitues.clientele.historique = [{ servis: { touriste: 0, habitue: 8, affaires: 4, groupe: 0 }, perdus: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 } }];
    const touristes = maison();
    touristes.clientele.historique = [{ servis: { touriste: 8, habitue: 0, affaires: 0, groupe: 4 }, perdus: { touriste: 0, habitue: 0, affaires: 0, groupe: 0 } }];
    expect(cibleAgressivite(habitues)).toBeCloseTo(cibleAgressivite(touristes) + B.RIVALE.parClientele);
  });

  it('chaque lundi, son agressivité fait la moitié du chemin vers sa cible', () => {
    const etat = maison({ reputation: 60 });
    etat.rivale.agressivite = 0;
    const cible = cibleAgressivite(etat);
    lundiDeLaRivale(etat, []);
    expect(etat.rivale.agressivite).toBeCloseTo(cible * B.RIVALE.rapprochement, 0);
  });

  it('plus elle est agressive, plus elle agit ; en trêve, jamais', () => {
    const compter = (agressivite: number, treve = 0) => {
      let n = 0;
      for (let g = 1; g <= 80; g++) {
        const etat = maison({ reputation: B.RIVALE.reputationNeutre, hasardRivale: g });
        etat.clientele.historique = [];
        etat.rivale = { ...etat.rivale, agressivite: agressivite * 2, treve };
        lundiDeLaRivale(etat, []);
        if (etat.rivale.derniereAction?.jour === etat.jour) n += 1;
      }
      return n;
    };
    expect(compter(80)).toBeGreaterThan(compter(20));
    expect(compter(80, 50)).toBe(0);
  });

  it('ne décale pas le hasard de la partie', () => {
    const etat = maison();
    const avant = etat.hasard;
    lundiDeLaRivale(etat, []);
    expect(etat.hasard).toBe(avant);
  });
});

describe('ses coups', () => {
  it('les prix cassés font fuir habitués et clients d’affaires jusqu’au lundi suivant', () => {
    const etat = maison();
    etat.intrigues.actives.push({ id: 'chatNoirPrix', etape: 'affiche', echeance: 0, employeId: null, debut: etat.jour });
    etat.intrigues.carte = 'chatNoirPrix';
    const apres = ordonner(etat, { type: 'choixIntrigue', choix: 0 }).etat;
    expect(demandeRivale(apres, 'habitue')).toBe(B.RIVALE.prixConcurrence);
    expect(demandeRivale(apres, 'affaires')).toBe(B.RIVALE.prixConcurrence);
    expect(demandeRivale(apres, 'touriste')).toBe(1);
    lundiDeLaRivale(apres, []);
    expect(apres.rivale.concurrence).toBe(1);
  });

  it('le faux client : une bulle dans la soirée ; ignorée, elle coûte réputation, presse et police', () => {
    const soir = maison({ minuteDuJour: h(22) });
    soir.briefingJour = soir.jour;
    soir.rivale.sabotage = true;
    let n = 0;
    while (!soir.minuteries.some((m) => m.id === 'sabotage') && n++ < 50) vivreMinuteries(soir, []);
    const alerte = soir.minuteries.find((m) => m.id === 'sabotage')!;
    expect(alerte).toBeDefined();
    expect(soir.rivale.sabotage).toBe(false);
    const avant = { reputation: soir.reputation, presse: soir.relations.jauges.presse, police: soir.relations.jauges.police };
    soir.minuteDuJour = h(23, 30);
    soir.minuteries = [{ ...alerte, expire: instant(soir) }];
    vivreMinuteries(soir, []);
    expect(soir.reputation).toBeLessThan(avant.reputation);
    expect(soir.relations.jauges.presse).toBeLessThan(avant.presse);
    expect(soir.relations.jauges.police).toBeLessThan(avant.police);
    const payer = maison({ minuteDuJour: h(22) });
    payer.minuteries = [{ ...alerte, debut: instant(payer), expire: instant(payer) + 30 }];
    expect(ordonner(payer, { type: 'traiterAlerte', cle: alerte.cle, action: 1 }).etat.tresorerie).toBe(5_000 - B.ALERTES.sabotage.remboursement);
  });
});

describe('« L’offre du Chat Noir »', () => {
  it('vise la personne la plus douée et la moins attachée, confirmée, et pas Mila tant que son arc n’est pas fini', () => {
    const etat = maison();
    perso(etat, 'jonas').loyaute = 10;
    expect(cibleDebauchage(etat)?.id).toBe('jonas');
    perso(etat, 'jonas').finEssai = 99;
    expect(cibleDebauchage(etat)?.id).not.toBe('jonas');
    const arcEnCours = maison();
    arcEnCours.intrigues.finies = [];
    perso(arcEnCours, 'mila').loyaute = 0;
    expect(cibleDebauchage(arcEnCours)?.id).not.toBe('mila');
  });

  it('suit les étapes des spécifications : un verre, la part, l’offre ferme si le moral ou la loyauté flanchent', () => {
    expect(Object.keys(INTRIGUE_CHAT_NOIR.etapes)).toEqual(['verre', 'verreMila', 'part', 'offre']);
    const etat = maison();
    const jonas = perso(etat, 'jonas');
    jonas.loyaute = 70;
    jonas.moral = 70;
    etat.intrigues.actives.push({ id: 'offreChatNoir', etape: 'offre', echeance: 0, employeId: 'jonas', debut: etat.jour });
    const evenements: EvenementMoteur[] = [];
    // Solide : Jonas décline de lui-même, la carte ne sort pas.
    const solide = tick({ ...etat, minuteDuJour: h(10, 55) });
    evenements.push(...solide.evenements);
    expect(evenements).toContainEqual(expect.objectContaining({ type: 'intrigueFinie', id: 'offreChatNoir', fin: 'reste' }));

    const fragile = maison();
    perso(fragile, 'jonas').loyaute = 30;
    fragile.intrigues.actives.push({ id: 'offreChatNoir', etape: 'offre', echeance: 0, employeId: 'jonas', debut: fragile.jour });
    const carte = tick({ ...fragile, minuteDuJour: h(10, 55) }).etat;
    expect(carte.intrigues.carte).toBe('offreChatNoir');
    const parti = ordonner(carte, { type: 'choixIntrigue', choix: 1 }).etat;
    expect(parti.personnel.some((e) => e.id === 'jonas')).toBe(false);
    expect(parti.rivale.transfuges).toEqual(['Jonas']);
  });

  it('Mila a sa propre première carte, qui rappelle son passage au Pink Palace', () => {
    expect(INTRIGUE_CHAT_NOIR.etapes.verreMila?.texte).toContain('Pink Palace');
  });
});

describe('les réponses du joueur', () => {
  it('une par semaine ; débaucher fait venir une recrue du Chat Noir et fâche la rivale', () => {
    const etat = maison();
    const { etat: apres, evenements } = ordonner(etat, { type: 'reponseRivale', reponse: 'debaucher' });
    const recrue = apres.candidats.find((c) => c.source === 'debauchage');
    expect(recrue).toBeDefined();
    expect(recrue!.partMin).toBe(B.CANDIDAT_VEDETTE.partMin);
    expect(apres.rivale.relation).toBe(etat.rivale.relation + B.RIVALE.debaucher.relation);
    expect(apres.rivale.agressivite).toBeGreaterThan(etat.rivale.agressivite);
    expect(evenements).toContainEqual({ type: 'reponseRivale', reponse: 'debaucher', reussite: true, montant: 0 });
    expect(reponsePossible(apres, 'treve')).toBe(false);
    expect(reponsePossible({ ...apres, jour: apres.jour + B.RIVALE.reponseRepit }, 'treve')).toBe(true);
  });

  it('la rumeur coûte, marche une fois sur deux environ, avec le hasard de la rivale', () => {
    let reussies = 0;
    for (let g = 1; g <= 60; g++) {
      const etat = maison({ hasardRivale: g });
      const apres = ordonner(etat, { type: 'reponseRivale', reponse: 'rumeur' }).etat;
      expect(apres.tresorerie).toBe(5_000 - B.RIVALE.rumeur.cout);
      expect(apres.hasard).toBe(etat.hasard);
      if (apres.rivale.concurrence > 1) reussies += 1;
      else expect(apres.relations.jauges.presse).toBeLessThan(etat.relations.jauges.presse);
    }
    expect(reussies).toBeGreaterThan(20);
    expect(reussies).toBeLessThan(45);
  });

  it('une trêve acceptée arrête ses coups ; elle accepte plus volontiers quand vous vous entendez', () => {
    const froid = maison();
    froid.rivale.relation = -60;
    const chaud = maison();
    chaud.rivale.relation = 60;
    expect(chanceTreve(chaud)).toBeGreaterThan(chanceTreve(froid));
    let acceptee: EtatJeu | null = null;
    for (let g = 1; g <= 30 && !acceptee; g++) {
      const r = ordonner(maison({ hasardRivale: g }), { type: 'reponseRivale', reponse: 'treve' }).etat;
      if (r.rivale.treve > 0) acceptee = r;
    }
    expect(acceptee).not.toBeNull();
    const t = acceptee!;
    expect(t.rivale.treve).toBe(t.jour + B.RIVALE.treve.jours);
    t.rivale.agressivite = 100;
    lundiDeLaRivale(t, []);
    expect(t.rivale.derniereAction?.jour).not.toBe(t.jour);
  });
});
