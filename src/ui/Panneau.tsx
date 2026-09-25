import {
  EMPRUNT_RACHAT,
  LIVRAISON_EXPRESS_LINGE,
  MENAGE_MAX,
  MENSUALITE,
  NETTOYAGE_EXPRESS,
  PERSONNEL_MAX,
  RENOVATION,
  SALAIRE_MENAGE,
  TAUX_RESERVE,
  JOURS_ENTRE_PRIMES,
  PRIMES,
  SEUIL_CHAMBRE_INUTILISABLE,
  SEUIL_EPUISEMENT,
  SEUIL_LINGE,
} from '../content/balance';
import { PIECES_COMMUNES, trouverChambre, trouverPiece } from '../content/maison';
import { JOSEE_RESERVE } from '../content/josee';
import { PALIERS } from '../content/paliers';
import { TALENTS, TRAITS, type Talent } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { Candidat, Employe, EtatJeu, Systemes } from '../engine/etat';
import { affinite, peutRecevoirEnEntretien, peutRecevoirPrime } from '../engine/personnel';
import { jourProchaineMensualite, NOMBRE_MENSUALITES } from '../engine/soiree';
import { estOuvert, heureDeInstant, jourDeLaSemaine } from '../engine/temps';
import { Figurine } from '../scene/Figurine';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
import { Jauge } from './Jauge';
import { JoseeLigne } from './Josee';
import { texteEvenement } from './journal';
import { useInterface, type Fiche, type Onglet } from './store';

const t = TEXTES.panneau;

/** Onglets du panneau, avec le système et le palier qui les ouvrent. */
const ONGLETS: { id: Onglet; systeme?: keyof Systemes; palier?: number }[] = [
  { id: 'maison' },
  { id: 'personnel', systeme: 'personnel' },
  { id: 'clientele', systeme: 'clientele', palier: 2 },
  { id: 'finances', systeme: 'finances' },
  { id: 'relations', systeme: 'relations', palier: 3 },
  { id: 'journal' },
];

function palier(numero: number) {
  return PALIERS.find((p) => p.numero === numero) ?? PALIERS[0]!;
}

export function Panneau({ partie }: { partie: EtatJeu }) {
  const onglet = useInterface((s) => s.onglet);
  const fiche = useInterface((s) => s.fiche);
  const choisirOnglet = useInterface((s) => s.choisirOnglet);
  const actuel = ONGLETS.find((o) => o.id === onglet) ?? ONGLETS[0]!;
  const verrouille = actuel.systeme !== undefined && !partie.systemes[actuel.systeme];
  const dernier = lignesJournal(partie)[0];

  return (
    <aside className="panneau">
      <nav className="onglets">
        {ONGLETS.map((o) => {
          const ferme = o.systeme !== undefined && !partie.systemes[o.systeme];
          const nom = TEXTES.onglets[o.id];
          return (
            <button
              key={o.id}
              aria-pressed={onglet === o.id}
              className={ferme ? 'onglet verrouille' : 'onglet'}
              aria-label={ferme && o.palier ? TEXTES.onglets.verrouille(nom, o.palier) : nom}
              onClick={() => choisirOnglet(o.id)}
            >
              {ferme ? (
                <>
                  <Cadenas />
                  <small>{o.palier}</small>
                </>
              ) : (
                nom
              )}
            </button>
          );
        })}
      </nav>
      <div className="panneau-corps">
        {verrouille && actuel.palier ? (
          <OngletVerrouille nom={TEXTES.onglets[actuel.id]} numero={actuel.palier} />
        ) : fiche?.type === 'employe' ? (
          <FicheEmploye partie={partie} id={fiche.id} />
        ) : fiche ? (
          <FichePiece partie={partie} fiche={fiche} />
        ) : (
          <>
            {onglet === 'maison' && <OngletMaison partie={partie} />}
            {onglet === 'personnel' && <OngletPersonnel partie={partie} />}
            {onglet === 'finances' && <OngletFinances partie={partie} />}
            {onglet === 'journal' && <OngletJournal partie={partie} />}
          </>
        )}
      </div>
      <button className="fil" onClick={() => choisirOnglet('journal')}>
        {dernier ? (
          <>
            <b>{formaterHeure(dernier.minuteDuJour)}</b> {dernier.texte}
          </>
        ) : (
          t.journalVide
        )}
      </button>
    </aside>
  );
}

