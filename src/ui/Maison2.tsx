import { GERANTE, MAISON2, type IdConsigne } from '../content/balance';
import { LIEUX } from '../content/agrandir';
import { CONSIGNES, GERANTE_EXTERNE, TEXTES_MAISON2, trouverIncident } from '../content/maison2';
import type { EtatJeu } from '../engine/etat';
import { accepteGerance } from '../engine/agrandir';
import { lieuMaison2, moyenneTalents, peutConfier, peutEngagerExterne, peutInaugurer, peutRappeler, type BilanMaison } from '../engine/maison2';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { remplir } from './modeles';
import { Portrait } from './Panneau';
import { useInterface } from './store';

const t = TEXTES_MAISON2;
const accord = (e: { genre: 'f' | 'm' }) => (e.genre === 'm' ? '' : 'e');
const virgule = (x: number) => x.toFixed(1).replace('.', ',');

/** Dans la fiche du bureau, une fois les travaux finis : choisir la gérante, inaugurer, puis suivre la maison. */
export function MaisonOuverte({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const lieu = lieuMaison2(partie);
  const statut = partie.etablissement.statut;
  if (!partie.systemes.maison2 || !lieu || (statut !== 'pret' && statut !== 'ouvert')) return null;
  const m = partie.maison2;
  const g = m.gerante;
  const dernier = m.bilans[m.bilans.length - 1];
  return (
    <>
      <p className="statut">{t.titre(lieu.quartier)}</p>
      {!g && statut === 'pret' && <ChoisirGerante partie={partie} />}
      {g && (
        <div className="gerante-maison">
          <Portrait personne={g.employe} petit />
          <p className="sous">
            <b>{t.tenue(g.employe.prenom, accord(g.employe))}</b>
            <br />
            {t.salaire(formaterEuros(g.salaire))}
          </p>
        </div>
      )}
      {g && statut === 'pret' && (
        <>
          {m.inauguration === null && <p className="sous">{t.inaugurerDetail}</p>}
          <button className="bouton principal pleine-largeur" disabled={!peutInaugurer(partie)} onClick={() => ordonner({ type: 'inaugurer' })}>
            {m.inauguration === null ? t.inaugurer(formaterEuros(MAISON2.inauguration)) : t.rouvrir}
          </button>
          {!peutInaugurer(partie) && <p className="sous negatif">{t.tropCher}</p>}
        </>
      )}
      {statut === 'pret' && m.inauguration !== null && !g && <p className="sous">{t.fermee}</p>}
      {statut === 'ouvert' && m.inauguration !== null && (
        <>
          <p className="sous">{t.ouverteDepuis(m.inauguration)}</p>
          <dl className="chiffres">
            <div>
              <dt>{t.reputation}</dt>
              <dd>{Math.round(m.reputation)}</dd>
            </div>
            {g && (
              <div>
                <dt>{t.loyaute}</dt>
                <dd className={g.employe.loyaute < GERANTE.loyauteHonnete ? 'negatif' : ''}>{Math.round(g.employe.loyaute)}</dd>
              </div>
            )}
            <div>
              <dt>{t.total}</dt>
              <dd className={m.total < 0 ? 'negatif' : 'positif'}>{formaterEuros(m.total)}</dd>
            </div>
            {dernier && (
              <div>
                <dt>{t.dernierBilan}</dt>
                <dd className={dernier.resultat < 0 ? 'negatif' : 'positif'}>{formaterEuros(dernier.resultat)}</dd>
              </div>
            )}
          </dl>
          <h3>{t.consigne.titre}</h3>
          <p className="sous">
            {t.consigne.detail} {t.consigne.enCours(CONSIGNES[m.consigneSemaine].nom)}
          </p>
          <div className="boutons-ligne" role="group" aria-label={t.consigne.titre}>
            {(Object.keys(CONSIGNES) as IdConsigne[]).map((id) => (
              <button
                key={id}
                className={m.consigne === id ? 'choix-court choisi' : 'choix-court'}
                aria-pressed={m.consigne === id}
                onClick={() => ordonner({ type: 'consigneMaison', consigne: id })}
              >
                {CONSIGNES[id].nom}
              </button>
            ))}
          </div>
          <p className="sous">{CONSIGNES[m.consigne].effet}</p>
        </>
      )}
      {g && (
        <>
          <button className="bouton discret pleine-largeur" disabled={!peutRappeler(partie)} onClick={() => ordonner({ type: 'rappelerGeranteMaison' })}>
            {g.externe ? t.finContrat(g.employe.prenom) : t.rappeler(g.employe.prenom)}
          </button>
          {!peutRappeler(partie) && <p className="sous">{t.salonComplet(g.employe.prenom)}</p>}
        </>
      )}
      <JoseeLigne texte={t.josee} />
    </>
  );
}

/** Qui tiendra la maison : une personne de l'équipe, ou la gérante venue d'ailleurs. */
function ChoisirGerante({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const eligibles = partie.personnel.filter((e) => peutConfier(partie, e.id));
  return (
    <>
      <p className="sous">{t.choisir}</p>
      <h3>{t.equipe}</h3>
      {eligibles.length === 0 && <p className="sous">{t.aucuneEquipe}</p>}
      {eligibles.map((e) => (
        <div key={e.id} className="lieu">
          <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'confierMaison', employeId: e.id })}>
            {t.confier(e.prenom)} · {t.talents(virgule(moyenneTalents(e)))}
          </button>
          {!accepteGerance(e) && <p className="sous">{t.hesite(e.prenom)}</p>}
        </div>
      ))}
      <p className="sous">{t.conditions(GERANTE.nuitsMin)}</p>
      {peutEngagerExterne(partie) && (
        <>
          <h3>{t.externe.titre}</h3>
          <div className="gerante-maison">
            <Portrait personne={GERANTE_EXTERNE} petit />
            <p className="sous">
              <b>{GERANTE_EXTERNE.prenom}</b>, {t.externe.presentation(GERANTE_EXTERNE.age, GERANTE_EXTERNE.accroche)}{' '}
              {t.talents(virgule(moyenneTalents(GERANTE_EXTERNE)))}
            </p>
          </div>
          <button className="bouton principal pleine-largeur" onClick={() => ordonner({ type: 'confierMaison', employeId: 'externe' })}>
            {t.externe.engager(GERANTE_EXTERNE.prenom, formaterEuros(MAISON2.salaireExterne))}
          </button>
          <JoseeLigne texte={t.externe.josee} />
        </>
      )}
    </>
  );
}

