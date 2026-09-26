// Palier 5, « S'agrandir » (v0.6, partie 7) : permis de la mairie, bâtiment voisin, gérante,
// projet de deuxième établissement. Textes à remplir avec {prenom}, {e}, {Il} (voir ui/modeles.ts).

import type { Segment } from './clientele';

export type IdAgrandissement = 'etages' | 'batiment' | 'rez';

/** Les lieux possibles pour la deuxième maison ; trois sont proposés, prix tirés à ±10 %. */
export interface DefinitionLieu {
  id: string;
  nom: string;
  quartier: string;
  description: string;
  achat: number;
  travaux: number;
  jours: number;
  chambres: number;
  /** La clientèle qui s'y presserait. */
  segment: Segment;
}

export const LIEUX: DefinitionLieu[] = [
  {
    id: 'pension',
    nom: 'Une ancienne pension',
    quartier: 'De Pijp',
    description: 'Trois étages de papier peint jauni, un escalier qui craque juste ce qu’il faut, et le marché Albert Cuyp au pied de la porte.',
    achat: 32000,
    travaux: 9000,
    jours: 6,
    chambres: 4,
    segment: 'touriste',
  },
  {
    id: 'entrepot',
    nom: 'Un entrepôt de négociant',
    quartier: 'Prinsengracht',
    description: 'Poutres de chêne, poulie sous le pignon et vue sur le canal. Il y a de la place pour tout, et d’abord pour les idées.',
    achat: 45000,
    travaux: 14000,
    jours: 10,
    chambres: 5,
    segment: 'affaires',
  },
  {
    id: 'salon-the',
    nom: 'Un salon de thé fermé',
    quartier: 'Jordaan',
    description: 'Des vitrines en arc, un comptoir en marbre et des voisins qui connaissent tout le monde. Les habitués s’y sentiraient chez eux.',
    achat: 36000,
    travaux: 8000,
    jours: 5,
    chambres: 3,
    segment: 'habitue',
  },
  {
    id: 'club',
    nom: 'Un club de jazz en faillite',
    quartier: 'Rembrandtplein',
    description: 'Une scène, des banquettes de cuir, et la place la plus bruyante de la ville. Les groupes n’attendent que ça.',
    achat: 40000,
    travaux: 12000,
    jours: 8,
    chambres: 4,
    segment: 'groupe',
  },
  {
    id: 'hotel',
    nom: 'Un petit hôtel particulier',
    quartier: 'Museumplein',
    description: 'Moulures, lustres et un concierge qui a tout vu. Ici, on ne parle pas fort et on ne compte pas.',
    achat: 48000,
    travaux: 13000,
    jours: 9,
    chambres: 3,
    segment: 'vip',
  },
];

