import { EMPRUNT_RACHAT, JOUR_PREMIERE_MENSUALITE, MENSUALITE } from '../content/balance';
import { PIECES_COMMUNES, trouverChambre, trouverPiece } from '../content/maison';
import { PALIERS } from '../content/paliers';
import { TEXTES } from '../content/textes';
import type { EtatJeu, Systemes } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
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
            detail={c.ouverte ? `${t.enService} · ${t.proprete.toLowerCase()} ${Math.round(c.proprete)} %` : t.sousDraps}
            fiche={{ type: 'chambre', id: c.id }}
          />
        );
      })}
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

function Jauge({ nom, valeur }: { nom: string; valeur: number }) {
  return (
    <div className="jauge">
      <span>
        {nom} <b>{Math.round(valeur)} %</b>
      </span>
      <div className={valeur < 40 ? 'jauge-barre basse' : 'jauge-barre'}>
        <i style={{ width: `${Math.max(0, Math.min(100, valeur))}%` }} />
      </div>
    </div>
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
  return (
    <div className="fiche">
      {retour}
      <h2>
        {def.nom} {def.premium && <span className="pastille premium">{t.premium}</span>}
      </h2>
      <p className="sous">{def.theme}</p>
      <p className="statut">{chambre.ouverte ? t.enService : t.sousDraps}</p>
      {chambre.ouverte && <Jauge nom={t.proprete} valeur={chambre.proprete} />}
      <Jauge nom={t.etat} valeur={chambre.etat} />
      {!chambre.ouverte && !partie.systemes.renovation && (
        <p className="verrou-ligne">
          <Cadenas /> {t.renovationVerrouillee(renovation.numero, renovation.nom)}
        </p>
      )}
    </div>
  );
}

function OngletPersonnel({ partie }: { partie: EtatJeu }) {
  const recrutement = palier(1);
  return (
    <>
      <p className="sous">{t.personnelProvisoire}</p>
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

