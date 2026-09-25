// Rapport d'équilibrage : `npm run rapport`. Hors de `npm test`, il ne vérifie rien, il mesure.
// Il joue les stratégies du joueur actif sur 28 nuits et 10 graines, et affiche un tableau à recopier dans docs/EQUILIBRAGE.md.

import { it } from 'vitest';
import type { Offre, Segment } from '../content/clientele';
import type { Regles } from './etat';
import { partsDeClientele, simuler, type ResumeNuit } from './simulation';

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NUITS = 28;
const SEGMENTS: Segment[] = ['touriste', 'habitue', 'affaires', 'groupe'];

interface Strategie {
  nom: string;
  offre: Offre;
  rdvMax: number;
  recruter?: boolean;
  renover?: boolean;
  regles?: Partial<Regles>;
}

const STRATEGIES: Strategie[] = [
  { nom: 'Classique, 3', offre: 'classique', rdvMax: 3 },
  { nom: 'Classique, 4', offre: 'classique', rdvMax: 4 },
  { nom: 'Happy hour, 4', offre: 'happy', rdvMax: 4 },
  { nom: 'Feutrée, 4', offre: 'feutree', rdvMax: 4 },
  { nom: 'Classique 3, tarif −20 %', offre: 'classique', rdvMax: 3, regles: { tarif: 0 } },
  { nom: 'Classique 3, tarif +20 %', offre: 'classique', rdvMax: 3, regles: { tarif: 2 } },
  { nom: 'Classique 3, formule courte', offre: 'classique', rdvMax: 3, regles: { formule: 'court' } },
  { nom: 'Classique 3, soirée complète', offre: 'classique', rdvMax: 3, regles: { formule: 'complete' } },
  { nom: 'Classique 3, sélection laxiste', offre: 'classique', rdvMax: 3, regles: { selection: 'laxiste' } },
  { nom: 'Classique 3, sélection stricte', offre: 'classique', rdvMax: 3, regles: { selection: 'stricte' } },
  { nom: 'Classique 3, habitués d’abord', offre: 'classique', rdvMax: 3, regles: { priorite: 'habitues' } },
  { nom: 'Classique 3, pressés d’abord', offre: 'classique', rdvMax: 3, regles: { priorite: 'presses' } },
  { nom: 'Passif (classique, sans recruter ni rénover)', offre: 'classique', rdvMax: 4, recruter: false, renover: false },
];

const arrondi = (n: number) => Math.round(n).toLocaleString('fr-FR');

it('rapport d’équilibrage', () => {
  const lignes = [
    '| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const s of STRATEGIES) {
    const parties = GRAINES.map((graine) => simuler({ graine, nuits: NUITS, ...s }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const semaine2 = (p: { nuits: ResumeNuit[] }) => p.nuits.slice(7, 14);
    const paliers = parties.map((p) => p.nuits.find((n) => n.palier >= 2)?.numero ?? 99);
    const rep = (n: number) => moy((p) => p.nuits[n - 1]?.reputation ?? 0).toFixed(0);
    const parts = partsDeClientele(parties.flatMap(semaine2));
    const satisfaction = SEGMENTS.map((seg) => moy((p) => p.nuits[NUITS - 1]?.satisfaction[seg] ?? 0).toFixed(0));
    lignes.push(
      `| ${s.nom} | ${Math.min(...paliers) > NUITS ? 'jamais' : `${Math.min(...paliers)} à ${Math.max(...paliers)}`} | ${rep(7)} / ${rep(14)} / ${rep(28)} | ` +
        `${arrondi(moy((p) => semaine2(p).reduce((t, n) => t + n.resultat, 0) / 7))} € | ` +
        `${arrondi(moy((p) => semaine2(p).reduce((t, n) => t + n.net, 0) / 7))} € | ` +
        `${arrondi(moy((p) => p.etat.tresorerie + p.etat.reserve))} € | ` +
        `${moy((p) => p.etat.personnel.reduce((t, e) => t + e.moral, 0) / Math.max(1, p.etat.personnel.length)).toFixed(0)} | ` +
        `${moy((p) => p.departs).toFixed(1).replace('.', ',')} | ${SEGMENTS.map((seg) => parts[seg].toFixed(0)).join(' / ')} | ${satisfaction.join(' / ')} |`,
    );
  }
  console.log(`\nRapport d'équilibrage : ${GRAINES.length} graines, ${NUITS} nuits\n\n${lignes.join('\n')}\n`);
}, 120_000);
