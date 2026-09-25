import { describe, expect, it } from 'vitest';
import {
  HEURE_BRIEFING,
  HEURE_FERMETURE,
  HEURE_OUVERTURE,
  MINUTES_PAR_TICK,
  SECONDES_REELLES_JOURNEE,
  SECONDES_REELLES_SOIREE,
} from '../content/balance';
import { creerEtatInitial, type EtatJeu } from './etat';
import { tirer } from './hasard';
import { estOuvert, jourDeLaSemaine, momentDeLaJournee, secondesParTick } from './temps';
import { appliquerOrdres, tick, type EvenementMoteur } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie à une heure donnée, briefing du jour déjà validé. */
function partieA(minuteDuJour: number, jour = 1): EtatJeu {
  return { ...creerEtatInitial(), jour, minuteDuJour, briefingJour: jour };
}

/** Enchaîne n ticks en validant le briefing dès qu'il est demandé. */
function avancer(etat: EtatJeu, n: number) {
  const evenements: EvenementMoteur[] = [];
  let courant = etat;
  for (let i = 0; i < n; i++) {
    const r = tick(courant);
    evenements.push(...r.evenements);
    courant = r.evenements.some((e) => e.type === 'briefing')
      ? appliquerOrdres(r.etat, [{ type: 'validerBriefing' }]).etat
      : r.etat;
  }
  return { etat: courant, evenements };
}

describe('tick du moteur', () => {
  it('avance le temps de 5 minutes', () => {
    const avant = partieA(h(10));
    const { etat: apres } = tick(avant);
    expect(MINUTES_PAR_TICK).toBe(5);
    expect(apres.minuteDuJour - avant.minuteDuJour).toBe(5);
    expect(apres.jour).toBe(avant.jour);
  });

  it("ne modifie pas l'état reçu", () => {
    const avant = partieA(h(22));
    const copie = structuredClone(avant);
    tick(avant);
    expect(avant).toEqual(copie);
  });

  it('passe minuit sans changer de jour', () => {
    const { etat, evenements } = tick(partieA(h(23, 55)));
    expect(etat.minuteDuJour).toBe(0);
    expect(etat.jour).toBe(1);
    expect(evenements.filter((e) => e.type === 'nouveauJour')).toEqual([]);
  });

  it('change de jour à 5 h', () => {
    const { etat, evenements } = tick(partieA(h(4, 55)));
    expect(etat.minuteDuJour).toBe(h(5));
    expect(etat.jour).toBe(2);
    expect(evenements).toEqual([{ type: 'nouveauJour', jour: 2 }]);
  });
});

describe('briefing de 19 h', () => {
  it('une nouvelle partie commence au briefing, temps bloqué', () => {
    const debut = creerEtatInitial();
    expect(debut.minuteDuJour).toBe(HEURE_BRIEFING);
    const { etat, evenements } = tick(debut);
    expect(etat.minuteDuJour).toBe(HEURE_BRIEFING);
    expect(evenements).toEqual([{ type: 'briefing', jour: 1 }]);
  });

  it('annonce le briefing en arrivant à 19 h', () => {
    const avant = { ...partieA(h(18, 55), 2), briefingJour: 1 };
    const { etat, evenements } = tick(avant);
    expect(etat.minuteDuJour).toBe(HEURE_BRIEFING);
    expect(evenements).toEqual([{ type: 'briefing', jour: 2 }]);
    expect(tick(etat).etat.minuteDuJour).toBe(HEURE_BRIEFING);
  });

  it('reprend le temps une fois le briefing validé', () => {
    const valide = appliquerOrdres(creerEtatInitial(), [{ type: 'validerBriefing' }]).etat;
    expect(valide.briefingJour).toBe(1);
    expect(tick(valide).etat.minuteDuJour).toBe(HEURE_BRIEFING + 5);
  });

  it('ignore une validation hors du briefing', () => {
    const etat = { ...partieA(h(10), 2), briefingJour: 1 };
    expect(appliquerOrdres(etat, [{ type: 'validerBriefing' }]).etat).toEqual(etat);
  });
});

