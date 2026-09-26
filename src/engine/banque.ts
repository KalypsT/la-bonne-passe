// La banque (v0.6) : découvert et agios, salaires impayés, mensualités impayées et faillite.
// Voir « Règles automatiques » dans les spécifications.

import * as B from '../content/balance';
import { depenser, noterDepense } from './comptes';
import type { EtatJeu } from './etat';
import { changerMoral } from './personnel';

/** Un emprunt signé en cours de partie (v0.6). */
export interface Emprunt {
  id: number;
  montant: number;
  /** Taux annuel, en %. */
  taux: number;
  /** Durée, en mois de 28 jours. */
  duree: number;
  mensualite: number;
  /** Échéances qui restent, et le jour de la prochaine. */
  restantes: number;
  prochaine: number;
  jourSignature: number;
}

export interface Banque {
  /** Mensualités échues (payées ou non) : le calendrier des échéances ne dépend pas des paiements. */
  echeances: number;
  /** Échéance en retard (rachat et emprunts du jour), à régulariser avant la suivante (0 : aucune). */
  retard: number;
  /** Le retard contient la mensualité du rachat : la régulariser la compte comme payée. */
  retardRachat: boolean;
  /** Emprunts en cours (v0.6, partie 3). */
  emprunts: Emprunt[];
  /** Mensualités restées impayées depuis le début : chacune alourdit le taux du prochain emprunt. */
  impayees: number;
  /** Salaires des équipes dus et pas encore versés. */
  salairesDus: number;
  /** Jours de suite où les salaires n'ont pas été versés. */
  joursImpayes: number;
  /** Ce que Josée a déjà signalé : 0 rien, 1 le découvert, 2 le découvert dépassé. */
  alerte: 0 | 1 | 2;
}

export type EvenementBanque =
  | { type: 'agios'; montant: number }
  | { type: 'decouvert'; niveau: 1 | 2 }
  | { type: 'salairesImpayes'; montant: number; dus: number }
  | { type: 'salairesRattrapes'; montant: number }
  | { type: 'departEquipe'; equipe: 'menage' | 'bar' | 'accueil' | 'securite' }
  | { type: 'mensualiteImpayee'; montant: number; limite: number }
  | { type: 'regularisation'; montant: number; depuisReserve: number }
  | { type: 'emprunt'; montant: number; taux: number; duree: number; mensualite: number }
  | { type: 'echeanceEmprunts'; montant: number }
  | { type: 'empruntRembourse'; montant: number }
  | { type: 'faillite'; jour: number };

interface Sortie {
  push(e: EvenementBanque): unknown;
}

export function banqueDeDepart(): Banque {
  return { echeances: 0, retard: 0, retardRachat: false, emprunts: [], impayees: 0, salairesDus: 0, joursImpayes: 0, alerte: 0 };
}

/** La trésorerie peut-elle payer ce montant sans passer sous le découvert autorisé ? */
export function peutPayer(etat: EtatJeu, montant: number, avecReserve = false): boolean {
  return etat.tresorerie + (avecReserve ? etat.reserve : 0) - montant >= -B.DECOUVERT.plafond;
}

/** Agios du jour, sur ce qui est à découvert. */
export function agiosDuJour(etat: Pick<EtatJeu, 'tresorerie'>): number {
  return etat.tresorerie < 0 ? Math.max(1, Math.round(-etat.tresorerie * B.DECOUVERT.agios)) : 0;
}

/** Chaque matin : les agios, prélevés sur la trésorerie. */
export function prelevementAgios(etat: EtatJeu, evenements: Sortie): void {
  const montant = agiosDuJour(etat);
  if (montant <= 0) return;
  depenser(etat, montant, 'agios');
  evenements.push({ type: 'agios', montant });
}

/** Josée signale une fois l'entrée dans le découvert, puis son dépassement ; elle oublie quand la caisse remonte. */
export function surveillerDecouvert(etat: EtatJeu, evenements: Sortie): void {
  const niveau = etat.tresorerie < -B.DECOUVERT.plafond ? 2 : etat.tresorerie < 0 ? 1 : 0;
  if (niveau > etat.banque.alerte) evenements.push({ type: 'decouvert', niveau: niveau as 1 | 2 });
  etat.banque.alerte = niveau;
}

const ORDRE_DEPARTS = ['securite', 'accueil', 'bar', 'menage'] as const;

/**
 * À midi, les salaires des équipes. Passé le découvert autorisé, ils ne sont plus versés :
 * le moral de chacun baisse, puis les équipes se vident une personne par jour. Les arriérés
 * se paient dès que la caisse le permet.
 */
