// Intrigues : des chaînes de cartes sur plusieurs jours, avec des conditions et des conséquences différées.
// Voir « Événements et intrigues » dans les spécifications.
//
// Une intrigue démarre un matin quand son déclencheur est rempli ; chaque étape tombe à son heure, un jour donné.
// À l'échéance, une étape peut vérifier une condition : si elle n'est plus remplie, l'intrigue prend l'issue `sinon`.
// Une « suite » est une intrigue courte, démarrée par un choix (d'imprévu ou d'intrigue) quelques jours plus tard.
//
// Les textes acceptent {prenom} (la personne concernée), {joueur}, {maison}, et les accords {e} et {Il}.

import * as B from './balance';
import type { EffetCarte } from './effets';
import { SUITES } from './suites';

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;

export interface ConditionIntrigue {
  palierMin?: number;
  /** Tapage du quartier, au moins ou au plus. */
  tapageMin?: number;
  tapageMax?: number;
  /** Cette personne fait partie de l'équipe (identifiant). */
  employe?: string;
  /** Pas avant ce jour de jeu. */
  jourMin?: number;
  /** La personne concernée (arc personnel) : moral au moins ou au plus. */
  moralMin?: number;
  moralMax?: number;
  /** La personne concernée a travaillé au moins tant de nuits. */
  nuitsMin?: number;
  /** La période d'essai de la personne concernée est finie. */
  confirme?: boolean;
  /** Points que l'intrigue a gardés en mémoire (voir l'effet `points`), au moins ou au plus. */
  pointsMin?: number;
  pointsMax?: number;
}

/** Ce qui suit un choix : une autre étape dans tant de jours, ou la fin de l'intrigue. */
export type Issue = { etape: string; delai: number } | { fin: string };

export interface ChoixIntrigue {
  texte: string;
  detail: string;
  effet: EffetCarte;
  journal: string;
  suite: Issue;
  /** Choix risqué : réussite avec cette probabilité, sinon `echec` et `suiteEchec`. */
  chance?: number;
  echec?: EffetCarte;
  journalEchec?: string;
  suiteEchec?: Issue;
}

export interface EtapeIntrigue {
  /** Heure de la carte (minutes depuis minuit). Une heure de soirée attend que la maison soit ouverte. */
  heure: number;
  titre: string;
  texte: string;
  /** Où en est l'histoire, dans l'onglet Journal, en attendant cette carte. */
  enCours: string;
  /** Vérifiée à l'échéance : si elle n'est pas remplie, la carte ne sort pas et l'intrigue prend l'issue `sinon`. */
  condition?: ConditionIntrigue;
  sinon?: Issue;
  choix: ChoixIntrigue[];
}

export interface FinIntrigue {
  /** Le dénouement, au journal et sur la carte. Absent : la suite se termine sans bruit. */
  texte?: string;
}

export interface DefinitionIntrigue {
  id: string;
  titre: string;
  /** Une intrigue démarre seule, une fois par partie ; une suite est démarrée par un choix, et peut revenir. */
  genre: 'intrigue' | 'suite';
  declencheur?: ConditionIntrigue;
  premiere: string;
  etapes: Record<string, EtapeIntrigue>;
  fins: Record<string, FinIntrigue>;
}

const H = (h: number, m = 0) => h * 60 + m;

