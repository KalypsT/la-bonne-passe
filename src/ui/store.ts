import { create } from 'zustand';
import { creerEtatInitial, type EtatJeu } from '../engine/etat';
import { tick } from '../engine/tick';
import { charger, lireEmplacements, sauvegarder, supprimer, type Emplacement } from '../save/emplacements';

export type Ecran = 'titre' | 'jeu';

interface EtatInterface {
  ecran: Ecran;
  emplacements: Emplacement[];
  emplacementActif: number | null;
  partie: EtatJeu | null;
  /** Emplacement dont la suppression attend une confirmation. */
  suppressionDemandee: number | null;

  nouvellePartie: (emplacement: number) => void;
  continuer: (emplacement: number) => void;
  demanderSuppression: (emplacement: number | null) => void;
  confirmerSuppression: () => void;
  sauvegarderPartie: () => void;
  retourTitre: () => void;
  /** Provisoire, en attendant l'horloge du jeu : avance de 12 pas de 5 minutes. */
  avancerUneHeure: () => void;
}

export const useInterface = create<EtatInterface>((set, get) => ({
  ecran: 'titre',
  emplacements: lireEmplacements(),
  emplacementActif: null,
  partie: null,
  suppressionDemandee: null,

  nouvellePartie: (emplacement) => {
    const partie = creerEtatInitial({ graine: Date.now() });
    sauvegarder(emplacement, partie, Date.now());
    set({ ecran: 'jeu', emplacementActif: emplacement, partie });
  },

  continuer: (emplacement) => {
    const partie = charger(emplacement);
    if (!partie) {
      set({ emplacements: lireEmplacements() });
      return;
    }
    set({ ecran: 'jeu', emplacementActif: emplacement, partie });
  },

  demanderSuppression: (emplacement) => set({ suppressionDemandee: emplacement }),

  confirmerSuppression: () => {
    const emplacement = get().suppressionDemandee;
    if (emplacement !== null) supprimer(emplacement);
    set({ suppressionDemandee: null, emplacements: lireEmplacements() });
  },

  sauvegarderPartie: () => {
    const { emplacementActif, partie } = get();
    if (emplacementActif !== null && partie) sauvegarder(emplacementActif, partie, Date.now());
  },

  retourTitre: () => {
    get().sauvegarderPartie();
    set({ ecran: 'titre', emplacementActif: null, partie: null, emplacements: lireEmplacements() });
  },

  avancerUneHeure: () => {
    let partie = get().partie;
    if (!partie) return;
    for (let i = 0; i < 12; i++) partie = tick(partie).etat;
    set({ partie });
  },
}));
