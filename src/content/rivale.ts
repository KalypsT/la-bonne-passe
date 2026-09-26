// La maison rivale (v0.5, palier 3) : le Chat Noir, la maison chic qui débauche, de l'autre côté du canal.
// Voir « Maisons rivales » dans les spécifications ; valeurs dans balance.ts (RIVALE, RIVALE_ARGENT).
// Les textes acceptent {prenom}, {joueur}, {maison}, et les accords {e} et {Il}.

import * as B from './balance';
import type { DefinitionIntrigue } from './intrigues';

const R = B.RIVALE;
const A = B.RIVALE_ARGENT;
const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;
const H = (h: number, m = 0) => h * 60 + m;

export const RIVALE_DEF = {
  nom: 'Le Chat Noir',
  patronne: 'Colette Vos',
  age: 54,
  portrait:
    'Colette Vos, 54 ans, ancienne meneuse de revue, tailleur noir et fume-cigarette éteint. Sa maison attire les costumes-cravates et les habitués fortunés, et elle n’aime pas qu’on les lui prenne.',
  style: 'Chic, feutrée, chère. Elle débauche les meilleures, casse ses prix quand il le faut, et ses rumeurs voyagent vite.',
  agace: 'Ce qui l’agace : ta réputation, et tes habitués ou tes clients d’affaires, qu’elle considère comme les siens.',
};

/** Humeur de la rivale selon son agressivité (0 à 100). */
export const HUMEURS_RIVALE = ['Indifférente', 'Sur ses gardes', 'Offensive', 'En guerre'] as const;

export function humeurRivale(agressivite: number): number {
  if (agressivite < 25) return 0;
  if (agressivite < 50) return 1;
  if (agressivite < 75) return 2;
  return 3;
}

/** Ce que la rivale a fait cette semaine, pour la fiche et le bilan du lundi. */
export const ACTIONS_RIVALE: Record<string, { nom: string; texte: string }> = {
  visite: { nom: 'Une carte de visite', texte: 'Colette Vos t’a fait savoir qu’elle existe.' },
  prix: { nom: 'Prix cassés', texte: 'Le Chat Noir casse ses prix cette semaine : habitués et clients d’affaires sont tentés.' },
  rumeur: { nom: 'Une rumeur', texte: 'Une rumeur sur {maison} court le quartier, et elle vient du Chat Noir.' },
  sabotage: { nom: 'Un faux client', texte: 'Colette Vos prépare un mauvais tour : un client payé pour faire un scandale.' },
  debauchage: { nom: 'Débauchage', texte: 'Le Chat Noir tourne autour de quelqu’un de ton équipe.' },
  alliance: { nom: 'Une main tendue', texte: 'Colette Vos propose un échange de bons procédés.' },
};

export type IdReponseRivale = 'debaucher' | 'rumeur' | 'treve';

export const TEXTES_REPONSES_RIVALE: Record<IdReponseRivale, { texte: string; detail: string; josee: string; journal: string; journalEchec?: string }> = {
  debaucher: {
    texte: 'Débaucher chez elle',
    detail: `Une recrue du Chat Noir attend au salon ; vos rapports ${R.debaucher.relation}, sa colère +${R.debaucher.agressivite}`,
    josee: 'Colette a les meilleures filles de la ville, et les meilleurs garçons. Elle ne te le pardonnera pas, mais ça, tu le savais.',
    journal: 'Une recrue du Chat Noir a franchi le canal. Elle attend au salon, un peu nerveuse.',
  },
  rumeur: {
    texte: 'Lancer une rumeur',
    detail: `${euros(R.rumeur.cout)} ; une chance sur deux que ses clients viennent chez toi cette semaine, sinon la presse s’en mêle`,
    josee: 'Une rumeur, c’est comme un chat : ça revient toujours à la maison. Assure-toi que ce ne soit pas la tienne.',
    journal: 'On murmure que le champagne du Chat Noir sort d’un carton. Ses habitués traversent le canal pour vérifier.',
    journalEchec: 'La rumeur t’est revenue en pleine figure : le Nachtblad cite « une concurrente jalouse ».',
  },
  treve: {
    texte: 'Proposer une trêve',
    detail: `${euros(R.treve.cout)} (un dîner) ; si elle accepte, ${R.treve.jours} jours de paix`,
    josee: 'Colette et moi avons dîné ensemble une fois par an pendant vingt ans. On ne s’aimait pas. On se respectait.',
    journal: 'Dîner au bord de l’eau avec Colette Vos. Poignée de main ferme : deux semaines de paix sur le canal.',
    journalEchec: 'Colette Vos a goûté le vin, reposé son verre, et décliné poliment. « Une autre fois, peut-être. »',
  },
};

