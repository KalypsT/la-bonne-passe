import * as B from '../content/balance';
import type { EtatJeu } from './etat';
import { estOuvert, instant } from './temps';

export type Alerte =
  | { type: 'chambreSale'; chambreId: string; inutilisable: boolean }
  | { type: 'linge' }
  | { type: 'epuisement'; employeId: string }
  | { type: 'dispute'; restant: number; total: number }
  | { type: 'menace'; employeId: string };

/** Alertes à afficher en bulles sur la maison. Elles découlent de l'état du jeu. */
export function alertes(etat: EtatJeu): Alerte[] {
  const liste: Alerte[] = [];
  const ouvert = estOuvert(etat);
  for (const c of etat.chambres) {
    if (c.ouverte && c.proprete < B.SEUIL_CHAMBRE_SALE) {
      liste.push({ type: 'chambreSale', chambreId: c.id, inutilisable: c.proprete < B.SEUIL_CHAMBRE_INUTILISABLE });
    }
  }
  if (ouvert && etat.linge < B.SEUIL_LINGE) liste.push({ type: 'linge' });
  if (ouvert) {
    for (const e of etat.personnel) {
      if (!e.repos && e.fatigue > B.SEUIL_EPUISEMENT) liste.push({ type: 'epuisement', employeId: e.id });
    }
  }
  for (const e of etat.personnel) if (e.menaceDepart !== null) liste.push({ type: 'menace', employeId: e.id });
  if (etat.dispute) {
    liste.push({ type: 'dispute', restant: Math.max(0, etat.dispute.expire - instant(etat)), total: B.DISPUTE_DELAI });
  }
  return liste;
}
