import { create } from 'zustand';
import { trouverAvatar } from '../content/avatars';
import { TEXTES } from '../content/textes';
import { creerEtatInitial, type EtatJeu } from '../engine/etat';
import { nettoyerNom } from '../engine/identite';
import { jourDeLaSemaine, secondesParTick } from '../engine/temps';
import { appliquerOrdres, tick, type EvenementMoteur } from '../engine/tick';
import { charger, lireEmplacements, sauvegarder, supprimer, type Emplacement } from '../save/emplacements';

export type Ecran = 'titre' | 'creation' | 'jeu';
export type Vitesse = 0 | 1 | 2 | 4;
export type Onglet = 'maison' | 'personnel' | 'clientele' | 'finances' | 'relations' | 'journal';
export type Fiche = { type: 'chambre'; id: string } | { type: 'piece'; id: 'salon' | 'bar' | 'bureau' };
export type Carte = 'briefing';

export interface ChoixCreation {
  prenom: string;
  avatar: string;
  tenue: number;
  nomMaison: string;
}

export interface EntreeJournal {
  jour: number;
  minuteDuJour: number;
  texte: string;
}

/** Nombre maximal de pas calculés par image, pour ne pas geler l'écran après une longue absence. */
const TICKS_MAX_PAR_IMAGE = 40;
const TAILLE_JOURNAL = 50;

interface EtatInterface {
  ecran: Ecran;
  emplacements: Emplacement[];
  emplacementActif: number | null;
  partie: EtatJeu | null;
  /** Emplacement dont la suppression attend une confirmation. */
  suppressionDemandee: number | null;

  vitesse: Vitesse;
  /** Carte ouverte par-dessus le jeu ; le temps est en pause tant qu'elle est là. */
  carte: Carte | null;
  onglet: Onglet;
  fiche: Fiche | null;
  journal: EntreeJournal[];

  /** Ouvre l'écran de création du personnage pour cet emplacement. */
  nouvellePartie: (emplacement: number) => void;
  /** Crée la partie à partir des choix (déjà validés) et l'ouvre. */
  creerPartie: (choix: ChoixCreation) => void;
  continuer: (emplacement: number) => void;
  demanderSuppression: (emplacement: number | null) => void;
  confirmerSuppression: () => void;
  sauvegarderPartie: () => void;
  retourTitre: () => void;

  choisirVitesse: (vitesse: Vitesse) => void;
  /** Appelée à chaque image avec le temps réel écoulé, en secondes. */
  avancer: (secondes: number) => void;
  validerBriefing: () => void;
  choisirOnglet: (onglet: Onglet) => void;
  ouvrirFiche: (fiche: Fiche | null) => void;
}

/** Temps réel accumulé en attente du prochain pas du moteur. Hors de l'état : il ne doit pas redessiner. */
let reserveDeTemps = 0;

function texteEvenement(evenement: EvenementMoteur, partie: EtatJeu): string {
  const t = TEXTES.journal;
  switch (evenement.type) {
    case 'ouverture':
      return t.ouverture(partie.maison.nom);
    case 'fermeture':
      return t.fermeture;
    case 'nouveauJour':
      return t.nouveauJour(TEXTES.jours[jourDeLaSemaine(evenement.jour)] ?? '', evenement.jour);
    case 'briefing':
      return t.briefing;
  }
}

const etatDeJeuInitial = {
  vitesse: 1 as Vitesse,
  carte: null,
  onglet: 'maison' as Onglet,
  fiche: null,
  journal: [],
};

export const useInterface = create<EtatInterface>((set, get) => ({
  ecran: 'titre',
  emplacements: lireEmplacements(),
  emplacementActif: null,
  partie: null,
  suppressionDemandee: null,
  ...etatDeJeuInitial,

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
    reserveDeTemps = 0;
    set({ ecran: 'jeu', partie, ...etatDeJeuInitial });
  },

  continuer: (emplacement) => {
    const partie = charger(emplacement);
    if (!partie) {
      set({ emplacements: lireEmplacements() });
      return;
    }
    reserveDeTemps = 0;
    set({ ecran: 'jeu', emplacementActif: emplacement, partie, ...etatDeJeuInitial });
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

  choisirVitesse: (vitesse) => set({ vitesse }),

  avancer: (secondes) => {
    const { partie, vitesse, carte } = get();
    if (!partie || vitesse === 0 || carte) return;
    reserveDeTemps += secondes * vitesse;

    let courante = partie;
    let nouvelleCarte: Carte | null = null;
    let fermeture = false;
    const nouvelles: EntreeJournal[] = [];

    for (let i = 0; i < TICKS_MAX_PAR_IMAGE; i++) {
      const duree = secondesParTick(courante);
      if (reserveDeTemps < duree) break;
      reserveDeTemps -= duree;
      const resultat = tick(courante);
      courante = resultat.etat;
      for (const evenement of resultat.evenements) {
        nouvelles.push({
          jour: courante.jour,
          minuteDuJour: courante.minuteDuJour,
          texte: texteEvenement(evenement, courante),
        });
        if (evenement.type === 'briefing') nouvelleCarte = 'briefing';
        if (evenement.type === 'fermeture') fermeture = true;
      }
      if (nouvelleCarte) {
        reserveDeTemps = 0;
        break;
      }
    }
    if (reserveDeTemps > 5) reserveDeTemps = 0;
    if (courante === partie && !nouvelleCarte) return;

    set((s) => ({
      partie: courante,
      carte: nouvelleCarte ?? s.carte,
      journal: nouvelles.length ? [...nouvelles.reverse(), ...s.journal].slice(0, TAILLE_JOURNAL) : s.journal,
    }));
    if (fermeture) get().sauvegarderPartie();
  },

  validerBriefing: () => {
    const { partie, vitesse } = get();
    if (!partie) return;
    reserveDeTemps = 0;
    set({
      partie: appliquerOrdres(partie, [{ type: 'validerBriefing' }]),
      carte: null,
      vitesse: vitesse === 0 ? 1 : vitesse,
    });
  },

  choisirOnglet: (onglet) => set({ onglet, fiche: null }),

  ouvrirFiche: (fiche) => set(fiche ? { fiche, onglet: 'maison' } : { fiche: null }),
}));
