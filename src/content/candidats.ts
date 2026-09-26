// Candidats : les trois premiers, scénarisés, et les pièces pour composer ceux du marché du lundi.
// Tous adultes, tous libres : ils négocient, refusent et peuvent partir.

import type { DefinitionEmploye, Silhouette, Talent } from './personnel';

/** Une question d'entretien : sa réponse révèle un trait caché. */
export interface QuestionEntretien {
  question: string;
  reponse: string;
  trait: string;
}

export interface DefinitionCandidat extends Omit<DefinitionEmploye, 'moral' | 'loyaute' | 'fatigue' | 'part'> {
  intro: string;
  questions: QuestionEntretien[];
  /** Part minimale acceptée ; en dessous, le candidat fait une contre-proposition. */
  partMin: number;
}

/** Candidat scénarisé, avec son jour et son heure de visite (voir « Départ » dans les spécifications). */
export interface VisiteScenarisee {
  candidat: DefinitionCandidat;
  jour: number;
  heure: number;
}

export const MILA: DefinitionCandidat = {
  id: 'mila',
  prenom: 'Mila',
  age: 26,
  genre: 'f',
  accroche: 'Un regard qui désarme.',
  intro: 'Mila arrive avec vingt minutes de retard et des lunettes de soleil. Elle vient du Pink Palace, de l’autre côté du canal.',
  talents: { charme: 5, conversation: 2, audace: 3, discretion: 2 },
  traits: ['Diva', 'Ambitieuse'],
  ambition: 'affiche',
  questions: [
    { question: '« Pourquoi quitter le Pink Palace ? »', reponse: '« Ils m’ont donné la chambre du fond. Moi. La chambre du fond. »', trait: 'Diva' },
    { question: '« Tu te vois où, dans deux ans ? »', reponse: '« Dans ton fauteuil, peut-être. Sans vouloir te vexer. »', trait: 'Ambitieuse' },
  ],
  partMin: 0.5,
  silhouette: { teint: '#D9A07A', cheveux: '#2A1712', coiffure: 'longue', haut: '#FF4F8B', bas: '#FF4F8B', accent: '#2A1712', robe: true },
};

export const JONAS: DefinitionCandidat = {
  id: 'jonas',
  prenom: 'Jonas',
  age: 28,
  genre: 'm',
  accroche: 'Le gendre idéal, en mieux.',
  intro: 'Jonas se présente en chemise repassée, un bouquet pour Sanne à la main. Il sort d’une maison qui vient de fermer.',
  talents: { charme: 4, conversation: 4, audace: 2, discretion: 4 },
  traits: ['Solitaire', 'Fidèle'],
  ambition: 'etudes',
  questions: [
    { question: '« Qu’est-ce que tu fais de tes soirs de repos ? »', reponse: '« Je lis. Seul. Avec un chat. C’est un problème ? »', trait: 'Solitaire' },
    { question: '« Pourquoi ta maison a fermé ? »', reponse: '« Le patron est parti avec la caisse. Moi, je suis resté jusqu’au bout. »', trait: 'Fidèle' },
  ],
  partMin: 0.45,
  silhouette: { teint: '#E8B894', cheveux: '#6B4A2B', coiffure: 'courte', haut: '#F2E6D8', bas: '#2B2233', accent: '#D4A64A' },
};

export const INES: DefinitionCandidat = {
  id: 'ines',
  prenom: 'Inès',
  age: 31,
  genre: 'f',
  accroche: 'N’a peur de rien, sauf des pigeons.',
  intro: 'Inès entre en poussant la porte du pied, casque de scooter sous le bras. « On m’a dit que vous cherchiez du monde. »',
  talents: { charme: 3, conversation: 3, audace: 5, discretion: 2 },
  traits: ['Tête brûlée', 'Fêtarde'],
  ambition: 'ibiza',
  questions: [
    { question: '« Ta dernière soirée mémorable ? »', reponse: '« Un karaoké, trois pompiers et une fontaine. Je n’en dirai pas plus. »', trait: 'Fêtarde' },
    { question: '« Tu réagis comment face à un client lourd ? »', reponse: '« Je le raccompagne. Parfois par la fenêtre. Je plaisante. À moitié. »', trait: 'Tête brûlée' },
  ],
  partMin: 0.5,
  silhouette: { teint: '#8D5A3B', cheveux: '#140C0A', coiffure: 'courte', haut: '#1B1B24', bas: '#1B1B24', accent: '#D4A64A', robe: true },
};

/** Les trois premières visites, pendant la première semaine. */
export const VISITES_SCENARISEES: VisiteScenarisee[] = [
  { candidat: MILA, jour: 2, heure: 11 * 60 },
  { candidat: JONAS, jour: 2, heure: 15 * 60 },
  { candidat: INES, jour: 3, heure: 11 * 60 },
];

