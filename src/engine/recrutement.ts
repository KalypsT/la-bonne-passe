// Recrutement : visites de candidats, marché du lundi, entretien d'embauche et période d'essai.
// Voir « Recrutement » et « Départ » dans les spécifications.

import * as B from '../content/balance';
import {
  ACCROCHES,
  INTROS,
  AGE_MAX,
  AGE_MIN,
  PIECES_SILHOUETTE,
  PRENOMS,
  QUESTIONS_PAR_TRAIT,
  TALENTS_LISTE,
  TALENTS_MARCHE,
  VISITES_SCENARISEES,
  type DefinitionCandidat,
} from '../content/candidats';
import { TRAITS_DU_MARCHE, type Silhouette, type Talent } from '../content/personnel';
import type { Candidat, Employe, EtatJeu } from './etat';
import type { Tirage } from './hasard';
import { instant, jourDeLaSemaine } from './temps';

export type EvenementRecrutement =
  | { type: 'visite'; candidatId: string; prenom: string }
  | { type: 'marche'; nombre: number }
  | { type: 'candidatParti'; prenom: string }
  | { type: 'contreOffre'; candidatId: string; prenom: string; part: number }
  | { type: 'candidatVexe'; prenom: string }
  | { type: 'candidatRefuse'; prenom: string }
  | { type: 'reflexion'; prenom: string }
  | { type: 'embauche'; employeId: string; prenom: string; part: number }
  | { type: 'finEssai'; employeId: string; prenom: string }
  | { type: 'essaiConfirme'; employeId: string; prenom: string }
  | { type: 'finCollaboration'; prenom: string }
  | { type: 'traitRevele'; employeId: string; prenom: string; trait: string };

export type OrdreRecrutement =
  | { type: 'questionCandidat'; candidatId: string; question: number }
  | { type: 'proposer'; candidatId: string; part: number }
  | { type: 'refuserCandidat'; candidatId: string }
  | { type: 'reflechir'; candidatId: string }
  | { type: 'trancherEssai'; employeId: string; garder: boolean };

interface Sortie {
  push(e: EvenementRecrutement): unknown;
}

/** Instant absolu d'un jour et d'une heure de l'horloge (entre 5 h et minuit). */
function instantDe(jour: number, heure: number): number {
  return (jour - 1) * 24 * 60 + heure - B.HEURE_DEBUT_JOURNEE;
}

export function candidatDepuis(def: DefinitionCandidat, source: Candidat['source'], expire: number): Candidat {
  return {
    id: def.id,
    prenom: def.prenom,
    age: def.age,
    genre: def.genre,
    accroche: def.accroche,
    silhouette: { ...def.silhouette },
    talents: { ...def.talents },
    traits: [...def.traits],
    intro: def.intro,
    questions: def.questions.map((q) => ({ ...q })),
    partMin: def.partMin,
    source,
    expire,
    questionPosee: null,
    contreOffre: null,
  };
}

/** Toutes les personnes déjà connues de la maison : en poste, en attente ou attendues. */
function idsConnus(etat: EtatJeu): Set<string> {
  return new Set([...etat.personnel.map((e) => e.id), ...etat.candidats.map((c) => c.id), ...etat.visites.map((v) => v.candidat.id)]);
}

/**
 * Prévoit les visites de Mila, Jonas et Inès. Une visite dont l'heure est déjà passée
 * (ancienne sauvegarde) est repoussée au lendemain, à la même heure.
 */
export function planifierVisitesScenarisees(etat: EtatJeu): void {
  const connus = idsConnus(etat);
  const maintenant = instant(etat);
  let precedent = maintenant;
  for (const v of VISITES_SCENARISEES) {
    if (connus.has(v.candidat.id)) continue;
    let moment = instantDe(v.jour, v.heure);
    while (moment <= maintenant || moment <= precedent) moment += 24 * 60;
    precedent = moment;
    etat.visites.push({ instant: moment, candidat: candidatDepuis(v.candidat, 'visite', 0) });
  }
}

/** Les visites arrivées à l'heure : le candidat entre, le jeu se met en pause pour l'entretien. */
export function arriveeVisites(etat: EtatJeu, evenements: Sortie): void {
  const maintenant = instant(etat);
  const arrivees = etat.visites.filter((v) => v.instant <= maintenant);
  if (arrivees.length === 0) return;
  etat.visites = etat.visites.filter((v) => v.instant > maintenant);
  for (const { candidat } of arrivees) {
    etat.candidats.push({ ...candidat, expire: etat.jour + B.JOURS_REFLEXION });
    evenements.push({ type: 'visite', candidatId: candidat.id, prenom: candidat.prenom });
  }
}

