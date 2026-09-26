// Alertes minutées de la soirée : une bulle sur la maison, un délai, une ou deux actions.
// Ignorée, une alerte a une conséquence. Les valeurs sont dans balance.ts (ALERTES).
// Les textes acceptent {prenom} et l'accord {e} pour la personne concernée.

import { ALERTES } from './balance';

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;

export type IdAlerte = 'presse' | 'bruit' | 'ivre' | 'bouteille' | 'photographe' | 'pause' | 'sabotage';

export interface TexteAlerte {
  /** Libellé de la bulle (lu par les lecteurs d'écran) et titre de la carte. */
  titre: string;
  texte: string;
  actions: { texte: string; detail: string }[];
  /** Au journal quand l'alerte apparaît, quand on la traite (par action), quand on la laisse filer. */
  journal: string;
  traitee: string[];
  manquee: string;
  /** Pour les actions risquées : ce qui arrive quand ça rate. */
  rate?: string;
}

export const TEXTES_ALERTES: Record<IdAlerte, TexteAlerte> = {
  presse: {
    titre: 'Un client pressé',
    texte: 'Un client d’affaires regarde sa montre pour la troisième fois. Encore quelques minutes, et il file.',
    actions: [
      { texte: 'Le faire passer devant', detail: `Il sera le prochain reçu ; les autres attendent ${ALERTES.presse.patienceAutres} minutes de plus` },
      { texte: 'Lui offrir un verre', detail: `${euros(ALERTES.presse.verre)}, et il patiente ${ALERTES.presse.patienceVerre} minutes de plus` },
    ],
    journal: 'Un client d’affaires s’impatiente sur le quai.',
    traitee: ['Le client pressé passe devant. Les autres soupirent.', 'Un verre à la main, le client pressé se détend un peu.'],
    manquee: 'Le client pressé est parti en claquant la porte. Il le racontera à ses collègues.',
  },
  bruit: {
    titre: 'Du bruit sur le quai',
    texte: 'Un groupe chante sur le quai, et une fenêtre vient de s’allumer deux étages plus haut.',
    actions: [
      { texte: 'Faire entrer le groupe', detail: 'Le quai se calme ; le groupe râle un peu' },
      { texte: 'Leur offrir un verre à l’intérieur', detail: `${euros(ALERTES.bruit.verre)}, le calme revient en douceur` },
    ],
    journal: 'Le groupe sur le quai fait monter le ton.',
    traitee: ['Le groupe rentre au salon. Le quai retrouve un peu de calme.', 'Un verre offert, et le groupe chante à l’intérieur.'],
    manquee: 'Les chants ont duré. Tout le voisinage les a entendus.',
  },
  ivre: {
    titre: 'Un client éméché',
    texte: 'Au bar, un client a un verre de trop et commence à haranguer le quai. Ça peut vite dégénérer.',
    actions: [
      { texte: 'Un café et un grand verre d’eau', detail: 'Gratuit ; ça marche souvent' },
      { texte: 'Lui appeler un taxi', detail: `${euros(ALERTES.ivre.taxi)}, et il rentre dormir` },
    ],
    journal: 'Un client éméché s’agite au bar.',
    traitee: ['Un café serré, un verre d’eau, et le client se calme.', 'Le taxi emporte le client éméché, qui chante encore.'],
    manquee: 'Le client éméché a fini par provoquer tout le quai.',
    rate: 'Le café n’a pas suffi : le client éméché cherche querelle sur le quai.',
  },
  bouteille: {
    titre: 'Une bouteille à servir',
    texte: 'Au salon, un client lève la main : il veut offrir une bouteille de champagne à sa table.',
    actions: [{ texte: 'Servir la bouteille', detail: `+${euros(ALERTES.bouteille.prix)} pour le bar` }],
    journal: 'Un client veut commander une bouteille.',
    traitee: ['Le bouchon saute au salon. Le client trinque avec toute la table.'],
    manquee: 'Personne n’est venu servir la bouteille. Le client a rangé son portefeuille.',
  },
  photographe: {
    titre: 'Un photographe sur le quai',
    texte: 'Un homme en parka photographie la porte au téléobjectif. Les clients d’affaires remontent leur col.',
    actions: [
      { texte: 'Le faire déguerpir', detail: 'Tu sors en personne ; il reviendra peut-être' },
      { texte: 'Lui glisser un billet', detail: `${euros(ALERTES.photographe.billet)}, et il photographie le canal` },
    ],
    journal: 'Un photographe rôde sur le quai.',
    traitee: ['Tu te plantes devant l’objectif, bras croisés. Le photographe range son matériel.', 'Le photographe empoche le billet et se découvre une passion pour les péniches.'],
    manquee: 'Le photographe a mitraillé la porte toute la soirée. Les clients discrets ne reviendront pas de sitôt.',
    rate: 'Le photographe recule de dix mètres, et continue.',
  },
  sabotage: {
    titre: 'Un client fait un scandale',
    texte: 'Sur le quai, un homme en costume trop neuf crie qu’on l’a volé et prend les passants à témoin. La fleuriste d’en face jure l’avoir vu sortir du Chat Noir il y a dix minutes.',
    actions: [
      { texte: 'Le raccompagner fermement', detail: 'Ça marche souvent ; sinon, la bagarre' },
      { texte: 'Lui rembourser sa « soirée »', detail: `${euros(ALERTES.sabotage.remboursement)}, et il s’en va` },
    ],
    journal: 'Un faux client fait un scandale sur le quai.',
    traitee: ['Tu raccompagnes l’homme au bout du quai, un bras amical autour des épaules. Il ne revient pas.', 'L’homme empoche les billets et file, en direction du Chat Noir.'],
    manquee: 'Le scandale a duré une heure : police, badauds, et un journaliste. Le Chat Noir a gagné sa soirée.',
    rate: 'L’homme se débat et renverse une table. La dispute gagne le quai.',
  },
  pause: {
    titre: '{prenom} demande une pause',
    texte: '{prenom} s’appuie au chambranle du salon : « Vingt minutes. Juste vingt minutes, pour souffler. »',
    actions: [
      { texte: 'Accorder la pause', detail: `{prenom} n’est pas disponible pendant ${ALERTES.pause.minutes} minutes, puis revient reposé{e}` },
      { texte: 'Pas maintenant', detail: 'Moral en légère baisse' },
    ],
    journal: '{prenom} demande une pause.',
    traitee: ['{prenom} souffle vingt minutes dans la loge, les pieds en l’air.', '{prenom} reprend son poste sans un mot.'],
    manquee: '{prenom} a attendu une réponse qui n’est jamais venue.',
  },
};