export const TEXTES_RIVALE = {
  titre: 'La concurrence',
  agressivite: 'Humeur',
  relation: 'Vos rapports',
  semaine: 'Cette semaine',
  rien: 'Elle observe.',
  pasEncore: 'Elle n’a pas encore bougé : elle agit le lundi.',
  treve: (jour: number) => `Trêve jusqu’au jour ${jour}.`,
  transfuges: (noms: string) => `Chez elle désormais : ${noms}.`,
  reponses: 'Répondre',
  chance: (pourcent: number) => `${pourcent} % de chances qu’elle accepte`,
  reponseFaite: (jour: number) => `Une réponse par semaine : la prochaine, le jour ${jour}.`,
  sansRecrutement: 'Il faut pouvoir recruter.',
  tropCher: 'Pas assez en caisse.',
  retour: 'Retour aux relations',
  /** Au bilan du lundi. */
  bilan: 'Le Chat Noir',
};

/** Au journal : l'agressivité de la rivale franchit un palier d'humeur. */
export const TEXTES_JOURNAL_RIVALE = {
  humeur: (indice: number) =>
    [
      'Le Chat Noir ne s’occupe plus de toi. Pour l’instant.',
      'Colette Vos garde un œil sur {maison}.',
      'Le Chat Noir passe à l’offensive.',
      'Colette Vos a déclaré la guerre à {maison}. Tout le canal le sait.',
    ][indice] ?? '',
  treveFinie: 'La trêve avec le Chat Noir est terminée.',
};

