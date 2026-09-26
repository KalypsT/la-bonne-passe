import type { IdFormule, IdPriorite, IdSelection, IdVisibilite } from '../content/balance';
import { TEXTES_PLAFOND } from '../content/plafond';
import { TEXTES_BANQUE } from '../content/banque';
import { CLIENTS } from '../content/clientele';
import { trouverImprevu } from '../content/imprevus';
import { trouverIntrigue } from '../content/intrigues';
import { TEXTES_ALERTES } from '../content/alertes';
import { trouverDefi } from '../content/defis';
import { trouverTendance } from '../content/tendances';
import { trouverTheme } from '../content/themes';
import { TEXTES_FORMULES, TEXTES_PRIORITES, TEXTES_SELECTIONS, TEXTES_TARIFS, TEXTES_VISIBILITES } from '../content/regles';
import { JOSEE_RESERVE } from '../content/josee';
import { ANNEXES, DECORS, trouverChambre } from '../content/maison';
import { TEXTES_AMENAGEMENT } from '../content/amenagement';
import { PALIERS } from '../content/paliers';
import { TEXTES_ACTIONS_RELATIONS, TEXTES_SEUILS_RELATIONS } from '../content/relations';
import { TEXTES_JOURNAL_RIVALE, TEXTES_REPONSES_RIVALE } from '../content/rivale';
import { TEXTES_EQUIPES } from '../content/equipes';
import { TEXTES } from '../content/textes';
import type { EtatJeu, Regles } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import type { EvenementMoteur } from '../engine/tick';
import { formaterEuros, formaterHeure, formaterTaux } from './format';
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
    case 'visibilite':
      return t.visibilite(TEXTES_VISIBILITES[valeur as IdVisibilite]?.nom ?? '');
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
    case 'visibilite':
      return t.visibiliteCout(formaterEuros(evenement.montant));
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
    case 'commandeLingeAuto':
      return t.commandeLingeAuto(evenement.parures, formaterEuros(evenement.montant));
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
    case 'agios':
      return TEXTES_BANQUE.journal.agios(formaterEuros(evenement.montant));
    case 'decouvert':
      return evenement.niveau === 1 ? TEXTES_BANQUE.journal.decouvert : TEXTES_BANQUE.journal.decouvertDepasse;
    case 'salairesImpayes':
      return TEXTES_BANQUE.journal.salairesImpayes(formaterEuros(evenement.montant), formaterEuros(evenement.dus));
    case 'salairesRattrapes':
      return TEXTES_BANQUE.journal.salairesRattrapes(formaterEuros(evenement.montant));
    case 'departEquipe':
      return TEXTES_BANQUE.journal.departEquipe(evenement.equipe);
    case 'mensualiteImpayee':
      return TEXTES_BANQUE.journal.mensualiteImpayee(formaterEuros(evenement.montant), evenement.limite);
    case 'regularisation':
      return TEXTES_BANQUE.journal.regularisation(formaterEuros(evenement.montant));
    case 'faillite':
      return TEXTES_BANQUE.journal.faillite;
    case 'emprunt':
      return TEXTES_BANQUE.journalEmprunt.signe(formaterEuros(evenement.montant), formaterTaux(evenement.taux), evenement.duree, formaterEuros(evenement.mensualite));
    case 'echeanceEmprunts':
      return TEXTES_BANQUE.journalEmprunt.echeance(formaterEuros(evenement.montant));
    case 'impotAnnonce':
      return TEXTES_BANQUE.impot.journalAnnonce(evenement.jour, formaterEuros(evenement.estimation));
    case 'impot':
      return evenement.montant > 0
        ? TEXTES_BANQUE.impot.journal(formaterEuros(evenement.montant), formaterEuros(evenement.benefice))
        : TEXTES_BANQUE.impot.journalRien;
    case 'gestionJosee':
      return evenement.active ? TEXTES_BANQUE.gestion.journalActive : TEXTES_BANQUE.gestion.journalReprise;
    case 'commissionJosee':
      return TEXTES_BANQUE.gestion.journalCommission(formaterEuros(evenement.montant));
    case 'sursis':
      return TEXTES_BANQUE.gestion.journalSursis(formaterEuros(evenement.montant));
    case 'expressRatee':
      return evenement.quoi === 'linge' ? TEXTES_BANQUE.fournisseurs.expressLinge : TEXTES_BANQUE.fournisseurs.expressBar;
    case 'rafraichir':
      return TEXTES_AMENAGEMENT.journal.rafraichir(trouverChambre(evenement.chambreId)?.dans ?? '', formaterEuros(evenement.montant));
    case 'changerDecor':
      return TEXTES_AMENAGEMENT.journal.changerDecor(trouverChambre(evenement.chambreId)?.dans ?? '', DECORS[evenement.decor].nom, formaterEuros(evenement.montant));
    case 'fermerChambre': {
      const nom = trouverChambre(evenement.chambreId)?.nom ?? '';
      return evenement.fermee ? TEXTES_AMENAGEMENT.journal.fermer(nom) : TEXTES_AMENAGEMENT.journal.rouvrir(nom);
    }
    case 'travauxAnnexe':
      return TEXTES_AMENAGEMENT.journal.travauxAnnexe(ANNEXES[evenement.annexe].nom, formaterEuros(evenement.montant));
    case 'finTravauxAnnexe':
      return TEXTES_AMENAGEMENT.journal.finTravauxAnnexe(ANNEXES[evenement.annexe].nom);
    case 'parureUsee':
      return TEXTES_AMENAGEMENT.journal.parureUsee;
    case 'empruntRembourse':
      return TEXTES_BANQUE.journalEmprunt.rembourse(formaterEuros(evenement.montant));
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
    case 'plafondRefuse':
      return TEXTES_PLAFOND.journalRefus(evenement.prenom);
    case 'plafondAccord':
      return evenement.contrepartie === 'prime'
        ? TEXTES_PLAFOND.journalPrime(evenement.prenom, formaterEuros(evenement.montant))
        : TEXTES_PLAFOND.journalRepos(evenement.prenom);
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
    case 'alerteMinutee':
    case 'alerteTraitee':
    case 'alerteManquee': {
      const def = TEXTES_ALERTES[evenement.id];
      const p = evenement.prenom ? { prenom: evenement.prenom, genre: genreDe(partie, evenement.prenom) } : undefined;
      const texte =
        evenement.type === 'alerteMinutee'
          ? def.journal
          : evenement.type === 'alerteManquee'
            ? def.manquee
            : evenement.reussite
              ? (def.traitee[evenement.action] ?? '')
              : (def.rate ?? '');
      return texte ? remplir(texte, partie, p) : null;
    }
    case 'alerteReglee':
      return TEXTES_ALERTES[evenement.id].reglee ?? null;
    case 'disputeEvitee':
      return TEXTES_EQUIPES.journal.disputeEvitee;
    case 'equipeQuartier':
      return TEXTES_EQUIPES.journal.effectif(evenement.equipe, evenement.effectif);
    case 'assurance':
      return TEXTES_EQUIPES.journal.assurance(evenement.niveau);
    case 'primeAssurance':
      return TEXTES_EQUIPES.journal.prime(formaterEuros(evenement.montant));
    case 'indemnisation':
      return TEXTES_EQUIPES.journal.indemnisation(formaterEuros(evenement.montant), evenement.sinistre);
    case 'defi': {
      const def = trouverDefi(evenement.id);
      return def ? t.defi(def.titre) : null;
    }
    case 'defiConclu': {
      const def = trouverDefi(evenement.id);
      return def ? t.defiConclu(def.titre, evenement.reussi) : null;
    }
    case 'bilanMois':
      return t.bilanMois(evenement.numero, evenement.reussi);
    case 'candidatVedette':
      return t.candidatVedette(evenement.prenom);
    case 'remboursement':
      return t.remboursement(evenement.prenom, formaterEuros(evenement.montant));
    case 'actionRelation': {
      const def = TEXTES_ACTIONS_RELATIONS[evenement.action];
      const texte = def && (evenement.reussite ? def.journal : (def.journalEchec ?? def.journal));
      return texte ? remplir(texte, partie) : null;
    }
    case 'rivaleHumeur':
      return remplir(TEXTES_JOURNAL_RIVALE.humeur(evenement.humeur), partie);
    case 'reponseRivale': {
      const def = TEXTES_REPONSES_RIVALE[evenement.reponse];
      return remplir(evenement.reussite ? def.journal : (def.journalEchec ?? def.journal), partie);
    }
    case 'treveFinie':
      return TEXTES_JOURNAL_RIVALE.treveFinie;
    case 'rivaleAgit':
      // La carte de la rivale raconte elle-même ; un sabotage ou un débauchage se découvrent plus tard.
      return null;
    case 'seuilRelation':
      return remplir(TEXTES_SEUILS_RELATIONS[evenement.acteur][evenement.termes], partie);
    case 'bilan':
      return null;
    default:
      // Événement d'une version plus récente ou disparu : rien à afficher.
      return null;
  }
}
