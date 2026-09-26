// Imprévus de la soirée : des cartes en pause, 2 ou 3 choix, jamais de bonne réponse évidente.
// Les textes acceptent {prenom}, {prenom2} (une seconde personne), {joueur} et {maison},
// et des accords : {e} (« e » si la personne est une femme), {Il} (« Elle » ou « Il »), {e2} pour la seconde.

import type { IdFormule, IdSelection } from './balance';
import type { Offre, Segment } from './clientele';
import * as B from './balance';
import type { EffetCarte } from './effets';
import type { IdActeur } from './relations';

const A = B.IMPREVU_ARGENT;
const euros = (n: number) => `${n.toLocaleString('fr-FR')}\u00a0€`;

export type EffetImprevu = EffetCarte;

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
  /** Palier atteint, au moins. */
  palierMin?: number;
  /** Réputation, au moins. */
  reputationMin?: number;
  /** Une de ces tendances est en cours cette semaine. */
  tendance?: string[];
  /** Le thème de la soirée est l'un de ceux-ci. */
  theme?: string[];
  /** L'offre du soir est l'une de celles-ci. */
  offre?: Offre[];
  /** Le bar sert ce soir (rouvert, avec une équipe et du stock). */
  bar?: boolean;
  /** Règles de la maison en vigueur. */
  selection?: IdSelection[];
  formule?: IdFormule[];
  /** Indice du cran de tarif, au moins (2 : +20 %). */
  tarifMin?: number;
  /** Ce segment est ouvert. */
  segment?: Segment;
  /** Un client de ce segment est sur le quai ou dans une chambre. */
  segmentPresent?: Segment;
  /** Il reste une place dans l'équipe, et le recrutement est ouvert. */
  placeLibre?: boolean;
  /** Relations avec le quartier (v0.5) : au plus, pour chaque acteur cité (une mairie amie n'envoie pas d'inspecteur). */
  relationMax?: Partial<Record<IdActeur, number>>;
}

/** Ce qui rend un imprévu plus probable, sans l'exiger : une tendance, un thème, une règle. */
export interface BonusImprevu {
  tendance?: string[];
  theme?: string[];
  selection?: IdSelection[];
}

