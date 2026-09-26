// Imprévus de la soirée : environ 2 par nuit, en pause, avec 2 ou 3 choix.
// Voir « Événements et intrigues » dans les spécifications.

import * as B from '../content/balance';
import { IMPREVUS, trouverImprevu, type ConditionImprevu, type DefinitionImprevu } from '../content/imprevus';
import type { Employe, EtatJeu, ImprevuEnCours } from './etat';
import { appliquerEffet } from './effets';
import type { Tirage } from './hasard';
import { barSert } from './bar';
import { segmentOuvert } from './clientele';
import { CLIENTS } from '../content/clientele';
import { demarrerSuite } from './intrigues';
import { candidatVedette, type EvenementRecrutement } from './recrutement';
import type { Segment } from '../content/clientele';
import { affinite, type EvenementPersonnel } from './personnel';
import { ecart, instant } from './temps';

export type EvenementImprevu =
  | { type: 'imprevu'; id: string; employeId: string | null; employe2Id: string | null }
  | { type: 'imprevuTranche'; id: string; choix: number; reussite: boolean; prenom?: string; prenom2?: string };

export type OrdreImprevu = { type: 'choixImprevu'; choix: number };

interface Sortie {
  push(e: EvenementImprevu): unknown;
}

/** Trancher un imprévu peut aussi faire partir quelqu'un, ou entrer une candidate. */
interface SortieChoix {
  push(e: EvenementImprevu | EvenementPersonnel | EvenementRecrutement): unknown;
}

function disponible(etat: EtatJeu, e: Employe): boolean {
  return e.enServiceCeSoir && !e.repos && !etat.rendezVous.some((r) => r.employeId === e.id);
}

/** Un client de ce segment est-il sur le quai ou dans une chambre ? */
function segmentPresent(etat: EtatJeu, segment: Segment): boolean {
  const presents = [...etat.file.map((c) => c.modele), ...etat.rendezVous.map((r) => r.modele)];
  return presents.some((m) => CLIENTS.find((c) => c.id === m)?.segment === segment);
}

/** Les circonstances de la soirée (palier, semaine, thème, bar, règles, clientèle) permettent-elles l'imprévu ? */
export function circonstances(etat: EtatJeu, c: ConditionImprevu): boolean {
  const tendances = etat.systemes.tendances ? etat.semaine.tendances : [];
  return (
    (c.palierMin === undefined || etat.palier >= c.palierMin) &&
    (c.reputationMin === undefined || etat.reputation >= c.reputationMin) &&
    (c.tendance === undefined || c.tendance.some((t) => tendances.includes(t))) &&
    (c.theme === undefined || (etat.themeDuSoir !== null && c.theme.includes(etat.themeDuSoir))) &&
    (c.offre === undefined || c.offre.includes(etat.offre)) &&
    (c.bar === undefined || barSert(etat) === c.bar) &&
    (c.selection === undefined || (etat.systemes.porte && c.selection.includes(etat.regles.selection))) &&
    (c.formule === undefined || (etat.systemes.tarifs && c.formule.includes(etat.regles.formule))) &&
    (c.tarifMin === undefined || (etat.systemes.tarifs && etat.regles.tarif >= c.tarifMin)) &&
    (c.segment === undefined || segmentOuvert(etat, c.segment)) &&
    (c.segmentPresent === undefined || segmentPresent(etat, c.segmentPresent)) &&
    (!c.placeLibre || (etat.systemes.recrutement && etat.personnel.length < B.PERSONNEL_MAX))
  );
}

/** Les circonstances favorisent-elles l'imprévu (tendance, thème, règle) ? */
export function favorise(etat: EtatJeu, def: DefinitionImprevu): boolean {
  const b = def.bonus;
  if (!b) return false;
  const tendances = etat.systemes.tendances ? etat.semaine.tendances : [];
  return (
    (b.tendance?.some((t) => tendances.includes(t)) ?? false) ||
    (etat.themeDuSoir !== null && (b.theme?.includes(etat.themeDuSoir) ?? false)) ||
    (etat.systemes.porte && (b.selection?.includes(etat.regles.selection) ?? false))
  );
}

