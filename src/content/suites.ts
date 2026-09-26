// Suites différées des imprévus : une carte, quelques jours plus tard, qui fait revenir un choix.
// Voir « Des conséquences différées » dans les spécifications. Même format que les intrigues (genre « suite »).

import * as B from './balance';
import type { DefinitionIntrigue } from './intrigues';

const A = B.IMPREVU_ARGENT;
const euros = (n: number) => `${n.toLocaleString('fr-FR')}\u00a0€`;
const H = (h: number, m = 0) => h * 60 + m;

export const SUITES: DefinitionIntrigue[] = [
  {
    // Suite de l'imprévu « Un client généreux », quand la maison a refusé.
    id: 'costume',
    titre: 'L’homme au costume',
    genre: 'suite',
    premiere: 'retour',
    etapes: {
      retour: {
        heure: H(21, 30),
        titre: 'L’homme au costume revient',
        texte:
          'L’habitué au costume trois-pièces est de retour, un bouquet de pivoines à la main. « Pour {prenom}. Pour m’excuser de l’autre soir. Je voudrais seulement lui parler. »',
        enCours: 'L’homme au costume n’a pas dit son dernier mot.',
        choix: [
          {
            texte: 'Laisser {prenom} décider',
            detail: 'Un pourboire, peut-être ; {prenom} appréciera',
            chance: 0.6,
            effet: { argent: B.COSTUME_POURBOIRE, moral: 6, satisfaction: { habitue: 3 } },
            journal: '{prenom} accepte les pivoines et un verre au salon. Le costume laisse un pourboire royal.',
            suite: { fin: 'reconcilie' },
            echec: { moral: 3 },
            journalEchec: '{prenom} prend les fleurs, pas le client. Il repart, digne.',
            suiteEchec: { fin: 'econduit' },
          },
          {
            texte: 'Le raccompagner',
            detail: 'Les habitués jasent un peu ; {prenom} te remercie',
            effet: { satisfaction: { habitue: -2 }, loyaute: 4 },
            journal: 'Tu raccompagnes le costume jusqu’au quai. {prenom} t’adresse un regard reconnaissant.',
            suite: { fin: 'econduit' },
          },
        ],
      },
    },
    fins: { reconcilie: {}, econduit: {} },
  },
  {
    // Suite de l'inspection sanitaire, quand la maison a demandé un délai.
    id: 'inspecteur',
    titre: 'L’inspecteur revient',
    genre: 'suite',
    premiere: 'retour',
    etapes: {
      retour: {
        heure: H(11),
        titre: 'L’inspecteur revient',
        texte: 'Cinq jours plus tard, pile à l’heure : l’inspecteur est de retour, stylo quatre couleurs dégainé. « Cette fois, je regarde tout. »',
        enCours: 'L’inspecteur a promis de revenir.',
        choix: [
          {
            texte: 'Lui ouvrir toutes les portes',
            detail: 'Tu as eu le temps de te préparer',
            chance: 0.75,
            effet: { reputation: 1, relations: { mairie: 4 } },
            journal: 'L’inspecteur passe les chambres au peigne fin et ne trouve rien. Il repart presque déçu.',
            echec: { argent: -A.inspectionAmende, relations: { mairie: -4 } },
            journalEchec: `Un extincteur périmé depuis 2019 : ${euros(A.inspectionAmende)} d’amende.`,
            suite: { fin: 'visite' },
          },
          {
            texte: 'Payer la mise aux normes',
            detail: `−${euros(A.inspectionNormes)}, sans surprise`,
            effet: { argent: -A.inspectionNormes, relations: { mairie: 3 } },
            journal: 'Tu signes pour la mise aux normes. L’inspecteur range son stylo, satisfait.',
            suite: { fin: 'normes' },
          },
        ],
      },
    },
    fins: { visite: {}, normes: {} },
  },
  {
    // Suite du live au salon, quand la maison a accepté le direct.
    id: 'video',
    titre: 'La vidéo tourne',
    genre: 'suite',
    premiere: 'vues',
    etapes: {
      vues: {
        heure: H(21),
        titre: 'La vidéo tourne',
        texte: 'Le live de l’influenceuse a fait cent quatre-vingt mille vues. Ce soir, des touristes arrivent sur le quai, téléphone à la main, en cherchant le bon angle.',
        enCours: 'La vidéo tourne sur les réseaux.',
        choix: [
          {
            texte: 'Les accueillir à bras ouverts',
            detail: 'Trois clients de plus ; l’équipe va courir',
            effet: { clients: 3, clientsSegment: 'touriste', fatigueEquipe: 6, satisfaction: { touriste: 2 }, relations: { presse: 3, voisins: -3 } },
            journal: 'Le quai se remplit de touristes en quête du salon « vu sur Internet ».',
            suite: { fin: 'accueil' },
          },
          {
            texte: 'Garder la tête froide',
            detail: 'Pas de photos à l’intérieur : les habitués apprécient',
            effet: { satisfaction: { habitue: 2, affaires: 2, touriste: -2 }, relations: { voisins: 2 } },
            journal: 'Un écriteau apparaît à l’entrée : « Ici, on éteint son téléphone. » Les habitués sourient.',
            suite: { fin: 'calme' },
          },
        ],
      },
    },
    fins: { accueil: {}, calme: {} },
  },
  {
    // Suite du client qui prend des notes, quand l'article est bon.
    id: 'critiqueFlatteuse',
    titre: 'L’article paraît',
    genre: 'suite',
    premiere: 'article',
    etapes: {
      article: {
        heure: H(11),
        titre: 'Un article flatteur',
        texte: '« Nuits d’Amsterdam » consacre une demi-page à {maison} : « un salon où l’on se sent attendu, et des hôtes qui ont de l’esprit ». Le téléphone sonne déjà.',
        enCours: 'Le guide des noctambules prépare son article.',
        choix: [
          {
            texte: 'L’encadrer dans l’entrée',
            detail: 'Réputation et touristes en hausse',
            effet: { reputation: 2, satisfaction: { touriste: 3 }, relations: { presse: 8 } },
            journal: 'L’article trône dans un cadre doré, juste à côté du vestiaire.',
            suite: { fin: 'encadre' },
          },
          {
            texte: 'En faire une affiche en vitrine',
            detail: `−${euros(A.afficheArticle)} ; tout le quartier le lira`,
            effet: { argent: -A.afficheArticle, reputation: 3, satisfaction: { touriste: 4, affaires: -1 }, relations: { presse: 6, voisins: -2 } },
            journal: 'La citation s’affiche en lettres dorées dans la vitrine. Les passants ralentissent.',
            suite: { fin: 'affiche' },
          },
        ],
      },
    },
    fins: { encadre: {}, affiche: {} },
  },
  {
    // Suite du client qui prend des notes, quand l'article est mauvais.
    id: 'critiqueAcide',
    titre: 'L’article paraît',
    genre: 'suite',
    premiere: 'article',
    etapes: {
      article: {
        heure: H(11),
        titre: 'Un article acide',
        texte: '« Nuits d’Amsterdam » est cruel avec {maison} : « un décor qui promet plus qu’il ne tient ». Les habitués font semblant de ne pas l’avoir lu.',
        enCours: 'Le guide des noctambules prépare son article.',
        choix: [
          {
            texte: 'Répondre avec humour',
            detail: 'Les lecteurs peuvent adorer… ou trouver ça aigre',
            chance: 0.5,
            effet: { reputation: 1, relations: { presse: 4 } },
            journal: 'Ta réponse, publiée le lendemain, fait rire tout le quartier. Même le critique, paraît-il.',
            echec: { reputation: -1.5, relations: { presse: -8 } },
            journalEchec: 'Ta réponse passe pour de l’aigreur. Le critique en rajoute une couche.',
            suite: { fin: 'reponse' },
          },
          {
            texte: 'Laisser passer l’orage',
            detail: 'Un peu de réputation perdue, et on n’en parle plus',
            effet: { reputation: -1, relations: { presse: -3 } },
            journal: 'Tu ranges le journal dans un tiroir. Dans une semaine, tout le monde aura oublié.',
            suite: { fin: 'silence' },
          },
        ],
      },
    },
    fins: { reponse: {}, silence: {} },
  },
  {
    // Suite de l'anniversaire de monsieur De Groot, quand la maison a offert le champagne.
    id: 'bridge',
    titre: 'Le club de bridge',
    genre: 'suite',
    premiere: 'amis',
    etapes: {
      amis: {
        heure: H(21),
        titre: 'Le club de bridge',
        texte: 'Monsieur De Groot revient, accompagné de trois amis de son club de bridge, cravatés comme pour un mariage. « Je leur ai tout raconté. »',
        enCours: 'Monsieur De Groot a promis de parler de la maison à ses amis.',
        choix: [
          {
            texte: 'Leur ouvrir le salon',
            detail: 'Trois habitués de plus',
            effet: { clients: 3, clientsSegment: 'habitue', satisfaction: { habitue: 2 } },
            journal: 'Le club de bridge s’installe au salon. Monsieur De Groot fait les présentations, très fier.',
            suite: { fin: 'salon' },
          },
          {
            texte: 'Leur réserver une table au bar',
            detail: `+${euros(A.bridgeTable)}, et du champagne à servir`,
            effet: { argent: A.bridgeTable, stockBar: -3 },
            journal: 'Le club de bridge commande trois bouteilles et joue une partie au bar jusqu’à minuit.',
            suite: { fin: 'bar' },
          },
        ],
      },
    },
    fins: { salon: {}, bar: {} },
  },
  {
    // Suite du loup tombé, quand la maison a raccompagné l'échevin.
    id: 'echevin',
    titre: 'Une enveloppe épaisse',
    genre: 'suite',
    premiere: 'invitation',
    etapes: {
      invitation: {
        heure: H(11),
        titre: 'Une enveloppe épaisse',
        texte: 'Une enveloppe au papier épais, adressée à « {maison} » : l’échevin te remercie de ta discrétion et t’invite au gala de printemps de la mairie.',
        enCours: 'L’échevin n’a pas oublié ta discrétion.',
        choix: [
          {
            texte: 'Y aller',
            detail: `Une tenue à louer (${euros(A.galaTenue)}) ; on parlera de la maison`,
            effet: { argent: -A.galaTenue, reputation: 2, relations: { mairie: 12 } },
            journal: 'Au gala, tu serres des mains, tu ris aux bons moments, et on te demande l’adresse de la maison. Deux fois.',
            suite: { fin: 'gala' },
          },
          {
            texte: 'Décliner, et garder sa carte',
            detail: 'La discrétion, jusqu’au bout',
            effet: { satisfaction: { affaires: 2 }, relations: { mairie: 4 } },
            journal: 'Tu glisses la carte de l’échevin dans le tiroir du bureau. On ne sait jamais.',
            suite: { fin: 'carte' },
          },
        ],
      },
    },
    fins: { gala: {}, carte: {} },
  },
  {
    // Suite du chat du Boudoir, quand la maison l'a adopté.
    id: 'chat',
    titre: 'Rembrandt',
    genre: 'suite',
    premiere: 'pigeon',
    etapes: {
      pigeon: {
        heure: H(12),
        titre: 'Un cadeau sur l’oreiller',
        texte: 'Rembrandt, le chat roux, a déposé un pigeon sur l’oreiller du Boudoir, en guise de loyer. Le ménage hurle.',
        enCours: 'Rembrandt prend ses marques.',
        choix: [
          {
            texte: 'Le garder quand même',
            detail: 'L’équipe l’adore ; les habitués aussi',
            effet: { moralEquipe: 2, satisfaction: { habitue: 1 } },
            journal: 'Rembrandt reste. On change les draps du Boudoir, et on lui achète une clochette.',
            suite: { fin: 'garde' },
          },
          {
            texte: 'Le confier au refuge',
            detail: 'Le Boudoir est sauvé ; l’équipe a le cœur gros',
            effet: { moralEquipe: -3 },
            journal: 'Rembrandt part au refuge dans un panier. La loge est bien silencieuse ce soir.',
            suite: { fin: 'refuge' },
          },
        ],
      },
    },
    fins: { garde: {}, refuge: {} },
  },
];
