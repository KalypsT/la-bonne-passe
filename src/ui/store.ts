import { create } from 'zustand';
import { trouverAvatar } from '../content/avatars';
import type { Offre, Segment } from '../content/clientele';
import { ETAPES_DIDACTICIEL, type AttenteDidacticiel } from '../content/didacticiel';
import { alertes } from '../engine/alertes';
import { creerEtatInitial, type EtatJeu, type Nuit } from '../engine/etat';
import { nettoyerNom } from '../engine/identite';
import { secondesParTick } from '../engine/temps';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from '../engine/tick';
import { charger, lireEmplacements, sauvegarder, supprimer, type Emplacement } from '../save/emplacements';
import { formaterEuros } from './format';

export type Ecran = 'titre' | 'creation' | 'jeu';
export type Vitesse = 0 | 1 | 2 | 4;
export type Onglet = 'maison' | 'personnel' | 'clientele' | 'finances' | 'relations' | 'journal';
export type Fiche =
  | { type: 'chambre'; id: string }
  | { type: 'piece'; id: 'salon' | 'bar' | 'bureau' }
  | { type: 'employe'; id: string }
  | { type: 'segment'; id: Segment }
  | { type: 'regles'; id: 'regles' };
export type Carte =
  | 'briefing'
  | 'bilan'
  | 'dispute'
  | 'palier'
  | 'nouveautes'
  | 'grossiste'
  | 'entretien'
  | 'essai'
  | 'imprevu'
  | 'entretienIndividuel'
  | 'adieu'
  | 'aide';

export interface ChoixCreation {
  prenom: string;
  avatar: string;
  tenue: number;
  nomMaison: string;
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
  /** Candidat reçu dans la carte d'entretien. */
  candidatOuvert: string | null;
  /** Personne reçue en entretien individuel. */
  employeOuvert: string | null;
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
  validerBriefing: (choix: { offre: Offre; commanderLinge: boolean; commanderBar: boolean; repos: string[]; rdvMax: number }) => void;
  /** Envoie un ordre au moteur (nettoyage, linge, repos, dispute), sans faire avancer le temps. */
  ordonner: (ordre: Ordre) => void;
  /** Ouvre une carte ; fermer (null) passe à la carte en attente, comme une annonce de palier. */
  ouvrirCarte: (carte: Carte | null) => void;
  choisirOnglet: (onglet: Onglet) => void;
  /** Reçoit un candidat en entretien (carte en pause). */
  ouvrirEntretien: (candidatId: string) => void;
  /** Reçoit une personne de l'équipe en entretien individuel (carte en pause). */
  ouvrirEntretienIndividuel: (employeId: string) => void;
  /** Signale au didacticiel une action du joueur ; l'étape avance si c'est celle qu'elle attendait. */
  signalerDidacticiel: (attente: AttenteDidacticiel) => void;
  passerDidacticiel: () => void;
  ouvrirFiche: (fiche: Fiche | null) => void;
}

type Modifier = (fn: (s: EtatInterface) => Partial<EtatInterface>) => void;

/** Temps réel accumulé en attente du prochain pas du moteur. Hors de l'état : il ne doit pas redessiner. */
let reserveDeTemps = 0;
let prochainMontant = 1;

/** Carte qui attend son tour une fois la carte courante fermée. */
function carteEnAttente(partie: EtatJeu | null): Carte | null {
  if (!partie) return null;
  if (partie.imprevu) return 'imprevu';
  if (partie.avance.statut === 'proposee') return 'grossiste';
  if (partie.annonces.length > 0) return 'palier';
  if (partie.nouveautes.length > 0) return 'nouveautes';
  if (partie.adieux.length > 0) return 'adieu';
  if (partie.essaisATrancher.length > 0) return 'essai';
  return null;
}

/** Étape du didacticiel en cours, ou null. */
function etapeDidacticiel(partie: EtatJeu | null) {
  return partie && partie.didacticiel !== null ? (ETAPES_DIDACTICIEL[partie.didacticiel] ?? null) : null;
}

/** Événements qui mettent le jeu en pause et ouvrent une carte. */
const EVENEMENTS_EN_PAUSE = new Set<EvenementMoteur['type']>(['briefing', 'bilan', 'visite', 'finEssai', 'imprevu', 'depart', 'grossiste']);