export const TEXTES_AGRANDIR = {
  briefing: (prenom: string, e: string) => `${prenom}, gérant${e}, tient la maison ce soir : pas de rendez-vous, et qui n’en peut plus part au repos.`,
  permis: {
    titre: 'Permis d’agrandir',
    detail: (prix: string) => `Pour racheter le bâtiment voisin, il faut l’accord de la mairie. Dossier : ${prix}. Réponse au prochain lundi.`,
    deposer: (prix: string) => `Déposer la demande (${prix})`,
    reputation: (seuil: number) => `Il faut une réputation de ${seuil} pour que la mairie lise le dossier.`,
    depose: 'Dossier déposé : la mairie répond lundi.',
    refuse: (seuil: number) => `Refusé lundi : la mairie veut être en bons termes avec la maison (au-dessus de +${seuil}). Tu peux redéposer.`,
    accorde: 'Permis accordé : le bâtiment voisin peut être racheté.',
    josee: 'L’échevin aime les dossiers épais et les maisons calmes. Soigne la mairie avant lundi.',
  },
  agrandissement: {
    titre: 'Le bâtiment voisin',
    detail: 'Une maison étroite, à droite de la nôtre. On la relie par le palier, et les chambres arrivent meublées, décor neuf.',
    options: {
      etages: { nom: 'Les deux étages', effet: '2 chambres : l’Atelier (premium) et la chambre du canal.' },
      batiment: { nom: 'Tout le bâtiment', effet: '3 chambres : l’Atelier (premium), la chambre du canal et la chambre du jardin.' },
      rez: { nom: 'Le rez-de-chaussée', effet: '1 chambre de plus : la chambre du jardin.' },
    } as Record<IdAgrandissement, { nom: string; effet: string }>,
    acheter: (nom: string, prix: string, jours: number) => `${nom} : ${prix}, ${jours} jours de travaux`,
    personnel: (max: number) => `Une fois agrandie, la maison peut accueillir jusqu’à ${max} personnes.`,
    enCours: (jour: number) => `Travaux chez le voisin jusqu’au jour ${jour}.`,
    fini: 'Le bâtiment voisin fait partie de la maison.',
    etagesSeuls: 'Les deux étages font partie de la maison ; le rez-de-chaussée est encore au voisin.',
    tropCher: 'Pas assez en caisse : un nouvel emprunt peut aider (onglet Finances).',
    josee: 'Plus de chambres, c’est plus de monde à faire tourner. Recrute avant que la peinture sèche.',
    voisinFerme: 'Chez le voisin',
  },
  gerante: {
    titre: 'Gérance',
    detail: (salaire: string) =>
      `À la gérance, on ne reçoit plus : on tient la maison. Salaire fixe de ${salaire} par jour, à midi.`,
    effets: [
      'Règle seule une part de toutes les alertes du quartier.',
      'Organise les rotations : chaque rendez-vous fatigue 20 % de moins.',
      'Remonte le moral de l’équipe chaque nuit.',
      'Met au repos qui est trop fatigué, avant l’ouverture.',
    ],
    promouvoir: (prenom: string, e: string) => `Proposer à ${prenom} de devenir gérant${e}`,
    conditions: (nuits: number) => `Il faut une personne confirmée, avec au moins ${nuits} nuits dans la maison.`,
    actuelle: (prenom: string, e: string) => `${prenom} est gérant${e} de la maison.`,
    retour: (prenom: string) => `Rendre ${prenom} au salon`,
    hesite: (prenom: string) => `${prenom} risque de refuser : il faudrait plus de loyauté ou de moral pour un oui.`,
    aucune: 'Personne n’est à la gérance. Propose-la depuis la fiche d’une personne (onglet Personnel).',
    statut: (e: string) => `Gérant${e}`,
    josee: 'Choisis quelqu’un de loyal. Une gérante tient la caisse, et la caisse n’a pas de mémoire.',
  },
  etablissement: {
    titre: 'Une deuxième maison',
    detail: 'Trois lieux sont à vendre en ville. On achète, on fait les travaux, et la maison attend son ouverture.',
    lieu: (quartier: string, chambres: number) => `${quartier} · ${chambres} chambres`,
    prix: (achat: string, travaux: string, jours: number) => `Achat ${achat}, puis travaux ${travaux} (${jours} jours).`,
    signer: (achat: string) => `Signer l’achat (${achat})`,
    lancer: (travaux: string, jours: number) => `Lancer les travaux (${travaux}, ${jours} jours)`,
    signe: (nom: string, quartier: string) => `${nom}, ${quartier} : l’acte est signé.`,
    enTravaux: (jour: number) => `Travaux en cours jusqu’au jour ${jour}.`,
    pret: 'Les travaux sont finis. La maison attend sa gérante et son ouverture, qui viendra avec le prochain chapitre.',
    tropCher: 'Pas assez en caisse.',
    clientele: {
      touriste: 'Les touristes s’y presseraient.',
      habitue: 'Des habitués tout trouvés.',
      affaires: 'Les clients d’affaires y passent chaque jour.',
      groupe: 'Les groupes y viendraient en bande.',
      vip: 'Les VIP y seraient à leur aise.',
      couple: 'Les couples curieux y flâneraient.',
    } as Record<Segment, string>,
    josee: 'Une deuxième maison, c’est une deuxième dette. Garde de quoi payer la première.',
  },
  journal: {
    permisDepose: (montant: string) => `Demande de permis déposée à la mairie (${montant}).`,
    permisAccorde: 'La mairie accorde le permis d’agrandir.',
    permisRefuse: 'La mairie refuse le permis d’agrandir : elle n’est pas encore convaincue.',
    agrandissement: (nom: string, montant: string, jour: number) => `Rachat chez le voisin : ${nom.toLowerCase()} (${montant}), travaux jusqu’au jour ${jour}.`,
    agrandissementFini: (n: number) => `Le bâtiment voisin ouvre ses portes : ${n} chambre${n > 1 ? 's' : ''} de plus.`,
    promotion: (prenom: string, e: string) => `${prenom} devient gérant${e} de la maison.`,
    promotionAmbition: (prenom: string, e: string) => `${prenom} devient gérant${e} : c’était son rêve.`,
    refus: (prenom: string) => `${prenom} refuse la gérance : « Je préfère le salon, pour l’instant. »`,
    retour: (prenom: string) => `${prenom} reprend sa place au salon.`,
    geranteRepos: (gerante: string, prenom: string, e: string) => `${gerante} met ${prenom} au repos ce soir : trop fatigué${e} pour tenir.`,
    caisse: (montant: string) => `La caisse ne tombe pas juste : il manque ${montant}.`,
    achat: (nom: string, quartier: string, montant: string) => `${nom}, ${quartier} : acte signé (${montant}).`,
    travaux: (montant: string, jour: number) => `Travaux de la deuxième maison lancés (${montant}), jusqu’au jour ${jour}.`,
    pret: 'La deuxième maison est prête. Il lui manque une gérante et une enseigne.',
  },
  scene: {
    versVoisin: 'Chez le voisin ›',
    versMaison: '‹ La maison',
    aVendre: 'À vendre',
    travaux: 'Travaux en cours',
  },
  ouvertures: {
    gerante: {
      titre: 'Nouveau ce lundi : la gérance, dans la fiche de chaque personne (onglet Personnel).',
      josee: 'Tu ne peux pas être partout. Confie la maison à quelqu’un de loyal : tu verras plus loin.',
    },
    etablissement: {
      titre: 'Nouveau ce lundi : le projet d’une deuxième maison, dans la fiche du bureau.',
      josee: 'Trois adresses se sont libérées en ville. Ne signe pas avec le cœur : signe avec la caisse.',
    },
  },
};
