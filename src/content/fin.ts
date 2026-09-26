// La fin du chapitre 1 (v1.0, partie 2), racontée par Madame Josée : durée, recettes, fidèles, moments marquants,
// et un titre selon le style de jeu. Accords : chaque texte existe au féminin (patronne) et au masculin (patron).
// {joueur} et {maison} se remplissent dans ui/modeles.ts.

import type { IdTitre } from '../engine/chronique';

export interface TexteTitre {
  patronne: string;
  patron: string;
  /** Pourquoi ce titre, en une phrase de Josée. */
  raison: string;
}

export const TITRES: Record<IdTitre, TexteTitre> = {
  velours: {
    patronne: 'Baronne du velours',
    patron: 'Baron du velours',
    raison: 'Ta maison est la plus courue du canal, et on y entre en baissant la voix.',
  },
  discretion: {
    patronne: 'Reine de la discrétion',
    patron: 'Roi de la discrétion',
    raison: 'Lumières basses, portes feutrées : chez toi, on vient pour ne pas être vu.',
  },
  fete: {
    patronne: 'Impératrice des nuits blanches',
    patron: 'Empereur des nuits blanches',
    raison: 'Happy hours, thèmes et champagne : le quartier sait où finir la soirée.',
  },
  batisseuse: {
    patronne: 'Bâtisseuse du canal',
    patron: 'Bâtisseur du canal',
    raison: 'Tu as abattu des murs, relié deux maisons et rempli les chambres.',
  },
  famille: {
    patronne: 'Mère de la maison',
    patron: 'Père de la maison',
    raison: 'Personne n’est parti. Dans ce métier, c’est plus rare qu’une bonne réputation.',
  },
  funambule: {
    patronne: 'Funambule du découvert',
    patron: 'Funambule du découvert',
    raison: 'La banque a dû attendre, et tu es encore là. Ça aussi, c’est un talent.',
  },
  quartier: {
    patronne: 'Patronne du quartier',
    patron: 'Patron du quartier',
    raison: 'Ni trop sage ni trop folle : une maison qui tient, et qu’on salue dans la rue.',
  },
};

export const TEXTES_FIN = {
  titre: 'Fin du chapitre 1',
  sousTitre: 'Les débuts, Amsterdam',
  intro: (jours: number, quartier: string) =>
    `Il y a ${jours} jours, {joueur}, tu m’as racheté une maison presque vide : une hôtesse, une chambre et des draps sur les meubles. Ce soir, {maison} a une petite sœur à ${quartier}.`,
  introDepuis: (jour: number, quartier: string) =>
    `Je tiens tes comptes depuis le jour ${jour}, {joueur}. Ce soir, {maison} a une petite sœur à ${quartier}.`,
  duree: 'Durée',
  jours: (n: number) => `${n} jours de jeu`,
  tempsReel: (heures: number, minutes: number) => (heures > 0 ? `${heures} h ${String(minutes).padStart(2, '0')} de ta vie` : `${minutes} minutes de ta vie`),
  recettes: 'Recettes totales',
  recettesDepuis: (jour: number) => `Recettes depuis le jour ${jour}`,
  reputation: 'Réputation',
  fideles: 'Restés fidèles',
  aucunFidele: 'Personne n’a encore passé un mois au salon. Ça viendra.',
  partis: 'Partis en route',
  aucunParti: 'Personne. Garde-les.',
  moments: 'Ce que je retiendrai',
  gerante: (prenom: string, quartier: string) => `${prenom} tient la maison de ${quartier}.`,
  titreIntro: 'Dans le quartier, on t’appelle déjà :',
  conclusion:
    'Moi, je rentre à Delft, chez ma sœur. Enfin, je repasserai : on ne quitte jamais tout à fait une maison. La tienne continue, et toi aussi. Les chapitres suivants t’attendent ailleurs, plus tard.',
  avertissement:
    'Cette histoire est une fiction. Les lois, les lieux, les maisons et les personnages sont simplifiés ou inventés. Dans le jeu, chaque personne travaille librement : elle choisit, négocie, refuse ou s’en va.',
  continuer: 'Continuer la partie',
  titreEcran: 'Écran titre',
  journal: (titre: string) => `Fin du chapitre 1 : on t’appelle « ${titre} ».`,
  emplacement: 'Chapitre 1 bouclé',
  /** Au palier 5, dans l'onglet Maison, à la place du prochain palier. */
  objectif: {
    titre: 'Objectif du chapitre',
    nom: 'Une deuxième maison',
    texte: (reputation: number) => `Inaugurer une deuxième maison, avec au moins ${reputation} de réputation ici le soir venu.`,
    detail: (reputation: number) => `Réputation actuelle : ${reputation}. Le projet se prépare dans la fiche du bureau.`,
  },
  /** Les moments, racontés en une ligne. */
  moment: {
    palier: (nom: string) => `Palier atteint : « ${nom} ».`,
    embauche: (prenom: string) => `${prenom} rejoint la maison.`,
    depart: (prenom: string) => `${prenom} s’en va.`,
    chambre: (nom: string) => `${nom} sort de sous les draps.`,
    bar: 'Le bar rouvre ses portes.',
    emprunt: (montant: string) => `Un emprunt de ${montant} signé à la banque.`,
    impayee: 'Une mensualité restée impayée : la banque a écrit.',
    sursis: 'La banque accorde un sursis, grâce à Josée.',
    agrandissement: 'Le bâtiment voisin rejoint la maison.',
    gerance: (prenom: string) => `${prenom} prend la gérance.`,
    achatLieu: (nom: string, quartier: string) => `${nom}, ${quartier} : l’acte est signé.`,
    inauguration: (prenom: string) => `Inauguration de la deuxième maison, confiée à ${prenom}.`,
    jour: (jour: number) => `Jour ${jour}`,
  },
};

/** Avertissement court, en pied de l'écran titre. */
export const AVERTISSEMENT_TITRE = 'Fiction pour adultes. Lois, lieux et personnages simplifiés ou inventés.';
