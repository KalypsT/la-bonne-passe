// Relations avec le quartier (palier 3) : les acteurs, ce qu'ils rendent en bons termes, ce qu'ils coûtent en mauvais,
// et les actions pour les soigner. Voir « Relations et rivaux » dans les spécifications ; valeurs dans balance.ts.
// Les textes acceptent {joueur} et {maison}.

import { ACTIONS_RELATIONS, RELATIONS } from './balance';

export type IdActeur = 'voisins' | 'mairie' | 'presse' | 'police';
export const ACTEURS_ORDRE: IdActeur[] = ['voisins', 'mairie', 'presse', 'police'];

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;

export interface DefinitionActeur {
  id: IdActeur;
  nom: string;
  /** Qui c'est, en une phrase. */
  portrait: string;
  /** Ce que la maison gagne en bons termes, et ce qu'elle risque en mauvais termes. */
  bons: string;
  mauvais: string;
  /** Ce qui fait bouger la jauge, pour la fiche. */
  bouge: string;
  /** Événement du quartier démarré en bons ou en mauvais termes (identifiant d'une suite de src/content/quartier.ts). */
  evenementBons: string;
  evenementMauvais: string;
}

export const ACTEURS: Record<IdActeur, DefinitionActeur> = {
  voisins: {
    id: 'voisins',
    nom: 'Les voisins',
    portrait: 'Monsieur Bakker et son violoncelle, la fleuriste d’en face, le comité de quartier et ses réunions du jeudi.',
    bons: 'Ils tolèrent un peu de bruit (le tapage monte moins vite), et t’invitent parfois.',
    mauvais: 'Plaintes et pétition : la mairie et la presse locale finissent par s’en mêler.',
    bouge: 'Le tapage de chaque nuit, les disputes sur le quai, les gestes de bon voisinage.',
    evenementBons: 'feteVoisins',
    evenementMauvais: 'petition',
  },
  mairie: {
    id: 'mairie',
    nom: 'La mairie',
    portrait: 'L’échevin du quartier, son service des licences et ses inspecteurs au stylo quatre couleurs.',
    bons: 'Plus d’inspection sanitaire à l’improviste, et des conseils glissés à temps. Son accord comptera pour s’agrandir.',
    mauvais: 'Des inspections surprises, avec amendes à la clé.',
    bouge: 'Les inspections, les galas, les dons au quartier, les plaintes des voisins.',
    evenementBons: 'conseilEchevin',
    evenementMauvais: 'inspectionSurprise',
  },
  presse: {
    id: 'presse',
    nom: 'La presse',
    portrait: 'Le Nachtblad, « Nuits d’Amsterdam », et tout ce qui a un téléphone et un compte à suivre.',
    bons: 'Bonne presse : les touristes viennent plus nombreux. On te propose parfois un portrait.',
    mauvais: 'Mauvaise presse : les touristes boudent, et les fuites font fuir les clients discrets.',
    bouge: 'Les critiques, les vidéos, les photographes laissés filer, les soirées pour la presse.',
    evenementBons: 'portrait',
    evenementMauvais: 'fuite',
  },
  police: {
    id: 'police',
    nom: 'La police',
    portrait: 'Le commissariat du quartier et l’agent Visser, qui fait sa ronde sur le quai à vélo.',
    bons: 'Un avertissement plutôt qu’un procès-verbal : une dispute qui dégénère ne coûte plus de réputation.',
    mauvais: 'Des contrôles devant la porte, qui font fuir la clientèle.',
    bouge: 'Les disputes qui dégénèrent, les incidents, les gestes envers le commissariat.',
    evenementBons: 'agentQuartier',
    evenementMauvais: 'controle',
  },
};

/** L'humeur d'un acteur selon sa jauge, du pire au meilleur (voir `humeurRelation`). */
export const HUMEURS = ['En guerre ouverte', 'En froid', 'Neutre', 'Cordiale', 'Excellente'] as const;

/** Indice dans HUMEURS : mauvais termes, froid, neutre, cordial, bons termes. */
export function humeurRelation(valeur: number): number {
  if (valeur <= RELATIONS.mauvais) return 0;
  if (valeur < -10) return 1;
  if (valeur <= 10) return 2;
  if (valeur < RELATIONS.bons) return 3;
  return 4;
}

export interface TexteActionRelation {
  texte: string;
  detail: string;
  /** L'avis de Josée, en une phrase. */
  josee: string;
  /** Au journal, réussie et, s'il y a un risque, ratée. */
  journal: string;
  journalEchec?: string;
}

const A = ACTIONS_RELATIONS;
const pts = (n: number) => `${n > 0 ? '+' : ''}${n}`;