/** Nombre de candidats sur le marché du lundi, selon la réputation. */
export function tailleDuMarche(reputation: number): number {
  return Math.min(B.MARCHE_MAX, B.MARCHE_BASE + Math.floor(reputation / B.MARCHE_REPUTATION_PAR_CANDIDAT));
}

/** Compose un candidat unique à partir des pièces du contenu. */
export function genererCandidat(etat: EtatJeu, tirage: Tirage, expire: number): Candidat {
  const genre = tirage.chance(0.65) ? 'f' : 'm';
  const pris = new Set([...etat.personnel.map((e) => e.prenom), ...etat.candidats.map((c) => c.prenom)]);
  const libres = PRENOMS[genre].filter((p) => !pris.has(p));
  const prenom = tirage.choisir(libres.length > 0 ? libres : PRENOMS[genre]);

  const fort = tirage.choisir(TALENTS_LISTE);
  const talents = {} as Record<Talent, number>;
  for (const t of TALENTS_LISTE) {
    const [min, max] = t === fort ? [TALENTS_MARCHE.fortMin, TALENTS_MARCHE.fortMax] : [TALENTS_MARCHE.autresMin, TALENTS_MARCHE.autresMax];
    talents[t] = Math.floor(tirage.entre(min, max + 1));
  }

  const premier = tirage.choisir(TRAITS_DU_MARCHE);
  const second = tirage.choisir(TRAITS_DU_MARCHE.filter((t) => t !== premier));
  const traits = [premier, second];
  const questions = traits.map((trait) => ({ ...tirage.choisir(QUESTIONS_PAR_TRAIT[trait] ?? [{ question: '« Parle-moi de toi. »', reponse: '« Il y aurait trop à dire. »' }]), trait }));

  const total = TALENTS_LISTE.reduce((s, t) => s + talents[t], 0);
  const partMin = total >= 13 ? 0.55 : talents[fort] >= 5 ? 0.5 : 0.45;

  const p = PIECES_SILHOUETTE;
  const tenue = tirage.choisir(p.tenues);
  const robe = genre === 'f' && tirage.chance(0.5);
  const silhouette: Silhouette = {
    teint: tirage.choisir(p.teints),
    cheveux: tirage.choisir(p.cheveux),
    coiffure: tirage.choisir(genre === 'f' ? p.coiffuresF : p.coiffuresM),
    haut: tenue,
    bas: robe ? tenue : tirage.choisir(['#1A1A22', '#2B2233', '#24324A']),
    accent: tirage.choisir(p.accents),
    robe,
  };

  const source = tirage.chance(0.6) ? 'annonce' : 'boucheAOreille';
  const id = `c${etat.prochainCandidat}`;
  etat.prochainCandidat += 1;
  return {
    id,
    prenom,
    age: Math.floor(tirage.entre(AGE_MIN, AGE_MAX + 1)),
    genre,
    accroche: tirage.choisir(ACCROCHES),
    silhouette,
    talents,
    traits,
    intro: INTROS[source](prenom),
    questions,
    partMin,
    source,
    expire,
    questionPosee: null,
    contreOffre: null,
  };
}

/** Le matin : candidats lassés, fins d'essai, et le marché renouvelé chaque lundi. */
export function matinRecrutement(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  const partis = etat.candidats.filter((c) => c.expire <= etat.jour);
  etat.candidats = etat.candidats.filter((c) => c.expire > etat.jour);
  for (const c of partis) if (c.source === 'visite') evenements.push({ type: 'candidatParti', prenom: c.prenom });

  for (const e of etat.personnel) {
    if (e.finEssai !== null && etat.jour >= e.finEssai && !etat.essaisATrancher.includes(e.id)) {
      etat.essaisATrancher.push(e.id);
      evenements.push({ type: 'finEssai', employeId: e.id, prenom: e.prenom });
    }
  }

  if (etat.systemes.recrutement && etat.jour > 1 && jourDeLaSemaine(etat.jour) === 0) {
    const nombre = tailleDuMarche(etat.reputation);
    for (let i = 0; i < nombre; i++) etat.candidats.push(genererCandidat(etat, tirage, etat.jour + 7));
    evenements.push({ type: 'marche', nombre });
  }
}

