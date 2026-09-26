// Alertes minutées de la soirée : elles naissent de l'état de la maison, attendent une réaction,
// et ont une conséquence si on les laisse filer. Textes dans src/content/alertes.ts, valeurs dans balance.ts.
// Voir « Ce qui rend la soirée active » dans les spécifications.

import * as B from '../content/balance';
import type { IdAlerte } from '../content/alertes';
import { CLIENTS, type Segment } from '../content/clientele';
import type { EtatJeu } from './etat';
import { creerTirage, type Tirage } from './hasard';
import { barSert } from './bar';
import { changerReputationGlobale, changerSatisfaction } from './clientele';
import { depenser, encaisser } from './comptes';
import { changerLoyaute, changerMoral } from './personnel';
import { changerTapage } from './quartier';
import { visibiliteActive } from './regles';
import { equipeDe, partReglee, type EvenementEquipe } from './equipes';
import { changerRelations, relationsOuvertes, type EvenementRelation } from './relations';
import { ecart, instant } from './temps';

export interface AlerteMinutee {
  id: IdAlerte;
  /** Identifiant unique de l'alerte (type et cible). */
  cle: string;
  /** Client (son numéro) ou personne concernée, ou null. */
  cible: string | null;
  debut: number;
  /** Instant où elle a sa conséquence, si personne n'a réagi. */
  expire: number;
}

export type EvenementMinuterie =
  | { type: 'alerteMinutee'; id: IdAlerte; prenom?: string }
  | { type: 'alerteTraitee'; id: IdAlerte; action: number; reussite: boolean; prenom?: string }
  | { type: 'alerteManquee'; id: IdAlerte; prenom?: string }
  | { type: 'dispute' }
  | EvenementRelation
  | EvenementEquipe;

export type OrdreMinuterie = { type: 'traiterAlerte'; cle: string; action: number };

interface Sortie {
  push(e: EvenementMinuterie): unknown;
}

const borner = (v: number) => Math.min(100, Math.max(0, v));

function segmentDe(modele: string): Segment | undefined {
  return CLIENTS.find((c) => c.id === modele)?.segment;
}

function prenomDe(etat: EtatJeu, a: AlerteMinutee): string | undefined {
  return a.id === 'pause' ? etat.personnel.find((e) => e.id === a.cible)?.prenom : undefined;
}

/** Une personne en pause n'est pas disponible pour un rendez-vous. */
export function enPause(etat: EtatJeu, employeId: string): boolean {
  const e = etat.personnel.find((x) => x.id === employeId);
  return !!e && (e.pauseJusqua ?? 0) > instant(etat);
}

function ajouter(etat: EtatJeu, id: IdAlerte, cible: string | null, delai: number, evenements: Sortie, tirage: Tirage): void {
  const maintenant = instant(etat);
  const a: AlerteMinutee = { id, cle: cible === null ? id : `${id}-${cible}`, cible, debut: maintenant, expire: maintenant + delai };
  // L'équipe du domaine (Accueil, Sécurité) règle parfois l'affaire avant qu'une bulle n'apparaisse.
  const equipe = equipeDe(id);
  if (equipe && etat.equipes[equipe] > 0 && tirage.chance(partReglee(etat, equipe))) {
    reglerSeule(etat, a);
    evenements.push({ type: 'alerteReglee', id, equipe });
    return;
  }
  etat.minuteries.push(a);
  evenements.push({ type: 'alerteMinutee', id, prenom: prenomDe(etat, a) });
}

/** Ce que fait l'équipe, sans rien coûter de plus que son salaire. */
function reglerSeule(etat: EtatJeu, a: AlerteMinutee): void {
  const A = B.ALERTES;
  switch (a.id) {
    case 'presse': {
      // L'accueil installe le client pressé au salon : il passe devant, sans faire attendre les autres plus longtemps.
      const client = etat.file.find((c) => c.id === Number(a.cible));
      if (client) {
        etat.file = [client, ...etat.file.filter((c) => c !== client)];
        client.prioritaire = true;
      }
      break;
    }
    case 'bruit':
      changerTapage(etat, -A.bruit.rentrer);
      break;
    case 'ivre':
      // La sécurité raccompagne le client éméché jusqu'à un taxi.
      etat.file = etat.file.filter((c) => c.id !== Number(a.cible));
      break;
    case 'fenetre':
      changerTapage(etat, -B.ALERTES_QUARTIER.fenetre.baisser);
      break;
    case 'photographe':
    case 'sabotage':
    case 'journaliste':
      break;
  }
}

