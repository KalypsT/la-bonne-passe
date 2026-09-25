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
  creation: {
    titre: 'Qui reprend la maison ?',
    tenue: (n: number) => `Tenue ${n}`,
    prenom: 'Ton prénom',
    prenomExemple: 'Anouk, Bram, Inès…',
    maison: 'Nom de la maison',
    apercu: 'L’enseigne, sur la façade',
    retour: 'Retour',
    valider: 'Ouvrir la maison',
    erreurs: {
      prenom: {
        vide: 'Il te faut un prénom pour signer les factures.',
        long: (max: number) => `${max} caractères au maximum.`,
        caracteres: 'Lettres, espaces, apostrophes et traits d’union seulement.',
        injurieux: 'Madame Josée fronce les sourcils. Un autre prénom ?',
      },
      maison: {
        vide: 'Une maison sans nom, c’est une maison sans clients.',
        long: (max: number) => `${max} caractères au maximum, sinon le néon déborde.`,
        caracteres: 'Lettres, chiffres et ponctuation simple seulement.',
        injurieux: 'Le voisinage n’appréciera pas. Trouve un nom plus élégant.',
      },
    },
  },
  jeu: {
    menu: 'Menu',
    bienvenue: (prenom: string, genre: Genre, maison: string) =>
      `Bienvenue, ${prenom}. Te voilà ${accord(genre, 'patronne', 'patron')} ${de(maison)}.`,
    bientot: 'La maison ouvre bientôt. Pour l’instant, seul le temps passe.',
    avancer: 'Avancer d’une heure',
    provisoire: 'Écran provisoire : la sauvegarde est automatique.',
  },
} as const;

/** Accorde un mot selon l'avatar choisi : « patronne » ou « patron ». */
export function accord(genre: Genre, feminin: string, masculin: string): string {
  return genre === 'patronne' ? feminin : masculin;
}

/** « de » devant un nom propre, avec contraction : « du Velours », « des Tulipes », « de La bonne passe ». */
export function de(nom: string): string {
  if (/^le\s/i.test(nom)) return `du ${nom.slice(3)}`;
  if (/^les\s/i.test(nom)) return `des ${nom.slice(4)}`;
  return /^[aeiouyhéèêâîôû]/i.test(nom) ? `d’${nom}` : `de ${nom}`;
}
