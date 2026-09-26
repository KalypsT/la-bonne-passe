import { it } from 'vitest';
import { valeurNette } from './engine/banque';
import { simuler, type OptionsSimulation } from './engine/simulation';
const G = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const moy = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
function ligne(nom: string, o: Partial<OptionsSimulation>) {
  const ps = G.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 84, politique: 'hasard', ...o }));
  const signe = moy(ps.map((p) => p.etat.banque.emprunts[0]?.jourSignature ?? 0));
  const taux = moy(ps.map((p) => p.etat.banque.emprunts[0]?.taux ?? 0));
  console.log(`| ${nom} | ${Math.round(signe)} | ${taux.toFixed(1)} % | ${Math.round(moy(ps.map((p) => p.nuits[55]!.tresorerie)))} € | ${Math.round(moy(ps.map((p) => valeurNette(p.etat))))} € | ${Math.round(moy(ps.map((p) => p.tresorerieMin)))} € | ${moy(ps.map((p) => p.etat.banque.impayees)).toFixed(1)} | ${ps.filter((p) => p.etat.finDePartie).length}/10 |`);
}
it('mesure', () => {
  ligne('Sans emprunt', {});
  ligne('10 000 € sur 12 mois', { emprunt: { montant: 10000, duree: 12 } });
  ligne('20 000 € sur 24 mois', { emprunt: { montant: 20000, duree: 24 } });
  ligne('40 000 € sur 6 mois', { emprunt: { montant: 40000, duree: 6 } });
  ligne('40 000 € sur 24 mois', { emprunt: { montant: 40000, duree: 24 } });
}, 900000);
