// Les conseils de Madame Josée (v1.0, partie 5) : la suite du didacticiel. Une fois la soirée guidée finie, Josée revient
// au bon moment apprendre ce qui sauve une partie : rouvrir une chambre, recruter, la commande automatique du linge,
// rafraîchir une chambre, la réserve, le permis, bien choisir sa gérante. Une fois chacun, un par matin au plus.
// Passer le didacticiel coupe aussi les conseils (ils se rallument dans l'aide). Textes dans src/content/conseils.ts.

import * as B from '../content/balance';
import { peutDemanderPermis } from './agrandir';
import type { Segment } from '../content/clientele';
import { segmentsOuverts } from './clientele';
import type { EtatJeu } from './etat';

export type IdConseil =
  | 'renover'
  | 'renoverEncore'
  | 'recruter'
  | 'recruterEncore'
  | 'lingeAuto'
  | 'rafraichir'
  | 'reserve'
  | 'permis'
  | 'reputation'
  | 'gerance'
  | 'deuxiemeMaison';

export interface Conseils {
  /** Josée conseille (coupé en passant le didacticiel, rallumable dans l'aide). */
  actifs: boolean;
  /** Conseils déjà donnés. */
  vus: IdConseil[];
  /** Le conseil qui attend d'être lu (carte en pause), et la chambre qu'il désigne s'il y a lieu. */
  enCours: { id: IdConseil; chambreId?: string; segment?: Segment } | null;
}

export type EvenementConseil = { type: 'conseil'; id: IdConseil };
export type OrdreConseil = { type: 'conseilVu' } | { type: 'conseilsActifs'; actifs: boolean };

export function conseilsDeDepart(actifs = true): Conseils {
  return { actifs, vus: [], enCours: null };
}

const chambreFermee = (etat: EtatJeu) => etat.chambres.find((c) => !c.ouverte && c.travaux === null);
const chambreUsee = (etat: EtatJeu) =>
  etat.chambres.find((c) => c.ouverte && c.travaux === null && !c.fermee && c.etat < B.CONSEILS.etatRafraichir);

/** Le premier conseil utile ce matin, dans l'ordre où ils comptent. */
export function conseilDuMatin(etat: EtatJeu): Conseils['enCours'] {
  const C = B.CONSEILS;
  const vu = (id: IdConseil) => etat.conseils.vus.includes(id);
  const ouvertes = etat.chambres.filter((c) => c.ouverte).length;
  const fermee = chambreFermee(etat);
  if (!vu('renover') && etat.systemes.renovation && fermee && ouvertes === 1 && etat.tresorerie >= B.RENOVATION.prix + C.marge) {
    return { id: 'renover', chambreId: fermee.id };
  }
  if (!vu('recruter') && etat.systemes.recrutement && etat.jour >= C.jourRecruter && etat.personnel.length === 1 && etat.candidats.length > 0) {
    return { id: 'recruter' };
  }
  if (
    !vu('recruterEncore') &&
    etat.jour >= C.jourRecruterEncore &&
    etat.personnel.length < C.equipeMin &&
    etat.candidats.length > 0
  ) {
    return { id: 'recruterEncore' };
  }
  if (
    !vu('renoverEncore') &&
    etat.jour >= C.jourRenoverEncore &&
    fermee &&
    ouvertes >= 2 &&
    etat.tresorerie >= B.RENOVATION.prix + C.margeRenoverEncore
  ) {
    return { id: 'renoverEncore', chambreId: fermee.id };
  }
  if (!vu('lingeAuto') && etat.jour >= C.jourLinge && etat.lingeAuto === 0 && etat.linge < etat.personnel.length * 2) {
    return { id: 'lingeAuto' };
  }
  const usee = chambreUsee(etat);
  if (!vu('rafraichir') && usee && etat.tresorerie >= B.RAFRAICHIR.prix + C.marge) return { id: 'rafraichir', chambreId: usee.id };
  if (!vu('reserve') && etat.systemes.reserve && etat.jour >= C.jourReserve && etat.tauxReserve === 0 && !etat.gestionJosee) {
    return { id: 'reserve' };
  }
  if (!vu('permis') && etat.systemes.permis && peutDemanderPermis(etat)) return { id: 'permis' };
  // v1.0, partie 6 : la réputation plafonne sous 80 au palier 4 : Josée dit qui boude (le segment le moins content).
  if (!vu('reputation') && etat.palier === 4 && etat.jour >= C.jourReputation && etat.reputation < B.PALIER_5.reputation - 5) {
    const segment = [...segmentsOuverts(etat)].sort((a, b) => etat.clientele.satisfaction[a] - etat.clientele.satisfaction[b])[0];
    if (segment) return { id: 'reputation', segment };
  }
  if (!vu('gerance') && etat.systemes.gerante && !etat.gerante) return { id: 'gerance' };
  // La deuxième maison : quand une adresse est à la portée de la caisse, ou de la banque (v1.0, partie 6).
  if (!vu('deuxiemeMaison') && etat.systemes.etablissement && etat.etablissement.statut === 'offres') {
    const moinsChere = Math.min(...etat.etablissement.offres.map((o) => o.achat));
    if (etat.tresorerie >= moinsChere || etat.systemes.emprunt) return { id: 'deuxiemeMaison' };
  }
  return null;
}

/** Le matin, une fois la soirée guidée finie : Josée passe, si elle a quelque chose d'utile à dire. */
export function matinDesConseils(etat: EtatJeu, evenements: { push(e: EvenementConseil): unknown }): void {
  const c = etat.conseils;
  if (!c.actifs || c.enCours || etat.didacticiel !== null || etat.finDePartie) return;
  const conseil = conseilDuMatin(etat);
  if (!conseil) return;
  c.enCours = conseil;
  c.vus = [...c.vus, conseil.id];
  evenements.push({ type: 'conseil', id: conseil.id });
}

export function appliquerConseil(etat: EtatJeu, ordre: OrdreConseil): void {
  if (ordre.type === 'conseilVu') etat.conseils.enCours = null;
  else {
    etat.conseils.actifs = ordre.actifs;
    if (!ordre.actifs) etat.conseils.enCours = null;
  }
}