/** Qui est concerné par un imprévu, ou null si ses conditions ne sont pas remplies ce soir. */
export function concernes(etat: EtatJeu, def: DefinitionImprevu): ImprevuEnCours | null {
  const c = def.condition;
  if (!c) return { id: def.id, employeId: null, employe2Id: null };
  if (!circonstances(etat, c)) return null;
  const personnelle = c.rivalite !== undefined || c.fatigueMin !== undefined || c.trait !== undefined || c.partMax !== undefined || c.disponible;
  if (!personnelle) return { id: def.id, employeId: null, employe2Id: null };
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

/**
 * Poids de chaque imprévu possible : un imprévu jamais vu sort plus souvent, un imprévu vu il y a moins de
 * IMPREVU_REPOS_NUITS nuits ne sort pas (mieux vaut une soirée sans imprévu qu'une répétition), et les
 * circonstances qui le favorisent le rendent plus probable.
 */
export function poidsImprevus(etat: EtatJeu, possibles: ImprevuEnCours[]): number[] {
  const nuit = etat.nuit?.numero ?? etat.nuitsBouclees + 1;
  const ecarts = possibles.map((p) => {
    const vue = etat.imprevusNuit[p.id];
    return vue === undefined ? Infinity : nuit - vue;
  });
  const poids = possibles.map((p, i) => {
    const ecartNuits = ecarts[i]!;
    const base = ecartNuits === Infinity ? B.IMPREVU_POIDS_NOUVEAU : ecartNuits < B.IMPREVU_REPOS_NUITS ? 0 : 1 + Math.min(1, (ecartNuits - B.IMPREVU_REPOS_NUITS) / 7);
    const def = trouverImprevu(p.id);
    return base * (def && favorise(etat, def) ? B.IMPREVU_POIDS_BONUS : 1);
  });
  return poids;
}

/** Tire peut-être un imprévu pendant la soirée. Le tout premier de la partie est toujours le plus simple. */
export function declencherImprevu(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  if (etat.imprevu || etat.intrigues.carte || etat.dispute || !etat.nuit || etat.nuit.imprevus >= B.IMPREVUS_MAX_PAR_NUIT) return;
  const maintenant = instant(etat);
  if (maintenant < etat.prochainImprevu) return;
  if (ecart(B.HEURE_OUVERTURE, etat.minuteDuJour) < B.IMPREVU_PREMIER_APRES) return;
  if (ecart(etat.minuteDuJour, B.HEURE_FERMETURE) <= B.DERNIER_RDV_AVANT_FERMETURE) return;
  if (!tirage.chance((B.IMPREVU_CHANCE_PAR_HEURE * B.MINUTES_PAR_TICK) / 60)) return;

  const premiers = etat.imprevusVus.length === 0;
  const possibles = IMPREVUS.filter((d) => !!d.premier === premiers && !(d.unique && etat.imprevusNuit[d.id] !== undefined))
    .map((d) => concernes(etat, d))
    .filter((x): x is ImprevuEnCours => x !== null);
  const poids = poidsImprevus(etat, possibles);
  if (!poids.some((p) => p > 0)) return;
  const choisi = tirage.choisir(possibles, poids);

  etat.imprevu = choisi;
  etat.nuit.imprevus += 1;
  etat.prochainImprevu = maintenant + B.IMPREVU_ECART_MIN;
  etat.imprevusVus = [...etat.imprevusVus.filter((id) => id !== choisi.id), choisi.id];
  etat.imprevusNuit[choisi.id] = etat.nuit.numero;
  evenements.push({ type: 'imprevu', ...choisi });
}

export function trancherImprevu(
  etat: EtatJeu,
  choix: number,
  tirage: Tirage,
  ajouterClient: (segment?: Segment) => void,
  evenements: SortieChoix,
): void {
  const imprevu = etat.imprevu;
  const def = imprevu && trouverImprevu(imprevu.id);
  const option = def?.choix[choix];
  if (!imprevu || !option) return;
  const reussite = option.chance === undefined || tirage.chance(option.chance);
  appliquerEffet(etat, reussite ? option.effet : (option.echec ?? {}), imprevu, {
    ajouterClient,
    demarrerSuite: (id, delai, employeId) => demarrerSuite(etat, id, delai, employeId),
    candidatVedette: () => candidatVedette(etat, tirage, evenements),
    evenements,
    forceSatisfaction: B.IMPREVU_FORCE_SATISFACTION,
  });
  etat.imprevu = null;
  const prenom = etat.personnel.find((x) => x.id === imprevu.employeId)?.prenom;
  const prenom2 = etat.personnel.find((x) => x.id === imprevu.employe2Id)?.prenom;
  evenements.push({ type: 'imprevuTranche', id: imprevu.id, choix, reussite, prenom, prenom2 });
}
