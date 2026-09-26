// Règles de la maison (palier 2) : noms, effets affichés avant de choisir, avis de Josée.
// Les valeurs sont dans balance.ts (TARIFS, FORMULES, SELECTIONS, PRIORITE_QUALITE).

import { VISIBILITES, type IdVisibilite } from './balance';
import type { IdFormule, IdPriorite, IdSelection } from './balance';

export interface TexteOption {
  nom: string;
  /** Libellé court, pour un bouton. */
  court: string;
  /** L'effet, dit franchement, avant de valider. */
  effet: string;
  /** L'avis de Josée, en une phrase. */
  josee: string;
}

/** Crans du tarif, dans l'ordre de TARIFS. */
export const TEXTES_TARIFS: TexteOption[] = [
  {
    nom: '−20 %',
    court: '−20 %',
    effet: '20 % de moins par rendez-vous. Les touristes accourent et patientent plus volontiers ; les affaires s’en moquent.',
    josee: 'Brader quand le quai déborde, c’est jeter l’argent par la fenêtre. Quand il est vide, en revanche…',
  },
  {
    nom: 'Normal',
    court: 'Normal',
    effet: 'Le prix du quartier. Personne ne s’en plaint, personne ne s’en vante.',
    josee: 'Le juste prix. Ce n’est pas excitant, c’est pour ça que ça marche.',
  },
  {
    nom: '+20 %',
    court: '+20 %',
    effet: '20 % de plus par rendez-vous. Les touristes fuient ou râlent, les clients d’affaires paient sans ciller.',
    josee: 'Les banquiers ne regardent jamais l’addition. Les touristes, eux, la prennent en photo.',
  },
];

export const TEXTES_FORMULES: Record<IdFormule, TexteOption> = {
  court: {
    nom: 'Rendez-vous court',
    court: 'Court',
    effet: 'Plus bref, 40 % moins cher, moins fatigant : chaque personne en reçoit un peu plus. Les pressés adorent, les habitués trouvent ça expéditif.',
    josee: 'Vite fait, bien fait, et au suivant. Les banquiers t’enverront des fleurs. Pas les poètes.',
  },
  standard: {
    nom: 'Rendez-vous classique',
    court: 'Classique',
    effet: 'Une heure environ, au prix habituel.',
    josee: 'Une heure, c’est le temps qu’il faut. Ni course, ni roman.',
  },
  champagne: {
    nom: 'Formule champagne',
    court: 'Champagne',
    effet: 'Un rendez-vous classique avec une bouteille du bar : 50 % plus cher. Les affaires et les groupes adorent ; touristes et habitués trouvent l’addition salée. Il faut un bar ouvert, tenu et approvisionné, sinon c’est un rendez-vous classique.',
    josee: 'Les bulles délient les langues et les portefeuilles. Surveille la cave, elle se vide vite.',
  },
  complete: {
    nom: 'Soirée complète',
    court: 'Complète',
    effet: 'Une heure et demie, 85 % plus cher, plus fatigant. Les habitués sont comblés ; les pressés passent leur chemin.',
    josee: 'Du temps, du champagne imaginaire et des confidences. Ça rapporte, mais les chambres tournent moins.',
  },
};

export const TEXTES_SELECTIONS: Record<IdSelection, TexteOption> = {
  laxiste: {
    nom: 'Laxiste',
    court: 'Laxiste',
    effet: 'Porte grande ouverte : plus de groupes, une ambiance de fête, plus de disputes. Les habitués et les affaires trouvent ça bruyant.',
    josee: 'Tout le monde entre, même ceux qui ne tiennent plus debout. Garde une serpillière à portée de main.',
  },
  normale: {
    nom: 'Normale',
    court: 'Normale',
    effet: 'On refuse ceux qui ne tiennent pas debout. Le reste entre.',
    josee: 'Un œil sur la porte, l’autre sur la caisse. Comme d’habitude.',
  },
  stricte: {
    nom: 'Stricte',
    court: 'Stricte',
    effet: 'Un portier loué 80 € par soir refuse une partie des groupes et des touristes. Maison calme, trois fois moins de disputes ; les refusés le prennent mal.',
    josee: 'Un portier en costume, ça calme les esprits. Et ça fait monter le standing, disent les habitués.',
  },
};

export const TEXTES_PRIORITES: Record<IdPriorite, TexteOption> = {
  arrivee: {
    nom: 'Ordre d’arrivée',
    court: 'Arrivée',
    effet: 'Premier arrivé, premier servi.',
    josee: 'La file d’attente, c’est la démocratie des gens pressés.',
  },
  habitues: {
    nom: 'Habitués d’abord',
    court: 'Habitués',
    effet: 'Un habitué passe devant tout le monde, et apprécie d’être reconnu. Les autres attendent un peu plus.',
    josee: 'Soigne ceux qui reviennent. Ceux qui passent, eux, ne reviendront pas de toute façon.',
  },
  presses: {
    nom: 'Pressés d’abord',
    court: 'Pressés',
    effet: 'Le client le moins patient passe en premier. Les affaires apprécient ; les autres patientent.',
    josee: 'Les pressés d’abord : ils partent vite, et le racontent encore plus vite.',
  },
};

/** Visibilité (v0.5) : comment la maison se fait connaître. Plus de monde, mais pas toujours le bon. */
export const TEXTES_VISIBILITES: Record<IdVisibilite, TexteOption> = {
  bouche: {
    nom: 'Bouche-à-oreille',
    court: 'Bouche',
    effet: 'Gratuit : les clients contents en parlent à leurs amis. Rien de plus.',
    josee: 'Le meilleur des publicitaires, c’est un client qui repart en sifflotant.',
  },
  site: {
    nom: 'Site discret',
    court: 'Site',
    effet: `${VISIBILITES.site.cout} € par soir : une page sobre, un numéro. Un peu plus de monde, surtout des clients d’affaires et des habitués.`,
    josee: 'Pas de photos, pas de prix, un numéro de téléphone. Les gens bien élevés savent lire entre les lignes.',
  },
  concierges: {
    nom: 'Concierges d’hôtel',
    court: 'Concierges',
    effet: `${VISIBILITES.concierges.cout} € par soir de commissions : les grands hôtels envoient clients d’affaires et touristes aisés. La mairie apprécie les maisons recommandées.`,
    josee: 'Un concierge, ça se soigne comme un vieux client. Une enveloppe à Noël, un sourire le reste de l’année.',
  },
  influenceurs: {
    nom: 'Influenceurs',
    court: 'Influenceurs',
    effet: `${VISIBILITES.influenceurs.cout} € par soir : beaucoup plus de monde, surtout des touristes et des groupes. La presse adore, les voisins moins, les clients discrets fuient les téléphones.`,
    josee: 'Trois cent mille abonnés, et pas un qui sache se tenir. Mais ils remplissent le quai.',
  },
};
