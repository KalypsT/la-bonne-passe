import type { IdFormule, IdPriorite, IdSelection } from '../content/balance';
import { CLIENTS } from '../content/clientele';
import { trouverImprevu } from '../content/imprevus';
import { trouverIntrigue } from '../content/intrigues';
import { trouverTendance } from '../content/tendances';
import { trouverTheme } from '../content/themes';
import { TEXTES_FORMULES, TEXTES_PRIORITES, TEXTES_SELECTIONS, TEXTES_TARIFS } from '../content/regles';
import { JOSEE_RESERVE } from '../content/josee';
import { trouverChambre } from '../content/maison';
import { PALIERS } from '../content/paliers';
import { TEXTES } from '../content/textes';
import type { EtatJeu, Regles } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import type { EvenementMoteur } from '../engine/tick';
import { formaterEuros, formaterHeure } from './format';
import { remplir } from './modeles';

/** Genre d'une personne de l'équipe, retrouvée par son identifiant ou son prénom. */
function genreDe(partie: EtatJeu, cle: string | undefined): 'f' | 'm' {
  return partie.personnel.find((e) => e.id === cle || e.prenom === cle)?.genre ?? 'f';
}

function nomDuJour(jour: number): string {
  return TEXTES.date(TEXTES.jours[jourDeLaSemaine(jour)] ?? '', jour).toLowerCase();
}

/** Prénom d'une personne : celui que porte l'événement, sinon celui de l'équipe actuelle. */
export function prenomEmploye(partie: EtatJeu, id: string, prenom?: string): string {
  return prenom ?? partie.personnel.find((e) => e.id === id)?.prenom ?? id;
}

