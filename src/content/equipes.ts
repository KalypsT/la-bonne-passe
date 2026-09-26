// Équipes Accueil et Sécurité, et assurance (v0.5, palier 3) : textes de l'interface et du journal.
// Valeurs dans balance.ts (EQUIPES, ASSURANCES).

import { ASSURANCES, EQUIPES } from './balance';

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;
const pct = (x: number) => `${Math.round(x * 100)} %`;
const TEXTES_NIVEAUX = ['aucune', 'la casse', 'la casse et les amendes'];

export const TEXTES_EQUIPES = {
  titre: 'Équipes de la maison',
  accueil: {
    nom: 'Accueil',
    role: `Reçoit les clients sur le quai : ${EQUIPES.accueil.patience} minutes de patience en plus par personne. Règle seule une partie des clients pressés et des groupes bruyants.`,
    effectif: (n: number) => `${n === 0 ? 'Personne' : n === 1 ? '1 personne' : `${n} personnes`} · ${euros(EQUIPES.accueil.salaire)} par jour et par personne`,
    josee: 'Un sourire à la porte, et le client oublie qu’il attend. Ça ne s’apprend pas, ça se paie.',
  },
  securite: {
    nom: 'Sécurité',
    role: `Veille sur le quai : moins de disputes, des clients d’affaires rassurés, et plus besoin de payer un portier pour la porte stricte. Règle seule une partie des clients éméchés, des photographes, des faux clients et des disputes.`,
    effectif: (n: number) => `${n === 0 ? 'Personne' : n === 1 ? '1 personne' : `${n} personnes`} · ${euros(EQUIPES.securite.salaire)} par jour et par personne`,
    josee: 'Un bon videur, on ne le voit jamais travailler. C’est à ça qu’on le reconnaît.',
  },
  regle: (part: number) => `Règle seule environ ${pct(part)} des alertes de son domaine.`,
  retirer: 'Une personne de moins',
  ajouter: 'Une personne de plus',
  verrou: 'Au palier 3 : Tenir la maison.',
  assurance: {
    titre: 'Assurance',
    niveaux: [
      { nom: 'Aucune', effet: 'Rien à payer, rien de remboursé.', josee: 'Tu joues sans filet. Tant que personne ne casse rien…' },
      {
        nom: 'Casse',
        effet: `${euros(ASSURANCES[1].prime)} par semaine ; ${pct(ASSURANCES[1].casse)} de la casse remboursée (disputes, matériel).`,
        josee: 'Une chaise cassée par un supporter, ça arrive. Deux, c’est une habitude.',
      },
      {
        nom: 'Casse et amendes',
        effet: `${euros(ASSURANCES[2].prime)} par semaine ; toute la casse et toutes les amendes remboursées.`,
        josee: 'Cher, mais la mairie peut sortir son carnet quand elle veut. Et le Chat Noir le sait.',
      },
    ],
    ouverture: 'Nouveau ce lundi : l’assurance, dans l’onglet Finances.',
    ouvertureJosee: 'Tu tiens la maison depuis un mois : l’assureur du quartier accepte enfin de te recevoir. Casse, amendes : choisis ce qui te fera dormir tranquille.',
    verrou: 'S’ouvre au premier lundi après le palier 3.',
  },
  journal: {
    effectif: (equipe: 'accueil' | 'securite', n: number) =>
      `${equipe === 'accueil' ? 'Accueil' : 'Sécurité'} : ${n === 0 ? 'plus personne' : n === 1 ? 'une personne' : `${n} personnes`} désormais.`,
    disputeEvitee: 'La sécurité sépare deux clients avant que le ton ne monte.',
    assurance: (niveau: number) => `Assurance : ${TEXTES_NIVEAUX[niveau] ?? ''}.`,
    prime: (montant: string) => `Prime d’assurance de la semaine : ${montant}.`,
    indemnisation: (montant: string, sinistre: 'casse' | 'amende') =>
      `L’assurance rembourse ${montant} ${sinistre === 'casse' ? 'de casse' : 'd’amende'}.`,
  },
};

/** Ce qui s'ouvre un lundi après le palier 3, présenté par Josée au bilan de la semaine. */
export const OUVERTURES_LUNDI: Record<string, { titre: string; josee: string }> = {
  assurance: { titre: TEXTES_EQUIPES.assurance.ouverture, josee: TEXTES_EQUIPES.assurance.ouvertureJosee },
  visibilite: {
    titre: 'Nouveau ce lundi : la visibilité, dans les règles de la maison (onglet Clientèle).',
    josee: 'Tu peux maintenant faire parler de la maison : un site discret, les concierges des grands hôtels, ou ces jeunes gens qui filment tout. Plus de monde, mais pas toujours celui qu’on voudrait.',
  },
};
