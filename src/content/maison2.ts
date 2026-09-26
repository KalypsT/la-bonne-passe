// La deuxième maison ouverte (v1.0, partie 1) : sa gérante, son inauguration, sa consigne de la semaine
// et son bilan du lundi. Elle tourne seule : pas de scène, un résumé. Valeurs dans balance.ts (MAISON2).
// Accords : `e` vaut '' au masculin et 'e' au féminin ; {prenom}, {joueur}, {maison} se remplissent dans ui/modeles.ts.

import type { IdConsigne } from './balance';
import type { DefinitionEmploye } from './personnel';

/** La gérante venue d'ailleurs, présentée par Josée : chère, peu attachée, mais elle ne dégarnit pas l'équipe. */
export const GERANTE_EXTERNE: DefinitionEmploye = {
  id: 'margot',
  prenom: 'Margot',
  age: 46,
  accroche: 'Vingt ans à l’accueil d’un grand hôtel du Dam. Rien ne l’étonne, tout se note.',
  genre: 'f',
  talents: { charme: 3, conversation: 4, audace: 2, discretion: 5 },
  traits: ['Solitaire', 'Ambitieuse'],
  ambition: 'gerante',
  part: 0.5,
  moral: 65,
  loyaute: 45,
  fatigue: 0,
  silhouette: { teint: '#E8B894', cheveux: '#2B1B14', coiffure: 'chignon', haut: '#1C1C22', bas: '#1C1C22', accent: '#D4A64A', lunettes: true, robe: true },
};

export interface TexteConsigne {
  nom: string;
  effet: string;
}

export const CONSIGNES: Record<IdConsigne, TexteConsigne> = {
  prudente: { nom: 'Prudente', effet: 'Moins de monde, presque pas d’incident. La réputation et la loyauté montent.' },
  equilibree: { nom: 'Équilibrée', effet: 'Le rythme de croisière : un incident de temps en temps.' },
  ambitieuse: { nom: 'Ambitieuse', effet: 'Plus de monde, plus d’incidents. La réputation et la loyauté s’usent.' },
};

/** Incidents possibles dans la semaine de la deuxième maison, racontés au bilan du lundi. */
export const INCIDENTS_MAISON2: { id: string; texte: string }[] = [
  { id: 'peignoir', texte: 'Un client a voulu repartir avec le peignoir, et le peignoir avec le client. Il a fallu négocier.' },
  { id: 'canalisation', texte: 'Une canalisation a lâché au deuxième, pile le soir le plus chargé de la semaine.' },
  { id: 'fenetre', texte: 'Un voisin a filmé l’entrée depuis sa fenêtre. L’avocat a coûté plus cher que le voisin.' },
  { id: 'habitues', texte: 'Deux habitués se sont disputé la même chambre, puis la même personne. La vaisselle a perdu.' },
  { id: 'hygiene', texte: 'Un inspecteur de l’hygiène est passé à l’improviste. Il est reparti avec une amende à nous faire payer et un sourire.' },
];

export function trouverIncident(id: string | null) {
  return INCIDENTS_MAISON2.find((i) => i.id === id);
}

