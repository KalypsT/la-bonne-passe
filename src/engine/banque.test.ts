import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { agiosDuJour, avoirNet, majorationTaux } from './banque';
import { creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { jourProchaineMensualite } from './soiree';
import { tick, type EvenementMoteur } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Une partie au palier 2 (bar et ménage), au jour et à l'heure dits, sans visite ni annonce. */
function partie(jour: number, minuteDuJour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 9 }), jour, minuteDuJour, briefingJour: jour, nuitsBouclees: jour - 1 };
  accorderPalier(etat, 1);
  accorderPalier(etat, 2);
  return { ...etat, annonces: [], visites: [], candidats: [], ...champs };
}

const contient = (evenements: EvenementMoteur[], type: string) => evenements.some((e) => e.type === type);

describe('découvert et agios', () => {
  it('chaque matin, 1 % d’agios sur ce qui est à découvert, rangés à part', () => {
    const { etat, evenements } = tick(partie(3, h(4, 55), { tresorerie: -1500 }));
    expect(etat.jour).toBe(4);
    expect(evenements).toContainEqual({ type: 'agios', montant: 15 });
    expect(etat.semaine.comptes.depenses.agios).toBe(15);
    expect(agiosDuJour({ tresorerie: 500 })).toBe(0);
    expect(contient(tick(partie(3, h(4, 55), { tresorerie: 200 })).evenements, 'agios')).toBe(false);
  });

  it('Josée signale une fois l’entrée dans le découvert, puis son dépassement, et oublie quand la caisse remonte', () => {
    const a = tick(partie(3, h(10), { tresorerie: -10 }));
    expect(a.evenements).toContainEqual({ type: 'decouvert', niveau: 1 });
    const b = tick(a.etat);
    expect(contient(b.evenements, 'decouvert')).toBe(false);
    const c = tick({ ...b.etat, tresorerie: -2500 });
    expect(c.evenements).toContainEqual({ type: 'decouvert', niveau: 2 });
    const d = tick({ ...c.etat, tresorerie: 100 });
    expect(d.etat.banque.alerte).toBe(0);
  });
});

describe('salaires impayés', () => {
  it('au-delà du découvert autorisé, les salaires ne sont plus versés : moral en baisse, arriérés dus', () => {
    const avant = partie(3, h(11, 55), { tresorerie: -1950, equipes: { menage: 2, bar: 1, accueil: 0, securite: 0 } });
    const { etat, evenements } = tick(avant);
    const montant = 2 * B.SALAIRE_MENAGE + B.SALAIRE_BAR;
    expect(etat.tresorerie).toBe(-1950);
    expect(etat.banque.salairesDus).toBe(montant);
    expect(evenements).toContainEqual({ type: 'salairesImpayes', montant, dus: montant });
    expect(etat.personnel[0]!.moral).toBeLessThan(avant.personnel[0]!.moral - B.SALAIRES_IMPAYES.moral + 1);
    expect(contient(evenements, 'departEquipe')).toBe(false);
  });

  it('au deuxième jour sans paie, une personne d’équipe s’en va ; la dernière du ménage reste', () => {
    const base = partie(3, h(11, 55), { tresorerie: -1950, equipes: { menage: 1, bar: 1, accueil: 0, securite: 0 } });
    const jour2 = { ...base, banque: { ...base.banque, joursImpayes: 1, salairesDus: 240 } };
    const { etat, evenements } = tick(jour2);
    expect(evenements).toContainEqual({ type: 'departEquipe', equipe: 'bar' });
    expect(etat.equipes.bar).toBe(0);
    const jour3 = tick({ ...etat, minuteDuJour: h(11, 55) });
    expect(jour3.etat.equipes.menage).toBe(1);
    expect(contient(jour3.evenements, 'departEquipe')).toBe(false);
  });

  it('les arriérés se paient dès que la caisse le permet', () => {
    const base = partie(3, h(11, 55), { tresorerie: 3000, equipes: { menage: 1, bar: 0, accueil: 0, securite: 0 } });
    const avant = { ...base, banque: { ...base.banque, joursImpayes: 2, salairesDus: 330 } };
    const { etat, evenements } = tick(avant);
    expect(etat.tresorerie).toBe(3000 - 330 - B.SALAIRE_MENAGE);
    expect(etat.banque.salairesDus).toBe(0);
    expect(etat.banque.joursImpayes).toBe(0);
    expect(evenements).toContainEqual({ type: 'salairesRattrapes', montant: 330 });
  });
});

