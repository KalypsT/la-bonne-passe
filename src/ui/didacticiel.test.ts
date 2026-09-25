import { beforeEach, describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { ETAPES_DIDACTICIEL } from '../content/didacticiel';
import { creerEtatInitial } from '../engine/etat';
import { appliquerOrdres } from '../engine/tick';
import { useInterface } from './store';

const etat = () => useInterface.getState();
const etape = () => etat().partie?.didacticiel;

/** Fait passer du temps réel dans la boucle du jeu. */
function attendre(secondes: number) {
  for (let i = 0; i < secondes * 10; i++) etat().avancer(0.1);
}

describe('didacticiel : le moteur garde l’étape', () => {
  it('une partie avec didacticiel commence à 18 h, étape 0', () => {
    const partie = creerEtatInitial({ didacticiel: true });
    expect(partie.minuteDuJour).toBe(B.MINUTE_DE_DEPART_DIDACTICIEL);
    expect(partie.didacticiel).toBe(0);
    expect(creerEtatInitial().didacticiel).toBeNull();
  });

  it('l’ordre didacticiel range l’étape, ou la termine', () => {
    const partie = creerEtatInitial({ didacticiel: true });
    expect(appliquerOrdres(partie, [{ type: 'didacticiel', etape: 3 }]).etat.didacticiel).toBe(3);
    expect(appliquerOrdres(partie, [{ type: 'didacticiel', etape: null }]).etat.didacticiel).toBeNull();
  });

  it('chaque étape qui attend « suivant » a un bouton, et chaque carte parle', () => {
    for (const e of ETAPES_DIDACTICIEL) {
      if (e.attend === 'suivant') expect(e.bouton).toBeTruthy();
      if (e.pause) expect(e.texte).toBeTruthy();
    }
    expect(ETAPES_DIDACTICIEL.filter((e) => e.texte).length).toBeGreaterThanOrEqual(7);
  });
});

describe('didacticiel : la soirée guidée de Madame Josée', () => {
  beforeEach(() => {
    etat().nouvellePartie(0);
    etat().creerPartie({ prenom: 'Anouk', avatar: 'patronne-1', tenue: 0, nomMaison: 'La bonne passe' });
  });

  it('le temps attend pendant les explications', () => {
    const avant = etat().partie!.minuteDuJour;
    attendre(10);
    expect(etat().partie!.minuteDuJour).toBe(avant);
  });

  it('suit les 7 étapes, du Boudoir au premier palier', () => {
    etat().signalerDidacticiel('suivant'); // 1. Accueil
    etat().signalerDidacticiel('personnel'); // hors étape : ignoré
    expect(etape()).toBe(1);
    etat().ouvrirFiche({ type: 'chambre', id: 'boudoir' }); // 2. La maison
    etat().signalerDidacticiel('suivant');
    etat().choisirOnglet('personnel'); // 3. Le personnel
    etat().signalerDidacticiel('suivant');
    expect(ETAPES_DIDACTICIEL[etape()!]?.attend).toBe('vitesse');
    etat().choisirVitesse(4); // 4. Le temps
    attendre(5);
    expect(etat().carte).toBe('briefing'); // 5. Le briefing
    etat().validerBriefing({ offre: 'happy', commanderLinge: false, commanderBar: false, repos: [], rdvMax: 4 });
    expect(ETAPES_DIDACTICIEL[etape()!]?.attend).toBe('chambreSale');

    // 6. La première alerte : on joue jusqu'à la première chambre sale, en tranchant les cartes qui s'ouvrent.
    for (let i = 0; i < 400 && ETAPES_DIDACTICIEL[etape()!]?.attend === 'chambreSale'; i++) {
      attendre(1);
      if (etat().carte === 'imprevu') etat().ordonner({ type: 'choixImprevu', choix: 0 });
      if (etat().carte) etat().ouvrirCarte(null);
    }
    expect(ETAPES_DIDACTICIEL[etape()!]?.attend).toBe('bulle');
    const minute = etat().partie!.minuteDuJour;
    attendre(10);
    expect(etat().partie!.minuteDuJour).toBe(minute); // en pause sur l'alerte
    etat().signalerDidacticiel('bulle');
    const partie = etat().partie!;
    const sale = partie.chambres.find((c) => c.proprete < B.SEUIL_CHAMBRE_SALE && !partie.rendezVous.some((r) => r.chambreId === c.id))!;
    etat().ordonner({ type: 'nettoyageExpress', chambreId: sale.id });
    expect(ETAPES_DIDACTICIEL[etape()!]?.attend).toBe('suivant');
    etat().signalerDidacticiel('suivant');

    // 7. La fin de la nuit : bilan, puis carte du palier 1, qui termine le didacticiel.
    for (let i = 0; i < 800 && etat().carte !== 'palier'; i++) {
      attendre(1);
      if (etat().carte === 'imprevu') {
        etat().ordonner({ type: 'choixImprevu', choix: 0 });
        etat().ouvrirCarte(null);
      }
      if (etat().carte === 'bilan' || etat().carte === 'dispute') etat().ouvrirCarte(null);
    }
    expect(etat().carte).toBe('palier');
    expect(etape()).not.toBeNull();
    etat().ouvrirCarte(null);
    expect(etape()).toBeNull();
  });

  it('se passe à tout moment', () => {
    etat().choisirVitesse(0);
    etat().passerDidacticiel();
    expect(etape()).toBeNull();
    expect(etat().vitesse).toBe(1);
    const avant = etat().partie!.minuteDuJour;
    attendre(10);
    expect(etat().partie!.minuteDuJour).not.toBe(avant);
  });
});
