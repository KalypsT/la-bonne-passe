// Imprévus de la soirée : des cartes en pause, 2 ou 3 choix, jamais de bonne réponse évidente.
// Les textes acceptent {prenom}, {prenom2} (une seconde personne), {joueur} et {maison},
// et des accords : {e} (« e » si la personne est une femme), {Il} (« Elle » ou « Il »), {e2} pour la seconde.

export interface EffetImprevu {
  /** Moral, loyauté, fatigue de la personne concernée ({prenom}). */
  moral?: number;
  loyaute?: number;
  fatigue?: number;
  /** Moral de la seconde personne ({prenom2}). */
  moral2?: number;
  /** Affinité entre les deux personnes. */
  affinite?: number;
  /** La personne concernée se repose pour le reste de la nuit. */
  repos?: boolean;
  /** Points de part gardée en plus (0,05 = 5 points), plafonnée à 65 %. */
  part?: number;
  reputation?: number;
  /** Argent gagné (positif) ou dépensé (négatif). */
  argent?: number;
  /** Clients qui arrivent aussitôt sur le quai. */
  clients?: number;
}

export interface ChoixImprevu {
  texte: string;
  detail: string;
  effet: EffetImprevu;
  journal: string;
  /** Choix risqué : réussite avec cette probabilité, sinon `echec`. */
  chance?: number;
  echec?: EffetImprevu;
  journalEchec?: string;
}

export interface ConditionImprevu {
  /** Il faut une personne en service au moins aussi fatiguée. */
  fatigueMin?: number;
  /** Il faut une personne en service avec ce trait connu. */
  trait?: string;
  /** Il faut deux personnes en service à cette affinité ou moins. */
  rivalite?: number;
  /** Il faut une personne en service qui n'est pas en rendez-vous. */
  disponible?: boolean;
  /** Part maximale de la personne concernée (pour une demande d'augmentation). */
  partMax?: number;
}

export interface DefinitionImprevu {
  id: string;
  titre: string;
  texte: string;
  /** Le tout premier imprévu de la partie. */
  premier?: boolean;
  condition?: ConditionImprevu;
  choix: ChoixImprevu[];
}

