import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { TEXTES_ALERTES, type IdAlerte } from '../content/alertes';
import { MILA } from '../content/candidats';
import { alertes } from './alertes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { reputationPonderee } from './clientele';
import { fermerMinuteries, vivreMinuteries } from './minuteries';
import { accorderPalier } from './paliers';
import { candidatDepuis } from './recrutement';
import { prochainClient } from './regles';
import { employeDisponible } from './soiree';
import { appliquerOrdres, type EvenementMoteur } from './tick';
import { instant } from './temps';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Soirée ouverte au palier 2, 22 h, Sanne et Mila en service, bar qui sert, quai vide. */
function soiree(champs: Partial<EtatJeu> = {}): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 6 }), jour: 9, minuteDuJour: h(22), briefingJour: 9, nuitsBouclees: 8 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  etat = { ...etat, annonces: [], visites: [], tresorerie: 5_000 };
  etat = { ...etat, candidats: [{ ...candidatDepuis(MILA, 'visite', 20), questionPosee: 0 }] };
  etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: 'mila', part: 0.55 }]).etat;
  for (const e of etat.personnel) e.enServiceCeSoir = true;
  etat.bar = { ouvert: true, travaux: null, stock: 40, commande: 0 };
  etat.equipes.bar = 1;
  etat.nuit = { numero: 9, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: 30, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0, bar: 0 };
  return { ...etat, ...champs };
}

/** Pose une alerte à la main, due dans `delai` minutes. */
function poser(etat: EtatJeu, id: IdAlerte, cible: string | null, delai = 20): string {
  const cle = cible === null ? id : `${id}-${cible}`;
  etat.minuteries.push({ id, cle, cible, debut: instant(etat), expire: instant(etat) + delai });
  return cle;
}

const traiter = (etat: EtatJeu, cle: string, action: number) => appliquerOrdres(etat, [{ type: 'traiterAlerte', cle, action }]);

describe('les alertes minutées naissent de l’état de la maison', () => {
  it('un client d’affaires à bout de patience : une bulle, une seule fois, avec sa patience pour délai', () => {
    const etat = soiree({ file: [{ id: 7, modele: 'banquier', patience: B.ALERTES.presse.seuilPatience }] });
    const evenements: EvenementMoteur[] = [];
    vivreMinuteries(etat, evenements);
    expect(etat.minuteries).toMatchObject([{ id: 'presse', cible: '7', expire: instant(etat) + B.ALERTES.presse.seuilPatience }]);
    expect(evenements).toContainEqual({ type: 'alerteMinutee', id: 'presse', prenom: undefined });
    etat.minuteries = [];
    vivreMinuteries(etat, []);
    expect(etat.minuteries).toEqual([]);
  });

  it('le bruit a besoin d’un groupe sur le quai et d’un quartier déjà agacé ; le bar, d’un bar qui sert', () => {
    const naissances = (etat: EtatJeu) => {
      const vus = new Set<string>();
      for (let i = 0; i < 400; i++) {
        vivreMinuteries(etat, []);
        for (const m of etat.minuteries) vus.add(m.id);
        etat.minuteries = [];
        for (const c of etat.file) c.alerte = false;
      }
      return vus;
    };
    const calme = soiree({ file: [{ id: 1, modele: 'fetard', patience: 50 }] });
    expect(naissances(calme).has('bruit')).toBe(false);
    const agite = soiree({ file: [{ id: 1, modele: 'fetard', patience: 50 }], quartier: { tapage: 40, insonorise: false } });
    const vus = naissances(agite);
    expect(vus.has('bruit')).toBe(true);
    expect(vus.has('ivre')).toBe(true);
    const sansBar = soiree({ file: [{ id: 1, modele: 'fetard', patience: 50 }] });
    sansBar.bar.stock = 0;
    expect(naissances(sansBar).has('ivre')).toBe(false);
  });

  it('les alertes ont leur propre hasard : elles ne décalent pas celui de la soirée', () => {
    const etat = soiree({ file: [{ id: 1, modele: 'fetard', patience: 50 }], quartier: { tapage: 40, insonorise: false } });
    const avant = etat.hasard;
    for (let i = 0; i < 50; i++) vivreMinuteries(etat, []);
    expect(etat.hasard).toBe(avant);
  });

  it('elles apparaissent en bulles, avec le temps qui reste', () => {
    const etat = soiree();
    poser(etat, 'bouteille', null, 20);
    expect(alertes(etat)).toContainEqual({ type: 'minuterie', id: 'bouteille', cle: 'bouteille', cible: null, restant: 20, total: 20 });
  });
});

