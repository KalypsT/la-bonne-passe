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

export const INTRIGUES: DefinitionIntrigue[] = [
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
            effet: { argent: -B.VOISIN.arrangement },
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
            echec: { argent: -B.VOISIN.amende, reputation: -3 },
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
];

export function trouverIntrigue(id: string): DefinitionIntrigue | undefined {
  return INTRIGUES.find((i) => i.id === id);
}
