// Soirées à thème : programmées au briefing, une soirée à la fois.
// Les effets chiffrés sont dans balance.ts (THEMES).

export interface DefinitionTheme {
  id: string;
  nom: string;
  /** Ce que le joueur voit avant de choisir : ce que ça attire, ce que ça coûte. */
  effet: string;
  /** Au journal, à l'ouverture. */
  annonce: string;
  /** L'avis de Josée. */
  josee: string;
  /** Couleurs du salon ce soir-là (décor SVG). */
  couleurs: { principale: string; accent: string };
}

export const THEMES_SOIREE: DefinitionTheme[] = [
  {
    id: 'masquee',
    nom: 'Soirée masquée',
    effet: 'Loups de velours et anonymat garanti. Attire les clients d’affaires, qui adorent ne pas être reconnus.',
    annonce: 'Soirée masquée : les loups de velours attendent sur un plateau à l’entrée.',
    josee: 'Derrière un masque, un banquier redevient un homme. Un homme qui dépense.',
    couleurs: { principale: '#1C1C22', accent: '#D4A64A' },
  },
  {
    id: 'burlesque',
    nom: 'Soirée burlesque',
    effet: 'Plumes, paillettes et fous rires. Beaucoup de monde, touristes et groupes surtout ; l’équipe finit sur les rotules.',
    annonce: 'Soirée burlesque : les plumes volent jusque sur le quai.',
    josee: 'Ça remplit, ça rit, ça crie. Les habitués, eux, trouvent qu’on n’entend plus la musique.',
    couleurs: { principale: '#8C2640', accent: '#FF4F8B' },
  },
  {
    id: 'jazz',
    nom: 'Soirée jazz',
    effet: 'Un trio au salon, lumières tamisées. Les habitués reviennent, le quai reste calme, l’équipe souffle un peu.',
    annonce: 'Soirée jazz : le trio accorde sa contrebasse au salon.',
    josee: 'Le jazz, c’est pour ceux qui restent. Et ceux qui restent reviennent.',
    couleurs: { principale: '#1C2A44', accent: '#5FA3A8' },
  },
  {
    id: 'anneesFolles',
    nom: 'Années folles',
    effet: 'Charleston, franges et coupes de champagne. Du monde partout, le bar tourne à plein ; l’équipe danse jusqu’à l’épuisement.',
    annonce: 'Années folles : le gramophone crache du charleston, les franges s’agitent.',
    josee: 'Mille neuf cent vingt-six, la meilleure année de ma grand-mère. Surveille la cave, elle va se vider.',
    couleurs: { principale: '#2A1812', accent: '#E8B45A' },
  },
];

export function trouverTheme(id: string): DefinitionTheme | undefined {
  return THEMES_SOIREE.find((t) => t.id === id);
}
