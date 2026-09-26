import {
  ETAT_CHAMBRE_FERMEE,
  ETAT_CHAMBRE_OUVERTE,
  HEURE_BRIEFING,
  HEURE_DEBUT_JOURNEE,
  PROPRETE_CHAMBRE_OUVERTE,
  REPUTATION_INITIALE,
  TRESORERIE_INITIALE,
} from '../content/balance';
import { CHAMBRES } from '../content/maison';
import { SANNE } from '../content/personnel';
import {
  creerEmploye,
  maisonDeDepart,
  personnelDeDepart,
  recrutementDeDepart,
  soireeDeDepart,
  suiviDeDepart,
} from '../engine/etat';
import { cleAffinite } from '../engine/personnel';
import { clienteleDeDepart, type ParSegment } from '../engine/clientele';
import { numeroSemaine, semaineDeDepart } from '../engine/semaine';
import { SYSTEMES_PAR_PALIER } from '../engine/paliers';
import { ambitionDuMarche, planifierVisitesScenarisees } from '../engine/recrutement';
import { INES, JONAS, MILA } from '../content/candidats';
import { PARTIE_PAR_DEFAUT } from '../content/partie';
import { barDeDepart, reglesDeDepart, VERSION_ETAT, type EtatJeu } from '../engine/etat';
import { intriguesDeDepart } from '../engine/intrigues';
import { quartierDeDepart } from '../engine/quartier';
import { relationsDeDepart } from '../engine/relations';
import { rivaleDeDepart } from '../engine/rivale';
import { JOUR_PREMIERE_MENSUALITE, RELATIONS, TAPAGE } from '../content/balance';
import { moisDeDepart, prochainObjectif, statsDeDepart } from '../engine/bilans';
import { comptesVides, journeeVide } from '../engine/comptes';
import { banqueDeDepart } from '../engine/banque';
import { fiscDeDepart } from '../engine/fisc';

type Donnees = Record<string, unknown>;

/**
 * MIGRATIONS[n] transforme une sauvegarde de version n en version n + 1.
 * Ne jamais modifier une migration existante : en ajouter une nouvelle.
 */
