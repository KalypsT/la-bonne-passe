// Garde d'équilibrage de la deuxième maison (v1.0, partie 1) : chaque lieu se rembourse en 6 à 9 mois (26 à 39 semaines),
// tenu par Margot en consigne équilibrée, la maison d'origine à 70 de réputation. Voir docs/EQUILIBRAGE.md.

import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { LIEUX } from '../content/agrandir';
import { creerEtatInitial, type EtatJeu } from './etat';
import { appliquerOrdres } from './tick';
import { semaineMaison2 } from './maison2';

function ouverte(lieu: (typeof LIEUX)[number], graine: number, consigne: B.IdConsigne = 'equilibree'): EtatJeu {
  let e: EtatJeu = { ...creerEtatInitial({ graine }), reputation: 70, tresorerie: 50000 };
  e.systemes.maison2 = true;
  e.etablissement = { offres: [{ id: lieu.id, achat: lieu.achat, travaux: lieu.travaux, jours: lieu.jours }], lieu: lieu.id, statut: 'pret', fin: 0 };
  e = appliquerOrdres(e, [{ type: 'confierMaison', employeId: 'externe' }, { type: 'inaugurer' }]).etat;
  e.maison2.consigne = consigne;
  e.maison2.consigneSemaine = consigne;
  return e;
}

/** Semaines pour rembourser l'achat, les travaux et l'inauguration (60 au plus). */
function semainesPourRembourser(lieu: (typeof LIEUX)[number], graine: number): number {
  const e = ouverte(lieu, graine);
  const cout = lieu.achat + lieu.travaux + B.MAISON2.inauguration;
  for (let s = 1; s <= 60; s++) {
    e.maison2.nuitsSemaine = 7;
    semaineMaison2(e, []);
    if (e.maison2.total >= cout) return s;
  }
  return 60;
}

describe('équilibrage de la deuxième maison', () => {
  it('chaque lieu se rembourse en 6 à 9 mois, montée de la réputation comprise (mesuré : 29 à 33 semaines)', () => {
    for (const lieu of LIEUX) {
      const semaines = [1, 2, 3, 4, 5].map((g) => semainesPourRembourser(lieu, g));
      const moyenne = semaines.reduce((a, b) => a + b, 0) / semaines.length;
      expect(moyenne, lieu.id).toBeGreaterThanOrEqual(26);
      expect(moyenne, lieu.id).toBeLessThanOrEqual(39);
    }
  });

  it('la consigne ambitieuse rapporte plus au début, mais Margot finit par partir', () => {
    const lieu = LIEUX[0]!;
    const e = ouverte(lieu, 3, 'ambitieuse');
    const p = ouverte(lieu, 3, 'equilibree');
    for (let s = 0; s < 6; s++) {
      e.maison2.nuitsSemaine = 7;
      p.maison2.nuitsSemaine = 7;
      semaineMaison2(e, []);
      semaineMaison2(p, []);
    }
    expect(e.maison2.bilans.reduce((t, b) => t + b.rendezVous, 0)).toBeGreaterThan(p.maison2.bilans.reduce((t, b) => t + b.rendezVous, 0));
    let semaines = 6;
    while (e.maison2.gerante && semaines < 30) {
      e.maison2.nuitsSemaine = 7;
      semaineMaison2(e, []);
      semaines += 1;
    }
    // 45 de loyauté, −2 par semaine : elle se sert dans la caisse sous 40, et s'en va sous 20, vers la treizième semaine.
    expect(e.maison2.gerante).toBeNull();
    expect(semaines).toBeLessThanOrEqual(14);
  });
});
