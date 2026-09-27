// Didacticiel : la première soirée guidée par Madame Josée (voir « Didacticiel » dans les spécifications).
// {prenom} est remplacé par le prénom du joueur.

/** Ce qui fait passer à l'étape suivante. */
export type AttenteDidacticiel =
  | 'suivant' // bouton de la carte
  | 'boudoir' // fiche du Boudoir ouverte
  | 'personnel' // onglet Personnel ouvert
  | 'vitesse' // temps lancé
  | 'briefing' // briefing validé
  | 'chambreSale' // première chambre sale (le jeu se met en pause)
  | 'bulle' // bulle d'alerte touchée
  | 'nettoyage' // nettoyage express lancé
  | 'palier'; // carte du premier palier refermée

export interface EtapeDidacticiel {
  /** Réplique de Josée ; absente, aucune carte ne s'affiche (Josée parle dans une autre carte). */
  texte?: string;
  /** Élément mis en évidence : valeur de son attribut data-tuto. */
  cible?: string;
  attend: AttenteDidacticiel;
  /** Libellé du bouton, pour les étapes qui attendent « suivant ». */
  bouton?: string;
  /** Le temps est en pause pendant l'étape. */
  pause: boolean;
}

export const ETAPES_DIDACTICIEL: EtapeDidacticiel[] = [
  // 1. Accueil
  {
    texte: 'Alors c’est toi, {prenom} ? La maison est à toi désormais. Enfin, à toi et à la banque. Je te fais visiter.',
    attend: 'suivant',
    bouton: 'Suivant',
    pause: true,
  },
  // 2. La maison
  {
    texte: 'Une seule chambre en état : le Boudoir. Les trois autres dorment sous des draps depuis mon départ. Touche le Boudoir.',
    cible: 'piece-boudoir',
    attend: 'boudoir',
    pause: true,
  },
  {
    texte: 'Propreté, état… Une chambre sale, c’est un client qui ne revient pas. Tout se gère depuis ce panneau.',
    cible: 'panneau',
    attend: 'suivant',
    bouton: 'Suivant',
    pause: true,
  },
  // 3. Le personnel
  {
    texte: 'Et voici ton équipe. Enfin, ton équipe… Touche l’onglet Personnel.',
    cible: 'onglet-personnel',
    attend: 'personnel',
    pause: true,
  },
  {
    texte: 'Sanne tient la maison seule depuis mon départ. Surveille sa fatigue et son moral, et trouve-lui vite des collègues.',
    cible: 'panneau',
    attend: 'suivant',
    bouton: 'Suivant',
    pause: true,
  },
  // 4. Le temps
  {
    texte: 'Le temps passe tout seul. Pause, ×1, ×2, ×4 : à toi de voir. À 19 h, on prépare la soirée. Lance le temps.',
    cible: 'vitesses',
    attend: 'vitesse',
    pause: true,
  },
  // 5. Le briefing de 19 h : Josée parle dans la carte du briefing.
  { attend: 'briefing', pause: false },
  // 6. La première alerte : on attend qu'une chambre se salisse.
  { attend: 'chambreSale', pause: false },
  {
    texte: 'Ta première alerte ! Une chambre sale ne reçoit plus personne sous 15 %. Touche la bulle.',
    cible: 'bulle-sale',
    attend: 'bulle',
    pause: true,
  },
  {
    texte: 'Nettoyage express, ou tu attends que le ménage passe. Ici, on nettoie.',
    cible: 'nettoyage',
    attend: 'nettoyage',
    pause: true,
  },
  {
    texte: 'Parfait. Laisse la nuit se dérouler : je repasserai à la fermeture.',
    attend: 'suivant',
    bouton: 'Merci Josée',
    pause: true,
  },
  // 7. Le premier imprévu, le bilan et le premier palier : Josée parle dans ces cartes.
  { attend: 'palier', pause: false },
];

