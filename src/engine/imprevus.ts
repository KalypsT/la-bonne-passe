// Imprévus de la soirée : environ 2 par nuit, en pause, avec 2 ou 3 choix.
// Voir « Événements et intrigues » dans les spécifications.

import * as B from '../content/balance';
import { IMPREVUS, trouverImprevu, type DefinitionImprevu, type EffetImprevu } from '../content/imprevus';
import type { Employe, EtatJeu, ImprevuEnCours } from './etat';
import { changerReputationGlobale } from './clientele';
import { encaisser, noterDepense } from './comptes';
import type { Tirage } from './hasard';
import { affinite, changerLoyaute, changerMoral, ajusterAffinite } from './personnel';
import { ecart, instant } from './temps';

export type EvenementImprevu =
  | { type: 'imprevu'; id: string; employeId: string | null; employe2Id: string | null }
  | { type: 'imprevuTranche'; id: string; choix: number; reussite: boolean; prenom?: string; prenom2?: string };

export type OrdreImprevu = { type: 'choixImprevu'; choix: number };

interface Sortie {
  push(e: EvenementImprevu): unknown;
}

const borner = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

function disponible(etat: EtatJeu, e: Employe): boolean {
  return e.enServiceCeSoir && !e.repos && !etat.rendezVous.some((r) => r.employeId === e.id);
}

/** Qui est concerné par un imprévu, ou null si ses conditions ne sont pas remplies ce soir. */
export function concernes(etat: EtatJeu, def: DefinitionImprevu): ImprevuEnCours | null {
  const c = def.condition;
  if (!c) return { id: def.id, employeId: null, employe2Id: null };
  const enService = etat.personnel.filter((e) => e.enServiceCeSoir && !e.repos);
  if (c.rivalite !== undefined) {
    for (let i = 0; i < enService.length; i++) {
      for (let j = i + 1; j < enService.length; j++) {
        const a = enService[i]!;
        const b = enService[j]!;
        if (affinite(etat, a.id, b.id) <= c.rivalite) return { id: def.id, employeId: a.id, employe2Id: b.id };
      }
    }
    return null;
  }
  const personne = enService.find(
    (e) =>
      (c.fatigueMin === undefined || e.fatigue >= c.fatigueMin) &&
      (c.trait === undefined || e.traits.includes(c.trait)) &&
      (c.partMax === undefined || e.part <= c.partMax) &&
      (!c.disponible || disponible(etat, e)),
  );
  return personne ? { id: def.id, employeId: personne.id, employe2Id: null } : null;
}

/** Tire peut-être un imprévu pendant la soirée. Le tout premier de la partie est toujours le plus simple. */
export function declencherImprevu(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  if (etat.imprevu || etat.dispute || !etat.nuit || etat.nuit.imprevus >= B.IMPREVUS_MAX_PAR_NUIT) return;
  const maintenant = instant(etat);
  if (maintenant < etat.prochainImprevu) return;
  if (ecart(B.HEURE_OUVERTURE, etat.minuteDuJour) < B.IMPREVU_PREMIER_APRES) return;
  if (ecart(etat.minuteDuJour, B.HEURE_FERMETURE) <= B.DERNIER_RDV_AVANT_FERMETURE) return;
  if (!tirage.chance((B.IMPREVU_CHANCE_PAR_HEURE * B.MINUTES_PAR_TICK) / 60)) return;

  const premiers = etat.imprevusVus.length === 0;
  const possibles = IMPREVUS.filter((d) => !!d.premier === premiers)
    .map((d) => concernes(etat, d))
    .filter((x): x is ImprevuEnCours => x !== null);
  if (possibles.length === 0) return;
  // Les imprévus jamais vus sortent plus souvent ; le dernier vu est évité.
  const dernier = etat.imprevusVus[etat.imprevusVus.length - 1];
  const poids = possibles.map((p) => (p.id === dernier && possibles.length > 1 ? 0 : etat.imprevusVus.includes(p.id) ? 1 : 2));
  const choisi = tirage.choisir(possibles, poids);

  etat.imprevu = choisi;
  etat.nuit.imprevus += 1;
  etat.prochainImprevu = maintenant + B.IMPREVU_ECART_MIN;
  etat.imprevusVus = [...etat.imprevusVus.filter((id) => id !== choisi.id), choisi.id];
  evenements.push({ type: 'imprevu', ...choisi });
}

/** Applique l'effet d'un choix. `ajouterClient` fait entrer un client sur le quai. */
function appliquerEffet(etat: EtatJeu, effet: EffetImprevu, imprevu: ImprevuEnCours, ajouterClient: () => void): void {
  const e = etat.personnel.find((x) => x.id === imprevu.employeId);
  const e2 = etat.personnel.find((x) => x.id === imprevu.employe2Id);
  if (e) {
    if (effet.moral) changerMoral(e, effet.moral);
    if (effet.loyaute) changerLoyaute(e, effet.loyaute);
    if (effet.fatigue) e.fatigue = borner(e.fatigue + effet.fatigue);
    if (effet.part) e.part = Math.min(0.65, Math.round((e.part + effet.part) * 100) / 100);
    if (effet.repos && !etat.rendezVous.some((r) => r.employeId === e.id)) e.repos = true;
  }
  if (e2 && effet.moral2) changerMoral(e2, effet.moral2);
  if (e && e2 && effet.affinite) ajusterAffinite(etat, e.id, e2.id, effet.affinite);
  if (effet.reputation) changerReputationGlobale(etat, effet.reputation);
  const argent = effet.argent ?? 0;
  if (argent > 0) {
    encaisser(etat, argent, 'autres');
    if (etat.nuit) etat.nuit.recettes += argent;
  } else if (argent < 0) {
    etat.tresorerie += argent;
    noterDepense(etat, -argent, 'incidents');
    if (etat.nuit) etat.nuit.depenses -= argent;
  }
  for (let i = 0; i < (effet.clients ?? 0); i++) ajouterClient();
}

export function trancherImprevu(etat: EtatJeu, choix: number, tirage: Tirage, ajouterClient: () => void, evenements: Sortie): void {
  const imprevu = etat.imprevu;
  const def = imprevu && trouverImprevu(imprevu.id);
  const option = def?.choix[choix];
  if (!imprevu || !option) return;
  const reussite = option.chance === undefined || tirage.chance(option.chance);
  appliquerEffet(etat, reussite ? option.effet : (option.echec ?? {}), imprevu, ajouterClient);
  etat.imprevu = null;
  const prenom = etat.personnel.find((x) => x.id === imprevu.employeId)?.prenom;
  const prenom2 = etat.personnel.find((x) => x.id === imprevu.employe2Id)?.prenom;
  evenements.push({ type: 'imprevuTranche', id: imprevu.id, choix, reussite, prenom, prenom2 });
}
