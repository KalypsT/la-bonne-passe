import { create } from 'zustand';
import { trouverAvatar } from '../content/avatars';
import { creerEtatInitial, type EtatJeu } from '../engine/etat';
import { nettoyerNom } from '../engine/identite';
import { tick } from '../engine/tick';
import { charger, lireEmplacements, sauvegarder, supprimer, type Emplacement } from '../save/emplacements';

export type Ecran = 'titre' | 'creation' | 'jeu';

export interface ChoixCreation {
  prenom: string;
  avatar: string;
  tenue: number;
  nomMaison: string;
}

interface EtatInterface {
  ecran: Ecran;
  emplacements: Emplacement[];
  emplacementActif: number | null;
  partie: EtatJeu | null;
  /** Emplacement dont la suppression attend une confirmation. */
  suppressionDemandee: number | null;

  /** Ouvre l'écran de création du personnage pour cet emplacement. */
  nouvellePartie: (emplacement: number) => void;
  /** Crée la partie à partir des choix (déjà validés) et l'ouvre. */
  creerPartie: (choix: ChoixCreation) => void;
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

  nouvellePartie: (emplacement) => set({ ecran: 'creation', emplacementActif: emplacement, partie: null }),

  creerPartie: ({ prenom, avatar, tenue, nomMaison }) => {
    const emplacement = get().emplacementActif;
    if (emplacement === null) return;
    const partie = creerEtatInitial({
      graine: Date.now(),
      joueur: { prenom: nettoyerNom(prenom), avatar, tenue, genre: trouverAvatar(avatar).genre },
      nomMaison: nettoyerNom(nomMaison),
    });
    sauvegarder(emplacement, partie, Date.now());
    set({ ecran: 'jeu', partie });
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