// ——— Pièces pour composer les candidats du marché ———

export const PRENOMS = {
  f: ['Lotte', 'Fenna', 'Noor', 'Yara', 'Esmée', 'Lina', 'Zoé', 'Mireille', 'Anouk', 'Saskia', 'Chloé', 'Priya', 'Amira', 'Roos'],
  m: ['Bram', 'Daan', 'Milan', 'Sem', 'Karim', 'Luuk', 'Théo', 'Ruben', 'Hugo', 'Jasper'],
};

export const AGE_MIN = 21;
export const AGE_MAX = 45;

export const ACCROCHES = [
  'Sourire en coin, répartie en poche.',
  'Parle quatre langues, dont celle des yeux.',
  'A tenu un bar à Rotterdam. Le bar a tenu aussi.',
  'Élégance naturelle, ponctualité discutable.',
  'Rit fort, écoute mieux.',
  'Ancienne danseuse, toujours en rythme.',
  'Étudie la philosophie le jour, tout le reste la nuit.',
  'Ne se vexe jamais. Enfin, presque.',
];

/** Candidate ou candidat remarquable, entré au salon pendant un imprévu. */
export const INTRO_VEDETTE = (prenom: string, genre: 'f' | 'm') =>
  `${prenom} a passé la soirée au bar à observer la maison. ${genre === 'f' ? 'Elle' : 'Il'} a travaillé dans les plus belles maisons de Paris, et ${genre === 'f' ? 'elle' : 'il'} le sait.`;

export const INTRO_DEBAUCHAGE = (prenom: string, genre: 'f' | 'm') =>
  `${prenom} arrive du Chat Noir, un foulard noir noué au poignet. « Colette Vos paie bien, mais elle ne dit jamais merci. On m’a dit qu’ici, si. » ${genre === 'f' ? 'Elle' : 'Il'} connaît déjà les habitués de l’autre rive.`;

export const INTROS = {
  annonce: (prenom: string) => `${prenom} a répondu à ta petite annonce. Le papier est encore plié dans sa poche.`,
  boucheAOreille: (prenom: string) => `${prenom} vient de la part d’une amie de Sanne. « Il paraît que la maison est correcte. »`,
};

/** Deux questions par trait : l'une ou l'autre peut être posée à un candidat du marché. */
export const QUESTIONS_PAR_TRAIT: Record<string, { question: string; reponse: string }[]> = {
  'Mère poule': [
    { question: '« Et si une collègue craque en pleine soirée ? »', reponse: '« Je lui fais un thé, je prends son client et on en parle après. »' },
  ],
  Fidèle: [
    { question: '« Combien de temps dans ta dernière maison ? »', reponse: '« Six ans. Jusqu’à ce qu’elle ferme. »' },
  ],
  Diva: [
    { question: '« Une chambre modeste, ça te va ? »', reponse: '« Modeste ? Tu veux dire… sans lustre ? »' },
  ],
  Ambitieuse: [
    { question: '« Qu’est-ce qui te fait lever le matin ? »', reponse: '« L’idée d’avoir un jour ma propre maison. Sans vouloir te vexer. »' },
  ],
  Solitaire: [
    { question: '« Tu t’entends bien avec tes collègues ? »', reponse: '« Oui. Surtout de loin. »' },
  ],
  'Tête brûlée': [
    { question: '« Ton plus gros souci dans une maison ? »', reponse: '« Un client m’a manqué de respect. Il s’en souvient encore. »' },
  ],
  Fêtarde: [
    { question: '« Tu finis tard, ça ne te gêne pas ? »', reponse: '« Finir ? Je commence à peine à minuit. »' },
  ],
};

/** Couleurs et coupes pour composer les silhouettes. */
export const PIECES_SILHOUETTE = {
  teints: ['#F4CFB0', '#F1C7A5', '#E8B894', '#D9A07A', '#C68A62', '#8D5A3B', '#6B4530'],
  cheveux: ['#140C0A', '#2A1712', '#5A3A22', '#8A5A2B', '#C8913E', '#D8B25A', '#B5482A'],
  coiffuresF: ['longue', 'courte', 'chignon'] as Silhouette['coiffure'][],
  coiffuresM: ['courte', 'courte', 'degarnie'] as Silhouette['coiffure'][],
  tenues: ['#7A1F35', '#1F5A4A', '#2E3F55', '#5B2A6E', '#141418', '#B01E3A', '#1F7A5C', '#F2E6D8'],
  accents: ['#D4A64A', '#FF4F8B', '#E8E0D0'],
};

/** Talents d'un candidat du marché : un point fort, le reste autour de 2 ou 3. */
export const TALENTS_MARCHE = { fortMin: 3, fortMax: 5, autresMin: 1, autresMax: 3 };
export const TALENTS_LISTE: Talent[] = ['charme', 'conversation', 'audace', 'discretion'];