describe('mensualités', () => {
  it('se paie encore à découvert, tant que la caisse et la réserve restent au-dessus de −2 000 €', () => {
    const { etat } = tick(partie(27, h(4, 55), { tresorerie: 300, reserve: 200 }));
    expect(etat.mensualitesPayees).toBe(1);
    expect(etat.tresorerie + etat.reserve).toBe(500 - B.MENSUALITE);
    expect(etat.banque.retard).toBe(0);
  });

  it('impayée au-delà : lettre de la banque, +2 points de taux, et le palier 3 attend', () => {
    const { etat, evenements } = tick(partie(27, h(4, 55), { tresorerie: 300, reserve: 100 }));
    expect(etat.tresorerie).toBe(300);
    expect(etat.reserve).toBe(100);
    expect(etat.mensualitesPayees).toBe(0);
    expect(etat.banque).toMatchObject({ retard: B.MENSUALITE, impayees: 1, echeances: 1 });
    expect(evenements).toContainEqual({ type: 'mensualiteImpayee', montant: B.MENSUALITE, limite: 56 });
    expect(etat.bilanMois?.impayee).toBe(true);
    expect(etat.palier).toBe(2);
    expect(majorationTaux(etat)).toBe(B.DECOUVERT.majorationTaux);
    // Le calendrier ne glisse pas : la suivante reste au jour 56.
    expect(jourProchaineMensualite(etat)).toBe(56);
    expect(avoirNet(etat)).toBe(400 - B.MENSUALITE);
  });

  it('régularisée dès que possible : réserve d’abord, le palier 3 s’ouvre', () => {
    const impayee = tick(partie(27, h(4, 55), { tresorerie: 300, reserve: 100 })).etat;
    const riche = { ...impayee, jour: 30, minuteDuJour: h(4, 55), briefingJour: 30, tresorerie: 4000, reserve: 500, bilanMoisAVoir: false };
    const { etat, evenements } = tick(riche);
    expect(evenements).toContainEqual({ type: 'regularisation', montant: B.MENSUALITE, depuisReserve: 500 });
    expect(etat.banque.retard).toBe(0);
    expect(etat.mensualitesPayees).toBe(1);
    expect(etat.reserve).toBe(0);
    expect(etat.palier).toBe(3);
    // Les points de taux, eux, restent.
    expect(majorationTaux(etat)).toBe(2);
  });

  it('deux mensualités impayées : faillite, et le temps s’arrête', () => {
    const impayee = tick(partie(27, h(4, 55), { tresorerie: 300, reserve: 100 })).etat;
    // Toujours pas de quoi régulariser la première (100 € de réserve, rien en caisse) à la veille de la seconde.
    const veille = { ...impayee, jour: 55, minuteDuJour: h(4, 55), briefingJour: 55, tresorerie: 0, bilanMoisAVoir: false };
    const { etat, evenements } = tick(veille);
    expect(evenements).toContainEqual({ type: 'faillite', jour: 56 });
    expect(etat.finDePartie).toEqual({ raison: 'faillite', jour: 56 });
    const apres = tick(etat);
    expect(apres.evenements).toEqual([]);
    expect(apres.etat.minuteDuJour).toBe(etat.minuteDuJour);
  });

  it('une mensualité régularisée à temps évite la faillite à l’échéance suivante', () => {
    const impayee = tick(partie(27, h(4, 55), { tresorerie: 300, reserve: 100 })).etat;
    const veille = { ...impayee, jour: 55, minuteDuJour: h(4, 55), briefingJour: 55, tresorerie: 6000, bilanMoisAVoir: false };
    const { etat } = tick(veille);
    expect(etat.finDePartie).toBeNull();
    expect(etat.mensualitesPayees).toBe(2);
    expect(etat.tresorerie + etat.reserve).toBe(6100 - 2 * B.MENSUALITE);
  });
});
