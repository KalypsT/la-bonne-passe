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
    'Tes chambres, le linge et le ménage. Une chambre sale sous 40 % donne l’alerte, sous 15 % elle ne reçoit plus. Les chambres sous les draps se rénovent.',
  personnel:
    'Ton équipe et tes candidats. Surveille fatigue et moral : sous 20 de moral, on te menace de partir. Un entretien ou une prime, ça aide. Un soir de repos aussi.',
  clientele:
    'Tes clients, segment par segment. Chacun a sa satisfaction : contents, ils reviennent ; ta réputation est leur moyenne. Touche un segment pour voir ce qu’il attend.',
  finances:
    'Ta trésorerie, l’emprunt et la réserve de sécurité. La mensualité tombe le 28 : la réserve paie en premier.',
  relations: 'Le quartier, la mairie, les voisins et les rivales. Pas encore ouvert.',
  journal: 'Tout ce qui s’est passé, du plus récent au plus ancien.',
};
