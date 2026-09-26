// Rapport d'équilibrage : `npm run rapport`. Hors de `npm test`, il ne vérifie rien, il mesure.
// Il joue les stratégies du joueur actif sur 28 nuits et 10 graines, et affiche un tableau à recopier dans docs/EQUILIBRAGE.md.

import { it } from 'vitest';
import type { Offre, Segment } from '../content/clientele';
import type { EtatJeu, Regles } from './etat';
import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { choixAdaptatif, evenementsExterieurs, mesurerProgression, mesurerRenouvellement, partsDeClientele, simuler, type OptionsSimulation, type Renouvellement, type ResumeNuit } from './simulation';

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
  const TYPES = ['presse', 'bruit', 'ivre', 'bouteille', 'photographe', 'pause', 'sabotage', 'journaliste', 'fenetre', 'dispute', 'chambreSale', 'linge', 'barVide', 'epuisement'];
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

/** La rivale (v0.5) : son humeur au bout de deux mois, ses coups du deuxième mois, et les réponses du joueur. */
function rivale(): string[] {
  const lignes = [
    '| Stratégie (56 nuits) | Agressivité, nuit 56 | Rapports | Coups par partie, mois 2 (total sur les parties) | Faux clients par partie | Débauchages (dénouements) | Avoir, nuit 56 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  const variantes: { nom: string; options: Partial<OptionsSimulation> }[] = [
    { nom: 'Classique, 3', options: {} },
    { nom: 'Classique 3, sélection laxiste', options: { regles: { selection: 'laxiste' } } },
    { nom: 'Classique 3, sélection stricte', options: { regles: { selection: 'stricte' } } },
    { nom: 'Feutrée, 4', options: { offre: 'feutree', rdvMax: 4 } },
    { nom: 'Classique 3, trêve dès que possible', options: { rivale: 'treve' } },
    { nom: 'Classique 3, riposte par rumeur', options: { rivale: 'riposte' } },
  ];
  const virgule = (x: number) => x.toFixed(1).replace('.', ',');
  for (const v of variantes) {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...v.options }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const coups = parties.flatMap((p) => p.nuits.slice(28).flatMap((n) => n.rivale.actions)).filter((a) => a !== 'visite');
    const parType = [...new Set(coups)].map((id) => `${id} ${coups.filter((x) => x === id).length}`).join(', ');
    const fins = parties.flatMap((p) => p.intrigues.filter((f) => f.id === 'offreChatNoir').map((f) => f.fin));
    lignes.push(
      `| ${v.nom} | ${moy((p) => p.nuits[55]?.rivale.agressivite ?? 0).toFixed(0)} | ${moy((p) => p.nuits[55]?.rivale.relation ?? 0).toFixed(0)} | ` +
        `${virgule(coups.length / parties.length)}${parType ? ` (${parType})` : ''} | ` +
        `${virgule(moy((p) => p.nuits.slice(28).reduce((t, n) => t + (n.alertes.sabotage ?? 0), 0)))} | ` +
        `${fins.length}${fins.length ? ` (${[...new Set(fins)].map((f) => `${f} ${fins.filter((x) => x === f).length}`).join(', ')})` : ''} | ` +
        `${arrondi(moy((p) => p.etat.tresorerie + p.etat.reserve))} € |`,
    );
  }
  return lignes;
}

/** Équipes Accueil et Sécurité, et assurance (v0.5) : alertes des nuits 36 à 56, coût et remboursements. */
function equipes(): string[] {
  const lignes = [
    '| Stratégie (56 nuits) | Alertes par soirée, nuits 36 à 56 | Décisions par soirée | Clients perdus, semaine 6 | Réputation, nuit 56 | Primes / remboursements d’assurance | Avoir, nuit 56 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  const variantes: { nom: string; options: Partial<OptionsSimulation> }[] = [
    { nom: 'Classique, 3', options: {} },
    { nom: 'Classique 3, accueil 1', options: { accueil: 1 } },
    { nom: 'Classique 3, sécurité 1', options: { securite: 1 } },
    { nom: 'Classique 3, accueil 1 et sécurité 1', options: { accueil: 1, securite: 1 } },
    { nom: 'Classique 3, accueil 2 et sécurité 2', options: { accueil: 2, securite: 2 } },
    { nom: 'Classique 3, sélection stricte', options: { regles: { selection: 'stricte' } } },
    { nom: 'Classique 3, sélection stricte, sécurité 1', options: { regles: { selection: 'stricte' }, securite: 1 } },
    { nom: 'Classique 3, assurance casse', options: { assurance: 1 } },
    { nom: 'Classique 3, assurance casse et amendes', options: { assurance: 2 } },
  ];
  const virgule = (x: number) => x.toFixed(1).replace('.', ',');
  for (const v of variantes) {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...v.options }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const mesures = parties.map((p) => mesurerRenouvellement(p.nuits.slice(35)));
    const m = (f: (x: Renouvellement) => number) => mesures.reduce((t, x) => t + f(x), 0) / mesures.length;
    const primes = moy((p) => p.bilans.reduce((t, b) => t + b.comptes.depenses.assurance, 0));
    const rembourse = moy((p) => p.bilans.reduce((t, b) => t + b.comptes.recettes.assurance, 0));
    lignes.push(
      `| ${v.nom} | ${virgule(m((x) => x.alertes))} | ${virgule(m((x) => x.decisions))} | ${virgule(moy((p) => p.nuits.slice(35, 42).reduce((t, n) => t + n.perdus, 0)))} | ` +
        `${moy((p) => p.nuits[55]?.reputation ?? 0).toFixed(0)} | ${primes > 0 ? `${arrondi(primes)} € / ${arrondi(rembourse)} €` : '—'} | ${arrondi(moy((p) => p.etat.tresorerie + p.etat.reserve))} € |`,
    );
  }
  return lignes;
}

