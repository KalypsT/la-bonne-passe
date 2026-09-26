import {
  DECOUVERT,
  GESTION_JOSEE,
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
  TAPAGE,
} from '../content/balance';
import { trouverIntrigue } from '../content/intrigues';
import { trouverAmbition } from '../content/ambitions';
import { OBJECTIFS_MOIS, trouverDefi } from '../content/defis';
import { defiReussi, objectifReussi, valeurDefi, valeurObjectif } from '../engine/bilans';
import { formaterMesure, texteDefi, texteObjectif } from './objectifs';
import { ANNEXES, DECORS, PIECES_COMMUNES, trouverChambre, trouverPiece } from '../content/maison';
import { JOSEE_RESERVE } from '../content/josee';
import { PALIERS } from '../content/paliers';
import { TALENTS, TRAITS, type Talent } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { Candidat, Employe, EtatJeu, Systemes } from '../engine/etat';
import { affinite, peutRecevoirEnEntretien, peutRecevoirPrime } from '../engine/personnel';
import { quotaAtteint } from '../engine/regles';
import { totalDepenses, totalRecettes } from '../engine/comptes';
import { jourProchaineMensualite, NOMBRE_MENSUALITES } from '../engine/soiree';
import { agiosDuJour, majorationTaux } from '../engine/banque';
import { prixFournisseur } from '../engine/relations';
import { impotEstime, jourProchainImpot } from '../engine/fisc';
import { TEXTES_BANQUE } from '../content/banque';
import { estOuvert, heureDeInstant, jourDeLaSemaine } from '../engine/temps';
import { Figurine } from '../scene/Figurine';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
import { Jauge } from './Jauge';
import { JoseeLigne } from './Josee';
import { texteEvenement } from './journal';
import { remplir } from './modeles';
import { etatDuBar, FicheBar } from './FicheBar';
import { FicheRegles, FicheSegment, OngletClientele } from './OngletClientele';
import { FicheActeur, FicheRivale, OngletRelations } from './OngletRelations';
import { Assurance, EquipesQuartier } from './Equipes';
import { NouvelEmprunt } from './Emprunt';
import { AmenagementChambre, FicheAnnexe, statutAnnexe } from './Amenagement';
import { TEXTES_AMENAGEMENT } from '../content/amenagement';
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
    <aside className="panneau" data-tuto="panneau">
      <nav className="onglets">
        {ONGLETS.map((o) => {
          const ferme = o.systeme !== undefined && !partie.systemes[o.systeme];
          const nom = TEXTES.onglets[o.id];
          return (
            <button
              key={o.id}
              aria-pressed={onglet === o.id}
              data-tuto={`onglet-${o.id}`}
              className={ferme ? 'onglet verrouille' : 'onglet'}
              aria-label={ferme && o.palier ? TEXTES.onglets.verrouille(nom, o.palier) : nom}
              onClick={() => choisirOnglet(o.id)}
            >
              {ferme ? (
                <>
                  <Cadenas />
                  {partie.palier < (o.palier ?? 0) && <small>{o.palier}</small>}
                </>
              ) : (
                nom
              )}
            </button>
          );
        })}
      </nav>
      <div className="panneau-corps" key={`${onglet}-${fiche?.type ?? ''}-${fiche?.id ?? ''}`}>
        {verrouille && actuel.palier ? (
          <OngletVerrouille nom={TEXTES.onglets[actuel.id]} numero={actuel.palier} atteint={partie.palier >= actuel.palier} />
        ) : fiche?.type === 'employe' ? (
          <FicheEmploye partie={partie} id={fiche.id} />
        ) : fiche?.type === 'segment' ? (
          <FicheSegment partie={partie} id={fiche.id} />
        ) : fiche?.type === 'regles' ? (
          <FicheRegles partie={partie} />
        ) : fiche?.type === 'acteur' ? (
          <FicheActeur partie={partie} id={fiche.id} />
        ) : fiche?.type === 'rivale' ? (
          <FicheRivale partie={partie} />
        ) : fiche ? (
          <FichePiece partie={partie} fiche={fiche} />
        ) : (
          <>
            {onglet === 'maison' && <OngletMaison partie={partie} />}
            {onglet === 'personnel' && <OngletPersonnel partie={partie} />}
            {onglet === 'clientele' && <OngletClientele partie={partie} />}
            {onglet === 'finances' && <OngletFinances partie={partie} />}
            {onglet === 'relations' && <OngletRelations partie={partie} />}
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

/** Onglet pas encore ouvert. Un palier atteint dont le système n'existe pas encore le dit franchement. */
function OngletVerrouille({ nom, numero, atteint }: { nom: string; numero: number; atteint: boolean }) {
  const p = palier(numero);
  return (
    <div className="verrou">
      <Cadenas taille={22} />
      <h2>{nom}</h2>
      <p>{atteint ? t.ongletPlusTard : t.ongletVerrouille(p.numero, p.nom, p.objectif)}</p>
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
      <p className={partie.linge < SEUIL_LINGE ? 'sous negatif' : 'sous'}>
        {a.lingeStock(partie.linge)}
        {partie.annexes.buanderie.ouverte && ` · ${a.lingeSale(partie.annexes.buanderie.sale)}`}
        {partie.lingeCommande > 0 && ` · ${a.lingeEnRoute(partie.lingeCommande)}`}
      </p>
      <p className="sous">{a.lingeAuto(partie.lingeAuto)}</p>
      <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'livraisonLinge' })}>
        {a.livraisonLinge(LIVRAISON_EXPRESS_LINGE.parures, formaterEuros(prixFournisseur(partie, LIVRAISON_EXPRESS_LINGE.prix)))}
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
      <Objectifs partie={partie} />
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
                  : c.fermee
                  ? TEXTES_AMENAGEMENT.fermee
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
          detail={p.id === 'bar' ? etatDuBar(partie) : t.ouvert}
          fiche={{ type: 'piece', id: p.id }}
        />
      ))}
      {(partie.systemes.buanderie || partie.systemes.loges) && <h3>{TEXTES_AMENAGEMENT.annexes}</h3>}
      {(['buanderie', 'loges'] as const)
        .filter((id) => partie.systemes[id])
        .map((id) => (
          <Ligne key={id} titre={ANNEXES[id].nom} detail={statutAnnexe(partie, id)} fiche={{ type: 'annexe', id }} />
        ))}
      <Voisinage partie={partie} />
    </>
  );
}

