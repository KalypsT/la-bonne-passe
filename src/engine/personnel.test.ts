import { describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { INES, JONAS, MILA } from '../content/candidats';
import { creerEtatInitial, type Employe, type EtatJeu } from './etat';
import { creerTirage } from './hasard';
import { concernes, declencherImprevu } from './imprevus';
import { trouverImprevu } from '../content/imprevus';
import { accorderPalier } from './paliers';
import { affinite, cleAffinite, delaiMenace } from './personnel';
import { candidatDepuis } from './recrutement';
import { facteurDispute, qualiteRdv } from './soiree';
import { appliquerOrdres, tick, type EvenementMoteur, type Ordre } from './tick';

const h = (heures: number, minutes = 0) => heures * 60 + minutes;

/** Partie au palier 1 avec Sanne et, au choix, Mila, Jonas ou Inès déjà embauchés. */
function equipe(recrues: ('mila' | 'jonas' | 'ines')[] = [], champs: Partial<EtatJeu> = {}): EtatJeu {
  let etat: EtatJeu = { ...creerEtatInitial({ graine: 5 }), jour: 3, minuteDuJour: h(12), briefingJour: 3, nuitsBouclees: 2 };
  accorderPalier(etat, 1);
  etat = { ...etat, annonces: [], visites: [] };
  const defs = { mila: MILA, jonas: JONAS, ines: INES };
  for (const id of recrues) {
    etat = { ...etat, candidats: [{ ...candidatDepuis(defs[id], 'visite', 9), questionPosee: 0 }] };
    etat = appliquerOrdres(etat, [{ type: 'proposer', candidatId: id, part: 0.55 }]).etat;
  }
  return { ...etat, ...champs };
}

function modifier(etat: EtatJeu, id: string, champs: Partial<Employe>): EtatJeu {
  return { ...etat, personnel: etat.personnel.map((e) => (e.id === id ? { ...e, ...champs } : e)) };
}

const perso = (etat: EtatJeu, id: string) => etat.personnel.find((e) => e.id === id)!;

function ordonner(etat: EtatJeu, ordre: Ordre) {
  return appliquerOrdres(etat, [ordre]);
}

/** Valide le briefing puis passe l'ouverture. */
function ouvrir(etat: EtatJeu, briefing: Partial<Extract<Ordre, { type: 'validerBriefing' }>> = {}): EtatJeu {
  const au19h = { ...etat, minuteDuJour: h(19), briefingJour: etat.jour - 1 };
  const briefe = ordonner(au19h, { type: 'validerBriefing', ...briefing }).etat;
  let courant = briefe;
  for (let i = 0; i < 12; i++) courant = tick(courant).etat;
  return courant;
}

/** Nuit en cours juste avant la fermeture, tout le monde ayant pris son service. */
function avantFermeture(etat: EtatJeu, champs: Partial<EtatJeu> = {}): EtatJeu {
  return {
    ...etat,
    minuteDuJour: h(3, 55),
    briefingJour: etat.jour,
    personnel: etat.personnel.map((e) => ({ ...e, enServiceCeSoir: true })),
    nuit: { numero: 3, recettes: 0, partPersonnel: 0, depenses: 0, servis: 0, perdus: 0, reputationDebut: etat.reputation, meilleurAvis: null, pireAvis: null, reserve: 0, imprevus: 0 },
    ...champs,
  };
}

describe('planning du briefing', () => {
  it('une personne au repos ne prend pas son service', () => {
    const soir = ouvrir(equipe(['mila']), { repos: ['mila'] });
    expect(perso(soir, 'mila')).toMatchObject({ repos: true, enServiceCeSoir: false, reposPrevu: false });
    expect(perso(soir, 'sanne')).toMatchObject({ repos: false, enServiceCeSoir: true });
  });

  it('il reste toujours au moins une personne en service', () => {
    const soir = ouvrir(equipe(['mila']), { repos: ['mila', 'sanne'] });
    expect(soir.personnel.every((e) => e.enServiceCeSoir)).toBe(true);
  });

  it('le planning est fermé avant le palier 1', () => {
    const debut = { ...creerEtatInitial(), minuteDuJour: h(19) };
    const briefe = ordonner(debut, { type: 'validerBriefing', repos: ['sanne'], rdvMax: 2 }).etat;
    expect(briefe.rdvMax).toBe(B.RDV_MAX_PAR_SOIR);
    expect(briefe.personnel[0]?.reposPrevu).toBe(false);
  });

  it('le maximum de rendez-vous par personne se règle en 3 crans', () => {
    const deux = ouvrir(equipe(), { rdvMax: 2 });
    expect(deux.rdvMax).toBe(2);
    expect(ouvrir(equipe(), { rdvMax: 7 }).rdvMax).toBe(B.RDV_MAX_PAR_SOIR);
    const auMax = modifier({ ...deux, minuteDuJour: h(21), file: [{ id: 1, modele: 'poete', patience: 50 }] }, 'sanne', { rdvCeSoir: 2 });
    expect(tick(auMax).etat.rendezVous).toHaveLength(0);
  });

  it('une soirée de repos remonte le moral à la fermeture', () => {
    const etat = avantFermeture(equipe(['jonas']));
    const reposJonas = modifier(modifier(etat, 'jonas', { enServiceCeSoir: false, moral: 50 }), 'sanne', { moral: 50 });
    const apres = tick(reposJonas).etat;
    // Jonas (Solitaire) regagne plus qu'un soir de repos ordinaire ; Sanne (Mère poule) ne compte pas pour elle-même.
    expect(perso(apres, 'jonas').moral).toBeGreaterThanOrEqual(50 + B.MORAL_SOIR_DE_REPOS + B.TRAITS_EFFETS.solitaireMoralRepos);
  });

  it('seules les personnes en service comptent une nuit de travail', () => {
    const etat = modifier(avantFermeture(equipe(['jonas'])), 'jonas', { enServiceCeSoir: false, nuitsTravaillees: 0 });
    expect(perso(tick(etat).etat, 'jonas').nuitsTravaillees).toBe(0);
  });
});

describe('effets des traits', () => {
  it('une Diva perd du moral tant qu’aucune chambre premium n’est ouverte', () => {
    const etat = modifier(avantFermeture(equipe(['mila'])), 'mila', { moral: 60 });
    const sans = perso(tick(etat).etat, 'mila').moral;
    const chambres = etat.chambres.map((c) => (c.id === 'velours' ? { ...c, ouverte: true, proprete: 100 } : c));
    const avec = perso(tick({ ...etat, chambres }).etat, 'mila').moral;
    expect(avec - sans).toBeCloseTo(B.TRAITS_EFFETS.divaSansPremium);
  });

  it('une Ambitieuse gagne du moral quand la réputation monte', () => {
    const etat = modifier(avantFermeture(equipe(['mila'])), 'mila', { moral: 50 });
    const stable = perso(tick(etat).etat, 'mila').moral;
    const hausse = perso(tick({ ...etat, nuit: { ...etat.nuit!, reputationDebut: etat.reputation - 4 } }).etat, 'mila').moral;
    expect(hausse - stable).toBeCloseTo(4 * B.TRAITS_EFFETS.ambitieuseParPoint);
  });

  it('un Solitaire récupère mieux au repos', () => {
    const etat = modifier(modifier(equipe(['jonas'], { minuteDuJour: h(12) }), 'jonas', { fatigue: 60 }), 'sanne', { fatigue: 60 });
    const apres = tick(etat).etat;
    const recupJonas = 60 - perso(apres, 'jonas').fatigue;
    const recupSanne = 60 - perso(apres, 'sanne').fatigue;
    expect(recupJonas / recupSanne).toBeCloseTo(B.TRAITS_EFFETS.solitaireRepos);
  });

  it('une Fêtarde se fatigue plus vite, mais les clients patientent plus longtemps', () => {
    const base = ouvrir(equipe(['ines']));
    const rdv = (id: string) => ({ chambreId: 'boudoir', employeId: id, clientId: 1, modele: 'retraite', duree: 60, restant: 5 });
    const fatigueDe = (id: string) => {
      const etat = modifier({ ...base, minuteDuJour: h(21), rendezVous: [rdv(id)] }, id, { fatigue: 20 });
      return perso(tick({ ...etat, hasard: 42 }).etat, id).fatigue - 20;
    };
    expect(fatigueDe('ines') / fatigueDe('sanne')).toBeCloseTo(B.TRAITS_EFFETS.fetardeFatigue, 1);
    // Personne ne reçoit : le premier client arrivé garde toute sa patience, et plus.
    let soir: EtatJeu = { ...base, minuteDuJour: h(21), prochainClient: 2, personnel: base.personnel.map((e) => ({ ...e, rdvCeSoir: 9 })) };
    for (let i = 0; i < 60 && soir.file.length === 0; i++) soir = tick(soir).etat;
    expect(soir.file.length).toBeGreaterThan(0);
    expect(soir.file[0]!.patience).toBe(B.PATIENCE_CLIENT + B.TRAITS_EFFETS.fetardePatience);
  });

  it('chaque Tête brûlée en service fait monter le risque de dispute', () => {
    const soir = ouvrir(equipe(['ines']));
    expect(facteurDispute(soir)).toBeCloseTo(B.TRAITS_EFFETS.teteBruleeDispute);
    expect(facteurDispute(modifier(soir, 'ines', { repos: true }))).toBe(1);
  });

  it('une personne Fidèle perd moins de loyauté', () => {
    const etat = equipe(['jonas', 'mila'], { minuteDuJour: h(10) });
    const recadrer = (id: string) => perso(ordonner(etat, { type: 'entretienIndividuel', employeId: id, reponse: 'recadrer' }).etat, id);
    expect(perso(etat, 'jonas').loyaute - recadrer('jonas').loyaute).toBeCloseTo(-B.ENTRETIEN.recadrer.loyaute * B.TRAITS_EFFETS.fideleLoyaute);
    expect(perso(etat, 'mila').loyaute - recadrer('mila').loyaute).toBeCloseTo(-B.ENTRETIEN.recadrer.loyaute);
  });
});

describe('moral et qualité', () => {
  it('un moral bas fait baisser la qualité ; un recadrage la remonte le soir même', () => {
    const etat = equipe();
    const normal = qualiteRdv(etat, 'boudoir', 'sanne', 'retraite');
    const morose = qualiteRdv(modifier(etat, 'sanne', { moral: B.SEUIL_MORAL_BAS - 1 }), 'boudoir', 'sanne', 'poete');
    const moroseRef = qualiteRdv(etat, 'boudoir', 'sanne', 'poete');
    expect(moroseRef - morose).toBeCloseTo(B.MALUS_QUALITE_MORAL_BAS);
    const recadree = qualiteRdv(modifier(etat, 'sanne', { recadre: etat.jour }), 'boudoir', 'sanne', 'poete');
    expect(recadree - moroseRef).toBeCloseTo(B.ENTRETIEN.recadrer.qualite);
    expect(normal).toBeGreaterThan(0);
  });
});

describe('menace de départ', () => {
  const matin = (etat: EtatJeu) => tick({ ...etat, minuteDuJour: h(4, 55), briefingJour: etat.jour });

  it('sous 20 de moral, la personne annonce son départ', () => {
    const etat = modifier(equipe(['mila']), 'mila', { moral: 15 });
    const { etat: apres, evenements } = matin(etat);
    const mila = perso(apres, 'mila');
    expect(mila.menaceDepart).toBe(apres.jour + delaiMenace(mila));
    expect(evenements.some((e) => e.type === 'menaceDepart')).toBe(true);
  });

  it('une personne Fidèle laisse plus de temps', () => {
    const etat = equipe(['jonas', 'mila']);
    expect(delaiMenace(perso(etat, 'jonas')) - delaiMenace(perso(etat, 'mila'))).toBe(B.DELAI_MENACE_FIDELE);
  });

  it('remonter son moral au-dessus de 30 lève la menace', () => {
    const etat = modifier(equipe(['mila']), 'mila', { moral: 35, menaceDepart: 9 });
    const { etat: apres, evenements } = matin(etat);
    expect(perso(apres, 'mila').menaceDepart).toBeNull();
    expect(evenements.some((e) => e.type === 'menaceLevee')).toBe(true);
  });

  it('sinon, elle part le jour dit : l’équipe et la réputation en pâtissent', () => {
    const etat = modifier(equipe(['mila', 'jonas']), 'mila', { moral: 10, menaceDepart: 4 });
    const { etat: apres, evenements } = matin(etat);
    expect(apres.jour).toBe(4);
    expect(apres.personnel.map((e) => e.id)).toEqual(['sanne', 'jonas']);
    expect(apres.adieux).toEqual(['Mila']);
    expect(apres.reputation).toBe(etat.reputation - B.DEPART_REPUTATION);
    expect(perso(apres, 'jonas').moral).toBeLessThan(perso(etat, 'jonas').moral);
    expect(Object.keys(apres.affinites).some((k) => k.includes('mila'))).toBe(false);
    expect(evenements).toContainEqual({ type: 'depart', prenom: 'Mila' });
    expect(ordonner(apres, { type: 'adieuVu' }).etat.adieux).toEqual([]);
  });
});

describe('entretien individuel', () => {
  it('écouter remonte le moral, une fois par jour', () => {
    const etat = modifier(equipe(), 'sanne', { moral: 40, loyaute: 50 });
    const une = ordonner(etat, { type: 'entretienIndividuel', employeId: 'sanne', reponse: 'ecouter' }).etat;
    expect(perso(une, 'sanne')).toMatchObject({ moral: 40 + B.ENTRETIEN.ecouter.moral, loyaute: 50 + B.ENTRETIEN.ecouter.loyaute });
    const deux = ordonner(une, { type: 'entretienIndividuel', employeId: 'sanne', reponse: 'ecouter' }).etat;
    expect(perso(deux, 'sanne').moral).toBe(perso(une, 'sanne').moral);
  });

  it('une promesse de repos tenue ne coûte rien', () => {
    const promis = ordonner(modifier(equipe(['mila']), 'mila', { moral: 40 }), { type: 'entretienIndividuel', employeId: 'mila', reponse: 'promettre' }).etat;
    expect(perso(promis, 'mila').promesseRepos).toBe(promis.jour + B.ENTRETIEN.delaiPromesse);
    const soir = ouvrir(promis, { repos: ['mila'] });
    expect(perso(soir, 'mila').promesseRepos).toBeNull();
  });

  it('une promesse oubliée se paie en moral et en loyauté', () => {
    const promis = modifier(equipe(['mila']), 'mila', { moral: 60, loyaute: 60, promesseRepos: 3 });
    const { etat, evenements } = tick({ ...promis, minuteDuJour: h(4, 55), briefingJour: 3 });
    expect(etat.jour).toBe(4);
    expect(perso(etat, 'mila').moral).toBeLessThan(60 + B.ENTRETIEN.promesseRompue.moral + 5);
    expect(perso(etat, 'mila').promesseRepos).toBeNull();
    expect(evenements.some((e) => e.type === 'promesseRompue')).toBe(true);
  });
});

describe('primes', () => {
  it('coûtent de l’argent, remontent le moral, une fois par semaine', () => {
    const etat = modifier(equipe(), 'sanne', { moral: 40 });
    const prime = B.PRIMES[1]!;
    const apres = ordonner(etat, { type: 'prime', employeId: 'sanne', niveau: 1 }).etat;
    expect(apres.tresorerie).toBe(etat.tresorerie - prime.montant);
    expect(perso(apres, 'sanne').moral).toBe(40 + prime.moral);
    const encore = ordonner(apres, { type: 'prime', employeId: 'sanne', niveau: 0 }).etat;
    expect(encore.tresorerie).toBe(apres.tresorerie);
    const semaineSuivante = ordonner({ ...apres, jour: apres.jour + B.JOURS_ENTRE_PRIMES }, { type: 'prime', employeId: 'sanne', niveau: 0 }).etat;
    expect(semaineSuivante.tresorerie).toBe(apres.tresorerie - B.PRIMES[0]!.montant);
  });
});

describe('affinités', () => {
  it('chaque recrue a une affinité avec le reste de l’équipe, adoucie par la Mère poule', () => {
    const etat = equipe(['mila', 'jonas']);
    expect(Object.keys(etat.affinites).sort()).toEqual([cleAffinite('jonas', 'mila'), cleAffinite('mila', 'sanne'), cleAffinite('jonas', 'sanne')].sort());
    for (const v of Object.values(etat.affinites)) expect(Math.abs(v)).toBeLessThanOrEqual(B.AFFINITE.initialeEcart + B.AFFINITE.initialeMerePoule);
  });

  it('les nuits partagées rapprochent ; l’amitié remonte le moral', () => {
    const etat = avantFermeture(equipe(['jonas']));
    const proches = { ...etat, affinites: { [cleAffinite('sanne', 'jonas')]: B.AFFINITE.seuilAmitie + 5 } };
    const loin = { ...etat, affinites: { [cleAffinite('sanne', 'jonas')]: 0 } };
    const moral = (e: EtatJeu) => perso(tick(e).etat, 'jonas').moral;
    expect(moral(proches) - moral(loin)).toBeCloseTo(B.AFFINITE.moralAmitie);
    expect(affinite(tick(loin).etat, 'sanne', 'jonas')).toBeGreaterThan(0);
  });

  it('une Diva et une Ambitieuse en face se marchent dessus', () => {
    const etat = avantFermeture(equipe(['mila', 'ines']));
    const k = cleAffinite('mila', 'ines');
    let courant = { ...etat, affinites: { ...etat.affinites, [k]: 0 } };
    // Mila est Diva et Ambitieuse, Inès Tête brûlée : leur affinité baisse au fil des nuits.
    for (let n = 0; n < 6; n++) courant = { ...avantFermeture(tick(courant).etat), jour: courant.jour };
    expect(affinite(courant, 'mila', 'ines')).toBeLessThan(0);
  });
});

describe('imprévus', () => {
  /** Soirée en cours, 22 h, avec une nuit ouverte. */
  function soiree(etat: EtatJeu): EtatJeu {
    const ouvert = ouvrir(etat);
    return { ...ouvert, minuteDuJour: h(22) };
  }

  /** Force un imprévu à tomber (hasard favorable) et le renvoie. */
  function forcer(etat: EtatJeu) {
    const evenements: EvenementMoteur[] = [];
    for (let graine = 1; graine < 500; graine++) {
      const copie = structuredClone(etat);
      declencherImprevu(copie, creerTirage(graine), evenements);
      if (copie.imprevu) return copie;
    }
    throw new Error('Aucun imprévu');
  }

  it('le tout premier imprévu de la partie est le touriste perdu', () => {
    expect(forcer(soiree(equipe(['mila']))).imprevu?.id).toBe('touriste');
  });

  it('environ deux imprévus par soirée, trois au plus', () => {
    let total = 0;
    for (const graine of [1, 2, 3, 4, 5, 6, 7, 8]) {
      let etat: EtatJeu = { ...ouvrir(equipe(['mila', 'jonas'])), hasard: graine };
      let n = 0;
      for (let i = 0; i < 90; i++) {
        const r = tick(etat);
        etat = r.etat;
        if (etat.imprevu) {
          n += 1;
          etat = ordonner(etat, { type: 'choixImprevu', choix: 0 }).etat;
        }
      }
      expect(n).toBeLessThanOrEqual(B.IMPREVUS_MAX_PAR_NUIT);
      total += n;
    }
    expect(total / 8).toBeGreaterThanOrEqual(1.2);
    expect(total / 8).toBeLessThanOrEqual(3);
  });

  it('un choix applique ses effets, puis l’imprévu se referme', () => {
    const etat = forcer(soiree(equipe()));
    const { etat: apres, evenements } = ordonner(etat, { type: 'choixImprevu', choix: 0 });
    expect(apres.imprevu).toBeNull();
    expect(apres.reputation).toBeCloseTo(etat.reputation + 1);
    expect(evenements).toContainEqual({ type: 'imprevuTranche', id: 'touriste', choix: 0, reussite: true, prenom: undefined, prenom2: undefined });
  });

  it('« a mal aux pieds » ne concerne qu’une personne fatiguée et disponible', () => {
    const def = trouverImprevu('pieds')!;
    const soir = soiree(equipe(['mila']));
    expect(concernes(modifier(modifier(soir, 'mila', { fatigue: 20 }), 'sanne', { fatigue: 20 }), def)).toBeNull();
    const fatiguee = modifier(modifier(soir, 'mila', { fatigue: 70 }), 'sanne', { fatigue: 20 });
    expect(concernes(fatiguee, def)?.employeId).toBe('mila');
    const choisi = { ...fatiguee, imprevu: concernes(fatiguee, def) };
    const repos = ordonner(choisi, { type: 'choixImprevu', choix: 0 }).etat;
    expect(perso(repos, 'mila').repos).toBe(true);
    expect(perso(repos, 'mila').moral).toBeGreaterThan(perso(fatiguee, 'mila').moral);
  });

  it('une querelle demande deux personnes en froid', () => {
    const def = trouverImprevu('querelle')!;
    const soir = soiree(equipe(['mila']));
    const k = cleAffinite('sanne', 'mila');
    expect(concernes({ ...soir, affinites: { [k]: 0 } }, def)).toBeNull();
    const froid = { ...soir, affinites: { [k]: -50 } };
    const imprevu = concernes(froid, def);
    expect([imprevu?.employeId, imprevu?.employe2Id].sort()).toEqual(['mila', 'sanne']);
    const reconcilie = ordonner({ ...froid, imprevu }, { type: 'choixImprevu', choix: 2 }).etat;
    expect(affinite(reconcilie, 'sanne', 'mila')).toBe(-50 + 15);
  });

  it('une demande d’augmentation acceptée relève la part, sans dépasser 65 %', () => {
    const def = trouverImprevu('augmentation')!;
    const soir = soiree(equipe(['mila']));
    const imprevu = concernes(soir, def);
    expect(imprevu?.employeId).toBe('mila');
    const apres = ordonner({ ...soir, imprevu }, { type: 'choixImprevu', choix: 0 }).etat;
    expect(perso(apres, 'mila').part).toBeCloseTo(0.6);
    expect(concernes(modifier(soir, 'mila', { part: 0.65 }), def)).toBeNull();
  });

  it('faire entrer les clients de l’averse les met sur le quai', () => {
    const soir = { ...soiree(equipe()), file: [], imprevu: { id: 'pluie', employeId: null, employe2Id: null } };
    const apres = ordonner(soir, { type: 'choixImprevu', choix: 0 }).etat;
    expect(apres.file.length).toBe(2);
  });
});