function demarrerDispute(etat: EtatJeu, evenements: Sortie): void {
  if (etat.dispute) return;
  etat.dispute = { expire: instant(etat) + B.DISPUTE_DELAI };
  etat.semaine.stats.disputes += 1;
  evenements.push({ type: 'dispute' });
}

/** Ce qui arrive quand personne n'a réagi. */
function manquer(etat: EtatJeu, a: AlerteMinutee, evenements: Sortie): void {
  const A = B.ALERTES;
  switch (a.id) {
    case 'presse':
      changerSatisfaction(etat, 'affaires', -A.presse.satisfactionManquee);
      break;
    case 'bruit':
      changerTapage(etat, A.bruit.tapageManque);
      if (relationsOuvertes(etat)) changerRelations(etat, B.RELATIONS.bruitManque, evenements);
      break;
    case 'ivre':
      changerTapage(etat, A.ivre.tapageManque);
      demarrerDispute(etat, evenements);
      break;
    case 'bouteille':
      break;
    case 'photographe':
      changerSatisfaction(etat, 'affaires', -A.photographe.satisfactionManquee);
      if (relationsOuvertes(etat)) changerRelations(etat, B.RELATIONS.photographeManque, evenements);
      break;
    case 'journaliste':
      if (relationsOuvertes(etat)) changerRelations(etat, { presse: B.ALERTES_QUARTIER.journaliste.presseManque }, evenements);
      changerSatisfaction(etat, 'affaires', -2);
      break;
    case 'fenetre': {
      const F = B.ALERTES_QUARTIER.fenetre;
      if (relationsOuvertes(etat)) changerRelations(etat, { voisins: F.voisinsManque, police: F.policeManque }, evenements);
      break;
    }
    case 'sabotage':
      changerReputationGlobale(etat, -A.sabotage.reputation);
      changerRelations(etat, { presse: A.sabotage.presse, police: A.sabotage.police }, evenements);
      break;
    case 'pause': {
      const e = etat.personnel.find((x) => x.id === a.cible);
      if (e) {
        changerMoral(e, -A.pause.moralManque);
        changerLoyaute(e, -A.pause.loyauteManque);
      }
      break;
    }
  }
  etat.semaine.stats.alertesManquees += 1;
  evenements.push({ type: 'alerteManquee', id: a.id, prenom: prenomDe(etat, a) });
}

/** L'alerte a-t-elle perdu son objet (client reçu, personne partie) ? Renvoie « manquee » si le client est parti fâché. */
function sort(etat: EtatJeu, a: AlerteMinutee): 'active' | 'eteinte' | 'manquee' {
  if (a.id === 'presse' || a.id === 'ivre') {
    const id = Number(a.cible);
    if (etat.file.some((c) => c.id === id)) return 'active';
    const recu = etat.rendezVous.some((r) => r.clientId === id);
    // Le client pressé parti sans être reçu : l'alerte a manqué son but.
    return a.id === 'presse' && !recu ? 'manquee' : 'eteinte';
  }
  if (a.id === 'pause') return etat.personnel.some((e) => e.id === a.cible) ? 'active' : 'eteinte';
  return 'active';
}

/**
 * Un pas de soirée : conséquences des alertes échues, puis naissance de nouvelles.
 * Les alertes naissent avec leur propre générateur (etat.hasardAlertes) : ajouter ou régler une alerte ne décale
 * pas le hasard du reste de la soirée.
 */
export function vivreMinuteries(etat: EtatJeu, evenements: Sortie): void {
  const tirage = creerTirage(etat.hasardAlertes);
  naissances(etat, tirage, evenements);
  etat.hasardAlertes = tirage.etat();
}