export function payerSalaires(etat: EtatJeu, montant: number, evenements: Sortie): void {
  const b = etat.banque;
  const total = montant + b.salairesDus;
  if (total > 0 && peutPayer(etat, total)) {
    depenser(etat, total, 'salaires');
    if (b.salairesDus > 0) evenements.push({ type: 'salairesRattrapes', montant: b.salairesDus });
    b.salairesDus = 0;
    b.joursImpayes = 0;
    return;
  }
  if (montant > 0 && peutPayer(etat, montant)) {
    depenser(etat, montant, 'salaires');
    b.joursImpayes = 0;
    return;
  }
  if (montant <= 0) return;
  b.salairesDus += montant;
  b.joursImpayes += 1;
  for (const e of etat.personnel) changerMoral(e, -B.SALAIRES_IMPAYES.moral);
  evenements.push({ type: 'salairesImpayes', montant, dus: b.salairesDus });
  if (b.joursImpayes >= B.SALAIRES_IMPAYES.joursAvantDepart) {
    // Une personne d'équipe s'en va ; la dernière du ménage reste, par attachement à la maison.
    const equipe = ORDRE_DEPARTS.find((q) => etat.equipes[q] > (q === 'menage' ? 1 : 0));
    if (equipe) {
      etat.equipes[equipe] -= 1;
      evenements.push({ type: 'departEquipe', equipe });
    }
  }
}

/** Un paiement à la banque, par la réserve d'abord, puis par la trésorerie. Renvoie la part prise dans la réserve. */
function payerDepuisReserve(etat: EtatJeu, montant: number, poste: 'mensualite' | 'emprunts'): number {
  const depuisReserve = Math.min(etat.reserve, montant);
  etat.reserve -= depuisReserve;
  noterDepense(etat, depuisReserve, poste);
  depenser(etat, montant - depuisReserve, poste);
  return depuisReserve;
}

/** Chaque matin : une échéance en retard se régularise dès que la caisse le permet. Renvoie vrai si elle l'a été. */
export function regulariser(etat: EtatJeu, evenements: Sortie): boolean {
  const b = etat.banque;
  if (b.retard <= 0 || !peutPayer(etat, b.retard, true)) return false;
  const montant = b.retard;
  const depuisReserve = payerDepuisReserve(etat, montant, 'mensualite');
  b.retard = 0;
  if (b.retardRachat) etat.mensualitesPayees += 1;
  b.retardRachat = false;
  evenements.push({ type: 'regularisation', montant, depuisReserve });
  return true;
}

export type IssueEcheance = { payee: true; depuisReserve: number; montant: number } | { payee: false; montant: number } | { faillite: true };

/** Emprunts dont une échéance tombe aujourd'hui. */
export function empruntsDus(etat: EtatJeu): Emprunt[] {
  return etat.banque.emprunts.filter((e) => e.restantes > 0 && e.prochaine === etat.jour);
}

/**
 * Le jour d'une échéance (la mensualité du rachat, celles des emprunts, ou les deux) : la précédente
 * toujours impayée, c'est la faillite ; sinon tout se paie si la caisse (réserve comprise) reste dans
 * le découvert autorisé, ou tout reste en retard.
 */
export function echeance(etat: EtatJeu, rachat: boolean, evenements: Sortie): IssueEcheance {
  const b = etat.banque;
  if (b.retard > 0) {
    etat.finDePartie = { raison: 'faillite', jour: etat.jour };
    evenements.push({ type: 'faillite', jour: etat.jour });
    return { faillite: true };
  }
  const emprunts = empruntsDus(etat);
  const partRachat = rachat ? B.MENSUALITE : 0;
  const partEmprunts = emprunts.reduce((t, e) => t + e.mensualite, 0);
  const montant = partRachat + partEmprunts;
  if (rachat) b.echeances += 1;
  for (const e of emprunts) {
    e.restantes -= 1;
    e.prochaine += B.JOURS_PAR_MOIS;
  }
  const payee = peutPayer(etat, montant, true);
  let depuisReserve = 0;
  if (payee) {
    depuisReserve = payerDepuisReserve(etat, partRachat, 'mensualite') + payerDepuisReserve(etat, partEmprunts, 'emprunts');
    if (rachat) etat.mensualitesPayees += 1;
    if (partEmprunts > 0) evenements.push({ type: 'echeanceEmprunts', montant: partEmprunts });
  } else {
    b.retard = montant;
    b.retardRachat = rachat;
    b.impayees += 1;
    evenements.push({ type: 'mensualiteImpayee', montant, limite: etat.jour + B.JOURS_PAR_MOIS });
  }
  for (const e of emprunts) if (e.restantes === 0) evenements.push({ type: 'empruntRembourse', montant: e.montant });
  b.emprunts = b.emprunts.filter((e) => e.restantes > 0);
  return payee ? { payee: true, depuisReserve, montant } : { payee: false, montant };
}

// ——— Nouvel emprunt ———

/** Taux proposé par la banque : selon la réputation, puis majoré des mensualités restées impayées. */
export function tauxPropose(etat: EtatJeu): number {
  const E = B.EMPRUNT;
  const part = Math.min(1, Math.max(0, (etat.reputation - E.reputationBasse) / (E.reputationHaute - E.reputationBasse)));
  const base = Math.round((E.tauxMax - (E.tauxMax - E.tauxMin) * part) * 2) / 2;
  return base + majorationTaux(etat);
}

