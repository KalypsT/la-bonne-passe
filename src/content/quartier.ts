// Événements du quartier (v0.5, palier 3) : une carte quand un acteur est en bons ou en mauvais termes avec la maison.
// Même format que les suites des imprévus (genre « suite ») ; démarrées par src/engine/relations.ts.
// Autant d'opportunités que d'ennuis : chaque acteur a sa carte en bons termes et sa carte en mauvais termes.

import * as B from './balance';
import type { DefinitionIntrigue } from './intrigues';

const Q = B.QUARTIER_ARGENT;
const R = B.RELATIONS;
const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;
const H = (h: number, m = 0) => h * 60 + m;

export const EVENEMENTS_QUARTIER: DefinitionIntrigue[] = [
  {
    id: 'feteVoisins',
    titre: 'La fête des voisins',
    genre: 'suite',
    premiere: 'invitation',
    etapes: {
      invitation: {
        heure: H(16),
        titre: 'La fête des voisins',
        texte:
          'Un carton glissé sous la porte, calligraphié par la fleuriste d’en face : « Fête des voisins, samedi, sur le quai. Apportez ce que vous voulez, sauf votre sono. » Monsieur Bakker a ajouté au crayon : « Venez donc. »',
        enCours: 'Les voisins préparent leur fête sur le quai.',
        condition: { relationMin: { voisins: R.bons } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Y aller avec du champagne',
            detail: `−${euros(Q.feteVoisins)} ; l’équipe vient aussi, tout le quai trinque`,
            effet: { argent: -Q.feteVoisins, relations: { voisins: 6 }, moralEquipe: 3 },
            journal: 'Le champagne de {maison} fait le tour du quai. Monsieur Bakker sort son violoncelle, et la fleuriste danse.',
            suite: { fin: 'champagne' },
          },
          {
            texte: 'Passer en coup de vent',
            detail: 'Une bise, une part de tarte, et au travail',
            effet: { relations: { voisins: 2 } },
            journal: 'Tu passes une demi-heure sur le quai, une part de tarte aux pommes à la main. On t’a vu, c’est l’essentiel.',
            suite: { fin: 'passage' },
          },
          {
            texte: 'Décliner poliment',
            detail: 'La maison a du travail ; les voisins le prennent un peu mal',
            effet: { relations: { voisins: -4 } },
            journal: 'Tu t’excuses par un mot glissé dans la boîte aux lettres. Sur le quai, on remarque la chaise vide.',
            suite: { fin: 'absent' },
          },
        ],
      },
    },
    fins: { champagne: {}, passage: {}, absent: {}, oubliee: {} },
  },
  {
    id: 'petition',
    titre: 'La pétition',
    genre: 'suite',
    premiere: 'signatures',
    etapes: {
      signatures: {
        heure: H(11),
        titre: 'Une pétition dans l’escalier',
        texte:
          'Une feuille punaisée dans la cage d’escalier : « Pour le calme du quai. Non aux nuits blanches. » Déjà vingt-trois signatures, dont celle, très appliquée, de monsieur Bakker. Elle part jeudi à la mairie.',
        enCours: 'Une pétition circule dans le quartier.',
        condition: { relationMax: { voisins: R.mauvais } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Organiser une réunion avec les voisins',
            detail: `−${euros(Q.petitionRencontre)} (café, gâteaux, rideaux épais promis) ; la pétition s’arrête là`,
            effet: { argent: -Q.petitionRencontre, relations: { voisins: 15 }, tapage: -10 },
            journal: 'Réunion au salon, café et gâteaux. Tu promets des rideaux épais ; la feuille disparaît de l’escalier.',
            suite: { fin: 'reunion' },
          },
          {
            texte: 'Laisser la pétition partir',
            detail: 'La mairie la recevra, et la presse locale aussi',
            effet: { relations: { mairie: -10, presse: -6 }, reputation: -1 },
            journal: 'La pétition arrive à la mairie, avec un photographe du journal du quartier. Tu fais la une, en petit.',
            suite: { fin: 'mairie' },
          },
          {
            texte: 'Faire signer la contre-pétition des clients',
            detail: 'Les habitués adorent ; les voisins, beaucoup moins',
            effet: { relations: { voisins: -8 }, satisfaction: { habitue: 3 } },
            journal: 'Quarante habitués signent « Pour que vive {maison} ». Monsieur Bakker en fait une affaire personnelle.',
            suite: { fin: 'contre' },
          },
        ],
      },
    },
    fins: { reunion: {}, mairie: {}, contre: {}, oubliee: {} },
  },
  {
    id: 'conseilEchevin',
    titre: 'Un conseil de l’échevin',
    genre: 'suite',
    premiere: 'cafe',
    etapes: {
      cafe: {
        heure: H(10),
        titre: 'Un conseil de l’échevin',
        texte:
          'L’échevin passe « par hasard », accepte un café et baisse la voix : « Entre nous, {joueur}, le service d’hygiène fait une tournée du quartier le mois prochain. Ils adorent les extincteurs. »',
        enCours: 'L’échevin a une confidence à te faire.',
        condition: { relationMin: { mairie: R.bons } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Faire la mise aux normes tout de suite',
            detail: `−${euros(Q.normesPreventives)} ; la mairie apprécie les maisons sérieuses`,
            effet: { argent: -Q.normesPreventives, relations: { mairie: 6 }, reputation: 0.5 },
            journal: 'Extincteurs neufs, issues de secours repeintes : l’inspecteur n’aura rien à dire.',
            suite: { fin: 'normes' },
          },
          {
            texte: 'Le remercier, et lui resservir un café',
            detail: 'Il apprécie l’attention',
            effet: { relations: { mairie: 2 } },
            journal: 'L’échevin repart avec deux cafés dans le ventre et le sentiment d’avoir rendu service.',
            suite: { fin: 'merci' },
          },
          {
            texte: 'Lui demander plutôt de parler de la maison au conseil',
            detail: 'Une chance sur deux qu’il le fasse ; sinon il se sent utilisé',
            chance: 0.5,
            effet: { relations: { mairie: 4 }, reputation: 1.5 },
            journal: 'Au conseil municipal, l’échevin cite {maison} en exemple de « commerce de nuit responsable ».',
            echec: { relations: { mairie: -6 } },
            journalEchec: 'L’échevin pince les lèvres : « Je vais voir ce que je peux faire. » Il ne fera rien.',
            suite: { fin: 'conseil' },
          },
        ],
      },
    },
    fins: { normes: {}, merci: {}, conseil: {}, oubliee: {} },
  },
  {
    id: 'inspectionSurprise',
    titre: 'Inspection surprise',
    genre: 'suite',
    premiere: 'visite',
    etapes: {
      visite: {
        heure: H(11),
        titre: 'Inspection surprise',
        texte:
          'Trois inspecteurs de la mairie, badge au cou, sans rendez-vous : « Contrôle des licences, de l’hygiène et des issues de secours. On nous a beaucoup parlé de {maison}. »',
        enCours: 'La mairie a ouvert un dossier sur la maison.',
        condition: { relationMax: { mairie: R.mauvais } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Leur ouvrir toutes les portes',
            detail: `Si tout est en ordre, rien ; sinon ${euros(Q.inspectionAmende)} d’amende`,
            chance: 0.6,
            effet: { relations: { mairie: 8 } },
            journal: 'Les inspecteurs repartent bredouilles, presque vexés. Au dossier : « Rien à signaler. »',
            echec: { argent: -Q.inspectionAmende, relations: { mairie: -4 } },
            journalEchec: `Une licence de bar mal affichée : ${euros(Q.inspectionAmende)} d’amende.`,
            suite: { fin: 'visite' },
          },
          {
            texte: 'Payer une mise aux normes complète',
            detail: `−${euros(Q.inspectionNormes)}, et le dossier se referme`,
            effet: { argent: -Q.inspectionNormes, relations: { mairie: 12 } },
            journal: 'Tu signes le devis sur le capot de leur voiture. Le dossier se referme, avec un sourire.',
            suite: { fin: 'normes' },
          },
          {
            texte: 'Appeler un avocat',
            detail: `−${euros(Q.inspectionAvocat)} ; l’inspection est reportée, la mairie n’aime pas ça`,
            effet: { argent: -Q.inspectionAvocat, relations: { mairie: -5 }, juridique: true },
            journal: 'L’avocat arrive en taxi, cite trois articles de loi, et les inspecteurs repartent. Pour cette fois.',
            suite: { fin: 'avocat' },
          },
        ],
      },
    },
    fins: { visite: {}, normes: {}, avocat: {}, oubliee: {} },
  },
  {
    id: 'portrait',
    titre: 'Un portrait dans le Nachtblad',
    genre: 'suite',
    premiere: 'interview',
    etapes: {
      interview: {
        heure: H(15),
        titre: 'Un portrait dans le Nachtblad',
        texte:
          'Une journaliste du Nachtblad, carnet à spirale et béret, voudrait faire ton portrait : « Les nouvelles figures de la nuit. Une photo au salon, deux ou trois anecdotes… et quelques noms de clients, si vous en avez. »',
        enCours: 'Le Nachtblad voudrait faire ton portrait.',
        condition: { relationMin: { presse: R.bons } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Accepter, en pleine lumière',
            detail: 'Réputation et touristes en hausse ; les clients discrets tiquent',
            effet: { reputation: 2, satisfaction: { touriste: 4, affaires: -3 }, relations: { presse: 5 } },
            journal: 'Ta photo au salon fait la page trois du Nachtblad : « {joueur}, la nuit lui va si bien. »',
            suite: { fin: 'portrait' },
          },
          {
            texte: 'Accepter, sans un seul nom',
            detail: 'Un portrait élégant ; les clients d’affaires apprécient ta discrétion',
            effet: { reputation: 1, satisfaction: { affaires: 3 }, relations: { presse: 2 } },
            journal: 'Le portrait paraît, sans un nom de client. La journaliste écrit : « Une tombe, et une tombe élégante. »',
            suite: { fin: 'discret' },
          },
          {
            texte: 'Décliner',
            detail: 'Pas de vagues ; la journaliste s’en souviendra',
            effet: { relations: { presse: -5 } },
            journal: 'La journaliste referme son carnet à spirale. « Dommage. Vous auriez fait une belle page. »',
            suite: { fin: 'refus' },
          },
        ],
      },
    },
    fins: { portrait: {}, discret: {}, refus: {}, oubliee: {} },
  },
  {
    id: 'fuite',
    titre: 'Une fuite dans la presse',
    genre: 'suite',
    premiere: 'article',
    etapes: {
      article: {
        heure: H(11),
        titre: 'Une fuite dans la presse',
        texte:
          'Un journal à scandale publie une photo floue du quai : « Quel député sort de chez {maison} à trois heures du matin ? » Personne n’est reconnaissable, mais tout le monde cherche.',
        enCours: 'Un journal à scandale rôde autour de la maison.',
        condition: { relationMax: { presse: R.mauvais } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Démentir par la voix d’un avocat',
            detail: `−${euros(Q.fuiteAvocat)} ; les clients discrets se sentent protégés`,
            effet: { argent: -Q.fuiteAvocat, satisfaction: { affaires: 3 }, relations: { presse: 4 }, juridique: true },
            journal: 'Une lettre d’avocat sur papier crème, et le journal publie un rectificatif en page onze.',
            suite: { fin: 'avocat' },
          },
          {
            texte: 'Se taire et attendre',
            detail: 'Les clients d’affaires s’inquiètent ; ça passera',
            effet: { satisfaction: { affaires: -6 }, reputation: -1 },
            journal: 'Tu ne dis rien. Pendant quelques soirs, les costumes-cravates entrent en baissant la tête.',
            suite: { fin: 'silence' },
          },
          {
            texte: 'Offrir une exclusivité à un journal sérieux',
            detail: 'Une interview sans nom : la presse t’en sait gré, les clients discrets un peu moins',
            effet: { relations: { presse: 10 }, satisfaction: { affaires: -2 } },
            journal: '« Nuits d’Amsterdam » publie ton interview : pas un nom, beaucoup d’esprit. Le scandale retombe.',
            suite: { fin: 'exclusivite' },
          },
        ],
      },
    },
    fins: { avocat: {}, silence: {}, exclusivite: {}, oubliee: {} },
  },
  {
    id: 'agentQuartier',
    titre: 'L’agent Visser',
    genre: 'suite',
    premiere: 'tuyau',
    etapes: {
      tuyau: {
        heure: H(18),
        titre: 'L’agent Visser passe',
        texte:
          'L’agent Visser freine devant la porte, un pied sur le pavé : « Une bande de pickpockets travaille les quais ces soirs-ci. Je dis ça, je dis rien. » Il repart en faisant tinter sa sonnette.',
        enCours: 'L’agent Visser a quelque chose à te dire.',
        condition: { relationMin: { police: R.bons } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Louer un portier pour la soirée',
            detail: `−${euros(Q.portierSoir)} ; les touristes se sentent en sécurité`,
            effet: { argent: -Q.portierSoir, satisfaction: { touriste: 3 }, relations: { police: 3 } },
            journal: 'Un portier en manteau long surveille le quai. Les pickpockets vont tenter leur chance ailleurs.',
            suite: { fin: 'portier' },
          },
          {
            texte: 'Prévenir les clients à l’entrée',
            detail: 'Gratuit ; certains trouvent l’ambiance un peu refroidie',
            effet: { satisfaction: { touriste: -1, affaires: 1 }, relations: { police: 2 } },
            journal: 'Un petit panneau à l’entrée : « Gardez vos portefeuilles près du cœur. » Les habitués sourient.',
            suite: { fin: 'panneau' },
          },
          {
            texte: 'Lui offrir un café pour la route',
            detail: 'L’agent Visser apprécie ; les pickpockets, eux, restent',
            effet: { relations: { police: 5 }, satisfaction: { touriste: -2 } },
            journal: 'L’agent Visser boit son café sur le perron. Plus tard, deux touristes cherchent leur portefeuille.',
            suite: { fin: 'cafe' },
          },
        ],
      },
    },
    fins: { portier: {}, panneau: {}, cafe: {}, oubliee: {} },
  },
  {
    id: 'controle',
    titre: 'Contrôle devant la porte',
    genre: 'suite',
    premiere: 'barrage',
    etapes: {
      barrage: {
        heure: H(21, 30),
        titre: 'Contrôle devant la porte',
        texte:
          'Deux fourgons se garent sur le quai, gyrophares éteints mais bien visibles. Des agents contrôlent les papiers de tout ce qui approche de {maison}. Les passants changent de trottoir.',
        enCours: 'Le commissariat garde un œil sur la maison.',
        condition: { relationMax: { police: R.mauvais } },
        sinon: { fin: 'oubliee' },
        choix: [
          {
            texte: 'Coopérer, sourire aux lèvres',
            detail: 'Beaucoup moins de clients ce soir ; la police note ta bonne volonté',
            effet: { affluenceSoir: R.controleAffluence, relations: { police: 8 } },
            journal: 'Tu apportes du café aux agents. Le contrôle dure deux heures ; le quai reste désert.',
            suite: { fin: 'cooperation' },
          },
          {
            texte: 'Faire entrer les clients par la porte de service',
            detail: 'Personne n’en saura rien… sauf si la police le voit',
            chance: 0.6,
            effet: { satisfaction: { affaires: 2 } },
            journal: 'Les clients passent par la ruelle, un doigt sur les lèvres. Les agents n’y voient que du feu.',
            echec: { relations: { police: -10 }, reputation: -1, affluenceSoir: R.controleAffluence },
            journalEchec: 'Un agent fait le tour du pâté de maisons et tombe sur la file de la ruelle. Il sort son carnet.',
            suite: { fin: 'ruelle' },
          },
          {
            texte: 'Appeler un avocat',
            detail: `−${euros(Q.controleAvocat)} ; le contrôle est levé, le commissariat grince des dents`,
            effet: { argent: -Q.controleAvocat, relations: { police: -4 }, juridique: true },
            journal: 'Ton avocat arrive en vingt minutes et parle de « harcèlement d’un commerce en règle ». Les fourgons repartent.',
            suite: { fin: 'avocat' },
          },
        ],
      },
    },
    fins: { cooperation: {}, ruelle: {}, avocat: {}, oubliee: {} },
  },
];