function OngletVerrouille({ nom, numero }: { nom: string; numero: number }) {
  const p = palier(numero);
  return (
    <div className="verrou">
      <Cadenas taille={22} />
      <h2>{nom}</h2>
      <p>{t.ongletVerrouille(p.numero, p.nom, p.objectif)}</p>
    </div>
  );
}

function ProchainPalier({ partie }: { partie: EtatJeu }) {
  const suivant = PALIERS.find((p) => p.numero === partie.palier + 1);
  if (!suivant) return null;
  return (
    <div className="palier">
      <span className="palier-titre">{t.prochainPalier}</span>
      <b>
        {suivant.numero}. {suivant.nom}
      </b>
      <span>{suivant.objectif}</span>
      <span className="palier-ouvre">{suivant.ouvre}</span>
    </div>
  );
}

function Linge({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const a = TEXTES.actions;
  return (
    <>
      <h3>{TEXTES.briefing.linge}</h3>
      <p className={partie.linge < SEUIL_LINGE ? 'sous negatif' : 'sous'}>{a.lingeStock(partie.linge)}</p>
      <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'livraisonLinge' })}>
        {a.livraisonLinge(LIVRAISON_EXPRESS_LINGE.draps, formaterEuros(LIVRAISON_EXPRESS_LINGE.prix))}
      </button>
    </>
  );
}

function Ligne({ titre, detail, fiche }: { titre: string; detail: string; fiche: Fiche }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  return (
    <button className="ligne" onClick={() => ouvrirFiche(fiche)}>
      <span>{titre}</span>
      <small>{detail}</small>
    </button>
  );
}

function OngletMaison({ partie }: { partie: EtatJeu }) {
  return (
    <>
      <ProchainPalier partie={partie} />
      <h3>{t.chambres}</h3>
      {partie.chambres.map((c) => {
        const def = trouverChambre(c.id);
        if (!def) return null;
        return (
          <Ligne
            key={c.id}
            titre={def.nom}
            detail={
              partie.rendezVous.some((r) => r.chambreId === c.id)
                ? TEXTES.actions.occupee
                : c.travaux !== null
                  ? t.travaux
                  : c.ouverte
                  ? `${t.enService} · ${t.proprete.toLowerCase()} ${Math.round(c.proprete)} %`
                  : t.sousDraps
            }
            fiche={{ type: 'chambre', id: c.id }}
          />
        );
      })}
      <Linge partie={partie} />
      <EquipeMenage partie={partie} />
      <h3>{t.piecesCommunes}</h3>
      {PIECES_COMMUNES.map((p) => (
        <Ligne
          key={p.id}
          titre={p.nom}
          detail={p.id === 'bar' && !partie.systemes.bar ? t.sousDraps : t.ouvert}
          fiche={{ type: 'piece', id: p.id }}
        />
      ))}
    </>
  );
}

