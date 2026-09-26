import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { ACTEURS_ORDRE } from '../content/relations';
import { creerEtatInitial, type EtatJeu } from './etat';
import { prixLinge } from './linge';
import { accorderPalier } from './paliers';
import { acteursOuverts, facteurFournisseurs } from './relations';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

function partie(champs: Partial<EtatJeu> = {}, fournisseurs = 0): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 41 }), jour: 50, minuteDuJour: h(19), briefingJour: 49, nuitsBouclees: 49, mensualitesPayees: 1 };
  for (const p of [1, 2, 3]) accorderPalier(etat, p);
  etat.systemes.emprunt = true;
  etat.systemes.fournisseurs = true;
  etat.relations.jauges.fournisseurs = fournisseurs;
  return { ...etat, annonces: [], visites: [], candidats: [], ...champs };
}

describe('les fournisseurs, cinquième acteur', () => {
  it('ne comptent qu’une fois ouverts, au lundi qui suit l’emprunt', () => {
    const e = partie();
    e.systemes.fournisseurs = false;
    e.relations.jauges.fournisseurs = 80;
    expect(acteursOuverts(e)).not.toContain('fournisseurs');
    expect(facteurFournisseurs(e)).toBe(1);
    const lundi = tick({ ...e, jour: 49, minuteDuJour: h(4, 55), briefingJour: 49 }).etat;
    expect(lundi.systemes.fournisseurs).toBe(true);
    expect(lundi.bilanSemaine?.ouvertures).toContain('fournisseurs');
    expect(ACTEURS_ORDRE).toContain('fournisseurs');
  });

  it('en bons termes, prix d’ami ; en mauvais termes, prix gonflés', () => {
    const bons = valider(partie({}, 60));
    const neutres = valider(partie({}, 0));
    const mauvais = valider(partie({}, -60));
    expect(neutres).toBe(prixLinge(10));
    expect(bons).toBe(prixLinge(10, B.FOURNISSEURS.prixBons));
    expect(mauvais).toBe(prixLinge(10, B.FOURNISSEURS.prixMauvais));
    expect(bons).toBeLessThan(neutres);
    expect(mauvais).toBeGreaterThan(neutres);
  });

  it('en mauvais termes, une livraison express sur trois n’arrive pas, et ne se paie pas', () => {
    let ratees = 0;
    for (let i = 0; i < 60; i++) {
      const e = partie({ minuteDuJour: h(22), briefingJour: 50, hasardQuartier: i * 7919 }, -60);
      const { etat, evenements } = appliquerOrdres(e, [{ type: 'livraisonLinge' }]);
      if (evenements.some((x) => x.type === 'expressRatee')) {
        ratees += 1;
        expect(etat.tresorerie).toBe(e.tresorerie);
      }
    }
    expect(ratees).toBeGreaterThan(10);
    expect(ratees).toBeLessThan(35);
    const bons = appliquerOrdres(partie({ minuteDuJour: h(22), briefingJour: 50 }, 60), [{ type: 'livraisonLinge' }]);
    expect(bons.evenements.some((x) => x.type === 'expressRatee')).toBe(false);
  });

  it('aiment les commandes régulières ; fuient les maisons qui ne paient plus leurs équipes', () => {
    const e = partie();
    const apres = valider(e, true);
    expect(apres).toBeCloseTo(B.FOURNISSEURS.commande, 5);
    const impayes = partie({ minuteDuJour: h(11, 55), briefingJour: 50, tresorerie: -1990, equipes: { menage: 2, bar: 0, accueil: 0, securite: 0 } });
    const r = tick(impayes).etat;
    expect(r.relations.jauges.fournisseurs).toBeLessThan(0);
  });
});

/** Valide un briefing avec un pack de 10 parures : renvoie ce qu'il a coûté, ou la jauge des fournisseurs après. */
function valider(e: EtatJeu, jauge = false): number {
  const { etat } = appliquerOrdres(e, [{ type: 'validerBriefing', packLinge: 10 }]);
  return jauge ? etat.relations.jauges.fournisseurs - e.relations.jauges.fournisseurs : e.tresorerie - etat.tresorerie;
}