/** Les soirées du deuxième mois (v0.5) : imprévus, alertes et décisions des nuits 36 à 56, selon l'offre et la visibilité. */
function deuxiemeMois(): string[] {
  const lignes = [
    '| Stratégie (nuits 36 à 56) | Imprévus par soirée | Alertes par soirée | Décisions par soirée | Soirées sous 4 décisions | Imprévus différents (mois 2) | Presse / voisins, nuit 56 | Avoir, nuit 56 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const variantes: { nom: string; options: Partial<OptionsSimulation> }[] = [
    { nom: 'Classique, 3', options: {} },
    { nom: 'Feutrée, 4', options: { offre: 'feutree', rdvMax: 4 } },
    { nom: 'Classique 3, sélection stricte', options: { regles: { selection: 'stricte' } } },
    { nom: 'Classique 3, sélection laxiste', options: { regles: { selection: 'laxiste' } } },
    { nom: 'Classique 3, site discret', options: { visibilite: 'site' } },
    { nom: 'Classique 3, concierges d’hôtel', options: { visibilite: 'concierges' } },
    { nom: 'Classique 3, influenceurs', options: { visibilite: 'influenceurs' } },
  ];
  const virgule = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
  for (const v of variantes) {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...v.options }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const mesures = parties.map((p) => mesurerRenouvellement(p.nuits.slice(35)));
    const m = (f: (x: Renouvellement) => number) => mesures.reduce((t, x) => t + f(x), 0) / mesures.length;
    lignes.push(
      `| ${v.nom} | ${virgule(m((x) => x.imprevus), 2)} | ${virgule(m((x) => x.alertes))} | ${virgule(m((x) => x.decisions))} | ${(m((x) => x.soireesCalmes) * 100).toFixed(0)} % | ` +
        `${virgule(moy((p) => mesurerRenouvellement(p.nuits.slice(28)).imprevusDifferents))} | ` +
        `${moy((p) => p.nuits[55]?.relations.presse ?? 0).toFixed(0)} / ${moy((p) => p.nuits[55]?.relations.voisins ?? 0).toFixed(0)} | ${arrondi(moy((p) => p.etat.tresorerie + p.etat.reserve))} € |`,
    );
  }
  return lignes;
}

/** « Le quartier vit-il ? » (v0.5) : ce qui vient de dehors, semaine par semaine, au deuxième mois (nuits 29 à 56). */
function quartierVit(): string[] {
  const lignes = [
    '| Stratégie (nuits 29 à 56) | Événements venus de dehors par semaine | Semaines sans | Voisins / mairie / presse / police, nuit 56 | Rivale : agressivité, coups au mois 2 | Décisions par soirée |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const variantes: { nom: string; options: Partial<OptionsSimulation> }[] = [
    { nom: 'Classique, 3', options: {} },
    { nom: 'Feutrée, 4', options: { offre: 'feutree', rdvMax: 4 } },
    { nom: 'Classique 3, sélection stricte', options: { regles: { selection: 'stricte' } } },
    { nom: 'Classique 3, sélection laxiste', options: { regles: { selection: 'laxiste' } } },
    { nom: 'Classique 3, influenceurs', options: { visibilite: 'influenceurs' } },
    { nom: 'Classique 3, relations soignées et trêve', options: { relations: 'entretien', cibleRelations: 45, rivale: 'treve' } },
  ];
  const virgule = (x: number) => x.toFixed(1).replace('.', ',');
  for (const v of variantes) {
    const parties = GRAINES.map((graine) => simuler({ graine, offre: 'classique', rdvMax: 3, nuits: 56, politique: 'hasard', ...v.options }));
    const moy = (f: (p: (typeof parties)[number]) => number) => parties.reduce((t, p) => t + f(p), 0) / parties.length;
    const semaines = parties.flatMap((p) => [0, 1, 2, 3].map((k) => p.nuits.slice(28 + 7 * k, 35 + 7 * k).reduce((t, n) => t + evenementsExterieurs(n), 0)));
    const jauge = (a: 'voisins' | 'mairie' | 'presse' | 'police') => moy((p) => p.nuits[55]?.relations[a] ?? 0).toFixed(0);
    lignes.push(
      `| ${v.nom} | ${virgule(semaines.reduce((a, b) => a + b, 0) / semaines.length)} | ${((semaines.filter((x) => x === 0).length / semaines.length) * 100).toFixed(0)} % | ` +
        `${jauge('voisins')} / ${jauge('mairie')} / ${jauge('presse')} / ${jauge('police')} | ` +
        `${moy((p) => p.nuits[55]?.rivale.agressivite ?? 0).toFixed(0)}, ${virgule(moy((p) => p.nuits.slice(28).flatMap((n) => n.rivale.actions).filter((a) => a !== 'visite').length))} | ` +
        `${virgule(moy((p) => mesurerRenouvellement(p.nuits.slice(28)).decisions))} |`,
    );
  }
  return lignes;
}