/** À la fermeture : chaque personne a travaillé une nuit de plus, et un trait caché peut se révéler. */
export function revelerTraits(
  etat: EtatJeu,
  evenements: { push(e: Extract<EvenementRecrutement, { type: 'traitRevele' }>): unknown },
): void {
  for (const e of etat.personnel) {
    e.nuitsTravaillees += 1;
    const cache = e.traits.find((t) => !e.traitsConnus.includes(t));
    if (!cache || e.nuitsTravaillees < B.NUITS_POUR_REVELER_TRAIT) continue;
    e.traitsConnus.push(cache);
    evenements.push({ type: 'traitRevele', employeId: e.id, prenom: e.prenom, trait: cache });
  }
}

function embaucher(etat: EtatJeu, c: Candidat, part: number): Employe {
  const question = c.questionPosee === null ? undefined : c.questions[c.questionPosee];
  return {
    id: c.id,
    prenom: c.prenom,
    age: c.age,
    genre: c.genre,
    accroche: c.accroche,
    silhouette: { ...c.silhouette },
    talents: { ...c.talents },
    traits: [...c.traits],
    traitsConnus: question ? [question.trait] : [],
    finEssai: etat.jour + B.DUREE_ESSAI,
    nuitsTravaillees: 0,
    part,
    fatigue: B.RECRUE.fatigue,
    moral: B.RECRUE.moral,
    loyaute: Math.min(100, B.RECRUE.loyaute + (part > 0.5 ? B.BONUS_LOYAUTE_PART_HAUTE : 0)),
    rdvCeSoir: 0,
    repos: false,
  };
}

/** Applique un ordre du recrutement. */
export function appliquerRecrutement(etat: EtatJeu, ordre: OrdreRecrutement, evenements: Sortie): void {
  switch (ordre.type) {
    case 'questionCandidat': {
      const c = etat.candidats.find((x) => x.id === ordre.candidatId);
      if (!c || c.questionPosee !== null || !c.questions[ordre.question]) return;
      c.questionPosee = ordre.question;
      return;
    }
    case 'proposer': {
      const c = etat.candidats.find((x) => x.id === ordre.candidatId);
      if (!c || c.questionPosee === null || etat.personnel.length >= B.PERSONNEL_MAX) return;
      if (!(B.PARTS_PROPOSEES as readonly number[]).includes(ordre.part)) return;
      if (ordre.part >= c.partMin) {
        etat.candidats = etat.candidats.filter((x) => x !== c);
        etat.personnel.push(embaucher(etat, c, ordre.part));
        evenements.push({ type: 'embauche', employeId: c.id, prenom: c.prenom, part: ordre.part });
      } else if (c.contreOffre === null) {
        c.contreOffre = c.partMin;
        evenements.push({ type: 'contreOffre', candidatId: c.id, prenom: c.prenom, part: c.partMin });
      } else {
        // Insister en dessous de sa demande : le candidat s'en va.
        etat.candidats = etat.candidats.filter((x) => x !== c);
        evenements.push({ type: 'candidatVexe', prenom: c.prenom });
      }
      return;
    }
    case 'refuserCandidat': {
      const c = etat.candidats.find((x) => x.id === ordre.candidatId);
      if (!c) return;
      etat.candidats = etat.candidats.filter((x) => x !== c);
      evenements.push({ type: 'candidatRefuse', prenom: c.prenom });
      return;
    }
    case 'reflechir': {
      const c = etat.candidats.find((x) => x.id === ordre.candidatId);
      if (c) evenements.push({ type: 'reflexion', prenom: c.prenom });
      return;
    }
    case 'trancherEssai': {
      const e = etat.personnel.find((x) => x.id === ordre.employeId);
      if (!e || !etat.essaisATrancher.includes(e.id)) return;
      if (!ordre.garder && etat.rendezVous.some((r) => r.employeId === e.id)) return;
      etat.essaisATrancher = etat.essaisATrancher.filter((id) => id !== e.id);
      if (ordre.garder) {
        e.finEssai = null;
        evenements.push({ type: 'essaiConfirme', employeId: e.id, prenom: e.prenom });
      } else {
        etat.personnel = etat.personnel.filter((x) => x !== e);
        evenements.push({ type: 'finCollaboration', prenom: e.prenom });
      }
      return;
    }
  }
}
