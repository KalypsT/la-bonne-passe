// Défis de la semaine et objectifs du mois : les bilans de la v0.4.
// Voir « Les objectifs » dans les spécifications. Les cibles sont dans balance.ts (DEFIS, OBJECTIFS).
// Les textes acceptent {cible}, {segment} et {maison}.

import type { Segment } from './clientele';
import type { EffetCarte } from './effets';
import { DEFIS } from './balance';

/** Ce que mesure un défi, sur la semaine en cours. */
export type MesureDefi =
  | { type: 'servis'; segment: Segment }
  | { type: 'clients' }
  | { type: 'bar' }
  | { type: 'disputes' }
  | { type: 'alertes' }
  | { type: 'satisfaction'; segment: Segment }
  | { type: 'perdus' };

export interface DefinitionDefi {
  id: string;
  titre: string;
  /** L'annonce de Josée, au bilan du lundi. */
  texte: string;
  /** Le défi n'est proposé que si… (une tendance de la semaine, le bar qui tourne, un segment ouvert). */
  condition?: { tendance?: string[]; bar?: boolean; segment?: Segment };
  mesure: MesureDefi;
  cible: number;
  /** Au plus (disputes, alertes manquées, clients perdus) plutôt qu'au moins. */
  auPlus?: boolean;
  /** Ce que rapporte la réussite. */
  recompense: EffetCarte;
  /** Ce que la récompense veut dire, en clair. */
  recompenseTexte: string;
  reussite: string;
  echec: string;
}

export const DEFIS_SEMAINE: DefinitionDefi[] = [
  // ——— Liés à une tendance : ils passent en premier ———
  {
    id: 'congres',
    titre: 'Le congrès des médecins',
    texte: 'Huit mille médecins en ville : sauras-tu en profiter ? Reçois {cible} clients d’affaires cette semaine.',
    condition: { tendance: ['congres', 'salon'], segment: 'affaires' },
    mesure: { type: 'servis', segment: 'affaires' },
    cible: DEFIS.congres,
    recompense: { satisfaction: { affaires: 6 }, reputation: 1 },
    recompenseTexte: 'Les clients d’affaires parlent de toi dans les couloirs',
    reussite: 'Les congressistes sont repartis ravis. On parle de {maison} jusque dans les amphithéâtres.',
    echec: 'Les congressistes sont allés ailleurs. Les notes de frais, elles, ne reviennent pas.',
  },
  {
    id: 'match',
    titre: 'Pas une chaise cassée',
    texte: 'Un match européen, et pas plus de {cible} disputes sur le quai de toute la semaine. Chiche ?',
    condition: { tendance: ['match'], segment: 'groupe' },
    mesure: { type: 'disputes' },
    cible: DEFIS.match,
    auPlus: true,
    recompense: { satisfaction: { groupe: 5 }, reputation: 1 },
    recompenseTexte: 'Les supporters te recommandent, et les voisins te respectent',
    reussite: 'Une semaine de match sans une chaise cassée. Même le voisin du dessus en est resté sans voix.',
    echec: 'Le quai a vu trop de disputes. Les supporters sont des supporters.',
  },
  {
    id: 'hauteSaison',
    titre: 'La haute saison',
    texte: 'Les bateaux-mouches débordent : reçois {cible} touristes cette semaine.',
    condition: { tendance: ['hauteSaison'] },
    mesure: { type: 'servis', segment: 'touriste' },
    cible: DEFIS.hauteSaison,
    recompense: { satisfaction: { touriste: 5 } },
    recompenseTexte: 'Les guides touristiques t’ajoutent à leurs bonnes adresses',
    reussite: 'Les touristes ont laissé des avis enthousiastes, en six langues.',
    echec: 'Les touristes sont passés devant la porte sans s’arrêter. Dommage.',
  },
  {
    id: 'evgBar',
    titre: 'La saison des tutus',
    texte: 'Les enterrements de vie de garçon envahissent le quartier : fais tourner le bar, {cible} € de recette cette semaine.',
    condition: { tendance: ['evg'], bar: true },
    mesure: { type: 'bar' },
    cible: DEFIS.evgBar,
    recompense: { stockBar: 20, satisfaction: { groupe: 3 } },
    recompenseTexte: 'Le grossiste offre deux caisses',
    reussite: 'Le bar n’a jamais autant tourné. Le grossiste, épaté, t’offre deux caisses.',
    echec: 'Les tutus sont allés boire ailleurs.',
  },
  {
    id: 'evgGroupes',
    titre: 'La saison des tutus',
    texte: 'Les enterrements de vie de garçon envahissent le quartier : reçois {cible} clients des groupes cette semaine.',
    condition: { tendance: ['evg'], bar: false, segment: 'groupe' },
    mesure: { type: 'servis', segment: 'groupe' },
    cible: DEFIS.evgGroupes,
    recompense: { satisfaction: { groupe: 5 } },
    recompenseTexte: 'Les bandes de copains se passent ton adresse',
    reussite: 'Le futur marié en homard est revenu avec ses cousins. C’est bon signe.',
    echec: 'Les tutus sont allés faire la fête ailleurs.',
  },
  {
    id: 'creuse',
    titre: 'Tenir la barre',
    texte: 'Semaine creuse en ville. Reçois quand même {cible} clients, et la maison en sortira grandie.',
    condition: { tendance: ['greve', 'controles'] },
    mesure: { type: 'clients' },
    cible: DEFIS.creuse,
    recompense: { reputation: 1, moralEquipe: 4 },
    recompenseTexte: 'L’équipe est fière, et le quartier aussi',
    reussite: 'Quand tout le quartier était vide, {maison} ne désemplissait pas.',
    echec: 'Une semaine creuse est une semaine creuse. On ne pouvait pas tout faire.',
  },
  {
    id: 'habitues',
    titre: 'Choyer les habitués',
    texte: 'Les habitués reviennent cette semaine : fais grimper leur satisfaction de {cible} points.',
    condition: { tendance: ['pluie', 'paie'] },
    mesure: { type: 'satisfaction', segment: 'habitue' },
    cible: DEFIS.habitues,
    recompense: { satisfaction: { habitue: 3 }, moralEquipe: 3 },
    recompenseTexte: 'Les habitués apportent des chocolats à l’équipe',
    reussite: 'Les habitués ont apporté des chocolats pour l’équipe. Ceux à la liqueur ont disparu en premier.',
    echec: 'Les habitués sont venus, mais sans enthousiasme.',
  },
  // ——— Sans tendance particulière ———
  {
    id: 'attentive',
    titre: 'Rien ne nous échappe',
    texte: 'Cette semaine, ne laisse pas filer plus de {cible} alertes. L’œil du maître, comme on dit.',
    mesure: { type: 'alertes' },
    cible: DEFIS.attentive,
    auPlus: true,
    recompense: { moralEquipe: 5 },
    recompenseTexte: 'L’équipe se sent épaulée',
    reussite: 'Pas un client pressé oublié, pas une pause refusée par distraction. L’équipe s’en est rendu compte.',
    echec: 'Quelques alertes ont filé. La maison a tenu, mais on l’a sentie flotter.',
  },
  {
    id: 'bar',
    titre: 'Le bar à l’honneur',
    texte: 'Fais tourner le bar : {cible} € de recette cette semaine.',
    condition: { bar: true },
    mesure: { type: 'bar' },
    cible: DEFIS.bar,
    recompense: { stockBar: 15 },
    recompenseTexte: 'Le grossiste offre une caisse et demie',
    reussite: 'Le grossiste a vu passer les commandes : il t’offre une caisse et demie.',
    echec: 'Le bar a tourné au ralenti cette semaine.',
  },
  {
    id: 'fidelite',
    titre: 'Personne ne repart',
    texte: 'Cette semaine, pas plus de {cible} % de clients repartis sans être reçus.',
    mesure: { type: 'perdus' },
    cible: DEFIS.fidelite,
    auPlus: true,
    recompense: { reputation: 1 },
    recompenseTexte: 'Le bouche-à-oreille te fait une fleur',
    reussite: 'Presque personne n’a attendu pour rien. Ça se sait, dans le quartier.',
    echec: 'Trop de clients ont fait demi-tour sur le quai.',
  },
  {
    id: 'affluence',
    titre: 'Maison pleine',
    texte: 'Reçois {cible} clients cette semaine. Rien que ça.',
    mesure: { type: 'clients' },
    cible: DEFIS.affluence,
    recompense: { moralEquipe: 3, reputation: 0.5 },
    recompenseTexte: 'L’équipe trinque à la semaine',
    reussite: 'Une semaine à guichets fermés. L’équipe trinque, les pieds en compote.',
    echec: 'La maison n’a pas fait le plein cette semaine.',
  },
];

