import { create } from 'zustand';
import { trouverAvatar } from '../content/avatars';
import type { Offre } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import { SANNE } from '../content/personnel';
import { TEXTES } from '../content/textes';
import { creerEtatInitial, type EtatJeu, type Nuit } from '../engine/etat';
import { nettoyerNom } from '../engine/identite';
import { jourDeLaSemaine, secondesParTick } from '../engine/temps';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from '../engine/tick';
import { charger, lireEmplacements, sauvegarder, supprimer, type Emplacement } from '../save/emplacements';
import { formaterEuros } from './format';

export type Ecran = 'titre' | 'creation' | 'jeu';
export type Vitesse = 0 | 1 | 2 | 4;
export type Onglet = 'maison' | 'personnel' | 'clientele' | 'finances' | 'relations' | 'journal';
export type Fiche = { type: 'chambre'; id: string } | { type: 'piece'; id: 'salon' | 'bar' | 'bureau' };
export type Carte = 'briefing' | 'bilan' | 'dispute';

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

/** Montant qui s'envole au-dessus d'une chambre, purement visuel. */
export interface MontantFlottant {
  id: number;
  chambreId: string;
  texte: string;
  positif: boolean;
}

/** Nombre maximal de pas calculés par image, pour ne pas geler l'écran après une longue absence. */
const TICKS_MAX_PAR_IMAGE = 40;
const TAILLE_JOURNAL = 50;
const DUREE_MONTANT = 1800;

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
  /** Comptes de la dernière nuit, affichés dans la carte de bilan. */
  bilan: Nuit | null;
  montants: MontantFlottant[];

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
  validerBriefing: (choix: { offre: Offre; commanderLinge: boolean }) => void;
  /** Envoie un ordre au moteur (nettoyage, linge, repos, dispute), sans faire avancer le temps. */
  ordonner: (ordre: Ordre) => void;
  ouvrirCarte: (carte: Carte | null) => void;
  choisirOnglet: (onglet: Onglet) => void;
  ouvrirFiche: (fiche: Fiche | null) => void;
}

type Modifier = (fn: (s: EtatInterface) => Partial<EtatInterface>) => void;

/** Temps réel accumulé en attente du prochain pas du moteur. Hors de l'état : il ne doit pas redessiner. */
let reserveDeTemps = 0;
let prochainMontant = 1;

function prenomEmploye(id: string): string {
  return id === SANNE.id ? SANNE.prenom : id;
}

/** Texte du journal pour un événement du moteur, ou null s'il n'y a rien à raconter. */
function texteEvenement(evenement: EvenementMoteur, partie: EtatJeu): string | null {
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
    case 'arrivee':
      return t.arrivee(evenement.client);
    case 'clientParti':
      return t.clientParti(evenement.client);
    case 'filePleine':
      return t.filePleine;
    case 'debutRdv':
      return t.debutRdv(prenomEmploye(evenement.employeId), evenement.client, trouverChambre(evenement.chambreId)?.dans ?? '');
    case 'finRdv':
      return t.finRdv(evenement.client, evenement.avis, formaterEuros(evenement.montant));
    case 'salaires':
      return t.salaires(formaterEuros(evenement.montant));
    case 'charges':
      return t.charges(formaterEuros(evenement.montant));
    case 'dispute':
      return t.dispute;
    case 'disputeDegeneree':
      return t.disputeDegeneree(formaterEuros(evenement.montant));
    case 'disputeReglee':
      if (evenement.choix === 'verre') return t.disputeVerre;
      return evenement.reussite ? t.disputeCalmee(partie.joueur.prenom) : t.disputeRatee;
    case 'nettoyage':
      return t.nettoyage(trouverChambre(evenement.chambreId)?.de ?? '', formaterEuros(evenement.montant));
    case 'livraisonLinge':
      return t.livraisonLinge(formaterEuros(evenement.montant));
    case 'repos':
      return t.repos(prenomEmploye(evenement.employeId));
    case 'bilan':
      return null;
  }
}

