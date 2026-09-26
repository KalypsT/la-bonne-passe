import { chambreEnService } from './amenagement';
import * as B from '../content/balance';
import type { IdAlerte } from '../content/alertes';
import type { EtatJeu } from './etat';
import { estOuvert, instant } from './temps';

export type Alerte =
  | { type: 'chambreSale'; chambreId: string; inutilisable: boolean }
  | { type: 'linge' }
  | { type: 'epuisement'; employeId: string }
  | { type: 'dispute'; restant: number; total: number }
  | { type: 'menace'; employeId: string }
  | { type: 'barVide'; stock: number }
  /** Alerte minutée (client pressé, bruit, client éméché, bouteille, pause). */
  | { type: 'minuterie'; id: IdAlerte; cle: string; cible: string | null; restant: number; total: number };

/** Alertes à afficher en bulles sur la maison. Elles découlent de l'état du jeu. */
export function alertes(etat: EtatJeu): Alerte[] {
  const liste: Alerte[] = [];
  const ouvert = estOuvert(etat);
  for (const c of etat.chambres) {
    if (chambreEnService(c) && c.proprete < B.SEUIL_CHAMBRE_SALE) {
      liste.push({ type: 'chambreSale', chambreId: c.id, inutilisable: c.proprete < B.SEUIL_CHAMBRE_INUTILISABLE });
    }
  }
  if (ouvert && etat.linge < B.SEUIL_LINGE) liste.push({ type: 'linge' });
  if (ouvert && etat.bar.ouvert && etat.equipes.bar > 0 && etat.bar.stock < B.SEUIL_BAR) {
    liste.push({ type: 'barVide', stock: Math.floor(etat.bar.stock) });
  }
  if (ouvert) {
    for (const e of etat.personnel) {
      if (!e.repos && e.fatigue > B.SEUIL_EPUISEMENT) liste.push({ type: 'epuisement', employeId: e.id });
    }
  }
  for (const e of etat.personnel) if (e.menaceDepart !== null) liste.push({ type: 'menace', employeId: e.id });
  const maintenant = instant(etat);
  for (const m of etat.minuteries) {
    // Pour un client pressé, le délai est sa patience, qui peut changer (un verre offert).
    const client = m.id === 'presse' ? etat.file.find((c) => c.id === Number(m.cible)) : undefined;
    const restant = client ? client.patience : Math.max(0, m.expire - maintenant);
    const total = Math.max(restant, m.expire - m.debut);
    liste.push({ type: 'minuterie', id: m.id, cle: m.cle, cible: m.cible, restant, total });
  }
  if (etat.dispute) {
    liste.push({ type: 'dispute', restant: Math.max(0, etat.dispute.expire - instant(etat)), total: B.DISPUTE_DELAI });
  }
  return liste;
}