const MIGRATIONS: Record<number, (d: Donnees) => Donnees> = {
  // v1 → v2 : ajout du joueur, de la maison, du chapitre et de la trésorerie.
  1: (d) => ({
    ...d,
    version: 2,
    joueur: {
      prenom: PARTIE_PAR_DEFAUT.prenom,
      avatar: PARTIE_PAR_DEFAUT.avatar,
      genre: PARTIE_PAR_DEFAUT.genre,
    },
    maison: { nom: PARTIE_PAR_DEFAUT.nomMaison, ville: PARTIE_PAR_DEFAUT.ville },
    chapitre: 1,
    tresorerie: TRESORERIE_INITIALE,
  }),
  // v2 → v3 : ajout de la variante de tenue de l'avatar.
  2: (d) => ({
    ...d,
    version: 3,
    joueur: { ...(estObjet(d.joueur) ? d.joueur : {}), tenue: 0 },
  }),
  // v3 → v4 : horloge avec briefing, réputation, chambres, palier et systèmes.
  // Le jour change désormais à 5 h et non plus à minuit.
  3: ({ paliers: _paliers, ...d }) => {
    const minute = typeof d.minuteDuJour === 'number' ? d.minuteDuJour : HEURE_BRIEFING;
    const jourBrut = typeof d.jour === 'number' ? d.jour : 1;
    const jour = minute < HEURE_DEBUT_JOURNEE && jourBrut > 1 ? jourBrut - 1 : jourBrut;
    // Une partie sauvegardée après 19 h est considérée comme briefée ; à 19 h pile, le briefing reste à faire.
    const briefe = minute !== HEURE_BRIEFING && (minute > HEURE_BRIEFING || minute < HEURE_DEBUT_JOURNEE);
    return {
      ...d,
      version: 4,
      jour,
      palier: 0,
      systemes: {
        personnel: true,
        finances: true,
        clientele: false,
        relations: false,
        recrutement: false,
        renovation: false,
        bar: false,
      },
      reputation: REPUTATION_INITIALE,
      briefingJour: briefe ? jour : jour - 1,
      chambres: CHAMBRES.map((c) => ({
        id: c.id,
        ouverte: c.ouverteAuDepart,
        proprete: c.ouverteAuDepart ? PROPRETE_CHAMBRE_OUVERTE : 0,
        etat: c.ouverteAuDepart ? ETAT_CHAMBRE_OUVERTE : ETAT_CHAMBRE_FERMEE,
      })),
    };
  },
  // v4 → v5 : Sanne, l'équipe de ménage, le linge, l'offre du soir et la vie de la soirée.
  // Une partie sauvegardée en pleine soirée reprend avec un quai vide.
  4: (d) => ({
    ...d,
    ...soireeDeDepart(),
    version: 5,
  }),
  // v5 → v6 : travaux dans les chambres, réserve, mensualités, annonces de palier et journal.
  // Une partie qui a déjà bouclé une nuit reçoit le palier 1, avec sa carte d'annonce.
  5: (d) => {
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), planning: false, reserve: false };
    const chambres = Array.isArray(d.chambres)
      ? d.chambres.map((c: unknown) => (estObjet(c) ? { ...c, travaux: null } : c))
      : d.chambres;
    const suite = { ...d, ...maisonDeDepart(), version: 6, systemes, chambres };
    const nuits = typeof d.nuitsBouclees === 'number' ? d.nuitsBouclees : 0;
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    if (nuits >= 1 && palier < 1) {
      for (const s of SYSTEMES_PAR_PALIER[1] ?? []) (systemes as Donnees)[s] = true;
      return { ...suite, palier: 1, annonces: [1] };
    }
    return suite;
  },
  // v6 → v7 : identité de chaque personne dans l'état, candidats, visites et périodes d'essai.
  // Au palier 1, les visites de Mila, Jonas et Inès sont prévues (repoussées si leur heure est passée).
  6: (d) => {
    const nuits = typeof d.nuitsBouclees === 'number' ? d.nuitsBouclees : 0;
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => {
          if (!estObjet(e)) return e;
          const identite = e.id === SANNE.id ? creerEmploye(SANNE) : null;
          const { rdvCeSoir: _r, repos: _p, fatigue: _f, moral: _m, loyaute: _l, part: _pa, ...base } = identite ?? {};
          return { ...base, ...e, traitsConnus: Array.isArray(e.traits) ? e.traits : [], finEssai: null, nuitsTravaillees: nuits };
        })
      : d.personnel;
    const suite = { ...d, ...recrutementDeDepart(), version: 7, personnel };
    if (typeof d.palier === 'number' && d.palier >= 1) planifierVisitesScenarisees(suite as unknown as EtatJeu);
    return suite;
  },
  // v7 → v8 : planning, rendez-vous maximum, affinités, imprévus, menaces de départ et adieux.
  // Tout le monde est considéré en service ; les paires existantes partent d'une affinité neutre.
  7: (d) => {
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => (estObjet(e) ? { ...suiviDeDepart(), enServiceCeSoir: true, ...e } : e))
      : d.personnel;
    const ids = (personnel as unknown[]).flatMap((e) => (estObjet(e) && typeof e.id === 'string' ? [e.id] : []));
    const affinites: Record<string, number> = {};
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) affinites[cleAffinite(ids[i]!, ids[j]!)] = 0;
    const nuit = estObjet(d.nuit) ? { imprevus: 0, ...d.nuit } : d.nuit;
    return { ...d, ...personnelDeDepart(), version: 8, personnel, affinites, nuit };
  },
  // v8 → v9 : segments Affaires et Groupes, ouverts au palier 2 (réputation 25, vérifiée à la fermeture).
  8: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), affaires: deuxieme, groupes: deuxieme };
    return { ...d, version: 9, systemes };
  },
  // v9 → v10 : étape du didacticiel. Une partie existante n'a pas de didacticiel.
  9: (d) => ({ ...d, version: 10, didacticiel: null }),
  // v10 → v11 : satisfaction par segment, qui part de la réputation acquise, et onglet Clientèle au palier 2.
  // Une partie déjà au palier 2 reçoit l'onglet d'un coup, présenté par Josée au chargement.
  10: (d) => {
    const reputation = typeof d.reputation === 'number' ? d.reputation : REPUTATION_INITIALE;
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), clientele: deuxieme };
    return {
      ...d,
      version: 11,
      systemes,
      clientele: clienteleDeDepart(reputation),
      nouveautes: deuxieme ? ['clientele'] : [],
    };
  },
  // v11 → v12 : règles de la maison (tarif, formule, sélection, priorité), ouvertes au palier 2.
  // Chaque personne compte la charge de ses rendez-vous du soir ; un rendez-vous en cours est une formule standard.
  11: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), tarifs: deuxieme, porte: deuxieme };
    const personnel = Array.isArray(d.personnel)
      ? d.personnel.map((e: unknown) => (estObjet(e) ? { ...e, chargeCeSoir: typeof e.rdvCeSoir === 'number' ? e.rdvCeSoir : 0 } : e))
      : d.personnel;
    const rendezVous = Array.isArray(d.rendezVous)
      ? d.rendezVous.map((r: unknown) => (estObjet(r) ? { ...r, formule: 'standard' } : r))
      : d.rendezVous;
    const nouveautes = [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(deuxieme ? ['regles'] : [])];
    return { ...d, version: 12, systemes, personnel, rendezVous, regles: reglesDeDepart(), nouveautes };
  },
  // v12 → v13 : le bar (à rénover au palier 2), l'équipe Bar, le stock et l'avance du grossiste.
  // Une nuit en cours compte désormais la recette du bar.
  12: (d) => {
    const deuxieme = typeof d.palier === 'number' && d.palier >= 2;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), bar: deuxieme };
    const equipes = { ...(estObjet(d.equipes) ? d.equipes : { menage: 1 }), bar: 0 };
    const nuit = estObjet(d.nuit) ? { ...d.nuit, bar: 0 } : d.nuit;
    const nouveautes = [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(deuxieme ? ['bar'] : [])];
    return { ...d, ...barDeDepart(), version: 13, systemes, equipes, nuit, nouveautes };
  },
  // v13 → v14 : la semaine (comptes par poste, tendances) et le bilan du lundi.
  // La semaine en cours repart de zéro ; les tendances s'ouvriront au prochain lundi, si le palier 2 est atteint.
  13: (d) => {
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), tendances: false };
    const jour = typeof d.jour === 'number' ? d.jour : 1;
    const reputation = typeof d.reputation === 'number' ? d.reputation : REPUTATION_INITIALE;
    const semaine = { ...semaineDeDepart(reputation), numero: numeroSemaine(jour) };
    if (estObjet(d.clientele) && estObjet(d.clientele.satisfaction)) semaine.satisfactionDebut = { ...(d.clientele.satisfaction as ParSegment) };
    return { ...d, version: 14, systemes, semaine, bilanSemaine: null, bilanAVoir: false };
  },
  // v14 → v15 : soirées à thème, ouvertes avec les tendances ; un nouveau poste « thèmes » dans les comptes.
  14: (d) => {
    const ouvertes = estObjet(d.systemes) && d.systemes.tendances === true;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), themes: ouvertes };
    const avecPoste = (c: unknown) =>
      estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { ...c.depenses, themes: 0 } } : c;
    const semaine = estObjet(d.semaine) ? { ...d.semaine, themes: [], comptes: avecPoste(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;
    const nouveautes = [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(ouvertes ? ['themes'] : [])];
    return { ...d, version: 15, systemes, semaine, bilanSemaine, themeDuSoir: null, nouveautes };
  },
  // v15 → v16 : les intrigues et le tapage du quartier. Le quartier part calme.
  15: (d) => ({ ...d, version: 16, intrigues: intriguesDeDepart(), quartier: quartierDeDepart() }),
  // v16 → v17 : une ambition pour chaque personne (celle du contenu pour les personnages scénarisés).
  // Josée présente les ambitions et l'humeur du voisinage aux parties qui ont déjà passé les paliers.
  16: (d) => {
    const avecAmbition = (x: unknown) => (estObjet(x) ? { ...x, ambition: ambitionConnue(String(x.id)) } : x);
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    const nouveautes = [
      ...(Array.isArray(d.nouveautes) ? d.nouveautes : []),
      ...(palier >= 1 ? ['ambitions'] : []),
      ...(palier >= 2 ? ['voisinage'] : []),
    ];
    return {
      ...d,
      version: 17,
      personnel: Array.isArray(d.personnel) ? d.personnel.map(avecAmbition) : d.personnel,
      candidats: Array.isArray(d.candidats) ? d.candidats.map(avecAmbition) : d.candidats,
      visites: Array.isArray(d.visites)
        ? d.visites.map((v) => (estObjet(v) ? { ...v, candidat: avecAmbition(v.candidat) } : v))
        : d.visites,
      nouveautes,
    };
  },
  // v17 → v18 : la dernière nuit de chaque imprévu. On ne sait pas quand les anciens sont sortis : ils peuvent revenir.
  17: (d) => ({ ...d, version: 18, imprevusNuit: {} }),
  // v18 → v19 : les alertes minutées de la soirée. Aucune en cours.
  18: (d) => ({ ...d, version: 19, minuteries: [], hasardAlertes: (typeof d.hasard === 'number' ? d.hasard * 7 + 13 : 13) | 0 }),
  // v19 → v20 : défis de la semaine (ouverts avec les tendances) et objectif du mois.
  // Le premier défi tombera au prochain lundi ; l'objectif du mois en cours est fixé tout de suite.
  19: (d) => {
    const systemes = estObjet(d.systemes) ? d.systemes : {};
    const tendances = systemes.tendances === true;
    const semaine = estObjet(d.semaine) ? { ...d.semaine, stats: statsDeDepart() } : d.semaine;
    const payees = typeof d.mensualitesPayees === 'number' ? d.mensualitesPayees : 0;
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    const mois = payees === 0 ? moisDeDepart() : prochainObjectif(d as unknown as EtatJeu, payees + 1);
    const nouveautes = [
      ...(Array.isArray(d.nouveautes) ? d.nouveautes : []),
      ...(palier >= 1 ? ['objectifs'] : []),
      ...(tendances ? ['defis'] : []),
    ];
    return {
      ...d,
      version: 20,
      systemes: { ...systemes, defis: tendances },
      semaine,
      defi: null,
      mois,
      bilanMois: null,
      bilanMoisAVoir: false,
      nouveautes,
    };
  },
  // v20 → v21 : les relations avec le quartier et le palier 3 (première mensualité payée).
  // Les voisins se souviennent de l'intrigue du voisin du dessus et du tapage de la dernière nuit. Une partie qui a déjà
  // payé sa mensualité (et passé le palier 2) reçoit le palier 3, présenté par Josée au chargement.
  20: (d) => {
    const relations = relationsDeDepart();
    const intrigues = estObjet(d.intrigues) ? d.intrigues : {};
    const finies = Array.isArray(intrigues.finies) ? intrigues.finies : [];
    const finVoisin = finies.find((f) => estObjet(f) && f.id === 'voisin') as Donnees | undefined;
    relations.jauges.voisins += RELATIONS.souvenirDuVoisin[String(finVoisin?.fin)] ?? 0;
    const tapage = estObjet(d.quartier) && typeof d.quartier.tapage === 'number' ? d.quartier.tapage : 0;
    if (tapage > TAPAGE.recidive) relations.jauges.voisins -= Math.round((tapage - TAPAGE.recidive) * RELATIONS.voisins.pente);
    relations.lundi = { ...relations.jauges };

    const avecPoste = (c: unknown) =>
      estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { ...c.depenses, relations: 0 } } : c;
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPoste(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;

    const palier = typeof d.palier === 'number' ? d.palier : 0;
    const payees = typeof d.mensualitesPayees === 'number' ? d.mensualitesPayees : 0;
    const palier3 = palier === 2 && payees >= 1;
    const systemes = { ...(estObjet(d.systemes) ? d.systemes : {}), relations: palier3 || palier >= 3 };
    const annonces = [...(Array.isArray(d.annonces) ? d.annonces : []), ...(palier3 ? [3] : [])];
    return {
      ...d,
      version: 21,
      palier: palier3 ? 3 : palier,
      systemes,
      annonces,
      semaine,
      bilanSemaine,
      relations,
      hasardQuartier: (typeof d.hasard === 'number' ? d.hasard * 31 + 7 : 7) | 0,
    };
  },
  // v21 → v22 : la maison rivale, le Chat Noir. Ouverte avec le palier 3 ; elle se présentera au prochain lundi.
  // Une partie déjà au palier 3, dont l'annonce a été vue, la découvre par Josée au chargement.
  21: (d) => {
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    const annonces = Array.isArray(d.annonces) ? d.annonces : [];
    const nouveautes = [
      ...(Array.isArray(d.nouveautes) ? d.nouveautes : []),
      ...(palier >= 3 && !annonces.includes(3) ? ['rivale'] : []),
    ];
    return {
      ...d,
      version: 22,
      systemes: { ...(estObjet(d.systemes) ? d.systemes : {}), rivale: palier >= 3 },
      rivale: rivaleDeDepart(),
      hasardRivale: (typeof d.hasard === 'number' ? d.hasard * 17 + 3 : 3) | 0,
      nouveautes,
    };
  },
  // v22 → v23 : équipes Accueil et Sécurité (palier 3), et assurance (au premier lundi après le palier 3).
  // Une partie déjà au palier 3, dont l'annonce a été vue, découvre les équipes (et l'assurance si un lundi est passé)
  // par Josée au chargement.
  22: (d) => {
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    const annonces = Array.isArray(d.annonces) ? d.annonces : [];
    const rivale = estObjet(d.rivale) ? d.rivale : {};
    // La rivale s'est présentée : un lundi est passé depuis le palier 3.
    const assurance = palier >= 3 && rivale.derniereAction !== null && rivale.derniereAction !== undefined;
    const vus = palier >= 3 && !annonces.includes(3);
    const nouveautes = [
      ...(Array.isArray(d.nouveautes) ? d.nouveautes : []),
      ...(vus ? ['equipes'] : []),
      ...(vus && assurance ? ['assurance'] : []),
    ];
    const avecPostes = (c: unknown) =>
      estObjet(c) && estObjet(c.depenses) && estObjet(c.recettes)
        ? { ...c, recettes: { ...c.recettes, assurance: 0 }, depenses: { ...c.depenses, assurance: 0 } }
        : c;
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPostes(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPostes(d.bilanSemaine.comptes) } : d.bilanSemaine;
    return {
      ...d,
      version: 23,
      systemes: { ...(estObjet(d.systemes) ? d.systemes : {}), accueil: palier >= 3, securite: palier >= 3, assurance },
      equipes: { ...(estObjet(d.equipes) ? d.equipes : {}), accueil: 0, securite: 0 },
      assurance: 0,
      semaine,
      bilanSemaine,
      nouveautes,
    };
  },
  // v23 → v24 : la visibilité (bouche-à-oreille, site, concierges, influenceurs), au deuxième lundi après le palier 3.
  23: (d) => {
    const systemes = estObjet(d.systemes) ? d.systemes : {};
    const jour = typeof d.jour === 'number' ? d.jour : 1;
    // Le deuxième lundi après la première mensualité (jour 28) est le jour 36.
    const ouverte = systemes.assurance === true && jour >= JOUR_PREMIERE_MENSUALITE + 8;
    const avecPoste = (c: unknown) => (estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { ...c.depenses, visibilite: 0 } } : c);
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPoste(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;
    return {
      ...d,
      version: 24,
      systemes: { ...systemes, visibilite: ouverte },
      regles: { ...(estObjet(d.regles) ? d.regles : {}), visibilite: 'bouche' },
      semaine,
      bilanSemaine,
      nouveautes: [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(ouverte ? ['visibilite'] : [])],
    };
  },
  // v24 → v25 : les comptes de la nuit par poste (bilan de fermeture). La part du personnel devient un poste de
  // dépense, les rendez-vous se comptent pleins ; la journée en cours tient ses comptes.
  24: (d) => {
    const tresorerie = typeof d.tresorerie === 'number' ? d.tresorerie : 0;
    const avecPoste = (c: unknown) => (estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { partPersonnel: 0, express: 0, ...c.depenses } } : c);
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPoste(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;
    const journee = journeeVide(tresorerie);
    let nuit = d.nuit;
    if (estObjet(nuit)) {
      // Une nuit en cours reprend ce qu'elle a déjà gagné ; le détail de ses dépenses passées est perdu.
      const nombre = (v: unknown) => (typeof v === 'number' ? v : 0);
      const { recettes, partPersonnel, depenses, bar, ...reste } = nuit;
      const comptes = comptesVides();
      comptes.recettes.bar = nombre(bar);
      comptes.recettes.rendezVous = nombre(recettes) - nombre(bar) + nombre(partPersonnel);
      comptes.depenses.partPersonnel = nombre(partPersonnel);
      const enCours = typeof d.nuitsBouclees === 'number' && typeof nuit.numero === 'number' && d.nuitsBouclees < nuit.numero;
      if (enCours) {
        journee.comptes = structuredClone(comptes);
        journee.tresorerieAvant = tresorerie - nombre(recettes) + nombre(depenses);
      }
      nuit = { ...reste, comptes, retraitReserve: 0, tresorerieAvant: tresorerie - nombre(recettes) + nombre(depenses), tresorerieApres: tresorerie };
    }
    return { ...d, version: 25, semaine, bilanSemaine, journee, nuit };
  },
  // v25 → v26 : le linge se compte en parures (10 draps font une parure, arrondi à l'avantage du joueur),
  // avec une commande automatique, présentée par Josée.
  25: (d) => {
    const parures = (draps: unknown) => (typeof draps === 'number' ? Math.ceil(Math.max(0, draps) / 10) : 0);
    return {
      ...d,
      version: 26,
      linge: parures(d.linge),
      lingeCommande: parures(d.lingeCommande),
      lingeAuto: 0,
      nouveautes: [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), 'parures'],
    };
  },
  // v26 → v27 : les crans de 2 à 6 rendez-vous, avec refus et négociation au cran 6 (leur propre hasard).
  // Josée les présente aux parties qui ont déjà le planning (palier 1).
  26: (d) => {
    const palier = typeof d.palier === 'number' ? d.palier : 0;
    return {
      ...d,
      version: 27,
      hasardPlafond: (typeof d.hasard === 'number' ? d.hasard * 23 + 11 : 11) | 0,
      nouveautes: [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(palier >= 1 ? ['crans'] : [])],
    };
  },
  // v27 → v28 : la banque (découvert, agios, salaires et mensualités impayés, faillite), présentée par Josée.
  27: (d) => {
    const payees = typeof d.mensualitesPayees === 'number' ? d.mensualitesPayees : 0;
    const tresorerie = typeof d.tresorerie === 'number' ? d.tresorerie : 0;
    const avecPoste = (c: unknown) => (estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { agios: 0, ...c.depenses } } : c);
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPoste(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;
    const journee = estObjet(d.journee) ? { ...d.journee, comptes: avecPoste(d.journee.comptes) } : d.journee;
    const nuit = estObjet(d.nuit) ? { ...d.nuit, comptes: avecPoste(d.nuit.comptes) } : d.nuit;
    const banque = { ...banqueDeDepart(), echeances: payees, alerte: tresorerie < -2000 ? 2 : tresorerie < 0 ? 1 : 0 };
    return {
      ...d,
      version: 28,
      banque,
      finDePartie: null,
      semaine,
      bilanSemaine,
      journee,
      nuit,
      nouveautes: [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), 'banque'],
    };
  },
  // v28 → v29 : le nouvel emprunt, ouvert d'emblée si la visibilité l'est déjà (Josée le présente) ;
  // un poste pour ses échéances, et l'emprunt reçu tenu à part des recettes.
  28: (d) => {
    const systemes = estObjet(d.systemes) ? d.systemes : {};
    const ouvert = systemes.visibilite === true;
    const avecPoste = (c: unknown) => (estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { emprunts: 0, ...c.depenses } } : c);
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPoste(d.semaine.comptes), empruntRecu: 0 } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPoste(d.bilanSemaine.comptes) } : d.bilanSemaine;
    const journee = estObjet(d.journee) ? { ...d.journee, comptes: avecPoste(d.journee.comptes), empruntRecu: 0 } : d.journee;
    const nuit = estObjet(d.nuit) ? { ...d.nuit, comptes: avecPoste(d.nuit.comptes), empruntRecu: 0 } : d.nuit;
    const banque = estObjet(d.banque) ? { ...d.banque, retardRachat: typeof d.banque.retard === 'number' && d.banque.retard > 0, emprunts: [] } : d.banque;
    return {
      ...d,
      version: 29,
      systemes: { ...systemes, emprunt: ouvert },
      semaine,
      bilanSemaine,
      journee,
      nuit,
      banque,
      nouveautes: [...(Array.isArray(d.nouveautes) ? d.nouveautes : []), ...(ouvert ? ['emprunt'] : [])],
    };
  },
  // v29 → v30 : l'impôt trimestriel (le trimestre en cours part de zéro, à l'avantage du joueur), la gestion confiée
  // à Josée (avec la réserve), et les fournisseurs, cinquième acteur des relations (ouverts si l'emprunt l'est).
  29: (d) => {
    const systemes = estObjet(d.systemes) ? d.systemes : {};
    const fournisseurs = systemes.emprunt === true;
    const avecPostes = (c: unknown) =>
      estObjet(c) && estObjet(c.depenses) ? { ...c, depenses: { impots: 0, gestion: 0, ...c.depenses } } : c;
    const semaine = estObjet(d.semaine) ? { ...d.semaine, comptes: avecPostes(d.semaine.comptes) } : d.semaine;
    const bilanSemaine = estObjet(d.bilanSemaine) ? { ...d.bilanSemaine, comptes: avecPostes(d.bilanSemaine.comptes) } : d.bilanSemaine;
    const journee = estObjet(d.journee) ? { ...d.journee, comptes: avecPostes(d.journee.comptes) } : d.journee;
    const nuit = estObjet(d.nuit) ? { ...d.nuit, comptes: avecPostes(d.nuit.comptes) } : d.nuit;
    const banque = estObjet(d.banque) ? { ...d.banque, sursis: false, supplement: 0 } : d.banque;
    const r = estObjet(d.relations) ? d.relations : {};
    const avecActeur = (x: unknown, v: number) => (estObjet(x) ? { fournisseurs: v, ...x } : x);
    const relations = {
      ...r,
      jauges: avecActeur(r.jauges, 0),
      lundi: avecActeur(r.lundi, 0),
      derniereAction: avecActeur(r.derniereAction, -99),
      dernierEvenement: avecActeur(r.dernierEvenement, -99),
    };
    const reserve = systemes.reserve === true;
    return {
      ...d,
      version: 30,
      systemes: { ...systemes, fournisseurs },
      gestionJosee: false,
      fisc: fiscDeDepart(),
      semaine,
      bilanSemaine,
      journee,
      nuit,
      banque,
      relations,
      nouveautes: [
        ...(Array.isArray(d.nouveautes) ? d.nouveautes : []),
        'impot',
        ...(reserve ? ['gestionJosee'] : []),
        ...(fournisseurs ? ['fournisseurs'] : []),
      ],
    };
  },
};