/** Mensualité d'un prêt amortissable : taux annuel en %, durée en mois. */
export function mensualiteEmprunt(montant: number, taux: number, duree: number): number {
  const r = taux / 100 / 12;
  if (r === 0) return Math.round(montant / duree);
  return Math.round((montant * r) / (1 - Math.pow(1 + r, -duree)));
}

/** Capital restant dû sur les emprunts en cours (au prorata des échéances restantes). */
export function encours(etat: EtatJeu): number {
  return etat.banque.emprunts.reduce((t, e) => t + Math.round((e.montant * e.restantes) / e.duree), 0);
}

/** Ce que la banque accepte encore de prêter, par tranches. */
export function capaciteEmprunt(etat: EtatJeu): number {
  const reste = Math.max(0, B.EMPRUNT.max - encours(etat));
  return Math.floor(reste / B.EMPRUNT.tranche) * B.EMPRUNT.tranche;
}

/** Premier jour d'échéance après aujourd'hui (tous les 28 jours, avec la mensualité du rachat). */
export function prochaineEcheanceApres(jour: number): number {
  const J = B.JOUR_PREMIERE_MENSUALITE;
  if (jour < J) return J;
  return J + (Math.floor((jour - J) / B.JOURS_PAR_MOIS) + 1) * B.JOURS_PAR_MOIS;
}

export interface Apercu {
  taux: number;
  mensualite: number;
  /** Intérêts payés en tout. */
  cout: number;
  premiere: number;
  derniere: number;
}

/** Ce que coûterait l'emprunt, affiché avant de signer. */
export function apercuEmprunt(etat: EtatJeu, montant: number, duree: number): Apercu {
  const taux = tauxPropose(etat);
  const mensualite = mensualiteEmprunt(montant, taux, duree);
  const premiere = prochaineEcheanceApres(etat.jour);
  return { taux, mensualite, cout: mensualite * duree - montant, premiere, derniere: premiere + (duree - 1) * B.JOURS_PAR_MOIS };
}

export type RefusEmprunt = 'ferme' | 'retard' | 'montant' | 'duree' | null;

/** La banque refuse-t-elle ? Outil pas ouvert, échéance en retard, montant hors tranches ou au-delà de la capacité. */
export function refusEmprunt(etat: EtatJeu, montant: number, duree: number): RefusEmprunt {
  if (!etat.systemes.emprunt || etat.finDePartie) return 'ferme';
  if (etat.banque.retard > 0) return 'retard';
  if (montant <= 0 || montant % B.EMPRUNT.tranche !== 0 || montant > capaciteEmprunt(etat)) return 'montant';
  if (!(B.EMPRUNT.durees as readonly number[]).includes(duree)) return 'duree';
  return null;
}

/** Signer : l'argent arrive tout de suite ; les échéances tombent avec la mensualité, tous les 28 jours. */
export function emprunter(etat: EtatJeu, montant: number, duree: number, evenements: Sortie): void {
  if (refusEmprunt(etat, montant, duree)) return;
  const a = apercuEmprunt(etat, montant, duree);
  etat.banque.emprunts.push({
    id: etat.jour * 100 + etat.banque.emprunts.length,
    montant,
    taux: a.taux,
    duree,
    mensualite: a.mensualite,
    restantes: duree,
    prochaine: a.premiere,
    jourSignature: etat.jour,
  });
  etat.tresorerie += montant;
  etat.journee.empruntRecu += montant;
  etat.semaine.empruntRecu += montant;
  evenements.push({ type: 'emprunt', montant, taux: a.taux, duree, mensualite: a.mensualite });
}

/** Échéances à venir des emprunts (jour et montant), pour la projection. */
export function echeancesEmprunts(etat: EtatJeu): { jour: number; montant: number }[] {
  return etat.banque.emprunts.flatMap((e) =>
    Array.from({ length: e.restantes }, (_, k) => ({ jour: e.prochaine + k * B.JOURS_PAR_MOIS, montant: e.mensualite })),
  );
}

/** Points de taux en plus sur le prochain emprunt, pour les mensualités restées impayées. */
export function majorationTaux(etat: EtatJeu): number {
  return etat.banque.impayees * B.DECOUVERT.majorationTaux;
}

/** Ce que possède vraiment la maison : trésorerie et réserve, moins la mensualité en retard et les salaires dus. */
export function avoirNet(etat: Pick<EtatJeu, 'tresorerie' | 'reserve' | 'banque'>): number {
  return etat.tresorerie + etat.reserve - etat.banque.retard - etat.banque.salairesDus;
}

/** Pour mesurer une stratégie : l'avoir net, moins le capital encore dû sur les nouveaux emprunts. */
export function valeurNette(etat: EtatJeu): number {
  return avoirNet(etat) - encours(etat);
}
