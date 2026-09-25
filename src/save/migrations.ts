import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  HEURE_BRIEFING,
  HEURE_DEBUT_JOURNEE,
  PROPRETE_CHAMBRE_OUVERTE,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
} from '../content/balance';
import { CHAMBRES } from '../content/maison';
import { SANNE } from '../content/personnel';
import {
  creerEmploye,
  maisonDeDepart,
  personnelDeDepart,
  recrutementDeDepart,
  soireeDeDepart,
  suiviDeDepart,
} from '../engine/etat';
import { cleAffinite } from '../engine/personnel';
import { clienteleDeDepart, type ParSegment } from '../engine/clientele';
import { numeroSemaine, semaineDeDepart } from '../engine/semaine';
import { SYSTEMES_PAR_PALIER } from '../engine/paliers';
import { planifierVisitesScenarisees } from '../engine/recrutement';
import { PARTIE_PAR_DEFAUT } from '../content/partie';
import { barDeDepart, reglesDeDepart, VERSION_ETAT, type EtatJeu } from '../engine/etat';

type Donnees = Record<string, unknown>;

/**
 * MIGRATIONS[n] transforme une sauvegarde de version n en version n + 1.
 * Ne jamais modifier une migration existante : en ajouter une nouvelle.
 */
const MIGRATIONS: Record<number, (d: Donnees) => Donnees> = {
  // v1 → v2 : ajout du joueur, de la maison, du chapitre et de la trésorerie.
  1: (d) => ({
    ...d,
    version: 2,
    joueur: {
      prenom: PARTIE_PAR_DEFAUT.prenom,
      avatar: PARTIE_PAR_DEFAUT.avatar,
      genre: PARTIE_PAR_DEFAUT.genre,
    },
    maison: { nom: PARTIE_PAR_DEFAUT.nomMaison, ville: PARTIE_PAR_DEFAUT.ville },
    chapitre: 1,
    tresorerie: TRESORERIE_INITIALE,
  }),
  // v2 → v3 : ajout de la variante de tenue de l'avatar.
  2: (d) => ({
    ...d,
    version: 3,
    joueur: { ...(estObjet(d.joueur) ? d.joueur : {}), tenue: 0 },
  }),
  // v3 → v4 : horloge avec briefing, réputation, chambres, palier et systèmes.
  // Le jour change désormais à 5 h et non plus à minuit.
  3: ({ paliers: _paliers, ...d }) => {
    const minute = typeof d.minuteDuJour === 'number' ? d.minuteDuJour : HEURE_BRIEFING;
    const jourBrut = typeof d.jour === 'number' ? d.jour : 1;
    const jour = minute < HEURE_DEBUT_JOURNEE && jourBrut > 1 ? jourBrut - 1 : jourBrut;
    // Une partie sauvegardée après 19 h est considérée comme briefée ; à 19 h pile, le briefing reste à faire.
    const briefe = minute !== HEURE_BRIEFING && (minute > HEURE_BRIEFING || minute < HEURE_DEBUT_JOURNEE);
    return {
      ...d,
      version: 4,
      jour,
      palier: 0,
      systemes: {
        personnel: true,
        finances: true,
        clientele: false,
        relations: false,
        recrutement: false,
        renovation: false,
        bar: false,
      },
      reputation: REPUTATION_INITIALE,
      briefingJour: briefe ? jour : jour - 1,
      chambres: CHAMBRES.map((c) => ({
        id: c.id,
        ouverte: c.ouverteAuDepart,
        proprete: c.ouverteAuDepart ? PROPRETE_CHAMBRE_OUVERTE : 0,
        etat: c.ouverteAuDepart ? ETAT_CHAMBRE_OUVERTE : ETAT_CHAMBRE_FERMEE,
      })),
    };
  },
  // v4 → v5 : Sanne, l'équipe de ménage, le linge, l'offre du soir et la vie de la soirée.
  // Une partie sauvegardée en pleine soirée reprend avec un quai vide.
  4: (d) => ({
    ...d,
    ...soireeDeDepart(),
    version: 5,
  }),
  // v5 → v6 : travaux dans les chambres, réserve, mensualités, annonces de palier et journal.
  // Une partie qui a déjà bouclé une nuit reçoit le palier 1, avec sa carte d'annonce.
  5: (d) => {
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), planning: false, reserve: false };
    const chambres = Array.isArray(d.chambres)
      ? d.chambres.map((c: unknown) => (estObjet(c) ? { ...c, travaux: null } : c))
      : d.chambres;
    const suite = { ...d, ...maisonDeDepart(), version: 6, systemes, chambres };
    const nuits = typeof d.nuitsBouclees === 'number' ? d.nuitsBouclees : 0;
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    if (nuits >= 1 && palier < 1) {
      for (const s of SYSTEMES_PAR_PALIER[1] ?? []) (systemes as Donnees)[s] = true;
      return { ...suite, palier: 1, annonces: [1] };
    }
    return suite;
  },
  // v6 → v7 : identité de chaque personne dans l'état, candidats, visites et périodes d'essai.
  // Au palier 1, les visites de Mila, Jonas et Inès sont prévues (repoussées si leur heure est passée).
  6: (d) => {
    const nuits = typeof d.nuitsBouclees === 'number' ? d.nuitsBouclees : 0;
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => {
          if (!estObjet(e)) return e;
          const identite = e.id === SANNE.id ? creerEmploye(SANNE) : null;
          const { rdvCeSoir: _r, repos: _p, fatigue: _f, moral: _m, loyaute: _l, part: _pa, ...base } = identite ?? {};
          return { ...base, ...e, traitsConnus: Array.isArray(e.traits) ? e.traits : [], finEssai: null, nuitsTravaillees: nuits };
        })
      : d.personnel;
    const suite = { ...d, ...recrutementDeDepart(), version: 7, personnel };
    if (typeof d.palier === 'number' && d.palier >= 1) planifierVisitesScenarisees(suite as unknown as EtatJeu);
    return suite;
  },
  // v7 → v8 : planning, rendez-vous maximum, affinités, imprévus, menaces de départ et adieux.
  // Tout le monde est considéré en service ; les paires existantes partent d'une affinité neutre.
  7: (d) => {
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => (estObjet(e) ? { ...suiviDeDepart(), enServiceCeSoir: true, ...e } : e))
      : d.personnel;
    const ids = (personnel as unknown[]).flatMap((e) => (estObjet(e) && typeof e.id === 'string' ? [e.id] : []));
    const affinites: Record<string, number> = {};
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) affinites[cleAffinite(ids[i]!, ids[j]!)] = 0;
    const nuit = estObjet(d.nuit) ? { imprevus: 0, ...d.nuit } : d.nuit;
    return { ...d, ...personnelDeDepart(), version: 8, personnel, affinites, nuit };
  },
  // v8 → v9 : segments Affaires et Groupes, ouverts au palier 2 (réputation 25, vérifiée à la fermeture).
  8: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), affaires: deuxieme, groupes: deuxieme };
    return { ...d, version: 9, systemes };
  },
  // v9 → v10 : étape du didacticiel. Une partie existante n'a pas de didacticiel.
  9: (d) => ({ ...d, version: 10, didacticiel: null }),
  // v10 → v11 : satisfaction par segment, qui part de la réputation acquise, et onglet Clientèle au palier 2.
  // Une partie déjà au palier 2 reçoit l'onglet d'un coup, présenté par Josée au chargement.
  10: (d) => {
    const reputation = typeof d.reputation === 'number' ? d.reputation : REPUTATION_INITIALE;
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), clientele: deuxieme };
    return {
      ...d,
      version: 11,
      systemes,
      clientele: clienteleDeDepart(reputation),
      nouveautes: deuxieme ? ['clientele'] : [],
    };
  },
  // v11 → v12 : règles de la maison (tarif, formule, sélection, priorité), ouvertes au palier 2.
  // Chaque personne compte la charge de ses rendez-vous du soir ; un rendez-vous en cours est une formule standard.
  11: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), tarifs: deuxieme, porte: deuxieme };
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => (estObjet(e) ? { ...e, chargeCeSoir: typeof e.rdvCeSoir === 'number' ? e.rdvCeSoir : 0 } : e))
      : d.personnel;
    const rendezVous = Array.isArray(d.rendezVous)
      ? d.rendezVous.map((r: unknown) => (estObjet(r) ? { ...r, formule: 'standard' } : r))
      : d.rendezVous;
    const nouveautes = [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(deuxieme ? ['regles'] : [])];
    return { ...d, version: 12, systemes, personnel, rendezVous, regles: reglesDeDepart(), nouveautes };
  },
  // v12 → v13 : le bar (à rénover au palier 2), l'équipe Bar, le stock et l'avance du grossiste.
  // Une nuit en cours compte désormais la recette du bar.
  12: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), bar: deuxieme };
    const equipes = { ...(estObjet(d.equipes) ? d.equipes : { menage: 1 }), bar: 0 };
    const nuit = estObjet(d.nuit) ? { ...d.nuit, bar: 0 } : d.nuit;
    const nouveautes = [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(deuxieme ? ['bar'] : [])];
    return { ...d, ...barDeDepart(), version: 13, systemes, equipes, nuit, nouveautes };
  },
  // v13 → v14 : la semaine (comptes par poste, tendances) et le bilan du lundi.
  // La semaine en cours repart de zéro ; les tendances s'ouvriront au prochain lundi, si le palier 2 est atteint.
  13: (d) => {
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), tendances: false };
    const jour = typeof d.jour === 'number' ? d.jour : 1;
    const reputation = typeof d.reputation === 'number' ? d.reputation : REPUTATION_INITIALE;
    const semaine = { ...semaineDeDepart(reputation), numero: numeroSemaine(jour) };
    if (estObjet(d.clientele) && estObjet(d.clientele.satisfaction)) semaine.satisfactionDebut = { ...(d.clientele.satisfaction as ParSegment) };
    return { ...d, version: 14, systemes, semaine, bilanSemaine: null, bilanAVoir: false };
  },
};