export const IMPREVUS: DefinitionImprevu[] = [
  {
    id: 'touriste',
    premier: true,
    titre: 'Un touriste perdu',
    texte: 'Un touriste en short, plan à la main, demande si c’est bien ici le musée Van Gogh.',
    choix: [
      {
        texte: 'L’orienter gentiment',
        detail: 'Réputation en légère hausse',
        effet: { reputation: 1 },
        journal: 'Le touriste repart avec un plan annoté et un grand sourire.',
      },
      {
        texte: 'Lui proposer une autre visite',
        detail: 'Il entre peut-être…',
        chance: 0.6,
        effet: { clients: 1 },
        journal: 'Finalement, il reste. L’art peut attendre.',
        echec: { reputation: -0.5 },
        journalEchec: 'Il est parti en courant. Vers le musée, on espère.',
      },
    ],
  },
  {
    id: 'pluie',
    titre: 'Averse soudaine',
    texte: 'Une pluie d’été s’abat sur le canal. Six touristes trempés s’abritent sous ton porche.',
    choix: [
      {
        texte: 'Les faire entrer au sec',
        detail: 'Deux clients de plus, et le salon sent le chien mouillé',
        effet: { clients: 2, reputation: -0.5 },
        journal: 'Deux touristes restent après l’averse. Le tapis, lui, ne s’en remettra pas.',
      },
      {
        texte: 'Leur prêter des parapluies',
        detail: '−20 €, réputation en hausse',
        effet: { argent: -20, reputation: 1.5 },
        journal: 'Six parapluies roses dans les rues d’Amsterdam : belle publicité.',
      },
    ],
  },
  {
    id: 'pieds',
    titre: '{prenom} a mal aux pieds',
    texte: '{prenom} vient te voir, chaussures à la main : « Je peux finir plus tôt ce soir ? Mes pieds me détestent. »',
    condition: { fatigueMin: 55, disponible: true },
    choix: [
      {
        texte: 'Oui, file te reposer',
        detail: 'Une personne de moins ce soir, moral en hausse',
        effet: { repos: true, moral: 10, loyaute: 3 },
        journal: '{prenom} rentre plus tôt. {Il} t’en sera reconnaissant{e}.',
      },
      {
        texte: 'Encore un petit effort',
        detail: '{Il} reste, moral en baisse',
        effet: { moral: -12, loyaute: -4 },
        journal: '{prenom} reste, les dents serrées.',
      },
    ],
  },
  {
    id: 'augmentation',
    titre: '{prenom} veut plus',
    texte: '{prenom} s’assoit sur ton bureau : « Les clients me demandent par mon prénom. Je veux 5 points de plus sur chaque rendez-vous. »',
    condition: { trait: 'Ambitieuse', partMax: 0.6 },
    choix: [
      {
        texte: 'Accepter',
        detail: 'Sa part augmente de 5 points, loyauté en hausse',
        effet: { part: 0.05, moral: 8, loyaute: 10 },
        journal: '{prenom} garde désormais 5 points de plus, et sourit comme un conseil d’administration.',
      },
      {
        texte: 'Une prime à la place (80 €)',
        detail: 'Un geste, sans engager l’avenir',
        effet: { argent: -80, moral: 4 },
        journal: '{prenom} prend la prime. « On en reparlera. »',
      },
      {
        texte: 'Refuser',
        detail: 'Moral et loyauté en baisse',
        effet: { moral: -12, loyaute: -8 },
        journal: '{prenom} claque la porte du bureau. Doucement, mais la porte claque.',
      },
    ],
  },
  {
    id: 'genereux',
    titre: 'Un client généreux',
    texte: 'Un habitué en costume trois-pièces glisse un billet sur le comptoir : « Je voudrais {prenom}. Pour toute la soirée. »',
    condition: { disponible: true },
    choix: [
      {
        texte: 'Accepter',
        detail: '+180 € pour la maison, mais {prenom} finit la nuit épuisé{e}',
        effet: { argent: 180, fatigue: 25, repos: true },
        journal: '{prenom} passe la soirée avec l’homme au costume. La caisse sourit.',
      },
      {
        texte: 'Laisser {prenom} décider',
        detail: '{Il} choisit : moral en hausse, argent incertain',
        chance: 0.5,
        effet: { argent: 180, fatigue: 25, repos: true, moral: 5 },
        journal: '{prenom} accepte, à ses conditions. Tout le monde y gagne.',
        echec: { moral: 6, reputation: -0.5 },
        journalEchec: '{prenom} décline poliment. Le costume repart vexé.',
      },
      {
        texte: 'Refuser',
        detail: 'Personne ne réserve une personne entière ici',
        effet: { reputation: -0.5, loyaute: 3 },
        journal: 'Le client range son billet. {prenom} te fait un clin d’œil.',
      },
    ],
  },
  {
    id: 'querelle',
    titre: 'Querelle dans la loge',
    texte: '{prenom} et {prenom2} se disputent le miroir de la loge. Il est question d’un rouge à lèvres, puis de beaucoup d’autres choses.',
    condition: { rivalite: -30 },
    choix: [
      {
        texte: 'Donner raison à {prenom}',
        detail: '{prenom} content{e}, {prenom2} vexé{e2}',
        effet: { moral: 6, moral2: -10, affinite: -8 },
        journal: 'Tu tranches pour {prenom}. {prenom2} boude jusqu’à la fermeture.',
      },
      {
        texte: 'Donner raison à {prenom2}',
        detail: '{prenom2} content{e2}, {prenom} vexé{e}',
        effet: { moral: -10, moral2: 6, affinite: -8 },
        journal: 'Tu tranches pour {prenom2}. {prenom} ne te regarde plus.',
      },
      {
        texte: 'Les faire se parler',
        detail: 'Affinité en hausse, mais tout le monde y laisse un peu de moral',
        effet: { moral: -4, moral2: -4, affinite: 15 },
        journal: '{prenom} et {prenom2} finissent par rire du rouge à lèvres. Presque.',
      },
    ],
  },
];

export function trouverImprevu(id: string): DefinitionImprevu | undefined {
  return IMPREVUS.find((i) => i.id === id);
}
