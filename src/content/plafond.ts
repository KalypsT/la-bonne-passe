// Textes du plafond de rendez-vous (v0.6) : crans du briefing, fatigue attendue, refus et négociations au cran 6.
// Le personnel travaille librement : il peut dire non, ou poser ses conditions.

type Genre = 'f' | 'm';
const e = (genre: Genre) => (genre === 'f' ? 'e' : '');

/** Aide sous les crans 2 à 6. */
export const AIDE_CRANS: Record<number, string> = {
  2: 'Personnel reposé, recettes limitées.',
  3: 'Raisonnable.',
  4: 'Rentable, et encore tenable.',
  5: 'Tout juste tenable. Au-delà de 4, chaque rendez-vous pèse sur le moral.',
  6: 'Au-delà de l’épuisement. Les plus fatigués peuvent refuser, ou négocier.',
};

/** État attendu en fin de nuit, accordé. */
export function etatFinDeNuit(fatigue: number, genre: Genre): string {
  if (fatigue > 80) return `épuisé${e(genre)}`;
  if (fatigue > 75) return 'à la limite';
  if (fatigue > 55) return `fatigué${e(genre)}`;
  return 'en forme';
}

export const TEXTES_PLAFOND = {
  finDeNuit: (fatigue: number, etat: string) => `fin de nuit ≈ ${Math.round(fatigue)} % : ${etat}`,
  pasRemis: (genre: Genre) => `, pas remis${e(genre)} demain`,
  primeAccepter: (prix: string) => `Payer ${prix}`,
  reposAccepter: 'Promettre un soir',
  resterACinq: 'Rester à 5',
  journalRefus: (prenom: string) => `${prenom} s’arrêtera à 5 rendez-vous ce soir.`,
  journalPrime: (prenom: string, montant: string) => `${prenom} fera ses 6 rendez-vous, contre une prime de ${montant}.`,
  journalRepos: (prenom: string) => `${prenom} fera ses 6 rendez-vous ; tu lui as promis un soir de repos.`,
};

type Replique = (prenom: string, genre: Genre) => string;

/** Refus net, selon le trait qui parle le plus fort. */
const REFUS: Record<string, Replique[]> = {
  Diva: [
    (p) => `${p} lève un sourcil parfait : « Six ? Je suis une artiste, pas une chaîne de montage. » Ce sera 5.`,
    (p) => `${p} referme son poudrier d’un coup sec : « Cinq, et je reste éblouissante. Six, et je ne garantis plus rien. »`,
  ],
  Solitaire: [
    (p) => `${p} secoue la tête sans un mot, puis lâche : « Cinq. Après, j’ai besoin de silence. »`,
    (p) => `${p} a déjà la tête ailleurs : « Je serai là pour cinq. Le sixième, trouve quelqu’un d’autre. »`,
  ],
  'Tête brûlée': [
    (p) => `${p} éclate de rire : « Six ? Et puis quoi encore, un septième gratuit ? » Ce sera 5, point.`,
    (p) => `${p} croise les bras : « J’ose tout, mais pas ça. Cinq, et tu me remercieras demain. »`,
  ],
  Fidèle: [
    (p, g) => `${p} baisse les yeux : « Je ne te lâche pas, tu le sais. Mais ce soir je suis vidé${e(g)}. Cinq. »`,
  ],
  'Mère poule': [
    (p) => `${p} te tapote la main : « Qui s’occupera des autres si je m’effondre ? Cinq, mon chou. »`,
  ],
  Fêtarde: [
    (p) => `${p} bâille à s’en décrocher la mâchoire : « Même moi, j’ai mes limites. Cinq, et je danse encore. »`,
  ],
  Ambitieuse: [
    (p) => `${p} calcule à voix haute : « Six, ce soir, c’est deux de moins demain. Cinq. C’est plus rentable, crois-moi. »`,
  ],
  autre: [
    (p, g) => `${p} te regarde droit dans les yeux : « Non. Ce soir, je suis trop fatigué${e(g)}. Je ferai 5. »`,
    (p) => `${p} soupire : « Cinq, pas un de plus. J’ai besoin d’une vie, aussi. »`,
  ],
};

/** Négociation : une prime. */
const PRIME: Record<string, Replique[]> = {
  Ambitieuse: [
    (p) => `${p} sourit, ravie d’avoir la main : « Six, d’accord. Contre une prime : j’ai un projet à financer. »`,
    (p) => `${p} tend la paume : « Un sixième ? Tout se négocie. Une prime, et c’est oui. »`,
  ],
  Diva: [(p) => `${p} examine ses ongles : « Six… pour une petite attention. Sonnante et trébuchante. »`],
  'Tête brûlée': [(p) => `${p} hausse les épaules : « Six, si tu allonges. Le courage, ça se paie. »`],
  autre: [
    (p) => `${p} hésite, puis pose ses conditions : « Six, d’accord, mais avec une prime ce soir. »`,
    (p) => `${p} fait la moue : « Je veux bien, mais je ne suis pas une machine. Une prime, et je reste. »`,
  ],
};

/** Négociation : un soir de repos promis. */
const REPOS: Record<string, Replique[]> = {
  'Mère poule': [(p) => `${p} soupire : « Six, pour toi. Mais promets-moi une soirée au calme cette semaine, que je m’occupe un peu de moi. »`],
  Solitaire: [(p) => `${p} marchande à mi-voix : « Six ce soir, si j’ai un soir entier pour moi dans les trois jours. »`],
  Fidèle: [(p) => `${p} acquiesce : « Je le fais. Mais tiens ta promesse : un soir de repos, bientôt. »`],
  autre: [
    (p) => `${p} accepte à une condition : « Six ce soir, et un soir de repos dans les trois jours. Promis ? »`,
    (p, g) => `${p} se frotte les yeux : « D’accord pour six, si je suis sûr${e(g)} de souffler bientôt. »`,
  ],
};

const ORDRE_TRAITS = ['Diva', 'Ambitieuse', 'Solitaire', 'Tête brûlée', 'Mère poule', 'Fidèle', 'Fêtarde'];

/** La réplique d'une personne au cran 6, selon sa réponse et ses traits ; varie d'un jour à l'autre. */
export function repliquePlafond(
  reponse: 'refuse' | 'negociePrime' | 'negocieRepos',
  employe: { prenom: string; genre: Genre; traits: string[] },
  jour: number,
): string {
  const table = reponse === 'refuse' ? REFUS : reponse === 'negociePrime' ? PRIME : REPOS;
  const trait = ORDRE_TRAITS.find((t) => employe.traits.includes(t) && table[t]) ?? 'autre';
  const liste = table[trait]!;
  return liste[jour % liste.length]!(employe.prenom, employe.genre);
}