function estObjet(v: unknown): v is Donnees {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Vérification minimale de la forme de l'état, pour écarter une sauvegarde abîmée. */
function estEtatValide(d: Donnees): boolean {
  const joueur = d.joueur;
  const maison = d.maison;
  return (
    d.version === VERSION_ETAT &&
    estObjet(joueur) &&
    typeof joueur.prenom === 'string' &&
    typeof joueur.avatar === 'string' &&
    typeof joueur.tenue === 'number' &&
    (joueur.genre === 'patronne' || joueur.genre === 'patron') &&
    estObjet(maison) &&
    typeof maison.nom === 'string' &&
    typeof d.chapitre === 'number' &&
    typeof d.tresorerie === 'number' &&
    typeof d.jour === 'number' &&
    typeof d.minuteDuJour === 'number' &&
    typeof d.hasard === 'number' &&
    typeof d.palier === 'number' &&
    typeof d.reputation === 'number' &&
    typeof d.briefingJour === 'number' &&
    Array.isArray(d.chambres) &&
    Array.isArray(d.personnel) &&
    Array.isArray(d.file) &&
    Array.isArray(d.rendezVous) &&
    typeof d.linge === 'number' &&
    typeof d.reserve === 'number' &&
    typeof d.tauxReserve === 'number' &&
    typeof d.mensualitesPayees === 'number' &&
    Array.isArray(d.annonces) &&
    Array.isArray(d.journal) &&
    Array.isArray(d.candidats) &&
    Array.isArray(d.visites) &&
    Array.isArray(d.essaisATrancher) &&
    typeof d.prochainCandidat === 'number' &&
    typeof d.rdvMax === 'number' &&
    estObjet(d.affinites) &&
    Array.isArray(d.imprevusVus) &&
    Array.isArray(d.adieux) &&
    (d.didacticiel === null || typeof d.didacticiel === 'number') &&
    estObjet(d.clientele) &&
    estObjet(d.clientele.satisfaction) &&
    Array.isArray(d.clientele.historique) &&
    Array.isArray(d.nouveautes) &&
    estObjet(d.regles) &&
    typeof d.regles.tarif === 'number' &&
    estObjet(d.bar) &&
    estObjet(d.avance) &&
    estObjet(d.equipes) &&
    typeof d.equipes.bar === 'number' &&
    estObjet(d.semaine) &&
    typeof d.bilanAVoir === 'boolean' &&
    estObjet(d.systemes)
  );
}

/**
 * Amène des données de sauvegarde, de n'importe quelle version connue, à la version courante.
 * Renvoie null si les données sont illisibles ou d'une version future.
 */
export function migrer(brut: unknown): EtatJeu | null {
  if (!estObjet(brut) || typeof brut.version !== 'number') return null;
  let donnees = brut;
  while (typeof donnees.version === 'number' && donnees.version < VERSION_ETAT) {
    const etape = MIGRATIONS[donnees.version];
    if (!etape) return null;
    donnees = etape(donnees);
  }
  return estEtatValide(donnees) ? (donnees as unknown as EtatJeu) : null;
}