/** Une règle de la maison a changé : son nouveau nom. */
function texteRegle(regle: keyof Regles, valeur: number | string): string | null {
  const t = TEXTES.journal;
  switch (regle) {
    case 'tarif':
      return TEXTES_TARIFS[valeur as number] ? t.tarif(TEXTES_TARIFS[valeur as number]!.nom) : null;
    case 'formule':
      return t.formule(TEXTES_FORMULES[valeur as IdFormule]?.nom ?? '');
    case 'selection':
      return t.selection(TEXTES_SELECTIONS[valeur as IdSelection]?.nom ?? '');
    case 'priorite':
      return t.priorite(TEXTES_PRIORITES[valeur as IdPriorite]?.nom ?? '');
  }
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
      return t.debutRdv(prenomEmploye(partie, evenement.employeId, evenement.prenom), evenement.client, trouverChambre(evenement.chambreId)?.dans ?? '');
    case 'finRdv':
      return t.finRdv(evenement.client, evenement.avis, formaterEuros(evenement.montant));
    case 'salaires':
      return t.salaires(formaterEuros(evenement.montant));
    case 'debutTravauxBar':
      return t.debutTravauxBar(formaterEuros(evenement.montant), formaterHeure(evenement.fin));
    case 'finTravauxBar':
      return t.finTravauxBar;
    case 'equipeBar':
      return t.equipeBar(evenement.effectif);
    case 'livraisonBar':
      return t.livraisonBar(formaterEuros(evenement.montant));
    case 'barVide':
      return t.barVide;
    case 'bilanSemaine': {
      const b = partie.bilanSemaine;
      return b && b.numero === evenement.numero ? t.bilanSemaine(b.numero, formaterEuros(b.resultat)) : null;
    }
    case 'theme': {
      const theme = trouverTheme(evenement.id);
      return theme ? t.theme(theme.annonce, formaterEuros(evenement.montant)) : null;
    }
    case 'tendance': {
      const tendance = trouverTendance(evenement.id);
      return tendance ? t.tendance(tendance.nom) : null;
    }
    case 'grossiste':
      return t.grossiste;
    case 'avanceFournisseur':
      return evenement.accepter && evenement.echeance !== null
        ? t.avanceAcceptee(formaterEuros(evenement.montant), nomDuJour(evenement.echeance))
        : t.avanceRefusee;
    case 'remboursementAvance':
      return t.remboursementAvance(formaterEuros(evenement.montant));
    case 'refuse':
      return t.refuse(evenement.client, CLIENTS.find((c) => c.nom === evenement.client)?.genre === 'f');
    case 'portier':
      return t.portier(formaterEuros(evenement.montant));
    case 'regle':
      return texteRegle(evenement.regle, evenement.valeur);
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
      return t.repos(prenomEmploye(partie, evenement.employeId, evenement.prenom));
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
    case 'visite':
      return t.visite(evenement.prenom);
    case 'marche':
      return t.marche(evenement.nombre);
    case 'candidatParti':
      return t.candidatParti(evenement.prenom);
    case 'contreOffre':
      return t.contreOffre(evenement.prenom, Math.round(evenement.part * 100));
    case 'candidatVexe':
      return t.candidatVexe(evenement.prenom);
    case 'candidatRefuse':
      return t.candidatRefuse(evenement.prenom);
    case 'reflexion':
      return t.reflexion(evenement.prenom);
    case 'embauche':
      return t.embauche(evenement.prenom, Math.round(evenement.part * 100));
    case 'finEssai':
      return t.finEssai(evenement.prenom);
    case 'essaiConfirme':
      return t.essaiConfirme(evenement.prenom);
    case 'finCollaboration':
      return t.finCollaboration(evenement.prenom);
    case 'traitRevele':
      return t.traitRevele(evenement.prenom, evenement.trait);
    case 'menaceDepart':
      return t.menaceDepart(evenement.prenom, nomDuJour(evenement.jour), genreDe(partie, evenement.employeId));
    case 'menaceLevee':
      return t.menaceLevee(evenement.prenom);
    case 'depart':
      return t.depart(evenement.prenom);
    case 'promesseRompue':
      return t.promesseRompue(evenement.prenom, genreDe(partie, evenement.employeId));
    case 'entretienIndividuel':
      return evenement.reponse === 'ecouter'
        ? t.entretienEcouter(evenement.prenom)
        : evenement.reponse === 'promettre'
          ? t.entretienPromettre(evenement.prenom)
          : t.entretienRecadrer(evenement.prenom);
    case 'prime':
      return t.prime(evenement.prenom, formaterEuros(evenement.montant));
    case 'amitie':
      return t.amitie(evenement.prenom, evenement.prenom2);
    case 'rivalite':
      return t.rivalite(evenement.prenom, evenement.prenom2);
    case 'imprevu': {
      const def = trouverImprevu(evenement.id);
      const e = partie.personnel.find((x) => x.id === evenement.employeId);
      const e2 = partie.personnel.find((x) => x.id === evenement.employe2Id);
      return def ? t.imprevu(remplir(def.titre, partie, e, e2)) : null;
    }
    case 'imprevuTranche': {
      const choix = trouverImprevu(evenement.id)?.choix[evenement.choix];
      if (!choix) return null;
      const texte = evenement.reussite ? choix.journal : (choix.journalEchec ?? choix.journal);
      const p1 = evenement.prenom ? { prenom: evenement.prenom, genre: genreDe(partie, evenement.prenom) } : undefined;
      const p2 = evenement.prenom2 ? { prenom: evenement.prenom2, genre: genreDe(partie, evenement.prenom2) } : undefined;
      return remplir(texte, partie, p1, p2);
    }
    case 'intrigue': {
      const etape = trouverIntrigue(evenement.id)?.etapes[evenement.etape];
      const e = partie.personnel.find((x) => x.id === evenement.employeId);
      return etape ? t.intrigue(remplir(etape.titre, partie, e)) : null;
    }
    case 'intrigueTranchee': {
      const choix = trouverIntrigue(evenement.id)?.etapes[evenement.etape]?.choix[evenement.choix];
      if (!choix) return null;
      const texte = evenement.reussite ? choix.journal : (choix.journalEchec ?? choix.journal);
      const p = evenement.prenom ? { prenom: evenement.prenom, genre: genreDe(partie, evenement.prenom) } : undefined;
      return remplir(texte, partie, p);
    }
    case 'intrigueFinie': {
      const texte = trouverIntrigue(evenement.id)?.fins[evenement.fin]?.texte;
      const p = evenement.prenom ? { prenom: evenement.prenom, genre: genreDe(partie, evenement.prenom) } : undefined;
      return texte ? remplir(texte, partie, p) : null;
    }
    case 'bilan':
      return null;
    default:
      // Événement d'une version plus récente ou disparu : rien à afficher.
      return null;
  }
}