/** Traduit les événements en montants flottants et en cartes à ouvrir. Le journal, lui, vit dans la partie. */
function recevoirEvenements(evenements: EvenementMoteur[], modifier: Modifier) {
  const montants: MontantFlottant[] = [];
  let carte: Carte | null = null;
  let bilan: Nuit | null = null;
  let candidat: string | null = null;

  for (const e of evenements) {
    if (e.type === 'briefing') carte = 'briefing';
    if (e.type === 'visite') {
      carte = 'entretien';
      candidat = e.candidatId;
    }
    if (e.type === 'imprevu') carte = 'imprevu';
    if (e.type === 'grossiste') carte = 'grossiste';
    if (e.type === 'depart' && !carte) carte = 'adieu';
    if (e.type === 'finEssai' && !carte) carte = 'essai';
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

  if (montants.length) {
    modifier((s) => ({ montants: [...s.montants, ...montants] }));
    const ids = new Set(montants.map((m) => m.id));
    setTimeout(() => modifier((s) => ({ montants: s.montants.filter((m) => !ids.has(m.id)) })), DUREE_MONTANT);
  }
  return { carte, bilan, candidat };
}

const etatDeJeuInitial = {
  vitesse: 1 as Vitesse,
  carte: null,
  onglet: 'maison' as Onglet,
  fiche: null,
  candidatOuvert: null,
  employeOuvert: null,
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
      didacticiel: true,
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
    set({ ecran: 'jeu', emplacementActif: emplacement, partie, ...etatDeJeuInitial, carte: carteEnAttente(partie) });
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

  choisirVitesse: (vitesse) => {
    set({ vitesse });
    if (vitesse > 0) get().signalerDidacticiel('vitesse');
  },

  avancer: (secondes) => {
    const { partie, vitesse, carte } = get();
    if (!partie || vitesse === 0 || carte) return;
    // Josée parle : le temps attend.
    if (etapeDidacticiel(partie)?.pause) return;
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
      if (resultat.evenements.some((e) => EVENEMENTS_EN_PAUSE.has(e.type))) {
        reserveDeTemps = 0;
        break;
      }
    }
    if (reserveDeTemps > 5) reserveDeTemps = 0;
    if (courante === partie && evenements.length === 0) return;
    // Didacticiel : à la première chambre sale et libre (pour pouvoir la nettoyer), le jeu se met en pause.
    const saleEtLibre = (c: EtatJeu) =>
      alertes(c).some((a) => a.type === 'chambreSale' && !c.rendezVous.some((r) => r.chambreId === a.chambreId));
    if (etapeDidacticiel(courante)?.attend === 'chambreSale' && saleEtLibre(courante)) {
      courante = appliquerOrdres(courante, [{ type: 'didacticiel', etape: (courante.didacticiel ?? 0) + 1 }]).etat;
      reserveDeTemps = 0;
    }

    const { carte: nouvelleCarte, bilan, candidat } = recevoirEvenements(evenements, set);
    set((s) => ({
      partie: courante,
      carte: nouvelleCarte ?? s.carte,
      bilan: bilan ?? s.bilan,
      candidatOuvert: candidat ?? s.candidatOuvert,
    }));
    if (bilan) get().sauvegarderPartie();
  },

  validerBriefing: ({ offre, commanderLinge, commanderBar, repos, rdvMax }) => {
    const { partie, vitesse } = get();
    if (!partie) return;
    reserveDeTemps = 0;
    const resultat = appliquerOrdres(partie, [{ type: 'validerBriefing', offre, commanderLinge, commanderBar, repos, rdvMax }]);
    set({ partie: resultat.etat, carte: null, vitesse: vitesse === 0 ? 1 : vitesse });
    get().signalerDidacticiel('briefing');
    get().sauvegarderPartie();
  },

  ordonner: (ordre) => {
    const { partie } = get();
    if (!partie) return;
    const resultat = appliquerOrdres(partie, [ordre]);
    recevoirEvenements(resultat.evenements, set);
    set({ partie: resultat.etat });
    if (ordre.type === 'nettoyageExpress' && resultat.evenements.some((e) => e.type === 'nettoyage')) {
      get().signalerDidacticiel('nettoyage');
    }
    // L'entretien se referme quand le candidat n'attend plus (embauché, refusé ou parti).
    const { carte, candidatOuvert } = get();
    if (carte === 'entretien' && !resultat.etat.candidats.some((c) => c.id === candidatOuvert)) {
      get().ouvrirCarte(null);
      get().sauvegarderPartie();
    }
  },

  ouvrirCarte: (carte) => {
    const { partie, carte: actuelle } = get();
    let suite = carte ?? carteEnAttente(partie);
    // Fermer une annonce, des nouveautés ou un adieu : le moteur les marque comme vus, puis on passe à la suite.
    const vus = { palier: 'annonceVue', nouveautes: 'nouveautesVues', adieu: 'adieuVu' } as const;
    if (!carte && partie && (actuelle === 'palier' || actuelle === 'nouveautes' || actuelle === 'adieu')) {
      const resultat = appliquerOrdres(partie, [{ type: vus[actuelle] }]);
      set({ partie: resultat.etat });
      suite = carteEnAttente(resultat.etat);
    }
    set({ carte: suite });
    if (!carte && actuelle === 'palier') get().signalerDidacticiel('palier');
  },

  choisirOnglet: (onglet) => {
    set({ onglet, fiche: null });
    if (onglet === 'personnel') get().signalerDidacticiel('personnel');
  },

  ouvrirEntretien: (candidatId) => set({ carte: 'entretien', candidatOuvert: candidatId }),

  ouvrirEntretienIndividuel: (employeId) => set({ carte: 'entretienIndividuel', employeOuvert: employeId }),

  ouvrirFiche: (fiche) => {
    const onglet: Onglet = fiche?.type === 'employe' ? 'personnel' : fiche?.type === 'segment' || fiche?.type === 'regles' ? 'clientele' : 'maison';
    set(fiche ? { fiche, onglet } : { fiche: null });
    if (fiche?.type === 'chambre' && fiche.id === 'boudoir') get().signalerDidacticiel('boudoir');
  },

  signalerDidacticiel: (attente) => {
    const { partie } = get();
    const etape = etapeDidacticiel(partie);
    if (!partie || !etape || etape.attend !== attente) return;
    const suivante = (partie.didacticiel ?? 0) + 1;
    const fin = suivante >= ETAPES_DIDACTICIEL.length;
    set({ partie: appliquerOrdres(partie, [{ type: 'didacticiel', etape: fin ? null : suivante }]).etat });
    reserveDeTemps = 0;
    if (fin) get().sauvegarderPartie();
  },

  passerDidacticiel: () => {
    const { partie, vitesse } = get();
    if (!partie) return;
    set({ partie: appliquerOrdres(partie, [{ type: 'didacticiel', etape: null }]).etat, vitesse: vitesse === 0 ? 1 : vitesse });
    get().sauvegarderPartie();
  },
}));
