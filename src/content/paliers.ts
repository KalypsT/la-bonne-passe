// Paliers de montée en puissance (voir « Montée en puissance » dans les spécifications).

export interface DefinitionPalier {
  numero: number;
  nom: string;
  objectif: string;
  ouvre: string;
}

export const PALIERS: DefinitionPalier[] = [
  { numero: 0, nom: 'Départ', objectif: '', ouvre: 'Sanne, le Boudoir, le salon et le bureau.' },
  {
    numero: 1,
    nom: 'Rouvrir',
    objectif: 'Boucler une première soirée.',
    ouvre: 'Recrutement, rénovation des chambres, planning du soir, réserve de sécurité.',
  },
  {
    numero: 2,
    nom: 'Se faire un nom',
    objectif: 'Atteindre 25 de réputation.',
    ouvre: 'Bar, onglet Clientèle, tarifs et formules, clients d’affaires et groupes.',
  },
  {
    numero: 3,
    nom: 'Tenir la maison',
    objectif: 'Payer la première mensualité.',
    ouvre: 'Accueil et sécurité, soirées à thème, onglet Relations, emprunt, assurance.',
  },
  {
    numero: 4,
    nom: 'Monter en gamme',
    objectif: 'Réputation 50 et 4 personnes.',
    ouvre: 'VIP, formations, chambres de luxe, changement de nom de la maison.',
  },
  {
    numero: 5,
    nom: 'S’agrandir',
    objectif: 'Réputation 70 et accord de la mairie.',
    ouvre: 'Agrandissement, gérantes, deuxième établissement.',
  },
];