export const TEXTES_MAISON2 = {
  titre: (quartier: string) => `La maison de ${quartier}`,
  choisir: 'Il lui faut quelqu’un pour la tenir. Une personne de l’équipe, qui quitte le salon pour de bon, ou une gérante venue d’ailleurs.',
  equipe: 'Dans l’équipe',
  conditions: (nuits: number) => `Il faut une personne confirmée, avec au moins ${nuits} nuits dans la maison, et qui ne soit pas seule au salon.`,
  aucuneEquipe: 'Personne dans l’équipe ne remplit encore les conditions.',
  confier: (prenom: string) => `Confier à ${prenom}`,
  hesite: (prenom: string) => `${prenom} risque de refuser : il faudrait plus de loyauté ou de moral pour un oui.`,
  talents: (moyenne: string) => `talents ${moyenne}`,
  externe: {
    titre: 'Venue d’ailleurs',
    presentation: (age: number, accroche: string) => `${age} ans. ${accroche}`,
    engager: (prenom: string, salaire: string) => `Engager ${prenom} (${salaire} par jour)`,
    josee: 'Margot ne te doit rien, et elle le sait. Paie-la bien, ne la presse pas, et elle finira par s’attacher.',
  },
  salaire: (montant: string) => `Salaire : ${montant} par jour, payé avec le bilan du lundi.`,
  inaugurer: (prix: string) => `Inaugurer la maison (${prix})`,
  inaugurerDetail: 'Champagne, voisins et presse invités : la maison ouvre ce soir. La réputation de départ est meilleure si la presse t’aime bien.',
  rouvrir: 'Rouvrir la maison',
  tropCher: 'Pas assez en caisse.',
  tenue: (prenom: string, e: string) => `Tenue par ${prenom}, gérant${e}.`,
  rappeler: (prenom: string) => `Rappeler ${prenom} au salon`,
  finContrat: (prenom: string) => `Mettre fin au contrat de ${prenom}`,
  salonComplet: (prenom: string) => `Le salon est complet : pas de place pour faire revenir ${prenom}.`,
  ouverteDepuis: (jour: number) => `Ouverte depuis le jour ${jour}.`,
  fermee: 'La maison est fermée en attendant sa gérante.',
  reputation: 'Réputation',
  loyaute: 'Loyauté de la gérante',
  total: 'Rapporté depuis l’ouverture',
  dernierBilan: 'Dernière semaine',
  consigne: {
    titre: 'Consigne de la semaine',
    detail: 'Une consigne vaut à partir du prochain lundi.',
    enCours: (nom: string) => `En vigueur cette semaine : ${nom}.`,
  },
  josee: 'Une gérante qu’on surveille trop finit par partir. Donne une consigne, lis ses comptes, et laisse-la travailler.',
  annonces: {
    prete: {
      titre: 'La deuxième maison est prête',
      texte:
        'Les peintres sont partis. Des chambres, une enseigne, des draps neufs : il ne manque que quelqu’un pour la tenir. Choisis bien, {joueur} : tu ne seras pas là pour surveiller. Tout se passe dans la fiche du bureau.',
    },
    inauguree: {
      titre: 'Inauguration',
      texte: (gerante: string) =>
        `Champagne, voisins curieux et deux journalistes qui ont fait semblant de ne pas se connaître. ${gerante} tient la maison ; toi, tu recevras ses comptes chaque lundi. Une consigne par semaine, pas plus.`,
    },
    demission: {
      titre: 'La gérante s’en va',
      texte: (prenom: string, e: string) =>
        `${prenom} a rendu ses clés ce matin : « Je ne suis pas fait${e} pour tenir une maison qu’on me reproche. » La maison ferme en attendant quelqu’un d’autre. On ne retient personne de force, {joueur}.`,
    },
    ok: 'Entendu',
  },
  bilan: {
    titre: (quartier: string) => `La maison de ${quartier}`,
    activite: (nuits: number, rdv: number) => `${nuits} soirée${nuits > 1 ? 's' : ''}, ${rdv} rendez-vous.`,
    recette: 'Recette de la maison',
    frais: 'Charges, salaire et incidents',
    resultat: 'Résultat',
    reputation: (avant: number, apres: number) => `Réputation ${avant} → ${apres}.`,
    caisse: (montant: string) => `La caisse ne tombe pas juste : il manque ${montant}.`,
    remarques: {
      bonne: '« Salle comble, caisse juste. Je ne demande qu’une chose : que ça dure. »',
      moyenne: '« On se fait connaître, doucement. Les habitués d’ici ne se donnent pas au premier soir. »',
      mauvaise: '« Semaine creuse. J’ai des idées, il me faut du temps. »',
      incident: '« Une semaine à oublier. Rien de grave, mais je préfère te le dire moi-même. »',
      loyauteBasse: '« Tout va très bien. Ne t’occupe pas des comptes, je m’en charge. »',
    },
    /** Au-dessus de ce résultat, la semaine est bonne ; sous zéro, mauvaise. */
    seuilBonne: 1500,
  },
  journal: {
    confiee: (prenom: string, e: string) => `${prenom} devient gérant${e} de la deuxième maison.`,
    refus: (prenom: string) => `${prenom} refuse de tenir la deuxième maison : « Ma place est ici, pour l’instant. »`,
    engagee: (prenom: string) => `${prenom} est engagée pour tenir la deuxième maison.`,
    inauguration: (montant: string) => `Inauguration de la deuxième maison (${montant}).`,
    rouverte: 'La deuxième maison rouvre ses portes.',
    rappel: (prenom: string) => `${prenom} quitte la deuxième maison et reprend sa place au salon.`,
    finContrat: (prenom: string) => `Fin du contrat de ${prenom} : la deuxième maison ferme en attendant.`,
    bilan: (resultat: string) => `Comptes de la deuxième maison : ${resultat} sur la semaine.`,
    demission: (prenom: string) => `${prenom} quitte la deuxième maison : elle ferme en attendant.`,
    consigne: (nom: string) => `Consigne à la deuxième maison pour lundi : ${nom.toLowerCase()}.`,
  },
  statut: {
    travaux: (jour: number) => `travaux jusqu’au jour ${jour}`,
    aVendre: (n: number) => `${n} lieux à vendre`,
  },
};