/** Traduit les événements en entrées de journal, montants flottants et cartes à ouvrir. */
function recevoirEvenements(evenements: EvenementMoteur[], partie: EtatJeu, modifier: Modifier) {
  const entrees: EntreeJournal[] = [];
  const montants: MontantFlottant[] = [];
  let carte: Carte | null = null;
  let bilan: Nuit | null = null;

  for (const e of evenements) {
    const texte = texteEvenement(e, partie);
    if (texte) entrees.push({ jour: partie.jour, minuteDuJour: partie.minuteDuJour, texte });
    if (e.type === 'briefing') carte = 'briefing';
    if (e.type === 'bilan') {
      carte = 'bilan';
      bilan = e.nuit;
    }
    if (e.type === 'finRdv') {
      montants.push({ id: prochainMontant++, chambreId: e.chambreId, texte: `+${formaterEuros(e.montant)}`, positif: true });
    }
    if (e.type === 'nettoyage') {
      montants.push({ id: prochainMontant++, chambreId: e.chambreId, texte: `−${formaterEuros(e.montant)}`, positif: false });
    }
  }

  if (entrees.length || montants.length) {
    modifier((s) => ({
      journal: [...entrees.reverse(), ...s.journal].slice(0, TAILLE_JOURNAL),
      montants: [...s.montants, ...montants],
    }));
  }
  if (montants.length) {
    const ids = new Set(montants.map((m) => m.id));
    setTimeout(() => modifier((s) => ({ montants: s.montants.filter((m) => !ids.has(m.id)) })), DUREE_MONTANT);
  }
  return { carte, bilan };
}

const etatDeJeuInitial = {
  vitesse: 1 as Vitesse,
  carte: null,
  onglet: 'maison' as Onglet,
  fiche: null,
  journal: [],
  bilan: null,
  montants: [],
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
    const evenements: EvenementMoteur[] = [];
    for (let i = 0; i < TICKS_MAX_PAR_IMAGE; i++) {
      const duree = secondesParTick(courante);
      if (reserveDeTemps < duree) break;
      reserveDeTemps -= duree;
      const resultat = tick(courante);
      courante = resultat.etat;
      evenements.push(...resultat.evenements);
      // Une carte met le jeu en pause : on s'arrête là.
      if (resultat.evenements.some((e) => e.type === 'briefing' || e.type === 'bilan')) {
        reserveDeTemps = 0;
        break;
      }
    }
    if (reserveDeTemps > 5) reserveDeTemps = 0;
    if (courante === partie && evenements.length === 0) return;

    const { carte: nouvelleCarte, bilan } = recevoirEvenements(evenements, courante, set);
    set((s) => ({ partie: courante, carte: nouvelleCarte ?? s.carte, bilan: bilan ?? s.bilan }));
    if (bilan) get().sauvegarderPartie();
  },

  validerBriefing: ({ offre, commanderLinge }) => {
    const { partie, vitesse } = get();
    if (!partie) return;
    reserveDeTemps = 0;
    const resultat = appliquerOrdres(partie, [{ type: 'validerBriefing', offre, commanderLinge }]);
    set({ partie: resultat.etat, carte: null, vitesse: vitesse === 0 ? 1 : vitesse });
    get().sauvegarderPartie();
  },

  ordonner: (ordre) => {
    const { partie } = get();
    if (!partie) return;
    const resultat = appliquerOrdres(partie, [ordre]);
    recevoirEvenements(resultat.evenements, resultat.etat, set);
    set({ partie: resultat.etat });
  },

  ouvrirCarte: (carte) => set({ carte }),

  choisirOnglet: (onglet) => set({ onglet, fiche: null }),

  ouvrirFiche: (fiche) => set(fiche ? { fiche, onglet: 'maison' } : { fiche: null }),
}));
