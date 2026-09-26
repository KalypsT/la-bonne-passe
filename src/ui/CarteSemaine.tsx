import { ACTIONS_RIVALE, TEXTES_RIVALE } from '../content/rivale';
import { TEXTES_EQUIPES } from '../content/equipes';
import { remplir } from './modeles';
import { SEGMENTS } from '../content/clientele';
import { trouverTendance } from '../content/tendances';
import { TEXTES } from '../content/textes';
import { segmentsOuverts } from '../engine/clientele';
import { POSTES_DEPENSES, POSTES_RECETTES, totalDepenses, totalRecettes } from '../engine/comptes';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';
import { trouverDefi } from '../content/defis';
import { formaterMesure, texteDefi, texteReussiteDefi } from './objectifs';

/** Bilan du lundi : recettes et dépenses par poste, résultat, trésorerie projetée, tendances de la semaine. En pause. */
export function CarteSemaine({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const b = partie.bilanSemaine;
  if (!b) return null;
  const t = TEXTES.semaine;
  const recettes = POSTES_RECETTES.filter((p) => b.comptes.recettes[p] !== 0);
  const depenses = POSTES_DEPENSES.filter((p) => b.comptes.depenses[p] !== 0);
  const passeSousZero = b.projection.some((v) => v < 0);
  const tendances = b.tendances.flatMap((id) => trouverTendance(id) ?? []);

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-semaine">
      <div className="carte-modale carte-large carte-semaine">
        <h2 id="titre-semaine" className="titre-neon">
          {t.titre(b.numero)}
        </h2>
        <div className="carte-colonnes">
          <section>
            <h3>{t.recettes}</h3>
            <dl className="comptes">
              {recettes.map((p) => (
                <div key={p}>
                  <dt>{t.postesRecettes[p]}</dt>
                  <dd>{formaterEuros(b.comptes.recettes[p])}</dd>
                </div>
              ))}
              <div className="total">
                <dt>{t.recettes}</dt>
                <dd>{formaterEuros(totalRecettes(b.comptes))}</dd>
              </div>
            </dl>
            <h3>{t.depenses}</h3>
            <dl className="comptes">
              {depenses.map((p) => (
                <div key={p}>
                  <dt>{t.postesDepenses[p]}</dt>
                  <dd>−{formaterEuros(b.comptes.depenses[p])}</dd>
                </div>
              ))}
              <div className="total">
                <dt>{t.depenses}</dt>
                <dd>−{formaterEuros(totalDepenses(b.comptes))}</dd>
              </div>
            </dl>
            <dl className="comptes resultat">
              <div>
                <dt>{t.resultat}</dt>
                <dd className={b.resultat < 0 ? 'negatif' : 'positif'}>{formaterEuros(b.resultat)}</dd>
              </div>
            </dl>
            <p className="sous">
              {t.reputation} {t.reputationDetail(Math.floor(b.reputationDebut), Math.floor(b.reputationFin))} ·{' '}
              {t.clients(b.servis, b.perdus)}
            </p>
            {partie.systemes.clientele && (
              <>
                <h3>{t.satisfaction}</h3>
                <dl className="bilan-segments">
                  {segmentsOuverts(partie).map((s) => {
                    const ecart = b.satisfactionFin[s] - b.satisfactionDebut[s];
                    return (
                      <div key={s} style={{ display: 'contents' }}>
                        <dt>{SEGMENTS[s]}</dt>
                        <dd>
                          {Math.round(b.satisfactionFin[s])}{' '}
                          <span className={ecart <= -0.5 ? 'negatif' : ecart >= 0.5 ? 'positif' : 'sous'}>({TEXTES.clientele.ecart(ecart)})</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </>
            )}
          </section>
          <section>
            <h3>{t.projection}</h3>
            <dl className="comptes">
              <div>
                <dt>{t.maintenant}</dt>
                <dd>{formaterEuros(b.avoir)}</dd>
              </div>
              {b.projection.map((v, i) => (
                <div key={i}>
                  <dt>{t.finSemaine(i + 1)}</dt>
                  <dd className={v < 0 ? 'negatif' : ''}>{formaterEuros(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="sous">{t.projectionDetail}</p>
            <JoseeLigne texte={passeSousZero ? t.joseeProjection : t.joseeResultat(b.resultat >= 0)} />
            <DefisDuLundi partie={partie} />
            <RivaleDuLundi partie={partie} />
            {b.ouvertures?.includes('assurance') && (
              <div className="defi-bilan">
                <h3>{TEXTES_EQUIPES.assurance.ouverture}</h3>
                <JoseeLigne texte={TEXTES_EQUIPES.assurance.ouvertureJosee} />
              </div>
            )}
            {(tendances.length > 0 || b.premieresTendances) && (
              <>
                <h3>{t.tendances}</h3>
                {b.premieresTendances && <p className="sous laiton">{t.premieresTendances}</p>}
                {tendances.map((td) => (
                  <div key={td.id} className="tendance">
                    <b>{td.nom}</b>
                    <p className="sous">{td.texte}</p>
                    <JoseeLigne texte={td.josee} />
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {t.continuer}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Au bilan du lundi : ce que le Chat Noir a décidé pour la semaine qui commence (hors débauchage, qui se découvre). */
function RivaleDuLundi({ partie }: { partie: EtatJeu }) {
  const a = partie.rivale.derniereAction;
  if (!partie.systemes.rivale || !a || a.jour !== partie.jour || a.id === 'debauchage') return null;
  const def = ACTIONS_RIVALE[a.id];
  if (!def) return null;
  return (
    <div className="defi-bilan">
      <h3>{TEXTES_RIVALE.bilan}</h3>
      <b>{def.nom}</b>
      <p className="sous">{remplir(def.texte, partie)}</p>
    </div>
  );
}

/** Au bilan du lundi : le défi de la semaine écoulée, jugé, et celui de la semaine qui commence. */
function DefisDuLundi({ partie }: { partie: EtatJeu }) {
  const b = partie.bilanSemaine;
  const o = TEXTES.objectifs;
  const passe = b?.defi ? trouverDefi(b.defi.id) : undefined;
  const nouveau = b?.nouveauDefi ? trouverDefi(b.nouveauDefi) : undefined;
  if (!b || (!passe && !nouveau)) return null;
  return (
    <>
      {passe && b.defi && (
        <div className="defi-bilan">
          <h3>{o.defiPasse}</h3>
          <b>
            {passe.titre} · <span className={b.defi.reussi ? 'positif' : 'negatif'}>{b.defi.reussi ? o.reussi : o.rate}</span>
          </b>
          <p className="sous">
            {o.progression(formaterMesure(passe.mesure.type, b.defi.valeur), formaterMesure(passe.mesure.type, b.defi.cible), !!passe.auPlus)}
          </p>
          <JoseeLigne texte={texteReussiteDefi(b.defi.reussi ? passe.reussite : passe.echec, partie)} />
        </div>
      )}
      {nouveau && (
        <div className="defi-bilan">
          <h3>{o.nouveauDefi}</h3>
          <b>{nouveau.titre}</b>
          <p className="sous">{texteDefi(nouveau, partie)}</p>
          <p className="sous laiton">{o.recompense(nouveau.recompenseTexte)}</p>
        </div>
      )}
    </>
  );
}
