// Le mode libre (v1.0, partie 3) : après la fin du chapitre, un objectif simple chaque semaine, tiré au sort.
// Plus aucun palier ne s'ouvre ; les intrigues continuent. Valeurs dans balance.ts (MODE_LIBRE).
// {cible} et {segment} se remplissent dans ui/objectifs.ts ; {maison} et {joueur} dans ui/modeles.ts.

import type { Segment } from './clientele';

export type TypeObjectifLibre = 'recette' | 'calme' | 'segment' | 'record';

/** Les segments dans une phrase : « Les {segment} t'en veulent ». */
export const SEGMENTS_PHRASE: Record<Segment, string> = {
  touriste: 'touristes',
  habitue: 'habitués',
  affaires: 'clients d’affaires',
  groupe: 'groupes',
  vip: 'VIP',
  couple: 'couples curieux',
};

export interface TexteObjectifLibre {
  titre: string;
  texte: string;
  /** Ce que la réussite rapporte, en clair. */
  recompense: string;
  reussite: string;
  echec: string;
}

export const OBJECTIFS_LIBRES: Record<TypeObjectifLibre, TexteObjectifLibre> = {
  recette: {
    titre: 'Une belle semaine',
    texte: 'Fais entrer {cible} de recette cette semaine (rendez-vous, bar et divers), un peu mieux que ton rythme habituel.',
    recompense: '+1 de réputation',
    reussite: 'La caisse sonne juste et fort. Le quartier sait compter, lui aussi.',
    echec: 'Une semaine ordinaire. Ce n’est pas un crime, mais ce n’est pas une fête non plus.',
  },
  calme: {
    titre: 'Une semaine sans histoire',
    texte: 'Pas une dispute qui dégénère, pas une alerte manquée de toute la semaine. La maison respire, et ça se voit.',
    recompense: '+4 de moral pour l’équipe, +1 de réputation',
    reussite: 'Sept soirs sans un éclat de voix. L’équipe a dormi comme un chat.',
    echec: 'Il y a eu du bruit. Dans ce métier, le calme est un luxe qu’on paie en attention.',
  },
  segment: {
    titre: 'Reconquérir',
    texte: 'Les {segment} t’en veulent un peu. Fais monter leur satisfaction de {cible} points d’ici lundi.',
    recompense: '+4 de satisfaction pour eux',
    reussite: 'Ils reviennent, et ils le disent. Rien ne vaut un client qu’on a su regagner.',
    echec: 'Ils boudent encore. Regarde ce qu’ils attendent, dans l’onglet Clientèle.',
  },
  record: {
    titre: 'Battre un record',
    texte: 'Fais entrer au moins {cible} de recette cette semaine : mieux que ta meilleure semaine du mois écoulé. Tarifs, thèmes, champagne : tout est permis.',
    recompense: '+5 de moral pour l’équipe, +2 de réputation',
    reussite: 'Record battu. L’équipe a mal aux pieds et le sourire aux lèvres.',
    echec: 'Le record tient bon. Il sera encore là la semaine prochaine.',
  },
};

export const TEXTES_MODE_LIBRE = {
  titre: 'Objectif de la semaine',
  passe: 'L’objectif de la semaine passée',
  nouveau: 'L’objectif de cette semaine',
  serie: (n: number) => `Série en cours : ${n} semaine${n > 1 ? 's' : ''} réussie${n > 1 ? 's' : ''}.`,
  bilan: (reussis: number, rates: number) => `Depuis la fin du chapitre : ${reussis} réussi${reussis > 1 ? 's' : ''}, ${rates} manqué${rates > 1 ? 's' : ''}.`,
  progression: (valeur: string, cible: string) => `${valeur} sur ${cible}`,
  incidents: (n: number) => (n === 0 ? 'Aucun incident pour l’instant.' : `${n} incident${n > 1 ? 's' : ''} déjà.`),
  ouverture: {
    titre: 'Nouveau ce lundi : le mode libre',
    josee:
      'Le chapitre est bouclé, mais la maison ne ferme pas pour autant. Plus de palier à décrocher : chaque lundi, je te donnerai un objectif simple. Une recette, une semaine calme, des clients à reconquérir, un record. À toi de voir si tu tiens la série.',
  },
  journal: {
    nouveau: (titre: string) => `Objectif de la semaine : ${titre.toLowerCase()}.`,
    reussi: (titre: string) => `Objectif réussi : ${titre.toLowerCase()}.`,
    rate: (titre: string) => `Objectif manqué : ${titre.toLowerCase()}.`,
  },
};
