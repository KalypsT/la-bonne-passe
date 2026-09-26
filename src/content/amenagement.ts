// Textes de l'aménagement (v0.6, partie 5) : fiches des chambres, loges et buanderie, journal.

export const TEXTES_AMENAGEMENT = {
  decor: 'Décor',
  decorActuel: (nom: string, refait: boolean) => (refait ? `${nom}, refait à neuf` : `${nom}, d’origine (défraîchi)`),
  plaitRefait: (plait: string) => `${plait.replace(/\.$/, '')} : qualité en plus pour eux.`,
  plaitAncien: 'Refait à neuf, un décor plaît davantage à sa clientèle.',
  rafraichir: (prix: string, heures: number) => `Rafraîchir la déco (${prix}, ${heures} h)`,
  rafraichirDetail: 'Peinture, tentures, literie : l’état revient à 90 %. La chambre ne reçoit pas pendant les travaux.',
  refaire: (prix: string, heures: number) => `Refaire le décor (${prix}, ${heures} h)`,
  refaireDetail: 'Choisis le style : la chambre ne reçoit pas pendant les travaux, puis plaît davantage à sa clientèle.',
  decorEnCours: (nom: string) => `Travaux : nouveau décor ${nom.toLowerCase()}.`,
  fermer: 'Fermer pour l’instant',
  rouvrir: 'Rouvrir la chambre',
  fermerDetail: 'Une chambre fermée ne reçoit plus : ni usure, ni rendez-vous. Le ménage continue.',
  fermee: 'Fermée pour l’instant',
  tropCher: (prix: string) => `Il faut ${prix} en caisse.`,
  occupee: 'Attends la fin du rendez-vous.',

  annexes: 'Pièces annexes',
  annexeFermee: 'À aménager',
  annexeOuverte: 'En service',
  annexeTravaux: 'Travaux en cours',
  renover: (prix: string, heures: number) => `Aménager (${prix}, ${heures} h de travaux)`,
  verrou: (palier: number, nom: string) => `S’ouvre au palier ${palier}, « ${nom} ».`,
  travauxFin: (heure: string) => `Travaux en cours, fin prévue à ${heure}.`,
  effet: 'Ce que ça change',
  linge: (propres: number, sales: number) => `${propres} propre${propres > 1 ? 's' : ''}, ${sales} au lavage`,

  journal: {
    rafraichir: (deChambre: string, montant: string) => `Les peintres s’installent ${deChambre} (${montant}).`,
    changerDecor: (deChambre: string, decor: string, montant: string) => `Nouveau décor ${decor.toLowerCase()} ${deChambre} : les tapissiers arrivent (${montant}).`,
    fermer: (chambre: string) => `${chambre} ferme ses rideaux pour l’instant.`,
    rouvrir: (chambre: string) => `${chambre} rouvre ses rideaux.`,
    travauxAnnexe: (nom: string, montant: string) => `Travaux : ${nom.toLowerCase()} (${montant}).`,
    finTravauxAnnexe: (nom: string) => `${nom} : les travaux sont finis.`,
    parureUsee: 'Une parure trop usée finit en chiffon à poussière.',
  },
};
