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
    regime: 'Amsterdam · légal',
    ouvert: 'Ouvert',
    ferme: 'Fermé',
    reputation: (n: number) => `★ ${n}`,
    reputationLabel: 'Réputation',
    pause: 'Pause',
    vitesse: (n: number) => `×${n}`,
    vitesseLabel: (n: number) => `Vitesse ×${n}`,
  },
  jours: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  date: (jourSemaine: string, jour: number) => `${jourSemaine}, jour ${jour}`,
  onglets: {
    maison: 'Maison',
    personnel: 'Personnel',
    clientele: 'Clientèle',
    finances: 'Finances',
    relations: 'Relations',
    journal: 'Journal',
    verrouille: (nom: string, palier: number) => `${nom}, s’ouvre au palier ${palier}`,
  },
  panneau: {
    prochainPalier: 'Prochain palier',
    chambres: 'Chambres',
    piecesCommunes: 'Pièces communes',
    enService: 'En service',
    sousDraps: 'Sous des draps',
    ferme: 'Fermé',
    ouvert: 'Ouvert',
    proprete: 'Propreté',
    etat: 'État',
    premium: 'Premium',
    retour: '‹ Retour',
    renovationVerrouillee: (palier: number, nom: string) =>
      `Rénovation possible au palier ${palier} (${nom}) : 900 € et 8 h de travaux.`,
    barVerrouille: (palier: number, nom: string) => `Le bar rouvre au palier ${palier} (${nom}).`,
    ongletVerrouille: (palier: number, nom: string, objectif: string) =>
      `S’ouvre au palier ${palier}, « ${nom} » : ${objectif.charAt(0).toLowerCase()}${objectif.slice(1)}`,
    personnelProvisoire:
      'Sanne tient la maison seule depuis le départ de Madame Josée. Elle prendra son service à la prochaine étape du développement.',
    recrutementVerrouille: (palier: number, nom: string) => `Recrutement : palier ${palier} (${nom}).`,
    tresorerie: 'Trésorerie',
    emprunt: 'Emprunt de rachat',
    mensualite: 'Prochaine mensualité',
    mensualiteDetail: (montant: string, jour: number, dans: number) =>
      `${montant} au jour ${jour}${dans > 0 ? `, dans ${dans} jour${dans > 1 ? 's' : ''}` : ''}`,
    journalVide: 'Rien à signaler pour l’instant.',
  },
  journal: {
    ouverture: (maison: string) => `${maison} ouvre ses portes. Le néon s’allume.`,
    fermeture: 'Fermeture. Les rideaux retombent, la maison dort.',
    nouveauJour: (jourSemaine: string, jour: number) => `${jourSemaine}, jour ${jour}. La journée commence.`,
    briefing: 'Briefing de 19 h : la soirée se prépare.',
  },
  scene: {
    chambreFermee: (nom: string) => `${nom} : fermée`,
    pieceFermee: (nom: string) => `${nom} : fermé`,
  },
  briefing: {
    titre: 'Briefing de 19 h',
    ceSoir: 'Ce soir',
    horaires: (ouverture: string, fermeture: string) => `Ouverture à ${ouverture}, fermeture à ${fermeture}.`,
    chambresEnService: (n: number, total: number) => `${n} chambre${n > 1 ? 's' : ''} en service sur ${total}`,
    laMaison: 'La maison',
    bientot: 'Planning, offre du soir et achats arrivent à la prochaine étape.',
    lancer: 'Lancer la soirée',
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