export function trouverDefi(id: string): DefinitionDefi | undefined {
  return DEFIS_SEMAINE.find((d) => d.id === id);
}

// ——— Objectifs du mois ———

export type IdObjectif = 'reputation' | 'satisfaction' | 'avoir' | 'equipe';

export interface TexteObjectif {
  titre: string;
  /** Avec {cible} et {segment}. */
  texte: string;
}

export const OBJECTIFS_MOIS: Record<IdObjectif, TexteObjectif> = {
  reputation: { titre: 'Se faire un nom', texte: 'Atteindre {cible} de réputation avant la prochaine mensualité.' },
  satisfaction: { titre: 'Fidéliser', texte: 'Porter la satisfaction des {segment}, ta clientèle principale, à {cible}.' },
  avoir: { titre: 'Garder une réserve', texte: 'Avoir encore {cible} en caisse et en réserve après la mensualité.' },
  equipe: { titre: 'Garder l’équipe', texte: 'Ne perdre personne de l’équipe d’ici la prochaine mensualité.' },
};

/** Les segments, tels qu'on les nomme dans un objectif (« la satisfaction des … »). */
export const SEGMENTS_OBJECTIF: Record<Segment, string> = {
  touriste: 'touristes',
  habitue: 'habitués',
  affaires: 'clients d’affaires',
  groupe: 'groupes',
};

/** Ordre des objectifs après le premier mois. */
export const ROTATION_OBJECTIFS: IdObjectif[] = ['satisfaction', 'avoir', 'reputation', 'equipe'];

/** Ce que Josée dit du mois, selon l'objectif et la mensualité. */
export const MENTIONS_MOIS = {
  reussiSerein: 'Un mois de maître. Je n’aurais pas fait mieux. Enfin si, mais de peu.',
  reussiDecouvert: 'L’objectif est atteint, mais la mensualité est passée à découvert. La banque fronce les sourcils.',
  manqueSerein: 'La mensualité est payée, c’est l’essentiel. L’objectif, on le rattrapera.',
  manqueDecouvert: 'Un mois difficile. La banque t’écrit : lis la lettre avant de la jeter.',
};
