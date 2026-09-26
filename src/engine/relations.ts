// Relations avec le quartier (v0.5, palier 3) : une jauge par acteur, qui bouge avec la vie de la maison,
// ouvre des services en bons termes et déclenche des ennuis en mauvais termes.
// Voir « Relations et rivaux » dans les spécifications ; valeurs dans balance.ts, textes dans src/content/relations.ts.

import * as B from '../content/balance';
import { ACTEURS, ACTEURS_ORDRE, type IdActeur } from '../content/relations';
import type { Segment } from '../content/clientele';
import type { EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { changerReputationGlobale } from './clientele';
import { depenser } from './comptes';
import { demarrerSuite } from './intrigues';
import { visibiliteActive } from './regles';

export interface Relations {
  /** Jauge de chaque acteur, de −100 à +100. */
  jauges: Record<IdActeur, number>;
  /** Les jauges au dernier lundi, pour montrer ce qui a bougé dans la semaine. */
  lundi: Record<IdActeur, number>;
  /** Jour de la dernière action de relation auprès de chaque acteur (très négatif : jamais). */
  derniereAction: Record<IdActeur, number>;
  /** Jour du dernier événement du quartier venu de chaque acteur. */
  dernierEvenement: Record<IdActeur, number>;
  /** Arrivées de la soirée multipliées (un contrôle devant la porte) ; revient à 1 chaque matin. */
  affluenceSoir: number;
}

export type EvenementRelation =
  | { type: 'actionRelation'; action: string; acteur: IdActeur; montant: number; reussite: boolean }
  | { type: 'expressRatee'; quoi: 'linge' | 'bar' }
  | { type: 'seuilRelation'; acteur: IdActeur; termes: 'bons' | 'mauvais' | 'neutre' };

export type OrdreRelation = { type: 'actionRelation'; action: string };

interface Sortie {
  push(e: EvenementRelation): unknown;
}

const JAMAIS = -99;
const borner = (v: number) => Math.min(100, Math.max(-100, v));
const parActeur = (f: (a: IdActeur) => number) =>
  Object.fromEntries(ACTEURS_ORDRE.map((a) => [a, f(a)])) as Record<IdActeur, number>;

export function relationsDeDepart(): Relations {
  const jauges = parActeur((a) => B.RELATIONS.depart[a] ?? 0);
  return {
    jauges,
    lundi: { ...jauges },
    derniereAction: parActeur(() => JAMAIS),
    dernierEvenement: parActeur(() => JAMAIS),
    affluenceSoir: 1,
  };
}

/** Les termes d'une relation : bons, mauvais, ou rien de particulier. */
export function termes(valeur: number): 'bons' | 'mauvais' | 'neutre' {
  if (valeur >= B.RELATIONS.bons) return 'bons';
  if (valeur <= B.RELATIONS.mauvais) return 'mauvais';
  return 'neutre';
}

/** Les relations comptent-elles déjà (palier 3) ? Avant, les cartes les font bouger en silence. */
export function relationsOuvertes(etat: EtatJeu): boolean {
  return etat.systemes.relations;
}

/** Cet acteur compte-t-il déjà ? Les fournisseurs arrivent plus tard (v0.6). */
export function acteurOuvert(etat: EtatJeu, acteur: IdActeur): boolean {
  return relationsOuvertes(etat) && (acteur !== 'fournisseurs' || etat.systemes.fournisseurs);
}

/** Les acteurs qui comptent déjà, dans l'ordre. */
export function acteursOuverts(etat: EtatJeu): IdActeur[] {
  return ACTEURS_ORDRE.filter((a) => acteurOuvert(etat, a));
}

export function enBonsTermes(etat: EtatJeu, acteur: IdActeur): boolean {
  return acteurOuvert(etat, acteur) && termes(etat.relations.jauges[acteur]) === 'bons';
}

export function enMauvaisTermes(etat: EtatJeu, acteur: IdActeur): boolean {
  return acteurOuvert(etat, acteur) && termes(etat.relations.jauges[acteur]) === 'mauvais';
}

/** Fait bouger une relation ; le journal note quand elle change de termes (une fois les relations ouvertes). */
export function changerRelation(etat: EtatJeu, acteur: IdActeur, delta: number, evenements?: Sortie): void {
  const avant = etat.relations.jauges[acteur];
  const apres = Math.round(borner(avant + delta) * 10) / 10;
  etat.relations.jauges[acteur] = apres;
  const t = termes(apres);
  if (evenements && acteurOuvert(etat, acteur) && t !== termes(avant)) evenements.push({ type: 'seuilRelation', acteur, termes: t });
}

export function changerRelations(etat: EtatJeu, deltas: Partial<Record<string, number>>, evenements?: Sortie): void {
  for (const [acteur, delta] of Object.entries(deltas)) {
    if (delta && acteur in etat.relations.jauges) changerRelation(etat, acteur as IdActeur, delta, evenements);
  }
}

/**
 * Le matin, avant que le quartier n'oublie le tapage : les voisins jugent la nuit, les autres jauges reviennent
 * doucement vers leur valeur de départ, et un acteur en bons ou en mauvais termes se manifeste parfois.
 * Les événements du quartier ont leur propre générateur : ils ne décalent pas le hasard de la partie.
 */
export function matinDesRelations(etat: EtatJeu, evenements: Sortie): void {
  const r = etat.relations;
  r.affluenceSoir = 1;
  if (!relationsOuvertes(etat)) return;
  const R = B.RELATIONS;

  // Les voisins jugent la nuit passée ; une nuit calme les apaise, jusqu'à un plafond.
  const tapage = etat.quartier.tapage;
  const V = R.voisins;
  const avis = (V.neutre - tapage) * V.pente;
  if (avis < 0) changerRelation(etat, 'voisins', avis, evenements);
  else if (r.jauges.voisins < V.plafondCalme) changerRelation(etat, 'voisins', Math.min(avis, V.plafondCalme - r.jauges.voisins), evenements);
  // Une nuit très bruyante : les voisins appellent la police. Fâchés, ils écrivent à la mairie.
  if (tapage >= R.police.tapageAppel) changerRelation(etat, 'police', -R.police.perte, evenements);
  if (termes(r.jauges.voisins) === 'mauvais') changerRelation(etat, 'mairie', -R.mairie.plaintesVoisins, evenements);
  // La visibilité de la nuit passée : la presse aime les influenceurs, les voisins beaucoup moins.
  if (etat.nuit && etat.nuit.numero === etat.nuitsBouclees) changerRelations(etat, visibiliteActive(etat).relations, evenements);
  // Les autres reviennent peu à peu vers leur point d'équilibre, en bien comme en mal.
  for (const a of ACTEURS_ORDRE) {
    if (a === 'voisins') continue;
    changerRelation(etat, a, (equilibre(etat, a) - r.jauges[a]) * R.retour, evenements);
  }
  // Le lundi, on garde la photo de la semaine qui commence.
  if ((etat.jour - 1) % 7 === 0) r.lundi = { ...r.jauges };

  // Un événement du quartier, au plus un par matin.
  const tirage = creerTirage(etat.hasardQuartier);
  for (const a of acteursOuverts(etat)) {
    const t = termes(r.jauges[a]);
    if (t === 'neutre' || etat.jour - r.dernierEvenement[a] < R.evenementRepit) continue;
    if (!tirage.chance(R.evenementChance)) continue;
    const id = t === 'bons' ? ACTEURS[a].evenementBons : ACTEURS[a].evenementMauvais;
    if (etat.intrigues.actives.some((x) => x.id === id)) continue;
    demarrerSuite(etat, id, 0, null);
    r.dernierEvenement[a] = etat.jour;
    break;
  }
  etat.hasardQuartier = tirage.etat();
}

/** Le point vers lequel une relation revient d'elle-même : sa valeur de départ, ou pour la presse, selon la réputation. */
export function equilibre(etat: EtatJeu, acteur: IdActeur): number {
  const R = B.RELATIONS;
  if (acteur === 'presse') return (etat.reputation - R.presse.reputationNeutre) * R.presse.pente;
  return R.depart[acteur] ?? 0;
}

/** Jour à partir duquel une nouvelle action est possible auprès de cet acteur. */
export function prochaineAction(etat: EtatJeu, acteur: IdActeur): number {
  return etat.relations.derniereAction[acteur] + B.RELATIONS.actionRepit;
}

export function actionPossible(etat: EtatJeu, action: string): boolean {
  const def = B.ACTIONS_RELATIONS[action];
  if (!def || !relationsOuvertes(etat)) return false;
  const acteur = def.acteur as IdActeur;
  return acteurOuvert(etat, acteur) && etat.jour >= prochaineAction(etat, acteur) && etat.tresorerie >= def.cout;
}

/** Une action de relation, choisie dans l'onglet Relations : elle coûte, rapporte, et parfois se retourne. */
export function agirRelation(etat: EtatJeu, action: string, evenements: Sortie): void {
  const def = B.ACTIONS_RELATIONS[action];
  if (!def || !actionPossible(etat, action)) return;
  const acteur = def.acteur as IdActeur;
  depenser(etat, def.cout, 'relations');
  etat.relations.derniereAction[acteur] = etat.jour;
  const tirage = creerTirage(etat.hasardQuartier);
  const rate = def.risque !== undefined && tirage.chance(def.risque.chance);
  etat.hasardQuartier = tirage.etat();
  if (rate && def.risque) {
    changerRelations(etat, def.risque.effet, evenements);
    if (def.risque.reputation) changerReputationGlobale(etat, def.risque.reputation);
  } else {
    changerRelation(etat, acteur, def.gain, evenements);
    changerRelations(etat, def.autres ?? {}, evenements);
  }
  evenements.push({ type: 'actionRelation', action, acteur, montant: def.cout, reussite: !rate });
}

// ——— Ce que les relations changent dans la maison ———

/** Voisins en bons termes : ils tolèrent, le tapage monte moins vite. */
export function facteurTapageVoisins(etat: EtatJeu): number {
  return enBonsTermes(etat, 'voisins') ? B.RELATIONS.voisinsTolerants : 1;
}

/** Bonne ou mauvaise presse : la demande des touristes suit la jauge. */
export function demandeRelations(etat: EtatJeu, segment: Segment): number {
  if (segment !== 'touriste' || !relationsOuvertes(etat)) return 1;
  return 1 + (etat.relations.jauges.presse / 100) * B.RELATIONS.presseTouristes;
}

/** Un contrôle devant la porte ce soir. */
export function affluenceRelations(etat: EtatJeu): number {
  return etat.relations.affluenceSoir;
}

/** Les fournisseurs : prix d'ami en bons termes, prix gonflés en mauvais termes (linge, bar, livraisons express). */
export function facteurFournisseurs(etat: EtatJeu): number {
  if (enBonsTermes(etat, 'fournisseurs')) return B.FOURNISSEURS.prixBons;
  if (enMauvaisTermes(etat, 'fournisseurs')) return B.FOURNISSEURS.prixMauvais;
  return 1;
}

/** Un prix de fournisseur, selon la relation. */
export function prixFournisseur(etat: EtatJeu, prix: number): number {
  return Math.round(prix * facteurFournisseurs(etat));
}

/** Fournisseurs en mauvais termes : une livraison express sur trois n'arrive pas (hasard du quartier). */
export function expressRatee(etat: EtatJeu): boolean {
  if (!enMauvaisTermes(etat, 'fournisseurs')) return false;
  const tirage = creerTirage(etat.hasardQuartier);
  const rate = tirage.chance(B.FOURNISSEURS.expressRatee);
  etat.hasardQuartier = tirage.etat();
  return rate;
}

/** Une commande régulière au briefing : les fournisseurs apprécient le client fidèle. */
export function commandeFournisseurs(etat: EtatJeu): void {
  if (acteurOuvert(etat, 'fournisseurs')) changerRelation(etat, 'fournisseurs', B.FOURNISSEURS.commande);
}

/** Police en bons termes : une dispute qui dégénère vaut un avertissement, pas une perte de réputation. */
export function disputeSansReputation(etat: EtatJeu): boolean {
  return enBonsTermes(etat, 'police');
}
