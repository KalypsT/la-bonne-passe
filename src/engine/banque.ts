// La banque (v0.6) : découvert et agios, salaires impayés, mensualités impayées et faillite.
// Voir « Règles automatiques » dans les spécifications.

import * as B from '../content/balance';
import { depenser, noterDepense } from './comptes';
import type { EtatJeu } from './etat';
import { changerMoral } from './personnel';

export interface Banque {
  /** Mensualités échues (payées ou non) : le calendrier des échéances ne dépend pas des paiements. */
  echeances: number;
  /** Mensualité en retard, à régulariser avant la suivante (0 : aucune). */
  retard: number;
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
  | { type: 'faillite'; jour: number };

interface Sortie {
  push(e: EvenementBanque): unknown;
}

export function banqueDeDepart(): Banque {
  return { echeances: 0, retard: 0, impayees: 0, salairesDus: 0, joursImpayes: 0, alerte: 0 };
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

/** La mensualité, payée par la réserve d'abord, puis par la trésorerie. */
function payerMensualite(etat: EtatJeu, montant: number): number {
  const depuisReserve = Math.min(etat.reserve, montant);
  etat.reserve -= depuisReserve;
  noterDepense(etat, depuisReserve, 'mensualite');
  depenser(etat, montant - depuisReserve, 'mensualite');
  return depuisReserve;
}

/** Chaque matin : une mensualité en retard se régularise dès que la caisse le permet. Renvoie vrai si elle l'a été. */
export function regulariser(etat: EtatJeu, evenements: Sortie): boolean {
  const b = etat.banque;
  if (b.retard <= 0 || !peutPayer(etat, b.retard, true)) return false;
  const montant = b.retard;
  const depuisReserve = payerMensualite(etat, montant);
  b.retard = 0;
  etat.mensualitesPayees += 1;
  evenements.push({ type: 'regularisation', montant, depuisReserve });
  return true;
}

export type IssueEcheance = { payee: true; depuisReserve: number } | { payee: false } | { faillite: true };

/**
 * Le jour d'une échéance : la précédente toujours impayée, c'est la faillite ; sinon la mensualité
 * se paie si la caisse (réserve comprise) reste dans le découvert autorisé, ou reste en retard.
 */
export function echeance(etat: EtatJeu, evenements: Sortie): IssueEcheance {
  const b = etat.banque;
  if (b.retard > 0) {
    etat.finDePartie = { raison: 'faillite', jour: etat.jour };
    evenements.push({ type: 'faillite', jour: etat.jour });
    return { faillite: true };
  }
  b.echeances += 1;
  if (peutPayer(etat, B.MENSUALITE, true)) {
    const depuisReserve = payerMensualite(etat, B.MENSUALITE);
    etat.mensualitesPayees += 1;
    return { payee: true, depuisReserve };
  }
  b.retard = B.MENSUALITE;
  b.impayees += 1;
  evenements.push({ type: 'mensualiteImpayee', montant: B.MENSUALITE, limite: etat.jour + B.JOURS_PAR_MOIS });
  return { payee: false };
}

/** Points de taux en plus sur le prochain emprunt, pour les mensualités restées impayées. */
export function majorationTaux(etat: EtatJeu): number {
  return etat.banque.impayees * B.DECOUVERT.majorationTaux;
}

/** Ce que possède vraiment la maison : trésorerie et réserve, moins la mensualité en retard et les salaires dus. */
export function avoirNet(etat: Pick<EtatJeu, 'tresorerie' | 'reserve' | 'banque'>): number {
  return etat.tresorerie + etat.reserve - etat.banque.retard - etat.banque.salairesDus;
}
