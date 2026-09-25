import {
  EMPRUNT_RACHAT,
  JOUR_PREMIERE_MENSUALITE,
  LIVRAISON_EXPRESS_LINGE,
  MENSUALITE,
  NETTOYAGE_EXPRESS,
  RDV_MAX_PAR_SOIR,
  SEUIL_CHAMBRE_INUTILISABLE,
  SEUIL_EPUISEMENT,
  SEUIL_LINGE,
} from '../content/balance';
import { PIECES_COMMUNES, trouverChambre, trouverPiece } from '../content/maison';
import { PALIERS } from '../content/paliers';
import { SANNE, TALENTS, TRAITS, type Talent } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { Employe, EtatJeu, Systemes } from '../engine/etat';
import { estOuvert, jourDeLaSemaine } from '../engine/temps';
import { Figurine } from '../scene/Figurine';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
import { Jauge } from './Jauge';
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
  const journal = useInterface((s) => s.journal);
  const choisirOnglet = useInterface((s) => s.choisirOnglet);
  const actuel = ONGLETS.find((o) => o.id === onglet) ?? ONGLETS[0]!;
  const verrouille = actuel.systeme !== undefined && !partie.systemes[actuel.systeme];
  const dernier = journal[0];

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
        ) : fiche ? (
          <FichePiece partie={partie} fiche={fiche} />
        ) : (
          <>
            {onglet === 'maison' && <OngletMaison partie={partie} />}
            {onglet === 'personnel' && <OngletPersonnel partie={partie} />}
            {onglet === 'finances' && <OngletFinances partie={partie} />}
            {onglet === 'journal' && <OngletJournal />}
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
                : c.ouverte
                  ? `${t.enService} · ${t.proprete.toLowerCase()} ${Math.round(c.proprete)} %`
                  : t.sousDraps
            }
            fiche={{ type: 'chambre', id: c.id }}
          />
        );
      })}
      <Linge partie={partie} />
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

function FichePiece({ partie, fiche }: { partie: EtatJeu; fiche: Fiche }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const retour = (
    <button className="retour" onClick={() => ouvrirFiche(null)}>
      {t.retour}
    </button>
  );

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
  const renovation = palier(1);
  const occupee = partie.rendezVous.some((r) => r.chambreId === chambre.id);
  return (
    <div className="fiche">
      {retour}
      <h2>
        {def.nom} {def.premium && <span className="pastille premium">{t.premium}</span>}
      </h2>
      <p className="sous">{def.theme}</p>
      <p className="statut">{occupee ? TEXTES.actions.occupee : chambre.ouverte ? t.enService : t.sousDraps}</p>
      {chambre.ouverte && <Jauge nom={t.proprete} valeur={chambre.proprete} alerte={chambre.proprete < 40} />}
      <Jauge nom={t.etat} valeur={chambre.etat} />
      {chambre.ouverte && chambre.proprete < SEUIL_CHAMBRE_INUTILISABLE && (
        <p className="sous negatif">{TEXTES.actions.inutilisable}</p>
      )}
      {chambre.ouverte && (
        <BoutonNettoyage chambreId={chambre.id} desactive={occupee || chambre.proprete >= 100} />
      )}
      {!chambre.ouverte && !partie.systemes.renovation && (
        <p className="verrou-ligne">
          <Cadenas /> {t.renovationVerrouillee(renovation.numero, renovation.nom)}
        </p>
      )}
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
  if (e.fatigue > SEUIL_EPUISEMENT) return st.epuisee;
  if (e.rdvCeSoir >= RDV_MAX_PAR_SOIR) return st.quota;
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

function FicheEmploye({ partie, employe }: { partie: EtatJeu; employe: Employe }) {
  const ordonner = useInterface((s) => s.ordonner);
  const p = TEXTES.personnel;
  const def = SANNE; // Seule Sanne pour l'instant ; le recrutement arrive au palier 1.
  const enRdv = partie.rendezVous.some((r) => r.employeId === employe.id);
  return (
    <div className="employe">
      <div className="employe-entete">
        <svg className="portrait" viewBox="4 -1 16 20" aria-hidden="true">
          <Figurine silhouette={def.silhouette} x={12} y={50} hauteur={50} />
        </svg>
        <div>
          <h2>
            {def.prenom} <small>{p.ans(def.age)}</small>
          </h2>
          <p className="sous">{def.accroche}</p>
          <span className="pastille ouverte">{statutEmploye(partie, employe)}</span>
        </div>
      </div>
      <Jauge nom={p.fatigue} valeur={employe.fatigue} alerte={employe.fatigue > 70} />
      <Jauge nom={p.moral} valeur={employe.moral} alerte={employe.moral < 35} />
      <Jauge nom={p.loyaute} valeur={employe.loyaute} />
      {estOuvert(partie) && <p className="sous">{p.rdvCeSoir(employe.rdvCeSoir, RDV_MAX_PAR_SOIR)}</p>}
      {estOuvert(partie) && !employe.repos && (
        <button className="bouton discret pleine-largeur" disabled={enRdv} onClick={() => ordonner({ type: 'repos', employeId: employe.id })}>
          {p.mettreAuRepos}
        </button>
      )}
      <h3>{p.talents}</h3>
      <div className="talents">
        {(Object.keys(TALENTS) as Talent[]).map((k) => (
          <div key={k}>
            <span>{TALENTS[k]}</span>
            <Pastilles n={employe.talents[k]} />
          </div>
        ))}
      </div>
      <h3>{p.traits}</h3>
      {employe.traits.map((trait) => (
        <p key={trait} className="trait">
          <b>{trait}</b> {TRAITS[trait]}
        </p>
      ))}
      <p className="sous">{p.part(Math.round(employe.part * 100))}</p>
    </div>
  );
}

function OngletPersonnel({ partie }: { partie: EtatJeu }) {
  const recrutement = palier(1);
  return (
    <>
      {partie.personnel.map((e) => (
        <FicheEmploye key={e.id} partie={partie} employe={e} />
      ))}
      {!partie.systemes.recrutement && (
        <p className="verrou-ligne">
          <Cadenas /> {t.recrutementVerrouille(recrutement.numero, recrutement.nom)}
        </p>
      )}
    </>
  );
}

function OngletFinances({ partie }: { partie: EtatJeu }) {
  const dans = JOUR_PREMIERE_MENSUALITE - partie.jour;
  return (
    <dl className="chiffres">
      <div>
        <dt>{t.tresorerie}</dt>
        <dd className={partie.tresorerie < 0 ? 'negatif' : ''}>{formaterEuros(partie.tresorerie)}</dd>
      </div>
      <div>
        <dt>{t.emprunt}</dt>
        <dd>{formaterEuros(EMPRUNT_RACHAT)}</dd>
      </div>
      <div>
        <dt>{t.mensualite}</dt>
        <dd>{t.mensualiteDetail(formaterEuros(MENSUALITE), JOUR_PREMIERE_MENSUALITE, dans)}</dd>
      </div>
    </dl>
  );
}

function OngletJournal() {
  const journal = useInterface((s) => s.journal);
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

