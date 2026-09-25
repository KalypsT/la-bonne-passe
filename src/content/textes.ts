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
    arrivee: (client: string) => `${client} attend sur le quai.`,
    clientParti: (client: string) => `${client} en a eu assez d’attendre sur le quai.`,
    filePleine: 'Le quai est plein : un client passe son chemin.',
    debutRdv: (employe: string, client: string, dansChambre: string) =>
      `${employe} reçoit ${client.charAt(0).toLowerCase()}${client.slice(1)} ${dansChambre}. Les rideaux se ferment.`,
    finRdv: (client: string, avis: string, montant: string) => `${client} : « ${avis} » (+${montant})`,
    salaires: (montant: string) => `Midi : salaire du ménage, ${montant}.`,
    charges: (montant: string) => `Lundi : charges fixes (énergie, assurance, licence), ${montant}.`,
    dispute: 'Ça chauffe sur le quai : deux clients se disputent la file.',
    disputeDegeneree: (montant: string) => `La dispute a dégénéré : un fauteuil en moins (${montant}) et des voisins fâchés.`,
    disputeVerre: 'Deux verres offerts ont ramené la paix sur le quai.',
    disputeCalmee: (prenom: string) => `${prenom} a calmé le jeu avec autorité.`,
    disputeRatee: 'Tu as calmé le jeu… en prenant un parapluie dans l’épaule.',
    nettoyage: (deChambre: string, montant: string) => `Nettoyage express ${deChambre} (${montant}).`,
    livraisonLinge: (montant: string) => `Livraison express : 50 draps propres (${montant}).`,
    repos: (prenom: string) => `${prenom} se repose pour le reste de la nuit.`,
  },
  scene: {
    occupe: '♥ Occupé',
    chambreFermee: (nom: string) => `${nom} : fermée`,
    pieceFermee: (nom: string) => `${nom} : fermé`,
  },
  briefing: {
    titre: 'Briefing de 19 h',
    ceSoir: 'Qui travaille ce soir ?',
    horaires: (ouverture: string, fermeture: string) => `Ouverture à ${ouverture}, fermeture à ${fermeture}.`,
    chambresEnService: (n: number, total: number) => `${n} chambre${n > 1 ? 's' : ''} en service sur ${total}`,
    planningVerrouille: (prenom: string) => `Le planning s’ouvre au palier 1. Ce soir, ${prenom} est seule.`,
    linge: 'Linge propre',
    stockLinge: (n: number) => `Stock : ${n} draps`,
    commanderLinge: (draps: number, prix: string) => `Commander ${draps} draps (${prix}), livrés à l’ouverture`,
    offre: 'L’offre du soir',
    conseilPremierSoir: 'Garde un œil sur le Boudoir : c’est ta seule chambre. Et Sanne, ta seule hôtesse.',
    lancer: 'Lancer la soirée',
  },
  bilan: {
    titre: (numero: number) => `Fin de la nuit ${numero}`,
    recettes: 'Recettes de la maison',
    partPersonnel: 'Part versée au personnel',
    depenses: 'Dépenses de la nuit',
    servis: 'Clients reçus',
    perdus: 'Clients perdus',
    reputation: 'Réputation',
    meilleurAvis: 'Meilleur avis',
    pireAvis: 'Avis le plus dur',
    fatigue: 'Fatigue en fin de nuit',
    conseilPerdus: 'Plus de clients perdus que reçus. Il te faudra plus de bras et plus de chambres.',
    conseilBon: 'Belle nuit. Ne t’endors pas sur tes lauriers : le Pink Palace, lui, ne dort jamais.',
    conseilMoyen: 'Correct. On peut faire mieux, et on fera mieux.',
    continuer: 'Continuer',
  },
  disputeCarte: {
    titre: 'Dispute sur le quai',
    texte: 'Deux clients se disputent la place dans la file. Le ton monte, les voisins ouvrent leurs fenêtres.',
    verre: (prix: string) => `Offrir un verre aux deux (${prix})`,
    verreDetail: 'Tout le monde se calme.',
    calmer: 'Descendre calmer le jeu',
    calmerDetail: 'Gratuit, mais ça peut mal tourner.',
    plusTard: 'Laisser faire pour l’instant',
  },
  alertes: {
    chambreSale: (chambre: string) => `${chambre} : chambre sale`,
    linge: 'Plus de linge propre',
    epuisement: (prenom: string) => `${prenom} est épuisée`,
    dispute: 'Dispute sur le quai',
  },
  personnel: {
    ans: (age: number) => `${age} ans`,
    part: (pourcent: number) => `Garde ${pourcent} % de chaque rendez-vous`,
    talents: 'Talents',
    traits: 'Traits',
    fatigue: 'Fatigue',
    moral: 'Moral',
    loyaute: 'Loyauté',
    rdvCeSoir: (n: number, max: number) => `Rendez-vous ce soir : ${n} sur ${max}`,
    statuts: {
      rdv: 'En rendez-vous',
      repos: 'Au repos ce soir',
      epuisee: 'Épuisée',
      quota: 'Quota atteint',
      disponible: 'Disponible',
      horsService: 'Hors service',
    },
    mettreAuRepos: 'Repos pour le reste de la nuit',
  },
  actions: {
    nettoyageExpress: (prix: string) => `Nettoyage express (${prix})`,
    livraisonLinge: (draps: number, prix: string) => `Livraison express : ${draps} draps (${prix})`,
    occupee: 'Occupée',
    inutilisable: 'Trop sale pour recevoir : la chambre est bloquée.',
    lingeStock: (n: number) => `${n} draps propres`,
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
