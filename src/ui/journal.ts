import { JOSEE_RESERVE } from '../content/josee';
import { trouverChambre } from '../content/maison';
import { PALIERS } from '../content/paliers';
import { SANNE } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import type { EvenementMoteur } from '../engine/tick';
import { formaterEuros, formaterHeure } from './format';

export function prenomEmploye(id: string): string {
  return id === SANNE.id ? SANNE.prenom : id;
}

/** Texte du journal pour un événement du moteur, ou null s'il n'y a rien à raconter. */
export function texteEvenement(evenement: EvenementMoteur, partie: EtatJeu): string | null {
  const t = TEXTES.journal;
  switch (evenement.type) {
    case 'ouverture':
      return t.ouverture(partie.maison.nom);
    case 'fermeture':
      return t.fermeture;
    case 'nouveauJour':
      return t.nouveauJour(TEXTES.jours[jourDeLaSemaine(evenement.jour)] ?? '', evenement.jour);
    case 'briefing':
      return t.briefing;
    case 'arrivee':
      return t.arrivee(evenement.client);
    case 'clientParti':
      return t.clientParti(evenement.client);
    case 'filePleine':
      return t.filePleine;
    case 'debutRdv':
      return t.debutRdv(prenomEmploye(evenement.employeId), evenement.client, trouverChambre(evenement.chambreId)?.dans ?? '');
    case 'finRdv':
      return t.finRdv(evenement.client, evenement.avis, formaterEuros(evenement.montant));
    case 'salaires':
      return t.salaires(formaterEuros(evenement.montant));
    case 'charges':
      return t.charges(formaterEuros(evenement.montant));
    case 'dispute':
      return t.dispute;
    case 'disputeDegeneree':
      return t.disputeDegeneree(formaterEuros(evenement.montant));
    case 'disputeReglee':
      if (evenement.choix === 'verre') return t.disputeVerre;
      return evenement.reussite ? t.disputeCalmee(partie.joueur.prenom) : t.disputeRatee;
    case 'nettoyage':
      return t.nettoyage(trouverChambre(evenement.chambreId)?.de ?? '', formaterEuros(evenement.montant));
    case 'livraisonLinge':
      return t.livraisonLinge(formaterEuros(evenement.montant));
    case 'repos':
      return t.repos(prenomEmploye(evenement.employeId));
    case 'palier':
      return t.palier(evenement.numero, PALIERS.find((p) => p.numero === evenement.numero)?.nom ?? '');
    case 'debutTravaux':
      return t.debutTravaux(
        trouverChambre(evenement.chambreId)?.de ?? '',
        formaterEuros(evenement.montant),
        formaterHeure(evenement.fin),
      );
    case 'finTravaux':
      return t.finTravaux(trouverChambre(evenement.chambreId)?.nom ?? '');
    case 'miseEnReserve':
      return t.miseEnReserve(formaterEuros(evenement.montant));
    case 'tauxReserve':
      return t.tauxReserve(Math.round(evenement.taux * 100));
    case 'retraitReserve':
      return t.retraitReserve(
        formaterEuros(evenement.montant),
        evenement.urgence ? JOSEE_RESERVE.retraitUrgence : JOSEE_RESERVE.retraitHorsUrgence,
      );
    case 'mensualite':
      return t.mensualite(formaterEuros(evenement.montant), formaterEuros(evenement.depuisReserve));
    case 'equipeMenage':
      return t.equipeMenage(evenement.effectif);
    case 'bilan':
      return null;
    default:
      // Événement d'une version plus récente ou disparu : rien à afficher.
      return null;
  }
}