describe('ouverture et fermeture', () => {
  it('ouvre à 20 h et ferme à 4 h', () => {
    const { etat: ouverte, evenements } = tick(partieA(h(19, 55)));
    expect(evenements[0]).toEqual({ type: 'ouverture', jour: 1 });
    expect(estOuvert(ouverte)).toBe(true);
    expect(estOuvert(partieA(h(2)))).toBe(true);

    const fermeture = tick(partieA(h(3, 55)));
    expect(fermeture.evenements.filter((e) => e.type === 'fermeture')).toEqual([{ type: 'fermeture', jour: 1 }]);
    expect(estOuvert(fermeture.etat)).toBe(false);
    expect(HEURE_OUVERTURE).toBe(h(20));
    expect(HEURE_FERMETURE).toBe(h(4));
  });

  it("n'ouvre pas sans briefing", () => {
    expect(estOuvert({ ...partieA(h(21), 3), briefingJour: 2 })).toBe(false);
  });

  it('enchaîne une journée complète : briefing, ouverture, fermeture, nouveau jour', () => {
    const { etat, evenements } = avancer(creerEtatInitial(), 1 + (24 * 60) / MINUTES_PAR_TICK);
    const rythme = ['briefing', 'ouverture', 'fermeture', 'nouveauJour'];
    expect(evenements.map((e) => e.type).filter((t) => rythme.includes(t))).toEqual([...rythme, 'briefing']);
    expect(etat.jour).toBe(2);
    expect(etat.minuteDuJour).toBe(HEURE_BRIEFING);
  });

  it('donne le moment de la journée', () => {
    expect(momentDeLaJournee(partieA(h(12)))).toBe('journee');
    expect(momentDeLaJournee(creerEtatInitial())).toBe('briefing');
    expect(momentDeLaJournee(partieA(h(23)))).toBe('soiree');
    expect(momentDeLaJournee(partieA(h(4, 30)))).toBe('nuit');
  });
});

describe('rythme en temps réel', () => {
  /** Durée réelle, à ×1, pour aller d'une heure à une autre. */
  function dureeReelle(etat: EtatJeu, jusqua: number): number {
    let secondes = 0;
    let courant = etat;
    while (courant.minuteDuJour !== jusqua) {
      secondes += secondesParTick(courant);
      courant = tick(courant).etat;
    }
    return secondes;
  }

  it('la soirée dure environ 6 minutes à ×1', () => {
    expect(dureeReelle(partieA(h(20)), h(4))).toBeCloseTo(SECONDES_REELLES_SOIREE);
    expect(SECONDES_REELLES_SOIREE).toBe(360);
  });

  it('la journée, de 5 h à 19 h, dure environ 45 secondes', () => {
    expect(dureeReelle({ ...partieA(h(5), 2), briefingJour: 1 }, h(19))).toBeCloseTo(SECONDES_REELLES_JOURNEE);
  });
});

describe('calendrier', () => {
  it('le jour 1 est un lundi', () => {
    expect(jourDeLaSemaine(1)).toBe(0);
    expect(jourDeLaSemaine(7)).toBe(6);
    expect(jourDeLaSemaine(8)).toBe(0);
  });
});

describe('état de départ', () => {
  it('une seule chambre en service, le Boudoir, et les onglets de départ', () => {
    const etat = creerEtatInitial();
    expect(etat.chambres.filter((c) => c.ouverte).map((c) => c.id)).toEqual(['boudoir']);
    expect(etat.chambres).toHaveLength(4);
    expect(etat.palier).toBe(0);
    expect(etat.systemes).toMatchObject({ personnel: true, finances: true, clientele: false, relations: false });
  });
});

describe('hasard à graine fixe', () => {
  it('rejoue la même suite avec la même graine', () => {
    const suite = (graine: number) => {
      let etat = graine;
      return Array.from({ length: 5 }, () => {
        const r = tirer(etat);
        etat = r.etat;
        return r.valeur;
      });
    };
    expect(suite(42)).toEqual(suite(42));
    expect(suite(42)).not.toEqual(suite(43));
    for (const v of suite(7)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