function EquipeMenage({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const n = partie.equipes.menage;
  const ouvert = partie.systemes.recrutement;
  return (
    <>
      <h3>{t.equipeMenage}</h3>
      <p className="sous">{t.effectifMenage(n, formaterEuros(SALAIRE_MENAGE))}</p>
      {ouvert ? (
        <div className="boutons-ligne">
          <button className="bouton discret" disabled={n <= 1} onClick={() => ordonner({ type: 'equipeMenage', effectif: n - 1 })}>
            {t.retirerMenage}
          </button>
          <button className="bouton discret" disabled={n >= MENAGE_MAX} onClick={() => ordonner({ type: 'equipeMenage', effectif: n + 1 })}>
            {t.ajouterMenage}
          </button>
        </div>
      ) : (
        <p className="verrou-ligne">
          <Cadenas /> {t.menageVerrouille(palier(1).numero, palier(1).nom)}
        </p>
      )}
    </>
  );
}

function Renovation({ partie, chambreId }: { partie: EtatJeu; chambreId: string }) {
  const ordonner = useInterface((s) => s.ordonner);
  const chambre = partie.chambres.find((c) => c.id === chambreId);
  if (!chambre || chambre.ouverte) return null;
  if (chambre.travaux !== null) {
    return <p className="statut">{t.travauxFin(formaterHeure(heureDeInstant(chambre.travaux)))}</p>;
  }
  if (!partie.systemes.renovation) {
    const renovation = palier(1);
    return (
      <p className="verrou-ligne">
        <Cadenas /> {t.renovationVerrouillee(renovation.numero, renovation.nom)}
      </p>
    );
  }
  const assez = partie.tresorerie >= RENOVATION.prix;
  return (
    <>
      <button
        className="bouton principal pleine-largeur"
        disabled={!assez}
        onClick={() => ordonner({ type: 'renover', chambreId })}
      >
        {t.renover(formaterEuros(RENOVATION.prix), RENOVATION.heures)}
      </button>
      <p className={assez ? 'sous' : 'sous negatif'}>
        {assez ? t.renoverDetail : t.renoverTropCher(formaterEuros(RENOVATION.prix))}
      </p>
    </>
  );
}

function FichePiece({ partie, fiche }: { partie: EtatJeu; fiche: Fiche }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const retour = (
    <button className="retour" onClick={() => ouvrirFiche(null)}>
      {t.retour}
    </button>
  );

  if (fiche.type === 'employe') return retour;
  if (fiche.type === 'piece') {
    const piece = trouverPiece(fiche.id);
    const rouvre = palier(2);
    return (
      <div className="fiche">
        {retour}
        <h2>{piece.nom}</h2>
        <p className="sous">{piece.description}</p>
        {fiche.id === 'bar' && !partie.systemes.bar && (
          <p className="verrou-ligne">
            <Cadenas /> {t.barVerrouille(rouvre.numero, rouvre.nom)}
          </p>
        )}
      </div>
    );
  }

  const def = trouverChambre(fiche.id);
  const chambre = partie.chambres.find((c) => c.id === fiche.id);
  if (!def || !chambre) return retour;
  const occupee = partie.rendezVous.some((r) => r.chambreId === chambre.id);
  return (
    <div className="fiche">
      {retour}
      <h2>
        {def.nom} {def.premium && <span className="pastille premium">{t.premium}</span>}
      </h2>
      <p className="sous">{def.theme}</p>
      <p className="statut">
        {occupee ? TEXTES.actions.occupee : chambre.ouverte ? t.enService : chambre.travaux !== null ? t.travaux : t.sousDraps}
      </p>
      {chambre.ouverte && <Jauge nom={t.proprete} valeur={chambre.proprete} alerte={chambre.proprete < 40} />}
      <Jauge nom={t.etat} valeur={chambre.etat} />
      {chambre.ouverte && chambre.proprete < SEUIL_CHAMBRE_INUTILISABLE && (
        <p className="sous negatif">{TEXTES.actions.inutilisable}</p>
      )}
      {chambre.ouverte && (
        <BoutonNettoyage chambreId={chambre.id} desactive={occupee || chambre.proprete >= 100} />
      )}
      <Renovation partie={partie} chambreId={chambre.id} />
    </div>
  );
}

function BoutonNettoyage({ chambreId, desactive }: { chambreId: string; desactive: boolean }) {
  const ordonner = useInterface((s) => s.ordonner);
  return (
    <button
      className="bouton principal pleine-largeur"
      disabled={desactive}
      onClick={() => ordonner({ type: 'nettoyageExpress', chambreId })}
    >
      {TEXTES.actions.nettoyageExpress(formaterEuros(NETTOYAGE_EXPRESS))}
    </button>
  );
}

function statutEmploye(partie: EtatJeu, e: Employe): string {
  const st = TEXTES.personnel.statuts;
  if (partie.rendezVous.some((r) => r.employeId === e.id)) return st.rdv;
  if (e.repos) return st.repos;
  if (!estOuvert(partie)) return st.horsService;
  if (e.fatigue > SEUIL_EPUISEMENT) return st.epuisee(e.genre);
  if (e.rdvCeSoir >= partie.rdvMax) return st.quota;
  return st.disponible;
}

function Pastilles({ n }: { n: number }) {
  return (
    <span className="pastilles" aria-label={`${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'pleine' : ''} />
      ))}
    </span>
  );
}

/** Petit portrait en pied, tiré de la silhouette. */
export function Portrait({ personne, petit = false }: { personne: { silhouette: Employe['silhouette'] }; petit?: boolean }) {
  return (
    <svg className={petit ? 'portrait petit' : 'portrait'} viewBox="4 -1 16 20" aria-hidden="true">
      <Figurine silhouette={personne.silhouette} x={12} y={50} hauteur={50} />
    </svg>
  );
}

export function Talents({ talents }: { talents: Employe['talents'] }) {
  return (
    <div className="talents">
      {(Object.keys(TALENTS) as Talent[]).map((k) => (
        <div key={k}>
          <span>{TALENTS[k]}</span>
          <Pastilles n={talents[k]} />
        </div>
      ))}
    </div>
  );
}

function nomDuJour(jour: number): string {
  return TEXTES.date(TEXTES.jours[jourDeLaSemaine(jour)] ?? '', jour).toLowerCase();
}

function FicheEmploye({ partie, id }: { partie: EtatJeu; id: string }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const employe = partie.personnel.find((e) => e.id === id);
  const retour = (
    <button className="retour" onClick={() => ouvrirFiche(null)}>
      {t.retour}
    </button>
  );
  if (!employe) return retour;
  const p = TEXTES.personnel;
  const enRdv = partie.rendezVous.some((r) => r.employeId === employe.id);
  const caches = employe.traits.length - employe.traitsConnus.length;
  return (
    <div className="employe">
      {retour}
      <div className="employe-entete">
        <Portrait personne={employe} />
        <div>
          <h2>
            {employe.prenom} <small>{p.ans(employe.age)}</small>
          </h2>
          <p className="sous">{employe.accroche}</p>
          <span className="pastille ouverte">{statutEmploye(partie, employe)}</span>
        </div>
      </div>
      {employe.menaceDepart !== null && <p className="alerte-ligne">{TEXTES.suivi.menace(nomDuJour(employe.menaceDepart))}</p>}
      {employe.promesseRepos !== null && <p className="sous laiton">{TEXTES.suivi.promesse(nomDuJour(employe.promesseRepos + 1))}</p>}
      {employe.finEssai !== null && <p className="sous">{p.enEssai(nomDuJour(employe.finEssai))}</p>}
      <Jauge nom={p.fatigue} valeur={employe.fatigue} alerte={employe.fatigue > 70} />
      <Jauge nom={p.moral} valeur={employe.moral} alerte={employe.moral < 35} />
      <Jauge nom={p.loyaute} valeur={employe.loyaute} />
      {estOuvert(partie) && <p className="sous">{p.rdvCeSoir(employe.rdvCeSoir, partie.rdvMax)}</p>}
      {estOuvert(partie) && !employe.repos && (
        <button className="bouton discret pleine-largeur" disabled={enRdv} onClick={() => ordonner({ type: 'repos', employeId: employe.id })}>
          {p.mettreAuRepos}
        </button>
      )}
      {partie.systemes.planning && <Suivi partie={partie} employe={employe} />}
      <h3>{p.talents}</h3>
      <Talents talents={employe.talents} />
      <h3>{p.traits}</h3>
      {employe.traitsConnus.map((trait) => (
        <p key={trait} className="trait">
          <b>{trait}</b> {TRAITS[trait]}
        </p>
      ))}
      {Array.from({ length: caches }, (_, i) => (
        <p key={i} className="trait cache">
          <b>{p.traitCache}</b> {p.traitCacheDetail}
        </p>
      ))}
      <p className="sous">{p.part(Math.round(employe.part * 100))}</p>
      <Affinites partie={partie} employe={employe} />
    </div>
  );
}

/** Entretien individuel et primes. */
function Suivi({ partie, employe }: { partie: EtatJeu; employe: Employe }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirEntretienIndividuel = useInterface((s) => s.ouvrirEntretienIndividuel);
  const su = TEXTES.suivi;
  const entretienPossible = peutRecevoirEnEntretien(partie, employe);
  const enRdv = partie.rendezVous.some((r) => r.employeId === employe.id);
  const primePossible = peutRecevoirPrime(partie, employe);
  return (
    <>
      <button
        className="bouton principal pleine-largeur"
        disabled={!entretienPossible}
        onClick={() => ouvrirEntretienIndividuel(employe.id)}
      >
        {entretienPossible ? su.entretien : enRdv ? su.entretienOccupe : su.entretienFait}
      </button>
      <div className="boutons-ligne" role="group" aria-label={su.primes}>
        {PRIMES.map((prime, niveau) => (
          <button
            key={prime.montant}
            className="bouton discret"
            disabled={!primePossible || partie.tresorerie < prime.montant}
            onClick={() => ordonner({ type: 'prime', employeId: employe.id, niveau })}
          >
            {su.prime(formaterEuros(prime.montant))}
          </button>
        ))}
      </div>
      {!primePossible && (
        <p className="sous">{su.primeAttente(JOURS_ENTRE_PRIMES - (partie.jour - employe.dernierePrime))}</p>
      )}
    </>
  );
}

function Affinites({ partie, employe }: { partie: EtatJeu; employe: Employe }) {
  const autres = partie.personnel.filter((e) => e.id !== employe.id);
  if (autres.length === 0) return null;
  const su = TEXTES.suivi;
  return (
    <>
      <h3>{su.affinites}</h3>
      {autres.map((autre) => {
        const v = affinite(partie, employe.id, autre.id);
        return (
          <p key={autre.id} className="trait">
            <b>{autre.prenom}</b>{' '}
            <span className={v <= -30 ? 'negatif' : v >= 40 ? 'positif' : ''}>{su.niveauxAffinite(v)}</span>
          </p>
        );
      })}
    </>
  );
}

function LigneEmploye({ partie, employe }: { partie: EtatJeu; employe: Employe }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  return (
    <button className="ligne ligne-personne" onClick={() => ouvrirFiche({ type: 'employe', id: employe.id })}>
      <Portrait personne={employe} petit />
      <span>
        {employe.prenom}
        <small>
          {TEXTES.personnel.fatigue} {Math.round(employe.fatigue)} % · {TEXTES.personnel.moral.toLowerCase()} {Math.round(employe.moral)} %
        </small>
      </span>
      <small>{statutEmploye(partie, employe)}</small>
    </button>
  );
}

function LigneCandidat({ candidat }: { candidat: Candidat }) {
  const ouvrirEntretien = useInterface((s) => s.ouvrirEntretien);
  const r = TEXTES.recrutement;
  return (
    <button className="ligne ligne-personne" onClick={() => ouvrirEntretien(candidat.id)}>
      <Portrait personne={candidat} petit />
      <span>
        {candidat.prenom} <small>{TEXTES.personnel.ans(candidat.age)} · {r.source[candidat.source]}</small>
        <small>{r.attendJusquA(nomDuJour(candidat.expire))}</small>
      </span>
      <small className="lien">{r.recevoir}</small>
    </button>
  );
}

function OngletPersonnel({ partie }: { partie: EtatJeu }) {
  const recrutement = palier(1);
  const r = TEXTES.recrutement;
  return (
    <>
      <h3>{r.effectif(partie.personnel.length, PERSONNEL_MAX)}</h3>
      {partie.personnel.map((e) => (
        <LigneEmploye key={e.id} partie={partie} employe={e} />
      ))}
      {partie.systemes.recrutement ? (
        <>
          <h3>{r.candidats}</h3>
          {partie.candidats.length === 0 ? (
            <p className="sous">{partie.visites.length > 0 ? t.recrutementOuvert : r.aucunCandidat}</p>
          ) : (
            partie.candidats.map((c) => <LigneCandidat key={c.id} candidat={c} />)
          )}
        </>
      ) : (
        <p className="verrou-ligne">
          <Cadenas /> {t.recrutementVerrouille(recrutement.numero, recrutement.nom)}
        </p>
      )}
    </>
  );
}

function OngletFinances({ partie }: { partie: EtatJeu }) {
  const jour = jourProchaineMensualite(partie);
  const restantes = NOMBRE_MENSUALITES - partie.mensualitesPayees;
  return (
    <>
      <dl className="chiffres">
        <div>
          <dt>{t.tresorerie}</dt>
          <dd className={partie.tresorerie < 0 ? 'negatif' : ''}>{formaterEuros(partie.tresorerie)}</dd>
        </div>
        <div>
          <dt>{t.emprunt}</dt>
          <dd>
            {formaterEuros(EMPRUNT_RACHAT)} · {restantes > 0 ? t.empruntRestant(restantes) : t.empruntRembourse}
          </dd>
        </div>
        {jour !== null && (
          <div>
            <dt>{t.mensualite}</dt>
            <dd>{t.mensualiteDetail(formaterEuros(MENSUALITE), jour, jour - partie.jour)}</dd>
          </div>
        )}
      </dl>
      <Reserve partie={partie} />
    </>
  );
}

function Reserve({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!partie.systemes.reserve) {
    const p = palier(1);
    return (
      <p className="verrou-ligne">
        <Cadenas /> {t.reserveVerrouillee(p.numero, p.nom)}
      </p>
    );
  }
  const indice = Math.max(0, TAUX_RESERVE.findIndex((x) => x === partie.tauxReserve));
  return (
    <>
      <h3>{t.reserve}</h3>
      <p className="sous">{t.reserveDetail}</p>
      <div className="boutons-ligne" role="group" aria-label={t.reserve}>
        {TAUX_RESERVE.map((taux) => (
          <button
            key={taux}
            className={partie.tauxReserve === taux ? 'choix-court choisi' : 'choix-court'}
            aria-pressed={partie.tauxReserve === taux}
            aria-label={t.reserveTauxLabel(Math.round(taux * 100))}
            onClick={() => ordonner({ type: 'tauxReserve', taux })}
          >
            {t.reserveTaux(Math.round(taux * 100))}
          </button>
        ))}
      </div>
      <JoseeLigne texte={JOSEE_RESERVE.taux[indice] ?? ''} />
      <dl className="chiffres">
        <div>
          <dt>{t.reserveMontant}</dt>
          <dd>{formaterEuros(partie.reserve)}</dd>
        </div>
      </dl>
      {partie.reserve > 0 && (
        <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'retirerReserve' })}>
          {t.retirerReserve(formaterEuros(partie.reserve))}
        </button>
      )}
    </>
  );
}

/** Lignes du journal mises en texte, du plus récent au plus ancien. */
function lignesJournal(partie: EtatJeu) {
  return partie.journal.flatMap((e) => {
    const texte = texteEvenement(e.evenement, partie);
    return texte ? [{ jour: e.jour, minuteDuJour: e.minuteDuJour, texte }] : [];
  });
}

function OngletJournal({ partie }: { partie: EtatJeu }) {
  const journal = lignesJournal(partie);
  if (journal.length === 0) return <p className="sous">{t.journalVide}</p>;
  return (
    <ol className="journal">
      {journal.map((e, i) => (
        <li key={i}>
          <span>
            {TEXTES.jours[jourDeLaSemaine(e.jour)]?.slice(0, 3)}. {formaterHeure(e.minuteDuJour)}
          </span>
          {e.texte}
        </li>
      ))}
    </ol>
  );
}
