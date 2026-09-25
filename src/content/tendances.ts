// Tendances de la semaine : un contexte qui change la demande, annoncé au briefing du lundi.
// Les effets chiffrés sont dans balance.ts (TENDANCES_EFFETS).

export interface DefinitionTendance {
  id: string;
  nom: string;
  /** Ce qui se passe, dit simplement. */
  texte: string;
  /** Le conseil de Josée, en une phrase. */
  josee: string;
}

export const TENDANCES: DefinitionTendance[] = [
  {
    id: 'congres',
    nom: 'Congrès médical au RAI',
    texte: 'Huit mille médecins en ville. Les clients d’affaires affluent, pressés comme jamais.',
    josee: 'Des gens qui opèrent à 8 h n’attendent pas sur un quai, et leurs notes de frais ne regardent pas les prix.',
  },
  {
    id: 'match',
    nom: 'Match européen à l’Arena',
    texte: 'Les supporters débarquent par cars entiers. Les groupes doublent, le quai s’échauffe.',
    josee: 'Un portier ne serait pas du luxe. Ou alors, du stock au bar et des nerfs solides.',
  },
  {
    id: 'hauteSaison',
    nom: 'Haute saison',
    texte: 'Les bateaux-mouches sont pleins, les vélos de location aussi. Les touristes se bousculent.',
    josee: 'Ils sont nombreux, bruyants et pas bien riches. Un portier trierait le bon grain de l’ivraie.',
  },
  {
    id: 'greve',
    nom: 'Grève des trains',
    texte: 'Plus un train à la gare centrale. Touristes et groupes restent coincés à Schiphol.',
    josee: 'Semaine creuse. Brader ne remplira pas la maison : vends plutôt une soirée complète, ou une bouteille, à ceux qui viennent.',
  },
  {
    id: 'salon',
    nom: 'Salon de l’horticulture',
    texte: 'Des acheteurs de tulipes du monde entier, carte de crédit d’entreprise en poche.',
    josee: 'Les notes de frais adorent le champagne. Et elles ne regardent pas les prix.',
  },
  {
    id: 'pluie',
    nom: 'Une semaine de pluie',
    texte: 'Il pleut sans arrêt sur les canaux. Les passants se font rares, les habitués cherchent un refuge.',
    josee: 'Quand il pleut, on reste entre soi. Choie tes habitués, les autres ne viendront pas.',
  },
  {
    id: 'paie',
    nom: 'Fin du mois',
    texte: 'Les salaires sont tombés. Les habitués ont le portefeuille garni et l’envie de se faire plaisir.',
    josee: 'Les fidèles reviennent. Une soirée feutrée, et ils te le rendront.',
  },
  {
    id: 'evg',
    nom: 'Saison des enterrements de vie de garçon',
    texte: 'Tutus, couronnes gonflables et chansons à boire : les bandes de copains envahissent le quartier.',
    josee: 'Beaucoup de bruit, beaucoup de bière. Le bar va chauffer.',
  },
  {
    id: 'controles',
    nom: 'Contrôles de police dans le quartier',
    texte: 'Des patrouilles à chaque coin de rue. Rien d’illégal ici, mais les clients discrets préfèrent rester chez eux.',
    josee: 'Semaine calme. Garde tes prix, repose l’équipe et fais durer le plaisir de ceux qui viennent quand même.',
  },
];

export function trouverTendance(id: string): DefinitionTendance | undefined {
  return TENDANCES.find((t) => t.id === id);
}
