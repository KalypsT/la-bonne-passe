// Rapport d'équilibrage : `npm run rapport`. Hors de `npm test`, il ne vérifie rien, il mesure.
// Il joue les stratégies du joueur actif sur 28 nuits et 10 graines, et affiche un tableau à recopier dans docs/EQUILIBRAGE.md.

import { it } from 'vitest';
import type { Offre, Segment } from '../content/clientele';
import type { EtatJeu, Regles } from './etat';
import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { choixAdaptatif, mesurerRenouvellement, partsDeClientele, simuler, type OptionsSimulation, type Renouvellement, type ResumeNuit } from './simulation';

const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NUITS = 28;
const SEGMENTS: Segment[] = ['touriste', 'habitue', 'affaires', 'groupe'];

interface Strategie {
  nom: string;
  offre: Offre;
  rdvMax: number;
  recruter?: boolean;
  renover?: boolean;
  regles?: Partial<Regles> | ((etat: EtatJeu) => Partial<Regles>);
  offreSelon?: (etat: EtatJeu) => Offre;
  theme?: (etat: EtatJeu) => string | null;
  equipeBar?: number;
  avance?: boolean;
}

const STRATEGIES: Strategie[] = [
  { nom: 'Classique, 3', offre: 'classique', rdvMax: 3 },
  { nom: 'Classique, 4', offre: 'classique', rdvMax: 4 },
  { nom: 'Happy hour, 4', offre: 'happy', rdvMax: 4 },
  { nom: 'Feutrée, 4', offre: 'feutree', rdvMax: 4 },
  { nom: 'Adaptatif (suit les tendances), 3', offre: 'classique', rdvMax: 3, regles: (e) => choixAdaptatif(e).regles, offreSelon: (e) => choixAdaptatif(e).offre, theme: (e) => choixAdaptatif(e).theme },
  { nom: 'Classique 3, sans bar', offre: 'classique', rdvMax: 3, equipeBar: 0 },
  { nom: 'Classique 3, bar à 2, sans avance', offre: 'classique', rdvMax: 3, equipeBar: 2, avance: false },
  { nom: 'Classique 3, champagne', offre: 'classique', rdvMax: 3, regles: { formule: 'champagne' } },
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

/** Les soirées se renouvellent-elles ? Une ligne par stratégie, cartes tranchées au hasard pour voir toutes les issues. */
function renouvellement(): { lignes: string[]; types: string[] } {
  const lignes = [
    '| Stratégie | Décisions par soirée | Soirées sous 4 décisions | Alertes par soirée | Imprévus par soirée | Imprévus différents | Répétitions du plus fréquent | Déjà vus dans les 7 nuits | Cartes d’intrigue | Voisin (parties, nuit moyenne) | Défis réussis | Objectif du mois 1 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const noms = ['Classique, 3', 'Feutrée, 4', 'Adaptatif (suit les tendances), 3', 'Classique 3, sélection laxiste', 'Classique 3, sélection stricte'];
  const virgule = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
  const TYPES = ['presse', 'bruit', 'ivre', 'bouteille', 'photographe', 'pause', 'dispute', 'chambreSale', 'linge', 'barVide', 'epuisement'];
  const types = [
    `| Stratégie | ${TYPES.join(' | ')} |`,
    `| --- | ${TYPES.map(() => '---').join(' | ')} |`,
  ];
  const reussis = (liste: boolean[]) => (liste.length ? `${liste.filter(Boolean).length} sur ${liste.length}` : '—');
  for (const s of STRATEGIES.filter((x) => noms.includes(x.nom))) {
    const parties = GRAINES.map((graine) => simuler({ graine, nuits: NUITS, ...s, offre: s.offreSelon ?? s.offre, politique: 'hasard' }));
    const mesures = parties.map((p) => mesurerRenouvellement(p.nuits));
    const moy = (f: (m: Renouvellement) => number) => mesures.reduce((t, m) => t + f(m), 0) / mesures.length;
    const voisin = parties.map((p) => p.nuits.find((n) => n.intrigues.includes('voisin:plainte'))?.numero).filter((x): x is number => x !== undefined);
    lignes.push(
      `| ${s.nom} | ${virgule(moy((m) => m.decisions))} | ${(moy((m) => m.soireesCalmes) * 100).toFixed(0)} % | ${virgule(moy((m) => m.alertes))} | ` +
        `${virgule(moy((m) => m.imprevus))} | ${virgule(moy((m) => m.imprevusDifferents))} | ${virgule(moy((m) => m.repetitionMax))} | ` +
        `${(moy((m) => m.dejaVus7) * 100).toFixed(0)} % | ${virgule(moy((m) => m.cartesIntrigue))} | ` +
        `${voisin.length} sur ${parties.length}${voisin.length ? `, nuit ${(voisin.reduce((a, b) => a + b, 0) / voisin.length).toFixed(0)}` : ''} | ` +
        `${reussis(parties.flatMap((p) => p.bilans.flatMap((b) => (b.defi ? [b.defi.reussi] : []))))} | ` +
        `${reussis(parties.flatMap((p) => p.bilansMois.filter((m) => m.numero === 1).map((m) => m.reussi)))} |`,
    );
    const soirees = parties.flatMap((p) => p.nuits);
    types.push(`| ${s.nom} | ${TYPES.map((t) => virgule(soirees.reduce((n, x) => n + (x.alertes[t] ?? 0), 0) / Math.max(1, soirees.length))).join(' | ')} |`);
  }
  return { lignes, types };
}

/** Le quartier (v0.5) : relations au bout de deux mois, événements et actions du deuxième mois (après le palier 3). */
function quartier(): string[] {
  const lignes = [
    '| Stratégie (56 nuits) | Voisins | Mairie | Presse | Police | Événements du quartier par partie, mois 2 (total sur les parties) | Actions de relations par partie, mois 2 | Avoir, nuit 56 | Décisions par soirée, mois 2 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const ids = new Set(EVENEMENTS_QUARTIER.map((e) => e.id));
  const variantes: { nom: string; options: Partial<OptionsSimulation> }[] = [
    { nom: 'Classique, 3', options: {} },
    { nom: 'Classique 3, sélection laxiste', options: { regles: { selection: 'laxiste' } } },
    { nom: 'Classique 3, sélection stricte', options: { regles: { selection: 'stricte' } } },
    { nom: 'Feutrée, 4', options: { offre: 'feutree', rdvMax: 4 } },
    { nom: 'Classique 3, relations entretenues (cible 10)', options: { relations: 'entretien' } },
    { nom: 'Laxiste, relations entretenues (cible 10)', options: { regles: { selection: 'laxiste' }, relations: 'entretien' } },
    { nom: 'Classique 3, relations soignées (cible 45)', options: { relations: 'entretien', cibleRelations: 45 } },
  ];
  const virgule = (x: number) => x.toFixed(1).replace('.', ',');
  for (const v of variantes) {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...v.options }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const mois2 = (p: (typeof parties)[number]) => p.nuits.slice(28);
    const evenements = parties.flatMap((p) => mois2(p).flatMap((n) => n.intrigues).map((x) => x.split(':')[0]!).filter((id) => ids.has(id)));
    const parType = [...new Set(evenements)].map((id) => `${id} ${evenements.filter((x) => x === id).length}`).join(', ');
    const jauge = (a: string) => moy((p) => p.nuits[55]?.relations[a as keyof ResumeNuit['relations']] ?? 0).toFixed(0);
    lignes.push(
      `| ${v.nom} | ${jauge('voisins')} | ${jauge('mairie')} | ${jauge('presse')} | ${jauge('police')} | ` +
        `${virgule(evenements.length / parties.length)}${parType ? ` (${parType})` : ''} | ${virgule(moy((p) => mois2(p).reduce((t, n) => t + n.actionsRelations, 0)))} | ` +
        `${arrondi(moy((p) => p.etat.tresorerie + p.etat.reserve))} € | ${virgule(moy((p) => mois2(p).reduce((t, n) => t + n.decisions, 0) / 28))} |`,
    );
  }
  return lignes;
}

it('rapport d’équilibrage', () => {
  const lignes = [
    '| Stratégie | Palier 2 (nuit) | Réputation 7 / 14 / 28 | Résultat réel par jour, semaine 2 | Net par nuit, semaine 2 | Avoir après la nuit 28, mensualité payée | Clients perdus, semaine 2 | Moral | Départs | Clientèle semaine 2 (T / H / A / G, %) | Satisfaction nuit 28 (T / H / A / G) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const s of STRATEGIES) {
    const parties = GRAINES.map((graine) => simuler({ graine, nuits: NUITS, ...s, offre: s.offreSelon ?? s.offre }));
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
        `${moy((p) => {
          const s = semaine2(p);
          const perdus = s.reduce((t, n) => t + n.perdus, 0);
          return (100 * perdus) / Math.max(1, perdus + s.reduce((t, n) => t + n.servis, 0));
        }).toFixed(0)} % | ` +
        `${moy((p) => p.etat.personnel.reduce((t, e) => t + e.moral, 0) / Math.max(1, p.etat.personnel.length)).toFixed(0)} | ` +
        `${moy((p) => p.departs).toFixed(1).replace('.', ',')} | ${SEGMENTS.map((seg) => parts[seg].toFixed(0)).join(' / ')} | ${satisfaction.join(' / ')} |`,
    );
  }
  console.log(`\nRapport d'équilibrage : ${GRAINES.length} graines, ${NUITS} nuits\n\n${lignes.join('\n')}\n`);
  const r = renouvellement();
  console.log(`\nRenouvellement des soirées : ${GRAINES.length} graines, ${NUITS} nuits (cartes tranchées au hasard)\n\n${r.lignes.join('\n')}\n`);
  console.log(`\nAlertes par soirée, selon leur type (mêmes parties)\n\n${r.types.join('\n')}\n`);
  console.log(`\nLe quartier : ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard ; événements sur 10 parties)\n\n${quartier().join('\n')}\n`);
}, 300_000);