/** Le défi de la semaine et l'objectif du mois, avec où on en est. */
function Objectifs({ partie }: { partie: EtatJeu }) {
  const o = TEXTES.objectifs;
  const def = partie.defi ? trouverDefi(partie.defi) : undefined;
  if (partie.palier < 1 && !def) return null;
  const mois = partie.mois;
  const valeurMois = valeurObjectif(partie, mois);
  const jourMensualite = jourProchaineMensualite(partie);
  return (
    <>
      {def && (
        <div className="objectif">
          <span className="palier-titre">{o.defi}</span>
          <b>{def.titre}</b>
          <span>{texteDefi(def, partie)}</span>
          <span className={defiReussi(def, valeurDefi(partie, def)) ? 'positif' : 'sous'}>
            {o.progression(formaterMesure(def.mesure.type, valeurDefi(partie, def)), formaterMesure(def.mesure.type, def.cible), !!def.auPlus)}
          </span>
          <span className="palier-ouvre">{o.recompense(def.recompenseTexte)}</span>
        </div>
      )}
      {jourMensualite !== null && (
        <div className="objectif">
          <span className="palier-titre">{o.mois(mois.numero)}</span>
          <b>{OBJECTIFS_MOIS[mois.objectif].titre}</b>
          <span>{texteObjectif(mois)}</span>
          <span className={objectifReussi(mois, valeurMois) ? 'positif' : 'sous'}>
            {o.progression(formaterMesure(mois.objectif, valeurMois), formaterMesure(mois.objectif, mois.cible), mois.objectif === 'equipe')}
          </span>
          <span className="palier-ouvre">{o.jugeLe(jourMensualite)}</span>
        </div>
      )}
    </>
  );
}