/** La progression sur six mois (v0.6, partie 8) : paliers, systèmes ouverts chaque semaine, argent et dette, décisions. */
function progression(): string[] {
  const complet: Omit<OptionsSimulation, 'graine'> = {
    offre: 'classique',
    rdvMax: 3,
    nuits: 168,
    relations: 'entretien',
    buanderie: true,
    loges: true,
    confort: true,
    former: true,
    placer: true,
    permis: true,
    agrandir: 'batiment',
    empruntAgrandir: { montant: 20000, duree: 24 },
    recruterJusqua: 8,
    gerante: true,
  };
  const strategies: [string, Omit<OptionsSimulation, 'graine'>][] = [
    ['Classique 3 (référence)', { offre: 'classique', rdvMax: 3, nuits: 168, permis: true }],
    ['Classique 4', { offre: 'classique', rdvMax: 4, nuits: 168, permis: true }],
    ['Feutrée 4', { offre: 'feutree', rdvMax: 4, nuits: 168, permis: true }],
    ['Complet (tout ce qui s’ouvre, bâtiment à crédit)', complet],
    ['Complet, cartes tranchées au hasard', { ...complet, politique: 'hasard' }],
    ['Passif (sans recruter ni rénover)', { offre: 'classique', rdvMax: 4, nuits: 168, recruter: false, renover: false }],
  ];
  const virgule = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
  const paliers = [
    '| Stratégie (168 nuits) | Palier 2 | Palier 3 | Palier 4 | Palier 5 | Faillites |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const semaines = ['| Stratégie | Systèmes ouverts en plus, semaines 1 à 16 | Semaines sans nouveauté (2 à 16) |', '| --- | --- | --- |'];
  const argent = [
    '| Stratégie | Trésorerie fin des mois 1 à 6 | Dette fin des mois 1 à 6 | Valeur nette fin des mois 1 à 6 | Réputation mois 1 à 6 | Personnes / chambres au mois 6 | Décisions d’argent / d’investissement par semaine (dès la semaine 5) |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const [nom, o] of strategies) {
    const p = mesurerProgression(GRAINES, o);
    const jour = (k: number) => {
      const j = p.paliers.map((x) => x[k]!).filter((x) => x > 0);
      if (!j.length) return 'jamais';
      const m = Math.round(j.reduce((a, b) => a + b, 0) / j.length);
      return `${m} (${Math.min(...j)} à ${Math.max(...j)})${j.length < GRAINES.length ? `, ${j.length} sur ${GRAINES.length}` : ''}`;
    };
    paliers.push(`| ${nom} | ${jour(1)} | ${jour(2)} | ${jour(3)} | ${jour(4)} | ${p.faillites} |`);
    const plus = p.systemesParSemaine.slice(0, 16).map((x, i) => x - (i === 0 ? x : p.systemesParSemaine[i - 1]!));
    semaines.push(`| ${nom} | ${plus.map((x, i) => (i === 0 ? '—' : virgule(x))).join(' · ')} | ${plus.slice(1).filter((x) => x < 0.5).length} sur 15 |`);
    const m = p.mois;
    const f = (g: (x: (typeof m)[number]) => number) => m.map((x) => arrondi(g(x))).join(' / ');
    const dernier = m[m.length - 1]!;
    argent.push(
      `| ${nom} | ${f((x) => x.tresorerie)} € | ${f((x) => x.dette)} € | ${f((x) => x.valeur)} € | ${m.map((x) => x.reputation.toFixed(0)).join(' / ')} | ${virgule(dernier.personnel)} / ${virgule(dernier.chambres)} | ${virgule(p.financesParSemaine, 2)} / ${virgule(p.investissementsParSemaine, 2)} |`,
    );
  }
  return [...paliers, '', ...semaines, '', ...argent];
}

/**
 * La fin du chapitre 1 (v1.0) : quand la deuxième maison ouvre-t-elle, selon les stratégies, et que rapporte-t-elle ?
 * Le joueur achète le lieu le moins cher dès que la caisse le permet, puis l'inaugure.
 */
function deuxiemeMaison(): string[] {
  const NUITS_CHAPITRE = 336;
  const base = { nuits: NUITS_CHAPITRE, permis: true, etablissement: true, maison2: 'externe' as const };
  const complet: Omit<OptionsSimulation, 'graine'> = {
    ...base,
    offre: 'classique',
    rdvMax: 3,
    relations: 'entretien',
    buanderie: true,
    loges: true,
    confort: true,
    former: true,
    placer: true,
    agrandir: 'batiment',
    empruntAgrandir: { montant: 20000, duree: 24 },
    recruterJusqua: 8,
    gerante: true,
  };
  const strategies: [string, Omit<OptionsSimulation, 'graine'>][] = [
    ['Classique 3', { ...base, offre: 'classique', rdvMax: 3 }],
    ['Classique 4', { ...base, offre: 'classique', rdvMax: 4 }],
    ['Feutrée 4', { ...base, offre: 'feutree', rdvMax: 4 }],
    ['Classique 4, gérante de l’équipe', { ...base, offre: 'classique', rdvMax: 4, maison2: 'equipe' }],
    ['Classique 4, consigne ambitieuse', { ...base, offre: 'classique', rdvMax: 4, consigneMaison: 'ambitieuse' }],
    ['Classique 4, consigne prudente', { ...base, offre: 'classique', rdvMax: 4, consigneMaison: 'prudente' }],
    ['Complet (bâtiment à crédit)', complet],
    ['Complet, cartes au hasard', { ...complet, politique: 'hasard' }],
  ];
  const lignes = [
    `| Stratégie (${NUITS_CHAPITRE} nuits) | Palier 5 | Inauguration (jour) | Résultat par semaine pleine | Coût du lieu | Remboursé en (semaines) | Rapporté à la fin | Faillites |`,
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const [nom, o] of strategies) {
    const p = mesurerProgression(GRAINES, o);
    const jours = (liste: number[]) => {
      const j = liste.filter((x) => x > 0);
      if (!j.length) return 'jamais';
      const m = Math.round(j.reduce((a, b) => a + b, 0) / j.length);
      return `${m} (${Math.min(...j)} à ${Math.max(...j)})${j.length < GRAINES.length ? `, ${j.length} sur ${GRAINES.length}` : ''}`;
    };
    const m2 = p.maison2;
    const moy = (f: (x: (typeof m2)[number]) => number) => (m2.length ? m2.reduce((t, x) => t + f(x), 0) / m2.length : 0);
    const semaine = moy((x) => x.resultatSemaine);
    lignes.push(
      `| ${nom} | ${jours(p.paliers.map((x) => x[4]!))} | ${jours(p.inaugurations)} | ${m2.length ? `${arrondi(semaine)} €` : '—'} | ${m2.length ? `${arrondi(moy((x) => x.cout))} €` : '—'} | ${
        semaine > 0 ? Math.round(moy((x) => x.cout) / semaine) : '—'
      } | ${m2.length ? `${arrondi(moy((x) => x.total))} €` : '—'} | ${p.faillites} |`,
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
  console.log(`\nLa rivale : ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard)\n\n${rivale().join('\n')}\n`);
  console.log(`\nLe quartier vit-il ? ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard)\n\n${quartierVit().join('\n')}\n`);
  console.log(`\nLes soirées du deuxième mois : ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard)\n\n${deuxiemeMois().join('\n')}\n`);
  console.log(`\nÉquipes et assurance : ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard)\n\n${equipes().join('\n')}\n`);
  console.log(`\nLa progression sur six mois : ${GRAINES.length} graines, 168 nuits (jours d'atteinte des paliers : moyenne, puis extrêmes)\n\n${progression().join('\n')}\n`);
  console.log(`\nLa deuxième maison et la fin du chapitre 1 : ${GRAINES.length} graines, 336 nuits\n\n${deuxiemeMaison().join('\n')}\n`);
  console.log(`\nLe quartier : ${GRAINES.length} graines, 56 nuits (cartes tranchées au hasard ; événements sur 10 parties)\n\n${quartier().join('\n')}\n`);
}, 1_800_000);