export interface DefinitionImprevu {
  id: string;
  titre: string;
  texte: string;
  /** Le tout premier imprévu de la partie. */
  premier?: boolean;
  condition?: ConditionImprevu;
  /** Plus probable dans ces circonstances (poids multiplié). */
  bonus?: BonusImprevu;
  /** Une opportunité plutôt qu'un problème (pour la mesure de la variété). */
  opportunite?: boolean;
  /** Ne sort qu'une fois par partie (un anniversaire, un chat…). */
  unique?: boolean;
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
        effet: { reputation: -0.5, loyaute: 3, suite: { id: 'costume', delai: 3 } },
        journal: 'Le client range son billet. {prenom} te fait un clin d’œil. Il reviendra, c’est sûr.',
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
  // ——— v0.4 : imprévus liés à l'état de la maison ———
  {
    id: 'inspection',
    titre: 'Inspection sanitaire',
    texte: 'Un inspecteur de la santé publique, blouse beige et stylo quatre couleurs, demande à « jeter un œil » aux chambres. Maintenant.',
    condition: { palierMin: 2, relationMax: { mairie: B.RELATIONS.bons - 1 } },
    choix: [
      {
        texte: 'Lui faire visiter, tout de suite',
        detail: `Rien à craindre si tout est en ordre. Sinon, ${euros(A.inspectionAmende)} d’amende`,
        chance: 0.7,
        effet: { reputation: 0.5, relations: { mairie: 3 } },
        journal: 'L’inspecteur coche toutes les cases et repart en complimentant les draps.',
        echec: { argent: -A.inspectionAmende, reputation: -1, relations: { mairie: -4 } },
        journalEchec: `Une tache suspecte derrière une porte : ${euros(A.inspectionAmende)} d’amende.`,
      },
      {
        texte: 'Lui demander de revenir un autre jour',
        detail: 'Il reviendra, et plus attentif',
        effet: { suite: { id: 'inspecteur', delai: 5 } },
        journal: '« Dans cinq jours, alors. » Il note la date en rouge.',
      },
      {
        texte: 'Payer une mise aux normes sur-le-champ',
        detail: `−${euros(A.inspectionNormes)}, et plus aucun souci`,
        effet: { argent: -A.inspectionNormes, reputation: 0.5, relations: { mairie: 4 } },
        journal: 'Tu signes pour des détecteurs neufs et un savon antibactérien. L’inspecteur repart ravi.',
      },
    ],
  },
  {
    id: 'live',
    opportunite: true,
    titre: 'Un live au salon',
    texte: 'Une influenceuse aux trois cent mille abonnés tend son téléphone : « Je peux faire un live depuis votre salon ? Promis, que du bon goût. »',
    condition: { palierMin: 2 },
    bonus: { theme: ['burlesque', 'anneesFolles'] },
    choix: [
      {
        texte: 'Oui, en direct',
        detail: 'Les touristes adorent ; les clients discrets, beaucoup moins',
        effet: { reputation: 1, satisfaction: { touriste: 4, affaires: -5, habitue: -2 }, relations: { presse: 4 }, suite: { id: 'video', delai: 3 } },
        journal: 'Le live dure vingt minutes. Les cœurs pleuvent sur l’écran.',
      },
      {
        texte: 'Oui, sans visages ni nom de rue',
        detail: 'Un peu de visibilité, sans casse',
        effet: { satisfaction: { touriste: 2 } },
        journal: 'Elle filme les rideaux de velours et les bougies. Mystérieux, donc irrésistible.',
      },
      {
        texte: 'Pas de téléphone ici',
        detail: 'Les habitués et les clients d’affaires apprécient',
        effet: { satisfaction: { habitue: 2, affaires: 2, touriste: -1 } },
        journal: '« Ce qui se passe au salon reste au salon. » Elle range son téléphone en soupirant.',
      },
    ],
  },
  {
    id: 'evg',
    opportunite: true,
    titre: 'Un enterrement de vie de garçon',
    texte: 'Huit garçons en tutu rose et un futur marié déguisé en homard se pressent devant la porte. « On nous a dit que c’était LA maison du canal ! »',
    condition: { segment: 'groupe' },
    bonus: { tendance: ['evg'], selection: ['laxiste'] },
    choix: [
      {
        texte: 'Les faire entrer',
        detail: 'Trois clients de plus ; le quartier va les entendre',
        effet: { clients: 3, clientsSegment: 'groupe', tapage: 10, relations: { voisins: -2 } },
        journal: 'Le homard et sa cour envahissent le quai. Deux étages plus haut, une lampe s’allume.',
      },
      {
        texte: 'Les envoyer au bar d’à côté',
        detail: `+${euros(A.evgCommission)} de commission ; les groupes t’en veulent un peu`,
        effet: { argent: A.evgCommission, satisfaction: { groupe: -2 } },
        journal: 'Le bar d’à côté te reverse une commission. Les tutus s’éloignent en chantant.',
      },
    ],
  },
  {
    id: 'tireuse',
    titre: 'La tireuse rend l’âme',
    texte: 'Un bruit de locomotive, un nuage de mousse, puis plus rien : la tireuse à bière vient de mourir en plein service.',
    condition: { bar: true },
    choix: [
      {
        texte: 'Appeler un réparateur de nuit',
        detail: `−${euros(A.reparateur)}, le bar tourne comme si de rien n’était`,
        effet: { argent: -A.reparateur },
        journal: 'Le réparateur arrive en scooter, change un joint et repart avec une bière offerte.',
      },
      {
        texte: 'Tout le monde au champagne',
        detail: 'Les clients sont ravis ; la cave, beaucoup moins',
        effet: { stockBar: -8, satisfaction: { groupe: 2, touriste: 2 } },
        journal: '« La maison offre le champagne ! » Les bouchons sautent, la cave se vide.',
      },
      {
        texte: 'Fermer le bar ce soir',
        detail: 'Les groupes râlent',
        effet: { satisfaction: { groupe: -4, touriste: -1 } },
        journal: 'Un panneau « Fermé pour raisons techniques » pend sur le comptoir. Les groupes boudent.',
      },
    ],
  },
  {
    id: 'critique',
    opportunite: true,
    titre: 'Un client qui prend des notes',
    texte: 'Un monsieur en tweed commande une eau pétillante et note tout dans un carnet noir. Au bar, quelqu’un jure l’avoir vu en photo dans « Nuits d’Amsterdam », le guide des noctambules.',
    condition: { reputationMin: 30 },
    choix: [
      {
        texte: 'Faire comme d’habitude',
        detail: 'La maison telle qu’elle est. À pile ou face',
        chance: 0.5,
        effet: { suite: { id: 'critiqueFlatteuse', delai: 4 } },
        journal: 'Personne ne change rien. Le carnet se remplit, avec l’air content.',
        echec: { suite: { id: 'critiqueAcide', delai: 4 } },
        journalEchec: 'Le monsieur repart tôt, le carnet sous le bras. Mauvais signe.',
      },
      {
        texte: 'Le chouchouter',
        detail: `−${euros(A.critiqueChampagne)} de champagne ; l’article a de bonnes chances d’être flatteur`,
        chance: 0.7,
        effet: { argent: -A.critiqueChampagne, suite: { id: 'critiqueFlatteuse', delai: 4 } },
        journal: 'Le monsieur en tweed goûte le champagne, sourit, et tourne une page de son carnet.',
        echec: { argent: -A.critiqueChampagne, suite: { id: 'critiqueAcide', delai: 4 } },
        journalEchec: 'Le monsieur en tweed repousse la coupe : « Je ne bois jamais en service. » Il note quelque chose. Longuement.',
      },
    ],
  },
  {
    id: 'anniversaire',
    unique: true,
    opportunite: true,
    titre: 'Un anniversaire au salon',
    texte: 'Monsieur De Groot, fidèle du jeudi depuis trente ans (du temps de Josée), fête ses soixante-dix ans. Il a apporté un gâteau. Et des bougies. Beaucoup de bougies.',
    condition: { segmentPresent: 'habitue' },
    choix: [
      {
        texte: 'Chanter, simplement',
        detail: 'Gratuit, et ça fait plaisir à tout le monde',
        effet: { moralEquipe: 2, satisfaction: { habitue: 1 } },
        journal: 'Une chanson, soixante-dix bougies soufflées en trois fois, et le salon applaudit.',
      },
      {
        texte: 'Offrir le champagne',
        detail: `−${euros(A.anniversaireChampagne)} ; il s’en souviendra`,
        effet: { argent: -A.anniversaireChampagne, satisfaction: { habitue: 3 }, suite: { id: 'bridge', delai: 6 } },
        journal: 'Toute la maison chante « Lang zal hij leven ». Monsieur De Groot essuie une larme.',
      },
    ],
  },
  {
    id: 'privatisation',
    opportunite: true,
    titre: 'Une soirée privée ?',
    texte: 'Un organisateur du congrès, badge encore autour du cou, pose sa carte sur le comptoir : « Mes conférenciers veulent le salon rien que pour eux, jusqu’à la fermeture. Vous faites un prix ? »',
    condition: { tendance: ['congres', 'salon'], segment: 'affaires' },
    choix: [
      {
        texte: `Accepter : ${euros(A.privatisation)}`,
        detail: 'Belle somme ; l’équipe va courir, les habitués seront à l’étroit',
        effet: { argent: A.privatisation, fatigueEquipe: 12, satisfaction: { habitue: -3, affaires: 3 } },
        journal: 'Les conférenciers investissent le salon. Ils parlent de cholestérol jusqu’à deux heures du matin.',
      },
      {
        texte: `Négocier ${euros(A.privatisationNegociee)}`,
        detail: 'Il peut accepter, ou aller voir ailleurs',
        chance: 0.45,
        effet: { argent: A.privatisationNegociee, fatigueEquipe: 12, satisfaction: { habitue: -3, affaires: 3 } },
        journal: '« Vendu. » Il signe sans lire. Les notes de frais n’ont pas de limite.',
        echec: {},
        journalEchec: 'L’organisateur reprend sa carte : « Trop cher. » Il part vers le Pink Palace.',
      },
      {
        texte: 'Refuser : la maison reste ouverte à tous',
        detail: 'Les habitués te sont reconnaissants',
        effet: { satisfaction: { habitue: 2 } },
        journal: 'Tu rends sa carte à l’organisateur. Au salon, un habitué lève son verre dans ta direction.',
      },
    ],
  },
  {
    id: 'prolongations',
    titre: 'Prolongations',
    texte: 'Le match est en prolongations, et une dizaine de supporters, écharpe au cou, supplient qu’on allume la télé du salon.',
    condition: { tendance: ['match'], segment: 'groupe' },
    choix: [
      {
        texte: 'Allumer la télé',
        detail: 'Deux clients de plus et du bruit ; les habitués soupirent',
        effet: { clients: 2, clientsSegment: 'groupe', tapage: 8, satisfaction: { habitue: -3, groupe: 3 }, relations: { voisins: -2 } },
        journal: 'But à la cent-dix-huitième minute. Le salon explose, et les vitres avec.',
      },
      {
        texte: 'La radio au bar, pas plus',
        detail: 'Un compromis, sans client de plus',
        effet: { satisfaction: { groupe: 1 } },
        journal: 'Les supporters se collent au transistor du bar. On entend les buts avec trois secondes de retard.',
      },
      {
        texte: 'Ici, on ne regarde pas le foot',
        detail: 'Les habitués approuvent ; les groupes vont ailleurs',
        effet: { satisfaction: { habitue: 2, groupe: -3 } },
        journal: 'Les supporters repartent vers un café. Le salon retrouve son calme feutré.',
      },
    ],
  },
  {
    id: 'loup',
    unique: true,
    opportunite: true,
    titre: 'Un loup tombé',
    texte: 'Au détour d’une valse, un client perd son loup de velours. Tu reconnais aussitôt l’échevin des finances de la ville, qui blêmit.',
    condition: { theme: ['masquee'] },
    choix: [
      {
        texte: 'Le raccompagner discrètement',
        detail: 'Il s’en souviendra',
        effet: { satisfaction: { affaires: 2 }, relations: { mairie: 3 }, suite: { id: 'echevin', delai: 5 } },
        journal: 'Tu tends un loup neuf à l’échevin et l’escortes jusqu’à un taxi. Il te serre la main un peu trop longtemps.',
      },
      {
        texte: 'Faire comme si de rien n’était',
        detail: 'La discrétion, sans plus',
        effet: { satisfaction: { affaires: 3 } },
        journal: 'Personne n’a rien vu. C’est la règle des soirées masquées.',
      },
      {
        texte: 'Lui offrir une coupe pour se remettre',
        detail: `−${euros(A.champagneEchevin)} ; le client est roi`,
        effet: { argent: -A.champagneEchevin, satisfaction: { affaires: 3 }, reputation: 0.5 },
        journal: 'L’échevin vide sa coupe d’un trait et remet son loup. « Quelle soirée délicieuse. »',
      },
    ],
  },
  {
    id: 'plumes',
    titre: 'La danseuse a raté son train',
    texte: 'La vedette de la soirée burlesque est bloquée à Utrecht. Le public attend, les plumes aussi. {prenom} regarde le boa rose avec une lueur dans l’œil.',
    condition: { theme: ['burlesque'], disponible: true },
    choix: [
      {
        texte: 'Laisser {prenom} improviser',
        detail: '{prenom} se fatigue, la salle adore',
        effet: { fatigue: 15, moral: 8, reputation: 1 },
        journal: '{prenom} improvise un numéro avec un boa et un tabouret de bar. Ovation.',
      },
      {
        texte: 'Rembourser le supplément',
        detail: `−${euros(A.remboursementSupplement)}, et une soirée ordinaire`,
        effet: { argent: -A.remboursementSupplement },
        journal: 'Tu rembourses le supplément de la soirée. Les plumes restent dans leur carton.',
      },
      {
        texte: 'Monter toi-même sur scène',
        detail: 'Un triomphe, ou un souvenir gênant',
        chance: 0.4,
        effet: { reputation: 2, moralEquipe: 4 },
        journal: '{joueur} sur scène, en plumes : personne n’oubliera cette soirée. Dans le bon sens.',
        echec: { reputation: -1, moralEquipe: 3 },
        journalEchec: '{joueur} trébuche sur un boa. L’équipe en rit encore le lendemain.',
      },
    ],
  },
  {
    id: 'contrebasse',
    titre: 'Le contrebassiste veut plus',
    texte: 'Entre deux morceaux, le contrebassiste du trio pose son archet : « Double cachet, ou on range les instruments. »',
    condition: { theme: ['jazz'] },
    choix: [
      {
        texte: 'Lui proposer une ardoise au bar',
        detail: 'Moins cher, s’il accepte',
        chance: 0.6,
        effet: { stockBar: -3, satisfaction: { habitue: 1 } },
        journal: 'Le trio accepte l’ardoise. Le contrebassiste joue de mieux en mieux, verre après verre.',
        echec: { satisfaction: { habitue: -3 } },
        journalEchec: 'Le trio range ses instruments. Le salon paraît soudain très silencieux.',
      },
      {
        texte: 'Payer',
        detail: `−${euros(A.cachetJazz)}, la soirée continue`,
        effet: { argent: -A.cachetJazz, satisfaction: { habitue: 1 } },
        journal: 'Le contrebassiste empoche son cachet et attaque « Round Midnight ». Le salon soupire d’aise.',
      },
      {
        texte: 'Mettre un disque',
        detail: 'Les habitués trouvent ça triste',
        effet: { satisfaction: { habitue: -3 } },
        journal: 'Un vieux disque de Chet Baker craque sur la platine. Ce n’est pas pareil.',
      },
    ],
  },
  {
    id: 'cave',
    opportunite: true,
    titre: 'Une cave à vendre',
    texte: 'Un négociant en costume à rayures, venu pour le charleston, propose de te céder une partie de sa cave. « Pour vous, un prix d’ami. »',
    condition: { theme: ['anneesFolles'], bar: true },
    choix: [
      {
        texte: 'Acheter',
        detail: `${A.caveBouteilles} bouteilles pour ${euros(A.caveNegociant)}, moins cher que chez le grossiste`,
        effet: { argent: -A.caveNegociant, stockBar: A.caveBouteilles },
        journal: 'Les caisses du négociant descendent à la cave. Il repart en fredonnant.',
      },
      {
        texte: 'Négocier',
        detail: `${euros(A.caveNegociee)}, s’il ne se vexe pas`,
        chance: 0.5,
        effet: { argent: -A.caveNegociee, stockBar: A.caveBouteilles },
        journal: 'Il fait mine de s’offusquer, puis tope. Une affaire.',
        echec: {},
        journalEchec: '« Un prix d’ami, j’ai dit. Pas un prix d’ennemi. » Il remballe ses caisses.',
      },
      {
        texte: 'Non merci',
        detail: 'Tu gardes ton argent',
        effet: {},
        journal: 'Le négociant range sa carte et retourne au charleston.',
      },
    ],
  },
  {
    id: 'refoule',
    titre: 'Refoulé à la porte',
    texte: 'Le portier vient de refouler un homme en imperméable qui jure être « un ami de la maison ». Il attend sous la pluie, très vexé.',
    condition: { selection: ['stricte'] },
    choix: [
      {
        texte: 'Le faire entrer',
        detail: 'Le portier fait la tête ; l’homme, lui, est peut-être un habitué',
        effet: { clients: 1, clientsSegment: 'habitue', satisfaction: { habitue: 2 } },
        journal: 'C’était bien un habitué, du temps de Josée. Il te remercie d’un clin d’œil.',
      },
      {
        texte: 'Faire confiance au portier',
        detail: 'La règle est la règle',
        chance: 0.5,
        effet: { satisfaction: { affaires: 1 } },
        journal: 'L’homme finit par partir. Le portier hoche la tête, satisfait.',
        echec: { satisfaction: { habitue: -4 } },
        journalEchec: 'C’était un habitué du jeudi. Il le raconte à tous ses amis.',
      },
    ],
  },
  {
    id: 'enceinte',
    titre: 'Une enceinte sur le quai',
    texte: 'Un groupe a posé une enceinte portative sur le quai. Les basses font trembler les vitres, et une fenêtre s’allume deux étages plus haut.',
    condition: { selection: ['laxiste'], segmentPresent: 'groupe' },
    choix: [
      {
        texte: 'Baisser le son',
        detail: 'Un peu de calme, un peu de grogne',
        effet: { satisfaction: { groupe: -1 }, tapage: -5, relations: { voisins: 2 } },
        journal: 'Le volume baisse d’un cran. Les basses aussi, à peine.',
      },
      {
        texte: 'Laisser la fête continuer',
        detail: 'Les groupes adorent ; le voisinage, non',
        effet: { satisfaction: { groupe: 3 }, tapage: 15, relations: { voisins: -5 } },
        journal: 'Le quai se transforme en piste de danse. Deux étages plus haut, un rideau s’agite.',
      },
      {
        texte: 'Confisquer l’enceinte jusqu’à la sortie',
        detail: 'Ça passe, ou ça casse',
        chance: 0.6,
        effet: { tapage: -10 },
        journal: 'L’enceinte rejoint le vestiaire, avec un ticket. Le groupe hausse les épaules.',
        echec: { tapage: -10, satisfaction: { groupe: -4 }, reputation: -0.5 },
        journalEchec: 'Le groupe proteste bruyamment, puis s’en va en promettant un avis assassin.',
      },
    ],
  },
  {
    id: 'addition',
    titre: 'L’addition fait tousser',
    texte: 'Un client brandit sa note sous la lampe du bar : « À ce prix-là, j’espérais au moins un orchestre ! »',
    condition: { tarifMin: 2 },
    choix: [
      {
        texte: 'Lui offrir un verre',
        detail: 'Un verre, un sourire, une bouteille entamée',
        effet: { stockBar: -1, satisfaction: { touriste: -1 } },
        journal: 'Un verre offert adoucit tout, même une addition salée.',
      },
      {
        texte: 'Lui rendre une partie',
        detail: `−${euros(A.geste)}, réputation préservée`,
        effet: { argent: -A.geste, reputation: 0.5 },
        journal: 'Tu rends un billet avec un sourire. Le client repart en sifflotant.',
      },
      {
        texte: 'Tenir bon',
        detail: 'Les prix sont les prix ; les touristes jasent',
        effet: { satisfaction: { touriste: -3 } },
        journal: '« La qualité a un prix, monsieur. » Il paie, et le raconte à son hôtel.',
      },
    ],
  },
  {
    id: 'vedette',
    opportunite: true,
    titre: 'Une visite remarquée',
    texte: 'Au bar, une silhouette élégante observe la maison depuis une heure, verre à la main. On chuchote qu’elle vient des plus belles maisons de Paris.',
    condition: { palierMin: 2, reputationMin: 30, placeLibre: true },
    choix: [
      {
        texte: 'Proposer un entretien',
        detail: `Un talent rare, et des exigences à la hauteur (${Math.round(B.CANDIDAT_VEDETTE.partMin * 100)} %)`,
        effet: { candidatVedette: true },
        journal: '« Avec plaisir. » La silhouette élégante pose son verre et te suit jusqu’au bureau.',
      },
      {
        texte: 'Lui offrir un verre, sans plus',
        detail: 'Un compliment, et la nuit reprend',
        effet: { reputation: 0.5, stockBar: -1 },
        journal: '« Charmante maison. » La silhouette élégante repart dans la nuit.',
      },
    ],
  },
  {
    id: 'voleur',
    titre: 'Au voleur !',
    texte: 'Une touriste crie sur le quai : on vient de lui voler son portefeuille. Le voleur file vers le pont, en baskets fluo.',
    condition: { palierMin: 1, segmentPresent: 'touriste', disponible: true },
    choix: [
      {
        texte: 'Envoyer {prenom} à sa poursuite',
        detail: '{prenom} court vite. Pas forcément assez',
        chance: 0.5,
        effet: { fatigue: 10, moral: 5, reputation: 1, satisfaction: { touriste: 4 }, relations: { police: 2 } },
        journal: '{prenom} rattrape le voleur au pont. La touriste l’embrasse sur les deux joues.',
        echec: { fatigue: 10 },
        journalEchec: '{prenom} revient bredouille, essoufflé{e}. Le voleur court encore.',
      },
      {
        texte: 'Dédommager la touriste',
        detail: `−${euros(A.dedommagement)} ; elle repart consolée`,
        effet: { argent: -A.dedommagement, satisfaction: { touriste: 3 } },
        journal: 'La touriste repart avec de quoi rentrer à l’hôtel, et une drôle d’histoire à raconter.',
      },
      {
        texte: 'Appeler la police',
        detail: 'Des uniformes sur le quai : les clients discrets s’éclipsent',
        effet: { satisfaction: { touriste: 2, affaires: -3 }, relations: { police: 5 } },
        journal: 'Deux agents prennent la déposition sur le quai. Un client d’affaires remonte son col et disparaît.',
      },
    ],
  },
  {
    id: 'chat',
    unique: true,
    opportunite: true,
    titre: 'Un chat dans le Boudoir',
    texte: 'Un chat roux s’est installé sur le lit du Boudoir, roulé en boule sur les coussins de soie. Il te regarde comme si la maison lui appartenait.',
    choix: [
      {
        texte: 'L’adopter',
        detail: `−${euros(A.veterinaire)} de vétérinaire ; l’équipe fond`,
        effet: { argent: -A.veterinaire, moralEquipe: 3, suite: { id: 'chat', delai: 4 } },
        journal: 'Le chat a un nom avant la fin de la soirée : Rembrandt. Il a déjà sa place au salon.',
      },
      {
        texte: 'Le remettre dehors',
        detail: 'Le Boudoir reste impeccable ; l’équipe est un peu déçue',
        effet: { moralEquipe: -1 },
        journal: 'Le chat roux sort, la queue haute, sans un regard en arrière.',
      },
    ],
  },
];

export function trouverImprevu(id: string): DefinitionImprevu | undefined {
  return IMPREVUS.find((i) => i.id === id);
}
