// Les pièces de la maison d'origine, à Amsterdam.

export interface DefinitionChambre {
  id: string;
  nom: string;
  theme: string;
  premium: boolean;
  /** En service dès le départ ; les autres dorment sous des draps. */
  ouverteAuDepart: boolean;
}

export const CHAMBRES: DefinitionChambre[] = [
  { id: 'boudoir', nom: 'Boudoir', theme: 'Rose poudré et guirlandes', premium: false, ouverteAuDepart: true },
  { id: 'orientale', nom: 'Chambre orientale', theme: 'Coussins, lanternes et thé à la menthe', premium: false, ouverteAuDepart: false },
  { id: 'velours', nom: 'Suite velours', theme: 'Damas bordeaux et lustre', premium: true, ouverteAuDepart: false },
  { id: 'miroirs', nom: 'Chambre miroirs', theme: 'Miroirs biseautés, satin rose', premium: true, ouverteAuDepart: false },
];

export interface DefinitionPiece {
  id: 'salon' | 'bar' | 'bureau';
  nom: string;
  description: string;
}

export const PIECES_COMMUNES: DefinitionPiece[] = [
  { id: 'salon', nom: 'Salon', description: 'Là où le personnel attend et où les clients patientent.' },
  { id: 'bar', nom: 'Bar', description: 'Fermé depuis des années. Les bouteilles aussi.' },
  { id: 'bureau', nom: 'Bureau', description: 'Ton bureau : un coffre, une lampe et des factures.' },
];

export function trouverChambre(id: string): DefinitionChambre | undefined {
  return CHAMBRES.find((c) => c.id === id);
}

export function trouverPiece(id: DefinitionPiece['id']): DefinitionPiece {
  return PIECES_COMMUNES.find((p) => p.id === id)!;
}