export const TEXTES_DIDACTICIEL = {
  passer: 'Passer le didacticiel',
  briefing: 'Un conseil : un happy hour pour se faire connaître. Et garde un œil sur le Boudoir, c’est ta seule chambre.',
  imprevu: 'Un imprévu ! Il n’y a jamais de bonne réponse, seulement des choix. Prends ton temps : le jeu t’attend.',
  palier: 'Pas mal, pour un début. Demain, des candidats vont passer : Sanne ne peut pas tout porter seule. Je repasserai.',
};

/** Aide courte de chaque onglet, que Josée donne à la demande. */
export const AIDE_ONGLETS: Record<string, string> = {
  maison:
    'Tes chambres, le linge et le ménage. Une chambre sale sous 40 % donne l’alerte, sous 15 % elle ne reçoit plus. Les chambres sous les draps se rénovent (900 €) ; une chambre usée se rafraîchit (400 €) avant d’être défraîchie. Tout en haut : ton prochain palier et tes objectifs.',
  personnel:
    'Ton équipe et tes candidats. Surveille fatigue et moral : sous 20 de moral, on te menace de partir. Un entretien, une prime, un soir de repos, ça aide. Il faut trois ou quatre personnes pour faire tourner la maison.',
  clientele:
    'Tes clients, segment par segment. Chacun a sa satisfaction : contents, ils reviennent ; ta réputation est leur moyenne. Touche un segment pour voir ce qu’il attend. Les règles de la maison (tarif, formule, porte, accueil) se changent à tout moment.',
  finances:
    'Ta trésorerie, la banque et la réserve. La mensualité tombe tous les 28 jours : la réserve paie en premier. Chaque lundi, le bilan de la semaine fait les comptes et projette les quatre semaines à venir. Tu peux aussi me confier la gestion.',
  relations:
    'Le quartier : voisins, mairie, presse, police, puis les fournisseurs, chacun avec sa jauge. Au-dessus de +40, ils rendent service ; sous −40, les ennuis commencent. Une action par semaine et par acteur. Le Chat Noir, en face, a sa fiche : tu peux lui répondre.',
  journal: 'Tout ce qui s’est passé, du plus récent au plus ancien.',
};

/** Aide courte de chaque carte (le bouton « ? » en haut à droite), que Josée donne à la demande (v1.0). */
export const AIDE_CARTES: Record<string, string> = {
  briefing:
    'À gauche, qui travaille ce soir et combien de rendez-vous chacun : au-delà de 4, ça use. À droite, l’offre du soir, le linge, le bar, le thème. Rien n’est définitif : tout se rejoue demain.',
  bilan: 'Le compte de la nuit : ce qui est entré, ce qui est sorti, et ce qui reste. Les salaires de midi sont à part ; les charges du lundi et la mensualité vont au bilan de la semaine.',
  semaine:
    'Les comptes de la semaine poste par poste, et ta trésorerie projetée sur quatre semaines, mensualités comprises. Si la projection passe sous zéro, c’est maintenant qu’il faut réagir.',
  mois: 'La mensualité du rachat, payée par la réserve d’abord, et l’objectif du mois. Deux mensualités impayées de suite, et la banque reprend la maison.',
  entretien: 'Une question révèle un trait caché. Puis tu proposes une part : trop basse, on négocie ou on s’en va. Tu peux aussi réfléchir : le candidat attend quelques jours.',
  entretienIndividuel: 'Écouter remonte le moral, promettre engage (une promesse rompue coûte cher), recadrer concentre mais pique. Une fois par semaine et par personne.',
  imprevu: 'Il n’y a pas de bonne réponse, seulement des choix. Le jeu t’attend : lis le détail sous chaque choix, il dit ce que ça coûte.',
  intrigue: 'Une histoire sur plusieurs jours : tes choix d’aujourd’hui décident de la suite. L’onglet Journal dit où elle en est.',
  dispute: 'Un verre offert calme presque toujours, mais coûte ; parler peut suffire, ou pas. Une dispute ignorée dégénère.',
  alerte: 'Une alerte a un délai : ignorée, elle a une conséquence. Les équipes Accueil et Sécurité en règlent une partie seules.',
};

export const TEXTES_AIDE_CARTE = { bouton: '?', titre: 'Aide' };