function naissances(etat: EtatJeu, tirage: Tirage, evenements: Sortie): void {
  const maintenant = instant(etat);
  for (const a of [...etat.minuteries]) {
    const etatAlerte = sort(etat, a);
    if (etatAlerte === 'eteinte') {
      etat.minuteries = etat.minuteries.filter((x) => x !== a);
    } else if (etatAlerte === 'manquee' || maintenant >= a.expire) {
      etat.minuteries = etat.minuteries.filter((x) => x !== a);
      manquer(etat, a, evenements);
    }
  }

  // Pas de nouvelle alerte juste après l'ouverture, ni dans la dernière demi-heure.
  if (ecart(B.HEURE_OUVERTURE, etat.minuteDuJour) < 15 || ecart(etat.minuteDuJour, B.HEURE_FERMETURE) <= 30) return;
  const A = B.ALERTES;
  const heures = B.MINUTES_PAR_TICK / 60;
  const active = (id: IdAlerte) => etat.minuteries.some((a) => a.id === id);

  // Client d'affaires à bout de patience : une bulle par client, une seule fois.
  for (const c of etat.file) {
    if (c.alerte || segmentDe(c.modele) !== 'affaires' || c.patience > A.presse.seuilPatience) continue;
    c.alerte = true;
    ajouter(etat, 'presse', String(c.id), c.patience, evenements, tirage);
  }

  const groupeSurLeQuai = etat.file.some((c) => segmentDe(c.modele) === 'groupe');
  if (!active('bruit') && groupeSurLeQuai && etat.quartier.tapage >= A.bruit.seuilTapage && tirage.chance(A.bruit.chance * heures)) {
    ajouter(etat, 'bruit', null, A.bruit.delai, evenements, tirage);
  }

  if (!active('ivre') && barSert(etat) && tirage.chance(A.ivre.chance * heures)) {
    const client = etat.file.find((c) => !c.alerte && ['groupe', 'touriste'].includes(segmentDe(c.modele) ?? ''));
    if (client) {
      client.alerte = true;
      ajouter(etat, 'ivre', String(client.id), A.ivre.delai, evenements, tirage);
    }
  }

  const amateurs = [...etat.file.map((c) => c.modele), ...etat.rendezVous.map((r) => r.modele)].some((m) =>
    ['habitue', 'affaires'].includes(segmentDe(m) ?? ''),
  );
  if (!active('bouteille') && barSert(etat) && amateurs && tirage.chance(A.bouteille.chance * heures)) {
    ajouter(etat, 'bouteille', null, A.bouteille.delai, evenements, tirage);
  }

  const affaires = etat.file.some((c) => segmentDe(c.modele) === 'affaires') || etat.rendezVous.some((r) => segmentDe(r.modele) === 'affaires');
  if (!active('photographe') && affaires && etat.reputation >= A.photographe.reputationMin && tirage.chance(A.photographe.chance * visibiliteActive(etat).photographe * heures)) {
    ajouter(etat, 'photographe', null, A.photographe.delai, evenements, tirage);
  }

  // Le quartier (palier 3) : une journaliste, attirée par les maisons chic ; un voisin à sa fenêtre, les soirs de bruit.
  if (relationsOuvertes(etat)) {
    const Q = B.ALERTES_QUARTIER;
    const chic = etat.offre === 'feutree' || (etat.systemes.porte && etat.regles.selection === 'stricte');
    if (!active('journaliste') && tirage.chance(Q.journaliste.chance * (chic ? Q.journaliste.chic : 1) * heures)) {
      ajouter(etat, 'journaliste', null, Q.journaliste.delai, evenements, tirage);
    }
    if (
      !active('fenetre') &&
      etat.quartier.tapage >= Q.fenetre.seuilTapage &&
      etat.relations.jauges.voisins <= Q.fenetre.voisinsMax &&
      tirage.chance(Q.fenetre.chance * heures)
    ) {
      ajouter(etat, 'fenetre', null, Q.fenetre.delai, evenements, tirage);
    }
  }

  // Le faux client du Chat Noir, décidé le lundi par la rivale.
  if (etat.rivale.sabotage && !active('sabotage') && tirage.chance(B.RIVALE.sabotageChanceParHeure * heures)) {
    etat.rivale.sabotage = false;
    ajouter(etat, 'sabotage', null, A.sabotage.delai, evenements, tirage);
  }

  if (!active('pause') && tirage.chance(A.pause.chance * heures)) {
    const occupes = new Set(etat.rendezVous.map((r) => r.employeId));
    const fatiguee = etat.personnel.find(
      (e) =>
        e.enServiceCeSoir &&
        !e.repos &&
        !occupes.has(e.id) &&
        !enPause(etat, e.id) &&
        e.fatigue >= A.pause.fatigueMin &&
        e.fatigue <= B.SEUIL_EPUISEMENT,
    );
    if (fatiguee) ajouter(etat, 'pause', fatiguee.id, A.pause.delai, evenements, tirage);
  }
}