describe('réagir, ou laisser filer', () => {
  it('le client pressé passe devant, et les autres attendent un peu plus', () => {
    const etat = soiree({
      file: [
        { id: 1, modele: 'touriste-egare', patience: 40 },
        { id: 2, modele: 'banquier', patience: 15 },
      ],
    });
    const cle = poser(etat, 'presse', '2');
    const apres = traiter(etat, cle, 0).etat;
    expect(apres.file.map((c) => c.id)).toEqual([2, 1]);
    expect(apres.file[1]!.patience).toBe(40 - B.ALERTES.presse.patienceAutres);
    expect(prochainClient(apres, () => 'touriste')?.id).toBe(2);
    expect(apres.minuteries).toEqual([]);
    const verre = traiter(etat, cle, 1).etat;
    expect(verre.file.find((c) => c.id === 2)!.patience).toBe(15 + B.ALERTES.presse.patienceVerre);
    expect(verre.bar.stock).toBe(39);
  });

  it('un client pressé qui part fâché coûte en satisfaction ; reçu, l’alerte s’éteint sans rien coûter', () => {
    const parti = soiree();
    poser(parti, 'presse', '2');
    const avant = parti.clientele.satisfaction.affaires;
    const evenements: EvenementMoteur[] = [];
    vivreMinuteries(parti, evenements);
    expect(parti.clientele.satisfaction.affaires).toBe(avant - B.ALERTES.presse.satisfactionManquee);
    expect(evenements).toContainEqual({ type: 'alerteManquee', id: 'presse', prenom: undefined });
    const recu = soiree({ rendezVous: [{ chambreId: 'boudoir', employeId: 'sanne', clientId: 2, modele: 'banquier', formule: 'standard', duree: 60, restant: 60 }] });
    poser(recu, 'presse', '2');
    vivreMinuteries(recu, []);
    expect(recu.minuteries).toEqual([]);
    expect(recu.clientele.satisfaction.affaires).toBe(avant);
  });

  it('un client éméché ignoré déclenche une dispute ; le taxi le ramène chez lui', () => {
    const etat = soiree({ file: [{ id: 3, modele: 'fetard', patience: 50, alerte: true }] });
    poser(etat, 'ivre', '3', 0);
    const evenements: EvenementMoteur[] = [];
    vivreMinuteries(etat, evenements);
    expect(etat.dispute).not.toBeNull();
    expect(evenements).toContainEqual({ type: 'dispute' });
    const taxi = soiree({ file: [{ id: 3, modele: 'fetard', patience: 50, alerte: true }] });
    const cle = poser(taxi, 'ivre', '3');
    const apres = traiter(taxi, cle, 1).etat;
    expect(apres.file).toEqual([]);
    expect(apres.tresorerie).toBe(5_000 - B.ALERTES.ivre.taxi);
    expect(apres.dispute).toBeNull();
  });

  it('une bouteille servie à temps rapporte au bar ; ratée, rien', () => {
    const etat = soiree();
    const cle = poser(etat, 'bouteille', null);
    const apres = traiter(etat, cle, 0).etat;
    expect(apres.tresorerie).toBe(5_000 + B.ALERTES.bouteille.prix);
    expect(apres.semaine.comptes.recettes.bar).toBe(B.ALERTES.bouteille.prix);
    expect(apres.nuit!.bar).toBe(B.ALERTES.bouteille.prix);
    expect(apres.bar.stock).toBe(39);
  });

  it('le bruit ignoré s’entend dans tout le quartier', () => {
    const etat = soiree({ quartier: { tapage: 30, insonorise: false } });
    poser(etat, 'bruit', null, 0);
    vivreMinuteries(etat, []);
    expect(etat.quartier.tapage).toBe(30 + B.ALERTES.bruit.tapageManque);
  });

  it('le photographe ignoré fait fuir les clients discrets ; un billet le fait partir', () => {
    const etat = soiree();
    const avant = etat.clientele.satisfaction.affaires;
    poser(etat, 'photographe', null, 0);
    vivreMinuteries(etat, []);
    expect(etat.clientele.satisfaction.affaires).toBe(avant - B.ALERTES.photographe.satisfactionManquee);
    const billet = soiree();
    const cle = poser(billet, 'photographe', null);
    expect(traiter(billet, cle, 1).etat.tresorerie).toBe(5_000 - B.ALERTES.photographe.billet);
  });

  it('une pause accordée : vingt minutes sans rendez-vous, moins de fatigue ; refusée ou oubliée, du moral en moins', () => {
    const etat = soiree();
    const mila = etat.personnel.find((e) => e.id === 'mila')!;
    mila.fatigue = 60;
    const cle = poser(etat, 'pause', 'mila');
    const apres = traiter(etat, cle, 0).etat;
    const m = apres.personnel.find((e) => e.id === 'mila')!;
    expect(m.fatigue).toBe(60 - B.ALERTES.pause.fatigue);
    expect(employeDisponible(apres, 'mila')).toBe(false);
    const plusTard = { ...apres, minuteDuJour: h(22, B.ALERTES.pause.minutes) };
    expect(employeDisponible(plusTard, 'mila')).toBe(true);

    const oubli = soiree();
    const moral = oubli.personnel.find((e) => e.id === 'mila')!.moral;
    poser(oubli, 'pause', 'mila', 0);
    vivreMinuteries(oubli, []);
    expect(oubli.personnel.find((e) => e.id === 'mila')!.moral).toBe(moral - B.ALERTES.pause.moralManque);
  });

  it('à la fermeture, tout s’éteint sans conséquence', () => {
    const etat = soiree();
    poser(etat, 'bouteille', null);
    etat.personnel[0]!.pauseJusqua = instant(etat) + 60;
    const reputation = reputationPonderee(etat);
    fermerMinuteries(etat);
    expect(etat.minuteries).toEqual([]);
    expect(etat.personnel[0]!.pauseJusqua).toBe(0);
    expect(reputationPonderee(etat)).toBe(reputation);
  });
});

describe('les textes des alertes', () => {
  it('une ou deux actions, un texte pour chaque issue, apostrophes typographiques', () => {
    for (const [id, t] of Object.entries(TEXTES_ALERTES)) {
      expect(t.actions.length, id).toBeGreaterThanOrEqual(1);
      expect(t.actions.length, id).toBeLessThanOrEqual(2);
      expect(t.traitee.length, id).toBe(t.actions.length);
      const tout = [t.titre, t.texte, t.journal, t.manquee, t.rate ?? '', ...t.traitee, ...t.actions.flatMap((a) => [a.texte, a.detail])].join(' ');
      expect(tout, id).not.toContain("'");
      for (const champ of tout.match(/\{[^}]*\}/g) ?? []) expect(['{prenom}', '{e}']).toContain(champ);
    }
  });
});
