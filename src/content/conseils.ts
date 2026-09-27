// Les conseils de Madame Josée (v1.0, partie 5) : la suite du didacticiel, au bon moment. Voir src/engine/conseils.ts.
// {joueur}, {maison} se remplissent dans ui/modeles.ts ; {chambre} est le nom de la chambre désignée.

import type { IdConseil } from '../engine/conseils';

export interface TexteConseil {
  titre: string;
  texte: string;
  /** Le bouton qui mène au bon endroit. */
  montrer: string;
  /** Où il mène : un onglet, ou une fiche (la chambre désignée, le bureau, la mairie). */
  cible: { onglet: 'maison' | 'personnel' | 'clientele' | 'finances' | 'relations' } | { fiche: 'chambre' | 'bureau' | 'mairie' } | null;
}

export const CONSEILS: Record<IdConseil, TexteConseil> = {
  renover: {
    titre: 'Une chambre, ce n’est pas une maison',
    texte:
      'Avec le seul Boudoir, tu refuses du monde tous les soirs, {joueur}. {chambre} dort sous ses draps : 900 €, huit heures de travaux, et elle rapporte dès ce soir. C’est le meilleur argent que tu dépenseras ce mois-ci.',
    montrer: 'Voir {chambre}',
    cible: { fiche: 'chambre' },
  },
  renoverEncore: {
    titre: 'Encore des draps sur les meubles',
    texte:
      'La caisse respire, {joueur}, et {chambre} dort toujours sous ses draps. Une chambre de plus, c’est un client de plus chaque heure, et une équipe qui ne fait plus la queue devant la même porte.',
    montrer: 'Voir {chambre}',
    cible: { fiche: 'chambre' },
  },
  recruter: {
    titre: 'Sanne ne tiendra pas seule',
    texte:
      'Des candidats attendent au salon. Reçois-les dans l’onglet Personnel : une question pour découvrir qui ils sont, puis une part. À 50 %, la plupart acceptent. Seule, Sanne s’épuise, et une maison vide ne paie pas la banque.',
    montrer: 'Onglet Personnel',
    cible: { onglet: 'personnel' },
  },
  recruterEncore: {
    titre: 'Il te faut du monde',
    texte:
      'Deux personnes pour une maison, c’est un couple, pas une équipe. Il faut trois ou quatre hôtesses pour faire tourner les chambres et payer la mensualité du 28. Des candidats attendent : va les voir.',
    montrer: 'Onglet Personnel',
    cible: { onglet: 'personnel' },
  },
  lingeAuto: {
    titre: 'Le linge, c’est le nerf de la guerre',
    texte:
      'Un client sans draps propres paie moins, et c’est toi qui perds. Au briefing, choisis une commande automatique : le stock se complète seul chaque soir, et tu n’y penses plus.',
    montrer: 'Onglet Maison',
    cible: { onglet: 'maison' },
  },
  rafraichir: {
    titre: '{chambre} fatigue',
    texte:
      'Les tentures pâlissent et le parquet grince. Sous 30 % d’état, {chambre} sera défraîchie et chaque rendez-vous s’y paiera 15 % de moins. Rafraîchis la déco maintenant : 400 €, six heures.',
    montrer: 'Voir {chambre}',
    cible: { fiche: 'chambre' },
  },
  reserve: {
    titre: 'Pense au 28',
    texte:
      'Rien de côté, et la mensualité tombe tous les 28 jours. Mets 10 % de la recette en réserve, dans l’onglet Finances : c’est elle qui paie la banque en premier. C’est ce que je faisais, les bonnes années.',
    montrer: 'Onglet Finances',
    cible: { onglet: 'finances' },
  },
  permis: {
    titre: 'La mairie t’attend',
    texte:
      'Ta réputation suffit pour déposer le dossier du permis d’agrandir. Trois lundis : le dépôt, l’enquête chez les voisins, la commission. Plus tôt tu déposes, plus tôt tu t’agrandis.',
    montrer: 'Voir la mairie',
    cible: { fiche: 'mairie' },
  },
  reputation: {
    titre: 'Ta réputation plafonne',
    texte:
      'Pour la commission, il te faut 80 de réputation, et tu stagnes. Ce sont surtout les {segment} qui boudent : regarde ce qu’ils attendent dans l’onglet Clientèle. Et chaque alerte laissée filer, chaque client qui attend trop, se paie en réputation.',
    montrer: 'Onglet Clientèle',
    cible: { onglet: 'clientele' },
  },
  gerance: {
    titre: 'Choisir sa gérante',
    texte:
      'Une gérante ne reçoit plus : choisis quelqu’un de loyal, mais pas ta meilleure hôtesse, ou tu le paieras chaque soir. Sa fiche, dans l’onglet Personnel, dit si elle accepterait.',
    montrer: 'Onglet Personnel',
    cible: { onglet: 'personnel' },
  },
  deuxiemeMaison: {
    titre: 'Une adresse à ta portée',
    texte:
      'Trois baux sont à reprendre en ville. Une deuxième maison, ouverte avec au moins 70 de réputation ici, et ton premier chapitre est bouclé. Si la caisse ne suffit pas, la banque prête (onglet Finances) : avec ta réputation, à bon taux. Garde de quoi payer les travaux.',
    montrer: 'Voir le bureau',
    cible: { fiche: 'bureau' },
  },
};

export const TEXTES_CONSEILS = {
  compris: 'Compris',
  etiquette: 'Un conseil de Josée',
  /** Dans la carte d'entretien, au premier recrutement. */
  entretien: 'Pose une question : elle révèle un trait. Puis propose une part : à 50 %, la plupart acceptent. N’aie pas peur d’embaucher, c’est l’équipe qui fait la recette.',
  /** Dans l'aide : couper ou rallumer les conseils. */
  reglage: (actifs: boolean) => (actifs ? 'Conseils de Josée : oui' : 'Conseils de Josée : non'),
  reglageDetail: 'Josée passe te conseiller au bon moment, une fois pour chaque chose.',
  journal: (titre: string) => `Conseil de Josée : ${titre.charAt(0).toLowerCase()}${titre.slice(1)}.`,
};