/** Ambition d'une personne d'une ancienne sauvegarde : celle du contenu si elle est scénarisée. */
function ambitionConnue(id: string): string {
  return [SANNE, MILA, JONAS, INES].find((def) => def.id === id)?.ambition ?? ambitionDuMarche(id);
}

function estObjet(v: unknown): v is Donnees {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Vérification minimale de la forme de l'état, pour écarter une sauvegarde abîmée. */
function estEtatValide(d: Donnees): boolean {
  const joueur = d.joueur;
  const maison = d.maison;
  return (
    d.version === VERSION_ETAT &&
    estObjet(joueur) &&
    typeof joueur.prenom === 'string' &&
    typeof joueur.avatar === 'string' &&
    typeof joueur.tenue === 'number' &&
    (joueur.genre === 'patronne' || joueur.genre === 'patron') &&
    estObjet(maison) &&
    typeof maison.nom === 'string' &&
    typeof d.chapitre === 'number' &&
    typeof d.tresorerie === 'number' &&
    typeof d.jour === 'number' &&
    typeof d.minuteDuJour === 'number' &&
    typeof d.hasard === 'number' &&
    typeof d.palier === 'number' &&
    typeof d.reputation === 'number' &&
    typeof d.briefingJour === 'number' &&
    Array.isArray(d.chambres) &&
    Array.isArray(d.personnel) &&
    d.personnel.every((e) => estObjet(e) && typeof e.ambition === 'string') &&
    Array.isArray(d.file) &&
    Array.isArray(d.rendezVous) &&
    typeof d.linge === 'number' &&
    typeof d.lingeAuto === 'number' &&
    typeof d.reserve === 'number' &&
    typeof d.tauxReserve === 'number' &&
    typeof d.mensualitesPayees === 'number' &&
    Array.isArray(d.annonces) &&
    Array.isArray(d.journal) &&
    Array.isArray(d.candidats) &&
    Array.isArray(d.visites) &&
    Array.isArray(d.essaisATrancher) &&
    typeof d.prochainCandidat === 'number' &&
    typeof d.rdvMax === 'number' &&
    estObjet(d.affinites) &&
    Array.isArray(d.imprevusVus) &&
    estObjet(d.imprevusNuit) &&
    Array.isArray(d.minuteries) &&
    typeof d.hasardAlertes === 'number' &&
    estObjet(d.mois) &&
    typeof d.bilanMoisAVoir === 'boolean' &&
    estObjet(d.semaine) &&
    estObjet(d.semaine.stats) &&
    Array.isArray(d.adieux) &&
    (d.didacticiel === null || typeof d.didacticiel === 'number') &&
    estObjet(d.clientele) &&
    estObjet(d.clientele.satisfaction) &&
    Array.isArray(d.clientele.historique) &&
    Array.isArray(d.nouveautes) &&
    estObjet(d.regles) &&
    typeof d.regles.tarif === 'number' &&
    typeof d.regles.visibilite === 'string' &&
    estObjet(d.bar) &&
    estObjet(d.avance) &&
    estObjet(d.equipes) &&
    typeof d.equipes.bar === 'number' &&
    typeof d.equipes.securite === 'number' &&
    typeof d.assurance === 'number' &&
    estObjet(d.semaine) &&
    estObjet(d.journee) &&
    typeof d.bilanAVoir === 'boolean' &&
    (d.themeDuSoir === null || typeof d.themeDuSoir === 'string') &&
    estObjet(d.intrigues) &&
    Array.isArray(d.intrigues.actives) &&
    Array.isArray(d.intrigues.finies) &&
    estObjet(d.quartier) &&
    typeof d.quartier.tapage === 'number' &&
    estObjet(d.relations) &&
    estObjet(d.relations.jauges) &&
    typeof d.hasardQuartier === 'number' &&
    estObjet(d.rivale) &&
    typeof d.hasardRivale === 'number' &&
    typeof d.hasardPlafond === 'number' &&
    estObjet(d.banque) &&
    estObjet(d.fisc) &&
    typeof d.gestionJosee === 'boolean' &&
    estObjet(d.systemes)
  );
}

/**
 * Amène des données de sauvegarde, de n'importe quelle version connue, à la version courante.
 * Renvoie null si les données sont illisibles ou d'une version future.
 */
export function migrer(brut: unknown): EtatJeu | null {
  if (!estObjet(brut) || typeof brut.version !== 'number') return null;
  let donnees = brut;
  while (typeof donnees.version === 'number' && donnees.version < VERSION_ETAT) {
    const etape = MIGRATIONS[donnees.version];
    if (!etape) return null;
    donnees = etape(donnees);
  }
  return estEtatValide(donnees) ? (donnees as unknown as EtatJeu) : null;
}
