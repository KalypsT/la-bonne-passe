import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { THEMES_SOIREE } from '../content/themes';
import { creerEtatInitial, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { accorderPalier } from './paliers';
import { arrivee, facteurDispute, modeleClient } from './soiree';
import { forceSiProgramme, themeDuSoir } from './themes';
import { appliquerOrdres, tick } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Palier 2, soirées à thème ouvertes, à l'heure du briefing du jour 10. */
function briefing(champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat: EtatJeu = { ...creerEtatInitial({ graine: 8 }), jour: 10, minuteDuJour: h(19), briefingJour: 9, nuitsBouclees: 9, tresorerie: 2000 };
  for (let p = 1; p <= 2; p++) accorderPalier(etat, p);
  etat.systemes.tendances = true;
  etat.systemes.themes = true;
  return { ...etat, annonces: [], visites: [], ...champs };
}

const programmer = (etat: EtatJeu, theme: string | null) => appliquerOrdres(etat, [{ type: 'validerBriefing', theme }]).etat;

/** La même soirée, en cours, avec un thème donné. */
function soireeAvec(theme: string | null, champs: Partial<EtatJeu> = {}): EtatJeu {
  const etat = programmer(briefing(), theme);
  return { ...etat, minuteDuJour: h(22), ...champs };
}

describe('programmer une soirée à thème', () => {
  it('au briefing : le thème se paie tout de suite et vaut pour ce soir', () => {
    const etat = programmer(briefing(), 'jazz');
    expect(etat.themeDuSoir).toBe('jazz');
    expect(etat.tresorerie).toBe(2000 - B.THEMES.jazz!.cout);
    expect(etat.semaine.comptes.depenses.themes).toBe(B.THEMES.jazz!.cout);
    expect(etat.semaine.themes).toEqual(['jazz']);
  });

  it('impossible avant leur ouverture, sans les moyens, ou pour un thème inconnu', () => {
    const ferme = briefing();
    ferme.systemes.themes = false;
    expect(programmer(ferme, 'jazz').themeDuSoir).toBeNull();
    expect(programmer(briefing({ tresorerie: 50 }), 'jazz').themeDuSoir).toBeNull();
    expect(programmer(briefing(), 'karaoke').themeDuSoir).toBeNull();
  });

  it('le briefing suivant repart sans thème, sauf à en programmer un', () => {
    const lendemain = { ...programmer(briefing(), 'jazz'), jour: 11, minuteDuJour: h(19) };
    expect(programmer(lendemain, null).themeDuSoir).toBeNull();
  });

  it('annoncé au journal à l’ouverture', () => {
    const etat = { ...programmer(briefing(), 'burlesque'), minuteDuJour: h(19, 55) };
    expect(tick(etat).evenements).toContainEqual({ type: 'theme', id: 'burlesque', montant: B.THEMES.burlesque!.cout });
  });

  it('chaque thème a ses textes', () => {
    for (const id of Object.keys(B.THEMES)) expect(THEMES_SOIREE.some((t) => t.id === id)).toBe(true);
  });
});

describe('lassitude', () => {
  it('un même thème répété dans la semaine perd la moitié de ses effets à chaque reprise', () => {
    let etat = programmer(briefing(), 'jazz');
    expect(themeDuSoir(etat)?.force).toBe(1);
    expect(forceSiProgramme(etat, 'jazz')).toBe(B.THEME_LASSITUDE);
    expect(forceSiProgramme(etat, 'masquee')).toBe(1);
    etat = programmer({ ...etat, jour: 11 }, 'jazz');
    expect(themeDuSoir(etat)?.force).toBe(B.THEME_LASSITUDE);
    etat = programmer({ ...etat, jour: 12 }, 'jazz');
    expect(themeDuSoir(etat)?.force).toBe(B.THEME_LASSITUDE ** 2);
  });

  it('une nouvelle semaine efface la lassitude', () => {
    const etat = programmer(briefing(), 'jazz');
    const lundi = tick({ ...etat, jour: 14, minuteDuJour: h(4, 55), briefingJour: 14 }).etat;
    expect(lundi.semaine.themes).toEqual([]);
    expect(forceSiProgramme(lundi, 'jazz')).toBe(1);
  });
});

describe('effets des thèmes', () => {
  const rdv = (modele: string) => ({ chambreId: 'boudoir', employeId: 'sanne', clientId: 1, modele, formule: 'standard' as const, duree: 60, restant: 5 });

  it('la soirée masquée attire les clients d’affaires', () => {
    const part = (etat: EtatJeu) => {
      const tirage = creerTirage(3);
      let n = 0;
      for (let i = 0; i < 300; i++) {
        const copie: EtatJeu = { ...structuredClone(etat), file: [] };
        arrivee(copie, tirage, { push: () => 0 });
        if (modeleClient(copie.file[0]?.modele ?? '').segment === 'affaires') n += 1;
      }
      return n;
    };
    expect(part(soireeAvec('masquee'))).toBeGreaterThan(part(soireeAvec(null)) * 1.4);
  });

  it('un supplément se paie ce soir-là, et le jazz apaise le quai', () => {
    const encaisse = (theme: string | null) => {
      const etat = soireeAvec(theme, { rendezVous: [rdv('retraite')] });
      return tick(etat).etat.semaine.comptes.recettes.rendezVous - etat.semaine.comptes.recettes.rendezVous;
    };
    expect(encaisse('masquee')).toBeGreaterThan(encaisse(null));
    const file = [{ id: 1, modele: 'fetard', patience: 50 }];
    expect(facteurDispute(soireeAvec('jazz', { file }))).toBeLessThan(facteurDispute(soireeAvec(null, { file })));
  });

  it('le burlesque fait parler de la maison : la satisfaction gagnée compte une fois et demie', () => {
    const gain = (theme: string | null) => {
      const etat = soireeAvec(theme, { rendezVous: [rdv('etudiant')] });
      return tick(etat).etat.clientele.satisfaction.touriste - etat.clientele.satisfaction.touriste;
    };
    expect(gain('burlesque')).toBeGreaterThan(gain(null) * 1.4);
  });

  it('les années folles vident la cave et fatiguent l’équipe', () => {
    const avecBar = (theme: string | null) => {
      const etat = soireeAvec(theme, { rendezVous: [rdv('fetard')] });
      etat.bar = { ouvert: true, travaux: null, stock: 30, commande: 0 };
      etat.equipes.bar = 1;
      const apres = tick(etat).etat;
      return { recette: apres.semaine.comptes.recettes.bar, fatigue: apres.personnel[0]!.fatigue - etat.personnel[0]!.fatigue };
    };
    expect(avecBar('anneesFolles').recette).toBe(Math.round(B.BAR_RECETTE.groupe * B.THEMES.anneesFolles!.bar));
    expect(avecBar('anneesFolles').fatigue).toBeGreaterThan(avecBar(null).fatigue);
  });
});

describe('ouverture', () => {
  it('les soirées à thème s’ouvrent avec les tendances, au premier lundi après le palier 2', () => {
    const etat = briefing({ jour: 7, minuteDuJour: h(4, 55), briefingJour: 7 });
    etat.systemes.tendances = false;
    etat.systemes.themes = false;
    expect(tick(etat).etat.systemes.themes).toBe(true);
  });
});