/** Les cartes de la rivale : des suites, démarrées le lundi par src/engine/rivale.ts. */
export const CARTES_RIVALE: DefinitionIntrigue[] = [
  {
    id: 'chatNoirVisite',
    titre: 'Une carte de visite noire',
    genre: 'suite',
    premiere: 'carte',
    etapes: {
      carte: {
        heure: H(11),
        titre: 'Une carte de visite noire',
        texte:
          'Une carte noire, gravée d’un chat doré, glissée sous la porte : « Colette Vos, Le Chat Noir. Le café est meilleur de l’autre côté du canal. Passez donc, {joueur}. »',
        enCours: 'La patronne du Chat Noir s’intéresse à toi.',
        choix: [
          {
            texte: 'Aller boire ce café',
            detail: 'On se jauge, on se respecte',
            effet: { rivale: { relation: 10 } },
            journal: 'Café serré au Chat Noir. Colette Vos t’observe comme on estime un meuble ancien. « Vous me plaisez. Ne grandissez pas trop vite. »',
            suite: { fin: 'cafe' },
          },
          {
            texte: 'Lui envoyer des fleurs, sans y aller',
            detail: `−${euros(A.fleurs)} ; courtois, et distant`,
            effet: { argent: -A.fleurs, rivale: { relation: 5 } },
            journal: 'Un bouquet de roses noires part vers le Chat Noir. La réponse arrive le soir même : « Charmant. »',
            suite: { fin: 'fleurs' },
          },
          {
            texte: 'Jeter la carte',
            detail: 'Elle le saura',
            effet: { rivale: { relation: -5, agressivite: 5 } },
            journal: 'La carte noire finit dans la corbeille. Au Chat Noir, quelqu’un l’apprend dans l’heure.',
            suite: { fin: 'corbeille' },
          },
        ],
      },
    },
    fins: { cafe: {}, fleurs: {}, corbeille: {} },
  },
  {
    id: 'chatNoirPrix',
    titre: 'Le Chat Noir casse ses prix',
    genre: 'suite',
    premiere: 'affiche',
    etapes: {
      affiche: {
        heure: H(11),
        titre: 'Le Chat Noir casse ses prix',
        texte:
          'Sur le quai d’en face, une affiche noire et or : « Cette semaine au Chat Noir, la deuxième coupe est offerte, et la discrétion aussi. » Deux de tes habitués l’ont prise en photo.',
        enCours: 'Le Chat Noir prépare une offensive commerciale.',
        choix: [
          {
            texte: 'Laisser faire : nos clients savent ce qu’ils valent',
            detail: 'Habitués et clients d’affaires viennent moins cette semaine',
            effet: { concurrence: R.prixConcurrence },
            journal: 'Tu ne changes rien. Cette semaine, quelques habitués iront voir de l’autre côté du canal.',
            suite: { fin: 'laisse' },
          },
          {
            texte: 'Une coupe offerte aux habitués cette semaine',
            detail: `−${euros(A.coupeHabitues)} ; l’offensive fait long feu`,
            effet: { argent: -A.coupeHabitues, concurrence: R.prixAttenue, satisfaction: { habitue: 2 } },
            journal: 'Chaque habitué trouve une coupe qui l’attend au bar. On reste en famille.',
            suite: { fin: 'coupe' },
          },
          {
            texte: 'Appeler Colette Vos',
            detail: 'Une chance sur deux qu’elle recule ; sinon elle s’en amuse',
            chance: 0.5,
            effet: { rivale: { relation: 5, agressivite: -10 } },
            journal: '« Vous avez raison, {joueur}, c’était indigne de nous deux. » L’affiche disparaît le lendemain.',
            echec: { concurrence: R.prixConcurrence, rivale: { relation: -5 } },
            journalEchec: 'Colette Vos rit au téléphone : « Vous m’appelez pour ça ? Adorable. » L’affiche reste.',
            suite: { fin: 'appel' },
          },
        ],
      },
    },
    fins: { laisse: {}, coupe: {}, appel: {} },
  },
  {
    id: 'chatNoirRumeur',
    titre: 'Une rumeur venue d’en face',
    genre: 'suite',
    premiere: 'rumeur',
    etapes: {
      rumeur: {
        heure: H(11),
        titre: 'Une rumeur venue d’en face',
        texte:
          'Le cafetier du coin te le glisse en rendant la monnaie : on raconte que les draps de {maison} « ne sont changés qu’une fois par semaine ». La rumeur a démarré au bar du Chat Noir.',
        enCours: 'Une rumeur se prépare au Chat Noir.',
        choix: [
          {
            texte: 'Démentir, draps neufs à l’appui',
            detail: `−${euros(A.dementi)} ; une vitrine de linge immaculé`,
            effet: { argent: -A.dementi, relations: { presse: 3 }, satisfaction: { habitue: -1 } },
            journal: 'Une pile de draps blancs trône en vitrine, avec un petit carton : « Changés à chaque visite. » Le quartier rit, et oublie.',
            suite: { fin: 'dementi' },
          },
          {
            texte: 'Répondre par une rumeur',
            detail: 'Une chance sur deux de retourner la situation ; la guerre monte d’un cran',
            chance: 0.5,
            effet: { rivale: { relation: -10, agressivite: 10 }, satisfaction: { habitue: 2 } },
            journal: 'On raconte maintenant que Colette Vos teint ses chats. Le quartier adore.',
            echec: { rivale: { relation: -10, agressivite: 10 }, relations: { presse: -6 }, reputation: -1 },
            journalEchec: 'Ta rumeur a fait pschitt, et le Nachtblad parle de « guerre des chattes sur le canal ».',
            suite: { fin: 'riposte' },
          },
          {
            texte: 'Laisser dire',
            detail: 'Quelques clients s’en inquiètent ; ça passera',
            effet: { satisfaction: { habitue: -4, affaires: -3 }, reputation: -1 },
            journal: 'Tu hausses les épaules. Pendant quelques soirs, des clients soulèvent les draps d’un air soupçonneux.',
            suite: { fin: 'silence' },
          },
        ],
      },
    },
    fins: { dementi: {}, riposte: {}, silence: {} },
  },
  {
    id: 'chatNoirAlliance',
    titre: 'Une main tendue',
    genre: 'suite',
    premiere: 'echange',
    etapes: {
      echange: {
        heure: H(15),
        titre: 'Une main tendue',
        texte:
          'Colette Vos passe en personne, gants noirs et sourire en coin : « Ma maison déborde ce soir. Je vous envoie trois de mes habitués, vous me rendrez la pareille un jour. Entre gens de goût. »',
        enCours: 'Colette Vos a une proposition à te faire.',
        condition: { rivaleRelationMin: R.allianceRelation },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Accepter, avec gratitude',
            detail: 'Trois habitués ce soir ; la paix s’installe',
            effet: { clients: 3, clientsSegment: 'habitue', rivale: { relation: 5, agressivite: -10 } },
            journal: 'Trois habitués du Chat Noir arrivent en fin de soirée, une carte noire à la main.',
            suite: { fin: 'accepte' },
          },
          {
            texte: 'Décliner poliment',
            detail: 'Tu ne dois rien à personne',
            effet: { rivale: { relation: -3 } },
            journal: '« Comme vous voudrez. » Colette Vos remet ses gants, lentement.',
            suite: { fin: 'decline' },
          },
        ],
      },
    },
    fins: { accepte: {}, decline: {}, oubliee: {} },
  },
];