export const INTRIGUES_PRINCIPALES: DefinitionIntrigue[] = [
  {
    id: 'voisin',
    titre: 'Le voisin du dessus',
    genre: 'intrigue',
    declencheur: { palierMin: 2, tapageMin: B.TAPAGE.plainte },
    premiere: 'plainte',
    etapes: {
      plainte: {
        heure: H(11),
        titre: 'Le voisin du dessus',
        texte:
          'On sonne. Sur le perron, monsieur Bakker, le voisin du dessus, en robe de chambre et bonnet de nuit : « Cette nuit, une chorale de supporters a chanté sous ma fenêtre jusqu’à quatre heures. Je suis violoncelliste, {joueur}. Retraité, mais violoncelliste. »',
        enCours: 'Monsieur Bakker, le voisin du dessus, n’a pas fermé l’œil de la nuit.',
        choix: [
          {
            texte: 'S’excuser, une bouteille à la main',
            detail: `−${euros(B.VOISIN.bouteille)}, et le quartier se calme un peu`,
            effet: { argent: -B.VOISIN.bouteille, tapage: -15 },
            journal: 'Monsieur Bakker repart avec une bouteille de porto et la promesse d’un quai plus calme.',
            suite: { etape: 'sonometre', delai: 3 },
          },
          {
            texte: 'Lui rappeler où il habite',
            detail: 'Rien ne change. Il reviendra',
            effet: {},
            journal: '« C’est un quartier vivant, monsieur Bakker. » Il remonte l’escalier en marmonnant quelque chose sur Mozart.',
            suite: { etape: 'sonometre', delai: 2 },
          },
          {
            texte: 'L’inviter à passer un soir',
            detail: 'Il pourrait adorer. Ou très mal le prendre',
            chance: 0.5,
            effet: { satisfaction: { habitue: 3 } },
            journal: 'Monsieur Bakker hésite, puis accepte « un porto, un seul ».',
            suite: { fin: 'invite' },
            echec: {},
            journalEchec: '« Moi ? Chez vous ? » Monsieur Bakker s’étrangle et claque sa porte, deux étages plus haut.',
            suiteEchec: { etape: 'avocat', delai: 3 },
          },
        ],
      },
      sonometre: {
        heure: H(23),
        titre: 'Le sonomètre',
        texte:
          'Monsieur Bakker est sur le quai, en pyjama, un sonomètre à bout de bras. Il note les décibels dans un carnet à spirale et te montre l’écran : 81. « Plus qu’un marteau-piqueur, {joueur}. »',
        enCours: 'Monsieur Bakker guette le bruit du quai. S’il reste fort, il redescendra.',
        condition: { tapageMin: B.TAPAGE.recidive },
        sinon: { fin: 'apaise' },
        choix: [
          {
            texte: 'Faire rentrer tout le monde',
            detail: 'Le quai se calme ; les groupes, eux, boudent',
            effet: { tapage: -25, satisfaction: { groupe: -2 } },
            journal: 'Tout le monde à l’intérieur, fenêtres fermées. Les groupes chantent plus bas. Un peu.',
            suite: { etape: 'avocat', delai: 4 },
          },
          {
            texte: 'Insonoriser le salon',
            detail: `${euros(B.VOISIN.insonorisation)} de travaux ; le bruit portera deux fois moins, pour de bon`,
            effet: { travaux: B.VOISIN.insonorisation, insonoriser: true, tapage: -20 },
            journal: 'Laine de roche, double vitrage et rideaux épais : les ouvriers attaquent le salon dès demain.',
            suite: { fin: 'insonorise' },
          },
          {
            texte: 'Lui tendre des bouchons d’oreille',
            detail: 'Il n’a aucun humour. Ou peut-être que si',
            chance: 0.35,
            effet: { reputation: 1 },
            journal: 'Il regarde les bouchons, puis toi, puis éclate de rire. « Touché. »',
            suite: { fin: 'rire' },
            echec: {},
            journalEchec: 'Monsieur Bakker range les bouchons dans la poche de son pyjama, sans un mot. Mauvais signe.',
            suiteEchec: { etape: 'avocat', delai: 2 },
          },
        ],
      },
      avocat: {
        heure: H(11),
        titre: 'Une lettre recommandée',
        texte:
          'Le facteur apporte une lettre recommandée adressée à « {maison} ». Maître De Vries, avocate de monsieur Bakker, y parle de « nuisances sonores répétées » et d’une procédure, « si rien ne change ».',
        enCours: 'Monsieur Bakker a pris une avocate. Si le quai ne se calme pas, elle écrira.',
        condition: { tapageMin: B.TAPAGE.recidive },
        sinon: { fin: 'apaise' },
        choix: [
          {
            texte: 'Proposer un arrangement',
            detail: `−${euros(B.VOISIN.arrangement)}, et l’affaire est close`,
            effet: { argent: -B.VOISIN.arrangement, juridique: true },
            journal: 'Tu signes un chèque à l’ordre de monsieur Bakker, « pour le préjudice ».',
            suite: { fin: 'arrangement' },
          },
          {
            texte: 'Insonoriser le salon',
            detail: `${euros(B.VOISIN.insonorisation)} de travaux ; plus rien ne filtrera`,
            effet: { travaux: B.VOISIN.insonorisation, insonoriser: true, tapage: -20 },
            journal: 'Tu réponds à Maître De Vries par un devis d’insonorisation. Signé.',
            suite: { fin: 'insonorise' },
          },
          {
            texte: 'Laisser venir',
            detail: `Du bluff, sans doute. Sinon, ${euros(B.VOISIN.amende)} d’amende et un article`,
            chance: 0.5,
            effet: {},
            journal: 'Tu ranges la lettre dans un tiroir. Et tu attends.',
            suite: { fin: 'bluff' },
            echec: { argent: -B.VOISIN.amende, reputation: -3, juridique: true },
            journalEchec: `Le tribunal donne raison à monsieur Bakker : ${euros(B.VOISIN.amende)} d’amende.`,
            suiteEchec: { fin: 'condamne' },
          },
        ],
      },
    },
    fins: {
      apaise: { texte: 'Le quai s’est calmé. Monsieur Bakker a rangé son sonomètre ; le dimanche, on l’entend de nouveau jouer du violoncelle.' },
      invite: { texte: 'Monsieur Bakker est venu, a bu son porto au salon et a trouvé l’équipe « charmante ». Il reviendra le jeudi.' },
      insonorise: { texte: 'Le salon ne laisse plus rien filtrer. Monsieur Bakker a glissé une carte de remerciement sous la porte.' },
      rire: { texte: 'Monsieur Bakker a gardé les bouchons. Il dit qu’il dort comme un bébé, et qu’il te doit un concert.' },
      arrangement: { texte: 'Monsieur Bakker s’est offert un archet neuf. La paix a un prix, et il est affiché.' },
      bluff: { texte: 'Aucune nouvelle de Maître De Vries. Monsieur Bakker te salue de nouveau dans l’escalier, du bout des lèvres.' },
      condamne: { texte: 'Condamnation et entrefilet dans le journal du quartier. Monsieur Bakker, lui, joue du violoncelle à sa fenêtre. Fort.' },
    },
  },
  {
    // Arc personnel de Mila : son ambition, être la tête d'affiche.
    id: 'mila',
    titre: 'Mila, la tête d’affiche',
    genre: 'intrigue',
    declencheur: { employe: 'mila', palierMin: 1, confirme: true, nuitsMin: B.ARC_MILA.nuits },
    premiere: 'affiche',
    etapes: {
      affiche: {
        heure: H(14),
        titre: 'Une affiche en vitrine',
        texte:
          'Mila pose un carton sur ton bureau : une affiche, elle en robe fuchsia, et en lettres dorées « Mila, ce soir ». « Dans la vitrine, {joueur}. C’est ce que font les grandes maisons. »',
        enCours: 'Mila rêve de voir son nom en vitrine.',
        choix: [
          {
            texte: 'L’afficher en vitrine',
            detail: `−${euros(B.ARC_MILA.affiche)} d’impression ; Mila rayonne, le reste de l’équipe tique`,
            effet: { points: 1, argent: -B.ARC_MILA.affiche, moral: 12, loyaute: 5, moralEquipe: -3, satisfaction: { touriste: 2 } },
            journal: 'L’affiche de Mila trône dans la vitrine. Les passants ralentissent ; dans la loge, on lève les yeux au ciel.',
            suite: { etape: 'magazine', delai: 4 },
          },
          {
            texte: '« Ici, tout le monde est à l’affiche »',
            detail: 'L’équipe apprécie ; Mila, beaucoup moins',
            effet: { points: -1, moral: -10, loyaute: -4, moralEquipe: 3 },
            journal: 'Mila reprend son carton sans un mot. Au salon, on t’adresse des sourires.',
            suite: { etape: 'magazine', delai: 5 },
          },
          {
            texte: '« Fais tes preuves, et on en reparle »',
            detail: 'Elle se vexe un peu, et se met au travail',
            effet: { moral: -4, fatigue: 5 },
            journal: 'Mila hausse un sourcil. Ce soir-là, elle ne s’assoit pas une seule fois.',
            suite: { etape: 'magazine', delai: 4 },
          },
        ],
      },
      magazine: {
        heure: H(21, 30),
        titre: 'Un photographe au salon',
        texte:
          'Un photographe du Nachtblad s’installe au salon, objectif braqué sur Mila : « Pour notre dossier, les nouvelles reines du canal. Avec le nom de la maison, bien sûr. »',
        enCours: 'Mila attend son heure de gloire.',
        choix: [
          {
            texte: 'Oui, en pleine lumière',
            detail: 'Réputation et touristes en hausse ; les clients discrets n’aiment pas les flashs',
            effet: { points: 1, reputation: 2, satisfaction: { touriste: 4, affaires: -5 }, moral: 10 },
            journal: 'Mila pose sur le canapé de velours, le nom de {maison} bien lisible derrière elle.',
            suite: { etape: 'part', delai: 5 },
          },
          {
            texte: 'Oui, mais sans le nom de la maison',
            detail: 'Un compromis : Mila est contente à moitié',
            effet: { moral: 4, reputation: 0.5 },
            journal: 'Le photographe cadre serré sur Mila. La maison reste dans le flou, comme il se doit.',
            suite: { etape: 'part', delai: 5 },
          },
          {
            texte: 'Pas de photographe ici',
            detail: 'Les clients discrets te remercient ; Mila boude',
            effet: { points: -1, moral: -12, loyaute: -6, satisfaction: { affaires: 3 } },
            journal: 'Tu raccompagnes le photographe jusqu’au quai. Mila, elle, claque la porte de la loge.',
            suite: { etape: 'part', delai: 3 },
          },
        ],
      },
      part: {
        heure: H(16),
        titre: 'Mila fait ses comptes',
        texte: `Mila s’assoit sur ton bureau, un carnet à la main : « Un tiers des réservations se font à mon nom. J’ai compté. Je veux ${Math.round(B.ARC_MILA.part * 100)} % sur chaque rendez-vous. Et je ne le redemanderai pas. »`,
        enCours: 'Mila a une question d’argent à te poser.',
        choix: [
          {
            texte: `Accepter ${Math.round(B.ARC_MILA.part * 100)} %`,
            detail: 'La maison gagne moins sur ses rendez-vous ; Mila se sent reconnue',
            effet: { partMin: B.ARC_MILA.part, moral: 10, loyaute: 10 },
            journal: `Mila garde désormais ${Math.round(B.ARC_MILA.part * 100)} %. Elle referme son carnet avec un petit claquement satisfait.`,
            suite: { etape: 'sacre', delai: 4 },
          },
          {
            texte: `Une prime à la place (${euros(B.ARC_MILA.prime)})`,
            detail: 'Un geste, sans engager l’avenir',
            effet: { argent: -B.ARC_MILA.prime, moral: 5 },
            journal: 'Mila empoche la prime. « C’est un début. »',
            suite: { etape: 'sacre', delai: 4 },
          },
          {
            texte: 'Refuser',
            detail: 'Moral et loyauté en baisse : elle pourrait partir',
            effet: { moral: -15, loyaute: -10 },
            journal: 'Mila range son carnet, lentement, sans te quitter des yeux.',
            suite: { etape: 'valise', delai: 3 },
          },
        ],
      },
      sacre: {
        heure: H(22),
        titre: 'Mila, ce soir',
        texte:
          'Trois habitués ont demandé Mila par son prénom avant même d’enlever leur manteau. Entre deux rendez-vous, elle a laissé la meilleure place du salon à une collègue. Elle te fait un clin d’œil.',
        enCours: 'Mila attend de voir si la maison croit en elle.',
        condition: { moralMin: 45 },
        sinon: { fin: 'amere' },
        choix: [
          {
            texte: 'Lui dire qu’elle est la tête d’affiche',
            detail: 'Elle devient Tête d’affiche : les habitués viennent pour elle',
            effet: { ajouterTrait: 'Tête d’affiche', retirerTrait: 'Diva', moral: 10, loyaute: 10 },
            journal: 'Mila ne dit rien. Elle sourit, pour une fois sans calcul.',
            suite: { fin: 'tete' },
          },
          {
            texte: 'Lui demander de former les autres',
            detail: 'Conversation +1 pour Mila, moral de l’équipe en hausse',
            effet: { talent: { conversation: 1 }, retirerTrait: 'Diva', moralEquipe: 5, loyaute: 8 },
            journal: 'Mila réunit l’équipe au salon : « Leçon numéro un : on ne regarde jamais sa montre. »',
            suite: { fin: 'mentor' },
          },
        ],
      },
      valise: {
        heure: H(11),
        titre: 'La valise de Mila',
        texte: 'Une valise fuchsia attend dans l’entrée. Mila enfile ses lunettes de soleil : « J’ai trouvé une maison qui sait ce que je vaux. Tu as jusqu’à ce soir. »',
        enCours: 'Mila n’a pas digéré ton refus.',
        // Elle part si, tout au long de l'histoire, la maison ne l'a jamais mise en avant.
        condition: { pointsMax: 0 },
        sinon: { fin: 'rentree' },
        choix: [
          {
            texte: `La retenir : ${Math.round(B.ARC_MILA.part * 100)} % et l’affiche`,
            detail: `−${euros(B.ARC_MILA.affiche)}, sa part monte, elle reste`,
            effet: { partMin: B.ARC_MILA.part, argent: -B.ARC_MILA.affiche, moral: 25, loyaute: 5 },
            journal: 'Mila défait sa valise, lentement, pour que tout le monde la voie faire.',
            suite: { fin: 'retenue' },
          },
          {
            texte: 'La laisser partir',
            detail: 'Mila s’en va, et quelques habitués avec elle',
            effet: { depart: true },
            journal: 'Mila s’en va sans se retourner. La valise fuchsia disparaît au coin du quai.',
            suite: { fin: 'partie' },
          },
        ],
      },
    },
    fins: {
      tete: { texte: 'Mila est la tête d’affiche de {maison}. Les habitués viennent pour elle, et elle ne parle plus de la chambre du fond.' },
      mentor: { texte: 'Mila a trouvé mieux que la gloire : un public. Toute l’équipe a appris ses tours, et elle en est fière.' },
      amere: { texte: 'Mila est restée, mais le cœur n’y est plus. Elle fait son travail, sans plus.' },
      rentree: { texte: 'Mila a rangé sa valise d’elle-même. Elle ne l’avouera jamais, mais elle se plaît ici.' },
      retenue: { texte: 'Mila est restée, plus chère et plus fière. L’affiche est de retour dans la vitrine.' },
      partie: { texte: 'Mila est partie. Quelque part de l’autre côté du canal, une affiche fuchsia vient d’apparaître.' },
    },
  },
  {
    // Arc personnel de Jonas : son ambition, financer ses études de droit.
    id: 'jonas',
    titre: 'Jonas et ses examens',
    genre: 'intrigue',
    declencheur: { employe: 'jonas', palierMin: 1, confirme: true, nuitsMin: B.ARC_JONAS.nuits },
    premiere: 'livres',
    etapes: {
      livres: {
        heure: H(15),
        titre: 'Des livres dans la loge',
        texte:
          'Des manuels de droit s’empilent dans la loge, surlignés en trois couleurs. Jonas se gratte la nuque : « J’ai les partiels dans dix jours. Tu crois que je pourrais avoir un soir de repos pour réviser ? »',
        enCours: 'Jonas révise son droit entre deux rendez-vous.',
        choix: [
          {
            texte: 'Bien sûr, révise',
            detail: 'Un soir de repos à placer au planning sous 3 jours',
            effet: { points: 2, promesseRepos: true, moral: 8, loyaute: 4 },
            journal: 'Jonas te serre la main, gêné. « Je te revaudrai ça. »',
            suite: { etape: 'inscription', delai: 4 },
          },
          {
            texte: 'Réviser au salon, entre deux clients',
            detail: 'Il ne perd pas de soirée, mais il fatigue',
            effet: { points: 1, fatigue: 12, moral: 2 },
            journal: 'Jonas révise le droit des contrats sur le canapé de velours. Les clients trouvent ça charmant.',
            suite: { etape: 'inscription', delai: 4 },
          },
          {
            texte: 'Après les partiels, pas avant',
            detail: 'Moral en baisse : il révisera la nuit',
            effet: { moral: -8, fatigue: 8 },
            journal: 'Jonas acquiesce. La lumière de la loge reste allumée jusqu’à l’aube.',
            suite: { etape: 'inscription', delai: 4 },
          },
        ],
      },
      inscription: {
        heure: H(11),
        titre: 'Les frais d’inscription',
        texte: `Jonas te tend une facture de l’université, pliée en quatre : ${euros(B.ARC_JONAS.inscription)} avant vendredi. « Tu pourrais me les avancer ? Je rembourserai, promis. »`,
        enCours: 'Jonas a une facture à régler avant ses examens.',
        choix: [
          {
            texte: `Avancer ${euros(B.ARC_JONAS.inscription)}`,
            detail: 'Il remboursera… s’il réussit',
            effet: { points: 2, avance: B.ARC_JONAS.inscription, moral: 10, loyaute: 8 },
            journal: 'Tu glisses l’enveloppe à Jonas. Il la range dans son manuel de droit civil, page 212.',
            suite: { etape: 'resultats', delai: 6 },
          },
          {
            texte: 'Une prime de moitié, sans retour',
            detail: `−${euros(B.ARC_JONAS.inscription / 2)}, le reste, il le trouvera`,
            effet: { points: 1, argent: -B.ARC_JONAS.inscription / 2, moral: 5 },
            journal: 'Jonas accepte la moitié avec un sourire. Il fera des heures en plus au vestiaire d’un club.',
            suite: { etape: 'resultats', delai: 6 },
          },
          {
            texte: 'Pas d’avance',
            detail: 'Il se débrouillera, sa motivation en prend un coup',
            effet: { moral: -10, loyaute: -5 },
            journal: 'Jonas range la facture. « Je vais trouver. » Il n’a pas l’air d’y croire.',
            suite: { etape: 'resultats', delai: 6 },
          },
        ],
      },
      resultats: {
        heure: H(21),
        titre: 'Les résultats',
        texte:
          'Jonas débarque au salon, une enveloppe à la main et les yeux brillants : reçu, mention bien. Quelqu’un a déjà sorti les coupes. « Et maintenant, maître Jonas ? »',
        enCours: 'Jonas attend ses résultats. Des révisions au calme et un moral solide l’aideraient.',
        // Il réussit s'il a pu réviser et payer son inscription, et s'il garde le moral.
        condition: { moralMin: B.ARC_JONAS.moralReussite, pointsMin: B.ARC_JONAS.preparation },
        sinon: { etape: 'rate', delai: 1 },
        choix: [
          {
            texte: 'Champagne pour toute l’équipe',
            detail: `−${euros(B.ARC_JONAS.champagne)}, moral de l’équipe en hausse ; Jonas devient Juriste`,
            effet: { argent: -B.ARC_JONAS.champagne, moralEquipe: 6, ajouterTrait: 'Juriste', rembourser: true },
            journal: 'Les bouchons sautent au salon. Jonas promet de relire tous tes courriers, « même ceux de la banque ».',
            suite: { fin: 'juriste' },
          },
          {
            texte: 'Lui confier tes contrats',
            detail: 'Il devient Juriste, discrétion +1, loyauté en hausse',
            effet: { ajouterTrait: 'Juriste', talent: { discretion: 1 }, loyaute: 12, rembourser: true },
            journal: 'Jonas repart avec une pile de contrats sous le bras. Il a l’air ravi.',
            suite: { fin: 'contrats' },
          },
        ],
      },
      rate: {
        heure: H(11),
        titre: 'Raté, de peu',
        texte: 'Jonas est assis dans la loge, l’enveloppe ouverte sur les genoux. Recalé à l’écrit, à un point près. « J’étais trop fatigué. Je crois que je vais tout arrêter. »',
        enCours: 'Jonas attend ses résultats.',
        choix: [
          {
            texte: 'Il repassera : repos garanti',
            detail: 'Un soir de repos promis, moral en hausse',
            effet: { promesseRepos: true, moral: 12, loyaute: 6 },
            journal: 'Jonas range l’enveloppe. « Session d’automne. Cette fois, je dors. »',
            suite: { fin: 'rattrapage' },
          },
          {
            texte: 'Lui offrir la prochaine inscription',
            detail: `−${euros(B.ARC_JONAS.reinscription)}, il ne l’oubliera pas`,
            effet: { argent: -B.ARC_JONAS.reinscription, moral: 15, loyaute: 12 },
            journal: 'Jonas regarde le chèque, puis toi. Il ne trouve rien à dire, ce qui n’arrive jamais.',
            suite: { fin: 'rattrapage' },
          },
          {
            texte: '« Le droit, ce n’était peut-être pas pour toi »',
            detail: 'Il abandonne ; moral en berne',
            effet: { moral: -12, loyaute: -6 },
            journal: 'Jonas range ses manuels dans un carton. Le carton finit au fond de la loge.',
            suite: { fin: 'abandon' },
          },
        ],
      },
    },
    fins: {
      juriste: { texte: 'Maître Jonas relit désormais tous les courriers adressés à {maison}. Les avocats n’ont qu’à bien se tenir.' },
      contrats: { texte: 'Jonas a épluché tes contrats, trouvé deux clauses douteuses et un fournisseur trop gourmand. Il appelle ça « se faire la main ».' },
      rattrapage: { texte: 'Jonas repassera ses examens à l’automne. Il a punaisé le calendrier dans la loge.' },
      abandon: { texte: 'Jonas a rangé ses manuels. Il sourit toujours aux clients, un peu moins aux autres.' },
    },
  },
];

/** Toutes les intrigues, et les suites différées des imprévus. */
export const INTRIGUES: DefinitionIntrigue[] = [...INTRIGUES_PRINCIPALES, ...SUITES];

export function trouverIntrigue(id: string): DefinitionIntrigue | undefined {
  return INTRIGUES.find((i) => i.id === id);
}