export const TEXTES_ACTIONS_RELATIONS: Record<string, TexteActionRelation> = {
  bouteilleVoisins: {
    texte: 'Une bouteille et des excuses d’avance',
    detail: `${euros(A.bouteilleVoisins!.cout)} · voisins ${pts(A.bouteilleVoisins!.gain)}`,
    josee: 'Un bon vin désarme plus de voisins qu’un avocat. Et ça coûte moins cher.',
    journal: 'Tu fais le tour des sonnettes avec une caisse de vin. Monsieur Bakker accepte la sienne en soupirant.',
  },
  associationQuartier: {
    texte: 'Un don à l’association du quartier',
    detail: `${euros(A.associationQuartier!.cout)} · voisins ${pts(A.associationQuartier!.gain)}, presse ${pts(A.associationQuartier!.autres!.presse!)}`,
    josee: 'Les jardinières du quai porteront ton nom. Discrètement, j’espère.',
    journal: 'Le comité de quartier te remercie : les jardinières du quai refleuriront grâce à {maison}.',
  },
  dejeunerEchevin: {
    texte: 'Un déjeuner avec l’échevin',
    detail: `${euros(A.dejeunerEchevin!.cout)} · mairie ${pts(A.dejeunerEchevin!.gain)} ; une fois sur cinq, il parle trop`,
    josee: 'Il adore les huîtres et les confidences. Méfie-toi surtout des secondes.',
    journal: 'Huîtres, vin blanc, et l’échevin qui promet de « garder un œil bienveillant » sur la maison.',
    journalEchec: 'L’échevin a raconté votre déjeuner à un journaliste, en riant un peu trop fort. La mairie fait machine arrière.',
  },
  festivalCanal: {
    texte: 'Mécène du festival du canal',
    detail: `${euros(A.festivalCanal!.cout)} · mairie ${pts(A.festivalCanal!.gain)}, voisins ${pts(A.festivalCanal!.autres!.voisins!)}`,
    josee: 'Le nom de la maison sur une péniche fleurie. Élégant, et la mairie s’en souviendra.',
    journal: 'Une péniche fleurie défile sur le canal, avec le nom de {maison} en lettres dorées. L’échevin applaudit.',
  },
  panierRedacteur: {
    texte: 'Un panier chez le rédacteur',
    detail: `${euros(A.panierRedacteur!.cout)} · presse ${pts(A.panierRedacteur!.gain)}`,
    josee: 'Du fromage, des chocolats, pas d’enveloppe. On n’achète pas un journaliste : on l’attendrit.',
    journal: 'Le rédacteur du Nachtblad reçoit un panier garni. Il t’envoie un petit mot : « Touché. »',
  },
  soireePresse: {
    texte: 'Une soirée privée pour la presse',
    detail: `${euros(A.soireePresse!.cout)} · presse ${pts(A.soireePresse!.gain)} ; une fois sur quatre, un article moqueur`,
    josee: 'Champagne et journalistes : un cocktail qui fait des articles. Pas toujours ceux qu’on espère.',
    journal: 'Les journalistes repartent ravis, les poches pleines de macarons. On parlera de {maison}, et en bien.',
    journalEchec: 'Un chroniqueur a trouvé la soirée « un peu trop parfumée ». Son billet fait sourire toute la ville.',
  },
  cafeCommissariat: {
    texte: 'Café et croissants au commissariat',
    detail: `${euros(A.cafeCommissariat!.cout)} · police ${pts(A.cafeCommissariat!.gain)}`,
    josee: 'Les agents de nuit ont toujours faim. Et ils ont bonne mémoire.',
    journal: 'Un plateau de croissants arrive au commissariat. L’agent Visser lève son gobelet vers la vitrine en passant.',
  },
  tournoiPolice: {
    texte: 'Parrainer le tournoi de foot de la police',
    detail: `${euros(A.tournoiPolice!.cout)} · police ${pts(A.tournoiPolice!.gain)}, voisins ${pts(A.tournoiPolice!.autres!.voisins!)}`,
    josee: 'Des maillots pour l’équipe du commissariat. Pas ton nom dessus, surtout : une étoile, ça suffit.',
    journal: 'L’équipe du commissariat joue en maillots neufs, une petite étoile rose sur le cœur. Elle perd quand même.',
  },
};

/** Textes de l'onglet Relations et de ses fiches. */
export const TEXTES_RELATIONS = {
  intro: 'Le quartier te regarde. Chacun a sa jauge, de −100 à +100 : au-dessus de +40, on te rend service ; sous −40, les ennuis commencent.',
  jauge: (valeur: number) => `${valeur > 0 ? '+' : ''}${Math.round(valeur)}`,
  cetteSemaine: (delta: number) => (Math.round(delta) === 0 ? 'stable cette semaine' : `${delta > 0 ? '+' : ''}${Math.round(delta)} cette semaine`),
  bons: 'En bons termes',
  mauvais: 'En mauvais termes',
  actif: 'en ce moment',
  bouge: 'Ce qui fait bouger la jauge',
  actions: 'Soigner la relation',
  actionFaite: (jour: number) => `Une action par semaine : la prochaine, le jour ${jour}.`,
  tropCher: 'Pas assez en caisse.',
  retour: 'Retour aux relations',
};

/** Au journal : une relation passe en bons ou en mauvais termes, ou en sort. */
export const TEXTES_SEUILS_RELATIONS: Record<IdActeur, { bons: string; mauvais: string; neutre: string }> = {
  voisins: {
    bons: 'Les voisins t’ont à la bonne : on te salue dans l’escalier, et on ferme les fenêtres les soirs de fête.',
    mauvais: 'Les voisins sont à bout. On parle de pétition dans la cage d’escalier.',
    neutre: 'Les voisins ont retrouvé leur calme… et leur méfiance habituelle.',
  },
  mairie: {
    bons: 'La mairie te considère comme une maison sérieuse. L’échevin te tutoie.',
    mauvais: 'À la mairie, le dossier de {maison} est passé sur le haut de la pile. Ce n’est pas bon signe.',
    neutre: 'La mairie ne pense plus à toi, ni en bien ni en mal. C’est souvent le mieux.',
  },
  presse: {
    bons: 'La presse t’adore : {maison} est « l’adresse dont on parle ».',
    mauvais: 'La presse flaire le scandale. Les téléobjectifs traînent sur le quai.',
    neutre: 'La presse est passée à autre chose.',
  },
  police: {
    bons: 'L’agent Visser te salue d’un coup de sonnette en passant. Un avertissement vaudra mieux qu’un procès-verbal.',
    mauvais: 'Le commissariat a noté l’adresse. Les rondes passent un peu trop souvent devant la porte.',
    neutre: 'La police te laisse tranquille. Pour l’instant.',
  },
};