/** « L'offre du Chat Noir » : l'intrigue de débauchage des spécifications, sur la personne que vise la rivale. */
export const INTRIGUE_CHAT_NOIR: DefinitionIntrigue = {
  id: 'offreChatNoir',
  titre: 'L’offre du Chat Noir',
  genre: 'intrigue',
  // Pas de déclencheur : c'est la rivale qui la démarre, un lundi, en choisissant sa cible.
  declencheur: { jourMin: 9999 },
  premiere: 'verre',
  etapes: {
    verre: {
      heure: H(15),
      titre: 'Un verre au Chat Noir',
      texte:
        'La fleuriste d’en face te le glisse en rendant la monnaie : elle a vu {prenom} au bar du Chat Noir, en grande conversation avec Colette Vos. Deux coupes, un rire, une carte noire glissée dans une poche.',
      enCours: 'On a vu {prenom} au Chat Noir.',
      choix: [
        {
          texte: 'Lui en parler franchement',
          detail: '{Il} apprécie la franchise, moins le soupçon',
          effet: { loyaute: 4, moral: -2, points: 1 },
          journal: '{prenom} rougit : « Un verre, c’est tout. » Mais {prenom} te remercie d’avoir posé la question en face.',
          suite: { etape: 'part', delai: 2 },
        },
        {
          texte: 'Faire comme si de rien n’était',
          detail: 'Et attendre la suite',
          effet: {},
          journal: 'Tu ne dis rien. Le soir, {prenom} est d’une humeur charmante, trop peut-être.',
          suite: { etape: 'part', delai: 2 },
        },
        {
          texte: 'Une prime, sans un mot',
          detail: `−${euros(A.primeDiscrete)} ; le message passera`,
          effet: { argent: -A.primeDiscrete, moral: 8, loyaute: 5, points: 1 },
          journal: '{prenom} trouve une enveloppe dans son casier. Pas de mot. Le message est passé.',
          suite: { etape: 'part', delai: 2 },
        },
      ],
    },
    verreMila: {
      heure: H(15),
      titre: 'Un verre au Chat Noir',
      texte:
        'La fleuriste d’en face a vu Mila au bar du Chat Noir, avec Colette Vos. « Le Pink Palace, puis toi, puis le Chat Noir ? Elle collectionne les maisons comme les paires de lunettes. »',
      enCours: 'On a vu Mila au Chat Noir.',
      choix: [
        {
          texte: 'Lui en parler franchement',
          detail: 'Elle apprécie la franchise, moins le soupçon',
          effet: { loyaute: 4, moral: -2, points: 1 },
          journal: 'Mila enlève ses lunettes : « Je regarde, c’est tout. Je sais où je suis bien. » Presque convaincante.',
          suite: { etape: 'part', delai: 2 },
        },
        {
          texte: 'Faire comme si de rien n’était',
          detail: 'Et attendre la suite',
          effet: {},
          journal: 'Tu ne dis rien. Mila fredonne en se maquillant, ce qui n’annonce jamais rien de bon.',
          suite: { etape: 'part', delai: 2 },
        },
        {
          texte: 'Une prime, sans un mot',
          detail: `−${euros(A.primeDiscrete)} ; le message passera`,
          effet: { argent: -A.primeDiscrete, moral: 8, loyaute: 5, points: 1 },
          journal: 'Mila ouvre l’enveloppe, compte, sourit. « Tu as l’œil, {joueur}. »',
          suite: { etape: 'part', delai: 2 },
        },
      ],
    },
    part: {
      heure: H(18, 30),
      titre: '{prenom} fait ses comptes',
      texte:
        'Juste avant le briefing, {prenom} ferme la porte du bureau : « Le Chat Noir m’offre plus. Je préfère travailler ici, mais je veux cinq points de plus sur chaque rendez-vous. »',
      enCours: '{prenom} veut te parler d’argent.',
      choix: [
        {
          texte: 'Accepter',
          detail: 'Sa part monte de cinq points ; {Il} reste, et le sait',
          effet: { part: 0.05, loyaute: 10, moral: 8 },
          journal: '{prenom} serre ta main un peu plus longtemps que d’habitude. L’affaire est close.',
          suite: { fin: 'fidele' },
        },
        {
          texte: 'Refuser',
          detail: 'Moral et loyauté en baisse : le Chat Noir attend',
          effet: { moral: -10, loyaute: -8 },
          journal: '{prenom} hoche la tête, lentement, et sort sans claquer la porte. C’est pire.',
          suite: { etape: 'offre', delai: 3 },
        },
        {
          texte: 'Prendre le temps de lui parler',
          detail: 'Une chance sur deux de retrouver sa confiance, sans rien céder',
          chance: 0.5,
          effet: { moral: 6, loyaute: 6, points: 1 },
          journal: 'Une heure au bureau. {prenom} repart avec l’envie de rester, et sans augmentation.',
          echec: { moral: -4 },
          journalEchec: '{prenom} écoute poliment. Ses yeux, eux, sont déjà de l’autre côté du canal.',
          suite: { etape: 'offre', delai: 3 },
        },
      ],
    },
    offre: {
      heure: H(11),
      titre: 'Une offre ferme',
      texte:
        '{prenom} pose une lettre sur ton bureau, papier noir, encre dorée : une offre ferme du Chat Noir. Une meilleure part, une loge à son nom, et Colette Vos qui attend la réponse ce soir.',
      enCours: 'Le Chat Noir prépare une offre pour {prenom}.',
      // Seulement si le moral ou la loyauté ont flanché ; sinon, {prenom} décline d'elle-même.
      condition: { fragile: true },
      sinon: { fin: 'reste' },
      choix: [
        {
          texte: 'Contre-offrir',
          detail: `−${euros(A.contreOffre)} de prime et cinq points de part : {Il} reste`,
          effet: { argent: -A.contreOffre, part: 0.05, loyaute: 15, moral: 10 },
          journal: '{prenom} déchire la lettre noire en quatre, lentement, pour que toute la loge le voie.',
          suite: { fin: 'fidele' },
        },
        {
          texte: 'Laisser partir {prenom}',
          detail: 'Ses habitués risquent de suivre',
          effet: { depart: true, transfuge: true, satisfaction: { habitue: -4 }, rivale: { agressivite: 5 } },
          journal: '{prenom} fait ses adieux à l’équipe et traverse le canal. Colette Vos l’attend sur le perron.',
          suite: { fin: 'partie' },
        },
        {
          texte: 'Riposter : débaucher chez le Chat Noir',
          detail: 'Une recrue du Chat Noir au salon ; une chance sur deux que {prenom} reste, par fierté',
          chance: 0.5,
          effet: { candidatRival: true, moral: 5, loyaute: 5, rivale: { relation: -15, agressivite: 10 } },
          journal: 'Une recrue du Chat Noir arrive au salon. {prenom} la regarde, puis range la lettre noire : « Bon. Je reste. »',
          echec: { candidatRival: true, depart: true, transfuge: true, rivale: { relation: -15, agressivite: 10 } },
          journalEchec: '{prenom} part au Chat Noir, pendant qu’une recrue du Chat Noir arrive chez toi. Échange de bons procédés.',
          suite: { fin: 'riposte' },
        },
      ],
    },
  },
  fins: {
    fidele: { texte: '{prenom} a rangé la carte noire du Chat Noir. Plus fidèle que jamais.' },
    reste: { texte: '{prenom} a décliné l’offre du Chat Noir sans même t’en parler. Tu l’apprends par la fleuriste d’en face.' },
    partie: { texte: '{prenom} travaille désormais au Chat Noir. Colette Vos compte bien s’en servir contre toi.' },
    riposte: { texte: 'Le Chat Noir et {maison} ont échangé des coups, et du personnel. Le canal en parle encore.' },
  },
};
