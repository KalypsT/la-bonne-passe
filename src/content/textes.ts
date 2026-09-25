// Textes de l'interface. Aucun texte en dur dans les composants.

import type { Genre } from './partie';

export const TEXTES = {
  titreJeu: 'La bonne passe',
  sousTitre: 'Amsterdam · maison close',
  tourneTelephone: {
    titre: 'Tourne ton téléphone',
    detail: 'La maison se visite en paysage.',
  },
  emplacements: {
    libre: 'Emplacement libre',
    libreDetail: 'Une maison à reprendre, presque vide.',
    illisible: 'Sauvegarde illisible',
    illisibleDetail: 'Cette partie ne peut pas être chargée.',
    nouvellePartie: 'Nouvelle partie',
    continuer: 'Continuer',
    supprimer: 'Supprimer',
    chapitre: (n: number) => `Chapitre ${n}`,
    jour: (n: number) => `Jour ${n}`,
    dernierePartie: 'Dernière partie',
  },
  confirmationSuppression: {
    titre: 'Supprimer cette partie ?',
    detail: (prenom: string, maison: string) =>
      `${prenom} et ${maison} disparaîtront pour de bon. Madame Josée ne gardera même pas les clés.`,
    detailIllisible: 'Cette sauvegarde abîmée sera effacée pour de bon.',
    annuler: 'Annuler',
    confirmer: 'Supprimer',
  },
  dates: {
    jamais: '—',
    instant: 'à l’instant',
    minutes: (n: number) => `il y a ${n} min`,
    heures: (n: number) => `il y a ${n} h`,
    hier: 'hier',
    le: (date: string) => `le ${date}`,
  },
  jeu: {
    menu: 'Menu',
    bienvenue: (prenom: string, genre: Genre, maison: string) =>
      `Bienvenue, ${prenom}. Te voilà ${accord(genre, 'patronne', 'patron')} de ${maison}.`,
    bientot: 'La maison ouvre bientôt. Pour l’instant, seul le temps passe.',
    avancer: 'Avancer d’une heure',
    provisoire: 'Écran provisoire : la sauvegarde est automatique.',
  },
} as const;

/** Accorde un mot selon l'avatar choisi : « patronne » ou « patron ». */
export function accord(genre: Genre, feminin: string, masculin: string): string {
  return genre === 'patronne' ? feminin : masculin;
}