/** Le joueur réagit à une alerte. */
export function traiterAlerte(etat: EtatJeu, cle: string, action: number, tirage: Tirage, evenements: Sortie): void {
  const a = etat.minuteries.find((x) => x.cle === cle);
  if (!a) return;
  const A = B.ALERTES;
  let reussite = true;
  switch (a.id) {
    case 'presse': {
      const client = etat.file.find((c) => c.id === Number(a.cible));
      if (!client) return;
      if (action === 0) {
        // Il passe devant ; les autres attendent un peu plus.
        etat.file = [client, ...etat.file.filter((c) => c !== client)];
        for (const c of etat.file) if (c !== client) c.patience = Math.max(B.MINUTES_PAR_TICK, c.patience - A.presse.patienceAutres);
        client.prioritaire = true;
      } else if (action === 1) {
        payerVerre(etat, A.presse.verre);
        client.patience += A.presse.patienceVerre;
      } else return;
      break;
    }
    case 'bruit': {
      if (action === 0) {
        changerTapage(etat, -A.bruit.rentrer);
        changerSatisfaction(etat, 'groupe', -A.bruit.groupe);
      } else if (action === 1) {
        payerVerre(etat, A.bruit.verre);
        changerTapage(etat, -A.bruit.tapageVerre);
      } else return;
      break;
    }
    case 'ivre': {
      const id = Number(a.cible);
      if (action === 0) {
        reussite = tirage.chance(A.ivre.cafeReussite);
        if (!reussite) demarrerDispute(etat, evenements);
      } else if (action === 1) {
        depenser(etat, A.ivre.taxi, 'incidents');
        etat.file = etat.file.filter((c) => c.id !== id);
      } else return;
      break;
    }
    case 'bouteille': {
      if (action !== 0 || !barSert(etat)) return;
      etat.bar.stock = Math.max(0, etat.bar.stock - 1);
      encaisser(etat, A.bouteille.prix, 'bar');
      break;
    }
    case 'photographe': {
      if (action === 0) {
        // Il revient parfois un peu plus loin : l'alerte reprend, avec moins de temps.
        reussite = tirage.chance(0.7);
        if (!reussite) {
          // Une nouvelle bulle, avec son propre compte à rebours.
          a.debut = instant(etat);
          a.expire = a.debut + Math.round(A.photographe.delai / 2);
          evenements.push({ type: 'alerteTraitee', id: a.id, action, reussite, prenom: undefined });
          return;
        }
      } else if (action === 1) {
        depenser(etat, A.photographe.billet, 'incidents');
      } else return;
      break;
    }
    case 'journaliste': {
      const Q = B.ALERTES_QUARTIER.journaliste;
      if (action === 0) {
        changerRelations(etat, { presse: Q.presse }, evenements);
        changerSatisfaction(etat, 'affaires', Q.affairesCharme);
      } else if (action === 1) {
        payerVerre(etat, Q.verre);
        changerRelations(etat, { presse: Q.presseVerre }, evenements);
      } else return;
      break;
    }
    case 'fenetre': {
      const F = B.ALERTES_QUARTIER.fenetre;
      if (action === 0) {
        changerTapage(etat, -F.baisser);
        changerSatisfaction(etat, 'groupe', -F.groupe);
      } else if (action === 1) {
        changerRelations(etat, { voisins: F.excuses }, evenements);
      } else return;
      break;
    }
    case 'sabotage': {
      if (action === 0) {
        reussite = tirage.chance(A.sabotage.reussite);
        if (!reussite) demarrerDispute(etat, evenements);
      } else if (action === 1) {
        depenser(etat, A.sabotage.remboursement, 'incidents');
      } else return;
      break;
    }
    case 'pause': {
      const e = etat.personnel.find((x) => x.id === a.cible);
      if (!e) return;
      if (action === 0) {
        e.pauseJusqua = instant(etat) + A.pause.minutes;
        e.fatigue = borner(e.fatigue - A.pause.fatigue);
        changerMoral(e, A.pause.moral);
      } else if (action === 1) {
        changerMoral(e, -A.pause.refus);
      } else return;
      break;
    }
  }
  etat.minuteries = etat.minuteries.filter((x) => x !== a);
  evenements.push({ type: 'alerteTraitee', id: a.id, action, reussite, prenom: prenomDe(etat, a) });
}

/** Un verre offert : une bouteille du bar s'il sert, sinon de la poche. */
function payerVerre(etat: EtatJeu, prix: number): void {
  if (barSert(etat) && etat.bar.stock >= 1) etat.bar.stock -= 1;
  else depenser(etat, prix, 'incidents');
}

/** À la fermeture, les alertes en cours s'éteignent sans conséquence : la soirée est finie. */
export function fermerMinuteries(etat: EtatJeu): void {
  etat.minuteries = [];
  for (const e of etat.personnel) e.pauseJusqua = 0;
}
