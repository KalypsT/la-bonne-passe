// Textes de la banque (v0.6) : découvert, agios, salaires impayés, mensualité impayée, faillite.

import type { Genre } from './partie';

const EQUIPES_NOMS: Record<'menage' | 'bar' | 'accueil' | 'securite', string> = {
  menage: 'du ménage',
  bar: 'du bar',
  accueil: 'de l’accueil',
  securite: 'de la sécurité',
};

export const TEXTES_BANQUE = {
  journal: {
    agios: (montant: string) => `La banque prélève ${montant} d’agios sur le découvert.`,
    decouvert: 'La caisse passe sous zéro. La banque tolère jusqu’à −2 000 €, contre 1 % d’agios par jour.',
    decouvertDepasse: 'Découvert dépassé : au-delà de −2 000 €, les salaires ne sont plus versés.',
    salairesImpayes: (montant: string, dus: string) =>
      `Pas de paie aujourd’hui (${montant}) : la caisse est à sec. Arriérés dus aux équipes : ${dus}. L’ambiance s’en ressent.`,
    salairesRattrapes: (montant: string) => `Arriérés de salaires réglés (${montant}). Les équipes respirent.`,
    departEquipe: (equipe: 'menage' | 'bar' | 'accueil' | 'securite') =>
      `Sans paie, une personne ${EQUIPES_NOMS[equipe]} rend son tablier.`,
    mensualiteImpayee: (montant: string, jour: number) =>
      `La mensualité (${montant}) n’a pas pu être payée. La banque écrit : à régulariser avant le jour ${jour}.`,
    regularisation: (montant: string) => `Mensualité en retard régularisée (${montant}). La banque range son stylo rouge.`,
    faillite: 'Deux mensualités impayées : la banque saisit la maison.',
  },

  finances: {
    titre: 'La banque',
    decouvertAutorise: 'Découvert autorisé',
    decouvertDetail: '−2 000 €, 1 % d’agios par jour',
    agiosDemain: 'Agios demain matin',
    salairesDus: 'Salaires dus aux équipes',
    retard: 'Mensualité en retard',
    retardDetail: (montant: string, jour: number) => `${montant}, avant le jour ${jour}`,
    impayees: 'Mensualités restées impayées',
    impayeesDetail: (n: number, points: number) => `${n}, soit +${points} points sur le taux du prochain emprunt`,
    mensualiteMenacee: (jour: number) => `Au jour ${jour}, la caisse et la réserve ne couvriront pas la mensualité.`,
  },

  josee: {
    tranquille: 'Rien à signaler côté banque. Profites-en : ça ne dure jamais.',
    decouvert: 'Tu vis à crédit, et la banque compte les jours à 1 %. Remonte au-dessus de zéro avant que ça coûte cher.',
    depasse: 'Plus un sou pour les salaires. Les équipes ne tiendront pas longtemps sans paie, et je les comprends.',
    retard: (jour: number) => `Une mensualité en retard. Si elle n’est pas réglée avant le jour ${jour}, la banque reprend la maison. Et tout ce qui va avec.`,
    menace: 'La prochaine mensualité ne passera pas en l’état. Remplis la réserve, serre les dépenses, ou prie.',
  },

  lettre: {
    titre: 'Lettre de la banque',
    texte: (maison: string, montant: string, jour: number) =>
      `Madame, Monsieur, la mensualité de ${montant} due par ${maison} n’a pu être prélevée. Nous vous prions de régulariser avant le jour ${jour}. À défaut, et à la prochaine échéance, nous engagerons la saisie de l’établissement. Le taux de tout nouveau prêt sera majoré de 2 points.`,
    mention: 'Je t’avais dit de lire les lettres avant de les jeter. Celle-là, garde-la sur ton bureau. Elle se régularise toute seule dès que la caisse le permet.',
  },

  faillite: {
    titre: 'Faillite',
    texte: (maison: string, jour: number) =>
      `Jour ${jour}. Deux mensualités impayées : la banque saisit ${maison}. Les rideaux de velours tombent pour de bon, les enseignes s’éteignent une à une.`,
    josee: (prenom: string, genre: Genre) =>
      `J’ai vu fermer des maisons plus solides que la mienne, ${prenom}. Tu n’es pas ${genre === 'patronne' ? 'la première' : 'le premier'}, et Amsterdam aime les retours. La prochaine fois, garde une réserve, et regarde la date de la mensualité avant de dépenser.`,
    duree: (jours: number) => `${jours} jours à la tête de la maison`,
    reputation: (n: number) => `Réputation finale : ${n}`,
    equipe: (n: number) => `${n} personne${n > 1 ? 's' : ''} dans l’équipe au dernier soir`,
    recommencer: 'Recommencer une partie',
    titreEcran: 'Écran titre',
  },

  emprunt: {
    titre: 'Nouvel emprunt',
    detail: 'Par tranches de 5 000 €. Les échéances tombent avec la mensualité, tous les 28 jours.',
    montant: 'Montant',
    moins: 'Retirer 5 000 €',
    plus: 'Ajouter 5 000 €',
    duree: 'Durée',
    mois: (n: number) => `${n} mois`,
    apercu: (taux: string, mensualite: string, cout: string) => `Taux ${taux} · mensualité ${mensualite} · intérêts ${cout} en tout`,
    derniere: (premiere: number, derniere: number, mois: number) => `Première échéance au jour ${premiere}, dernière au jour ${derniere} (mois ${mois})`,
    projection: (sans: string, avec: string) => `Dans 4 semaines : ${avec} (${sans} sans cet emprunt)`,
    signer: (montant: string) => `Signer pour ${montant}`,
    capacite: (montant: string) => `La banque prête encore jusqu’à ${montant}.`,
    plafond: 'La banque ne prête plus : 40 000 € d’encours au plus.',
    enCours: 'Emprunts en cours',
    ligne: (montant: string, taux: string, mensualite: string, restantes: number) =>
      `${montant} à ${taux} : ${mensualite} par mois, ${restantes} échéance${restantes > 1 ? 's' : ''} encore`,
    verrouille: 'Le nouvel emprunt s’ouvre au lundi qui suit la visibilité (palier 3).',
    recu: 'Emprunt reçu',
  },

  /** L'avis de Josée sur l'emprunt envisagé, du plus grave au plus doux. */
  joseeEmprunt: {
    retard: 'La banque ne prête pas à qui lui doit déjà. Régularise d’abord.',
    trop: 'Ta maison ne gagne pas de quoi payer ça tous les mois. Tu signerais ta faillite à l’encre fraîche.',
    cher: 'À ce taux-là, la banque te fait payer ta réputation. Fais-toi un nom d’abord, ça coûte moins cher.',
    long: 'Sur deux ans, c’est plus doux chaque mois, mais tu paies deux fois les intérêts. Seulement si tu n’as pas le choix.',
    sage: 'Emprunter pour rouvrir une chambre ou le bar, oui. Pour boucher un trou, une fois, jamais deux.',
  },

  journalEmprunt: {
    signe: (montant: string, taux: string, duree: number, mensualite: string) =>
      `Emprunt signé : ${montant} à ${taux} sur ${duree} mois, ${mensualite} par échéance.`,
    echeance: (montant: string) => `La banque prélève les échéances des emprunts : ${montant}.`,
    rembourse: (montant: string) => `Emprunt de ${montant} remboursé. Un tiroir de moins à ouvrir.`,
  },

  ouvertureLundi: {
    titre: 'Nouveau ce lundi : le nouvel emprunt, dans l’onglet Finances.',
    josee:
      'La banque veut bien te prêter, maintenant qu’elle connaît la maison. Par tranches de 5 000 €, à un taux qui dépend de ta réputation, et de tes retards. Lis bien la mensualité avant de signer.',
  },

  nouveauteEmprunt:
    'Nouvel emprunt, dans l’onglet Finances : par tranches de 5 000 €, sur 6, 12 ou 24 mois, à un taux qui suit ta réputation. La mensualité s’affiche avant de signer.',

  nouveaute:
    'La banque ne plaisante plus : découvert toléré jusqu’à −2 000 €, avec 1 % d’agios par jour. Au-delà, plus de salaires pour les équipes. Une mensualité impayée, c’est une lettre ; deux, c’est la faillite.',

  titreEcran: {
    faillite: (jour: number) => `Faillite au jour ${jour}`,
  },
};