/** Ligne de l'onglet Maison : où en est la deuxième maison. */
export function statutMaison2(partie: EtatJeu): string {
  const lieu = LIEUX.find((l) => l.id === partie.etablissement.lieu);
  const quartier = lieu?.quartier ?? '';
  switch (partie.etablissement.statut) {
    case 'ouvert':
      return `${quartier} · ${t.ouverteDepuis(partie.maison2.inauguration ?? partie.jour).toLowerCase()}`;
    case 'pret':
      return `${quartier} · ${t.fermee.toLowerCase()}`;
    case 'travaux':
      return `${quartier} · ${t.statut.travaux(partie.etablissement.fin)}`;
    case 'signe':
      return quartier;
    default:
      return t.statut.aVendre(partie.etablissement.offres.length);
  }
}

/** Au bilan du lundi : ce que la gérante de la deuxième maison raconte de sa semaine. */
export function BilanMaisonLundi({ partie, bilan }: { partie: EtatJeu; bilan: BilanMaison }) {
  const lieu = lieuMaison2(partie);
  const b = t.bilan;
  const incident = trouverIncident(bilan.incident);
  const remarque = incident
    ? b.remarques.incident
    : bilan.loyaute < GERANTE.loyauteHonnete
      ? b.remarques.loyauteBasse
      : bilan.resultat >= b.seuilBonne
        ? b.remarques.bonne
        : bilan.resultat < 0
          ? b.remarques.mauvaise
          : b.remarques.moyenne;
  return (
    <div className="defi-bilan">
      <h3>{b.titre(lieu?.quartier ?? '')}</h3>
      <p className="sous">
        {b.activite(bilan.nuits, bilan.rendezVous)} {b.reputation(bilan.reputationAvant, bilan.reputation)}
      </p>
      <dl className="comptes">
        <div>
          <dt>{b.recette}</dt>
          <dd>{formaterEuros(bilan.recette)}</dd>
        </div>
        <div>
          <dt>{b.frais}</dt>
          <dd>−{formaterEuros(bilan.frais)}</dd>
        </div>
        <div className="total">
          <dt>{b.resultat}</dt>
          <dd className={bilan.resultat < 0 ? 'negatif' : 'positif'}>{formaterEuros(bilan.resultat)}</dd>
        </div>
      </dl>
      {incident && <p className="sous negatif">{incident.texte}</p>}
      {bilan.caisse > 0 && <p className="sous negatif">{b.caisse(formaterEuros(bilan.caisse))}</p>}
      {bilan.prenom && (
        <p className="sous">
          <b>{bilan.prenom}</b> : {remplir(remarque, partie)}
        </p>
      )}
    </div>
  );
}

/** Josée présente la deuxième maison : prête, inaugurée, ou quittée par sa gérante. En pause. */
export function CarteMaison({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const annonce = partie.maison2.annonces[0];
  if (!annonce) return null;
  const a = t.annonces;
  const titre = a[annonce.id].titre;
  const texte =
    annonce.id === 'prete'
      ? remplir(a.prete.texte, partie)
      : annonce.id === 'inauguree'
        ? a.inauguree.texte(annonce.prenom)
        : remplir(a.demission.texte(annonce.prenom, accord(annonce)), partie);
  const fermer = () => {
    ouvrirCarte(null);
    if (annonce.id !== 'inauguree') ouvrirFiche({ type: 'piece', id: 'bureau' });
  };
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-maison2">
      <div className="carte-modale">
        <h2 id="titre-maison2" className="titre-neon">
          {titre}
        </h2>
        <JoseeLigne texte={texte} />
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={fermer}>
            {a.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
