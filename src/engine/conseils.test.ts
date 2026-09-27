import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { MILA } from '../content/candidats';
import { conseilDuMatin, matinDesConseils } from './conseils';
import { creerEtatInitial, type EtatJeu } from './etat';
import { accorderPalier } from './paliers';
import { candidatDepuis } from './recrutement';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;
/** Le matin du jour donné, palier 1 passé (la soirée guidée finie). */
function matin(jour: number, champs: Partial<EtatJeu> = {}): EtatJeu {
  const e: EtatJeu = { ...creerEtatInitial({ graine: 12 }), jour, minuteDuJour: h(5), briefingJour: jour - 1, nuitsBouclees: jour - 1 };
  accorderPalier(e, 1);
  return { ...e, annonces: [], visites: [], ...champs };
}

describe('les conseils de Josée', () => {
  it('au lendemain de la première nuit : rouvrir une chambre, en désignant la première sous les draps', () => {
    expect(conseilDuMatin(matin(2))).toEqual({ id: 'renover', chambreId: 'orientale' });
    // Pas sans la caisse pour la payer et garder une marge.
    expect(conseilDuMatin(matin(2, { tresorerie: B.RENOVATION.prix + B.CONSEILS.marge - 1 }))?.id).not.toBe('renover');
  });

  it('au troisième jour, Sanne seule et des candidats au salon : recruter', () => {
    const e = matin(3, { candidats: [{ ...candidatDepuis(MILA, 'visite', 10), questionPosee: null }] });
    e.conseils.vus = ['renover'];
    expect(conseilDuMatin(e)?.id).toBe('recruter');
    e.candidats = [];
    expect(conseilDuMatin(e)?.id).not.toBe('recruter');
  });

  it('le linge, une chambre usée, la réserve, chacun à son heure', () => {
    const e = matin(B.CONSEILS.jourReserve, { linge: 0 });
    e.conseils.vus = ['renover', 'renoverEncore', 'recruter', 'recruterEncore'];
    expect(conseilDuMatin(e)?.id).toBe('lingeAuto');
    e.conseils.vus.push('lingeAuto');
    e.chambres[0]!.etat = B.CONSEILS.etatRafraichir - 1;
    expect(conseilDuMatin(e)).toEqual({ id: 'rafraichir', chambreId: 'boudoir' });
    e.conseils.vus.push('rafraichir');
    expect(conseilDuMatin(e)?.id).toBe('reserve');
    e.tauxReserve = 0.1;
    expect(conseilDuMatin(e)).toBeNull();
  });

  it('une fois chacun, un par matin, jamais pendant la soirée guidée ni quand ils sont coupés', () => {
    const e = matin(2);
    matinDesConseils(e, []);
    expect(e.conseils.enCours?.id).toBe('renover');
    expect(e.conseils.vus).toEqual(['renover']);
    // Tant qu'il n'est pas lu, pas d'autre conseil.
    matinDesConseils(e, []);
    expect(e.conseils.vus).toEqual(['renover']);
    const lu = appliquerOrdres(e, [{ type: 'conseilVu' }]).etat;
    expect(lu.conseils.enCours).toBeNull();
    matinDesConseils(lu, []);
    expect(lu.conseils.enCours?.id).not.toBe('renover');

    const guide = matin(2, { didacticiel: 5 });
    matinDesConseils(guide, []);
    expect(guide.conseils.enCours).toBeNull();
    const coupe = appliquerOrdres(matin(2), [{ type: 'conseilsActifs', actifs: false }]).etat;
    matinDesConseils(coupe, []);
    expect(coupe.conseils.enCours).toBeNull();
  });

  it('passer le didacticiel coupe aussi les conseils', () => {
    const e = appliquerOrdres(creerEtatInitial({ didacticiel: true }), [{ type: 'passerDidacticiel' }]).etat;
    expect(e.didacticiel).toBeNull();
    expect(e.conseils.actifs).toBe(false);
    expect(appliquerOrdres(e, [{ type: 'conseilsActifs', actifs: true }]).etat.conseils.actifs).toBe(true);
  });

  it('Josée passe le matin, à 5 h, dans le déroulé du jeu', () => {
    const veille = matin(2, { minuteDuJour: h(4, 55), jour: 1, briefingJour: 1 });
    const { etat, evenements } = tick(veille);
    expect(evenements).toContainEqual({ type: 'conseil', id: 'renover' });
    expect(etat.conseils.enCours?.id).toBe('renover');
  });
});