/** Humeur du voisinage, à partir du palier 2 (quand les groupes arrivent). */
function Voisinage({ partie }: { partie: EtatJeu }) {
  if (partie.palier < 2) return null;
  const v = TEXTES.voisinage;
  const tapage = partie.quartier.tapage;
  const niveau = tapage >= TAPAGE.plainte ? 2 : tapage >= TAPAGE.recidive ? 1 : 0;
  return (
    <>
      <h3>{v.titre}</h3>
      <p className={niveau === 2 ? 'sous negatif' : 'sous'}>
        {v.niveaux[niveau]}
        {partie.quartier.insonorise ? ` · ${v.insonorise}` : ''}
      </p>
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

  if (fiche.type === 'employe' || fiche.type === 'segment' || fiche.type === 'regles') return retour;
  if (fiche.type === 'annexe') {
    return (
      <div className="fiche">
        {retour}
        <FicheAnnexe partie={partie} id={fiche.id} />
      </div>
    );
  }
  if (fiche.type === 'piece') {
    const piece = trouverPiece(fiche.id);
    return (
      <div className="fiche">
        {retour}
        <h2>{piece.nom}</h2>
        <p className="sous">{fiche.id === 'bar' && partie.bar.ouvert ? (piece.descriptionOuverte ?? piece.description) : piece.description}</p>
        {fiche.id === 'bar' && <FicheBar partie={partie} />}
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
      <p className="sous">{DECORS[chambre.decor].theme}</p>
      <p className="statut">
        {occupee
          ? TEXTES.actions.occupee
          : chambre.travaux !== null
            ? t.travaux
            : chambre.fermee
              ? TEXTES_AMENAGEMENT.fermee
              : chambre.ouverte
                ? t.enService
                : t.sousDraps}
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
      <AmenagementChambre partie={partie} chambre={chambre} />
    </div>
  );
}

function BoutonNettoyage({ chambreId, desactive }: { chambreId: string; desactive: boolean }) {
  const ordonner = useInterface((s) => s.ordonner);
  return (
    <button
      className="bouton principal pleine-largeur"
      disabled={desactive}
      data-tuto="nettoyage"
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
  if (quotaAtteint(partie, e)) return st.quota;
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
      {estOuvert(partie) && <p className="sous">{p.rdvCeSoir(employe.rdvCeSoir, employe.chargeCeSoir, partie.rdvMax)}</p>}
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
      <h3>{p.ambition}</h3>
      <Ambition personne={employe} />
      <p className="sous">{p.part(Math.round(employe.part * 100))}</p>
      <Affinites partie={partie} employe={employe} />
    </div>
  );
}

/** Le nom d'une ambition, accordé au genre de la personne. */
export function nomAmbition(personne: { ambition: string; genre: 'f' | 'm' }): string {
  return (trouverAmbition(personne.ambition)?.nom ?? '').replaceAll('{e}', personne.genre === 'f' ? 'e' : '');
}

/** L'ambition d'une personne, et ce qu'elle en dit. */
function Ambition({ personne }: { personne: { ambition: string; genre: 'f' | 'm' } }) {
  const ambition = trouverAmbition(personne.ambition);
  if (!ambition) return null;
  return (
    <p className="trait">
      <b>{nomAmbition(personne)}</b> {ambition.texte}
    </p>
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
      {partie.palier >= 2 && <EquipesQuartier partie={partie} />}
    </>
  );
}

function OngletFinances({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
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
      <Banque partie={partie} />
      <dl className="chiffres">
        <div>
          <dt>{TEXTES.semaine.enCours}</dt>
          <dd>
            {TEXTES.semaine.enCoursDetail(
              formaterEuros(totalRecettes(partie.semaine.comptes)),
              formaterEuros(totalDepenses(partie.semaine.comptes)),
            )}
          </dd>
        </div>
      </dl>
      {partie.bilanSemaine && (
        <button className="bouton discret pleine-largeur" onClick={() => ouvrirCarte('semaine')}>
          {TEXTES.semaine.revoir}
        </button>
      )}
      {partie.avance.statut === 'acceptee' && partie.avance.echeance !== null && (
        <dl className="chiffres">
          <div>
            <dt>{TEXTES.bar.avance}</dt>
            <dd>{TEXTES.bar.avanceDetail(formaterEuros(partie.avance.montant), partie.avance.echeance)}</dd>
          </div>
        </dl>
      )}
      <Impot partie={partie} />
      <Reserve partie={partie} />
      <Assurance partie={partie} />
      <NouvelEmprunt partie={partie} />
    </>
  );
}

/** La banque : découvert, agios, salaires dus, mensualité en retard, avec l'avis de Josée (v0.6). */
function Banque({ partie }: { partie: EtatJeu }) {
  const tb = TEXTES_BANQUE.finances;
  const b = partie.banque;
  const echeance = jourProchaineMensualite(partie);
  const agios = agiosDuJour(partie);
  const menace =
    echeance !== null && echeance - partie.jour <= 7 && partie.tresorerie + partie.reserve - MENSUALITE - b.retard < -DECOUVERT.plafond;
  const avis =
    b.retard > 0 && echeance !== null
      ? TEXTES_BANQUE.josee.retard(echeance)
      : partie.tresorerie < -DECOUVERT.plafond
        ? TEXTES_BANQUE.josee.depasse
        : menace
          ? TEXTES_BANQUE.josee.menace
          : partie.tresorerie < 0
            ? TEXTES_BANQUE.josee.decouvert
            : TEXTES_BANQUE.josee.tranquille;
  return (
    <>
      <h3>{tb.titre}</h3>
      <dl className="chiffres">
        <div>
          <dt>{tb.decouvertAutorise}</dt>
          <dd>{tb.decouvertDetail}</dd>
        </div>
        {agios > 0 && (
          <div>
            <dt>{tb.agiosDemain}</dt>
            <dd className="negatif">−{formaterEuros(agios)}</dd>
          </div>
        )}
        {b.salairesDus > 0 && (
          <div>
            <dt>{tb.salairesDus}</dt>
            <dd className="negatif">{formaterEuros(b.salairesDus)}</dd>
          </div>
        )}
        {b.retard > 0 && echeance !== null && (
          <div>
            <dt>{tb.retard}</dt>
            <dd className="negatif">{tb.retardDetail(formaterEuros(b.retard), echeance)}</dd>
          </div>
        )}
        {b.impayees > 0 && (
          <div>
            <dt>{tb.impayees}</dt>
            <dd>{tb.impayeesDetail(b.impayees, majorationTaux(partie))}</dd>
          </div>
        )}
      </dl>
      {menace && b.retard === 0 && echeance !== null && <p className="alerte-ligne">{tb.mensualiteMenacee(echeance)}</p>}
      <JoseeLigne texte={avis} />
    </>
  );
}

/** L'impôt du trimestre : bénéfice des semaines closes, estimation et jour du prélèvement (v0.6). */
function Impot({ partie }: { partie: EtatJeu }) {
  const ti = TEXTES_BANQUE.impot;
  const f = partie.fisc;
  return (
    <>
      <h3>{ti.titre}</h3>
      <p className="sous">{ti.detail}</p>
      <dl className="chiffres">
        {f.du > 0 && (
          <div>
            <dt>{ti.annonce(f.jourDu)}</dt>
            <dd className="negatif">{formaterEuros(f.du)}</dd>
          </div>
        )}
        {f.semaines > 0 && (
          <div>
            <dt>{ti.benefice(f.semaines)}</dt>
            <dd className={f.benefice < 0 ? 'negatif' : ''}>{formaterEuros(Math.round(f.benefice))}</dd>
          </div>
        )}
        {f.du === 0 && f.semaines > 0 && (
          <div>
            <dt>{ti.estimation(jourProchainImpot(partie))}</dt>
            <dd>{formaterEuros(impotEstime(partie))}</dd>
          </div>
        )}
      </dl>
      {f.du === 0 && f.semaines === 0 && <p className="sous">{ti.aucune}</p>}
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
  const g = TEXTES_BANQUE.gestion;
  const josee = partie.gestionJosee;
  return (
    <>
      <h3>{g.titre}</h3>
      <div className="boutons-ligne" role="group" aria-label={g.titre}>
        <button className={!josee ? 'choix-court choisi' : 'choix-court'} aria-pressed={!josee} onClick={() => ordonner({ type: 'gestionJosee', active: false })}>
          {g.moi}
        </button>
        <button className={josee ? 'choix-court choisi' : 'choix-court'} aria-pressed={josee} onClick={() => ordonner({ type: 'gestionJosee', active: true })}>
          {g.josee}
        </button>
      </div>
      <p className="sous">
        {josee ? g.detailJosee(Math.round(GESTION_JOSEE.commission * 100)) : g.detailMoi}
        {josee && partie.banque.sursis && ` ${g.sursisUtilise}`}
      </p>
      <JoseeLigne texte={josee ? g.joseeJosee : g.joseeMoi} />
      <h3>{t.reserve}</h3>
      <p className="sous">{t.reserveDetail}</p>
      <div className="boutons-ligne" role="group" aria-label={t.reserve}>
        {TAUX_RESERVE.map((taux) => (
          <button
            key={taux}
            className={partie.tauxReserve === taux ? 'choix-court choisi' : 'choix-court'}
            aria-pressed={partie.tauxReserve === taux}
            aria-label={t.reserveTauxLabel(Math.round(taux * 100))}
            disabled={josee && partie.tauxReserve !== taux}
            onClick={() => ordonner({ type: 'tauxReserve', taux })}
          >
            {t.reserveTaux(Math.round(taux * 100))}
          </button>
        ))}
      </div>
      {!josee && <JoseeLigne texte={JOSEE_RESERVE.taux[indice] ?? ''} />}
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

/** Les intrigues en cours, et où en est chacune. Les suites courtes restent une surprise. */
function IntriguesEnCours({ partie }: { partie: EtatJeu }) {
  const enCours = partie.intrigues.actives.flatMap((a) => {
    const def = trouverIntrigue(a.id);
    const etape = def?.etapes[a.etape];
    if (!def || !etape || def.genre !== 'intrigue') return [];
    const e = partie.personnel.find((x) => x.id === a.employeId);
    return [{ id: a.id, titre: remplir(def.titre, partie, e), texte: remplir(etape.enCours, partie, e) }];
  });
  if (enCours.length === 0) return null;
  return (
    <>
      <h3>{TEXTES.intrigue.enCours}</h3>
      {enCours.map((i) => (
        <p key={i.id} className="intrigue-en-cours">
          <strong>{i.titre}</strong>
          {i.texte}
        </p>
      ))}
    </>
  );
}

function OngletJournal({ partie }: { partie: EtatJeu }) {
  const journal = lignesJournal(partie);
  if (journal.length === 0) return <p className="sous">{t.journalVide}</p>;
  return (
    <>
      <IntriguesEnCours partie={partie} />
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
    </>
  );
}
