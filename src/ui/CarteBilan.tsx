import { SEGMENTS } from '../content/clientele';
import { trouverTheme } from '../content/themes';
import { TEXTES } from '../content/textes';
import { segmentsOuverts } from '../engine/clientele';
import { gagneNuit, POSTES_DEPENSES, POSTES_RECETTES, recetteMaison, totalDepenses, totalRecettes } from '../engine/comptes';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { Jauge } from './Jauge';
import { useInterface } from './store';

/** Bilan de fermeture : le compte de la nuit poste par poste d'abord, puis la salle et le personnel. En pause. */
export function CarteBilan({ partie }: { partie: EtatJeu }) {
  const bilan = useInterface((s) => s.bilan);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  if (!bilan) return null;
  const t = TEXTES.bilan;
  const ecart = Math.round(partie.reputation - bilan.reputationDebut);
  const c = bilan.comptes;
  const recettes = POSTES_RECETTES.filter((p) => c.recettes[p] !== 0);
  // Les salaires de midi se lisent sur une ligne à part, après les dépenses de la nuit.
  const depenses = [...POSTES_DEPENSES.filter((p) => p !== 'salaires'), 'salaires' as const].filter((p) => c.depenses[p] !== 0);
  const pourcentagePart = c.recettes.rendezVous > 0 ? Math.round((c.depenses.partPersonnel / c.recettes.rendezVous) * 100) : 0;
  const gagne = gagneNuit(c);
  const conseil = bilan.perdus > bilan.servis ? t.conseilPerdus : recetteMaison(c) >= 400 ? t.conseilBon : t.conseilMoyen;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-bilan">
      <div className="carte-modale carte-large">
        <h2 id="titre-bilan" className="titre-neon">
          {t.titre(bilan.numero)}
        </h2>
        <div className="carte-colonnes">
          <section className="compte-nuit">
            <h3>{t.recettes}</h3>
            <dl className="comptes">
              {recettes.map((p) => (
                <div key={p}>
                  <dt>{p === 'rendezVous' ? t.postesRecettes.rendezVous(bilan.servis) : t.postesRecettes[p]}</dt>
                  <dd>{formaterEuros(c.recettes[p])}</dd>
                </div>
              ))}
              <div className="total">
                <dt>{t.totalRecettes}</dt>
                <dd>{formaterEuros(totalRecettes(c))}</dd>
              </div>
            </dl>
            <h3>{t.depenses}</h3>
            <dl className="comptes">
              {depenses.map((p) => (
                <div key={p} className={p === 'salaires' ? 'a-part' : undefined}>
                  <dt>{p === 'partPersonnel' ? t.postesDepenses.partPersonnel(pourcentagePart) : t.postesDepenses[p]}</dt>
                  <dd>−{formaterEuros(c.depenses[p])}</dd>
                </div>
              ))}
              <div className="total">
                <dt>{t.totalDepenses}</dt>
                <dd>−{formaterEuros(totalDepenses(c))}</dd>
              </div>
            </dl>
            <dl className="comptes resultat">
              <div>
                <dt>{t.gagne}</dt>
                <dd className={gagne < 0 ? 'negatif' : 'positif'}>{formaterEuros(gagne)}</dd>
              </div>
            </dl>
            <dl className="comptes">
              {bilan.reserve > 0 && (
                <div>
                  <dt>{t.dontReserve}</dt>
                  <dd>{formaterEuros(bilan.reserve)}</dd>
                </div>
              )}
              {bilan.retraitReserve > 0 && (
                <div>
                  <dt>{t.retraitReserve}</dt>
                  <dd>{formaterEuros(bilan.retraitReserve)}</dd>
                </div>
              )}
              <div>
                <dt>{t.tresorerie}</dt>
                <dd>
                  {formaterEuros(bilan.tresorerieAvant)} → {formaterEuros(bilan.tresorerieApres)}
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <dl className="chiffres serre">
              {partie.themeDuSoir && (
                <div>
                  <dt>{t.theme}</dt>
                  <dd>{trouverTheme(partie.themeDuSoir)?.nom}</dd>
                </div>
              )}
              <div>
                <dt>{t.servis}</dt>
                <dd>{bilan.servis}</dd>
              </div>
              <div>
                <dt>{t.perdus}</dt>
                <dd>{bilan.perdus}</dd>
              </div>
              <div>
                <dt>{t.reputation}</dt>
                <dd>
                  ★ {Math.floor(partie.reputation)} ({ecart >= 0 ? '+' : '−'}
                  {Math.abs(ecart)})
                </dd>
              </div>
            </dl>
            {bilan.meilleurAvis && (
              <>
                <h3>{t.meilleurAvis}</h3>
                <p className="avis">« {bilan.meilleurAvis.texte} »</p>
                <p className="sous">{bilan.meilleurAvis.client}</p>
              </>
            )}
            {bilan.pireAvis && bilan.pireAvis !== bilan.meilleurAvis && bilan.pireAvis.texte !== bilan.meilleurAvis?.texte && (
              <>
                <h3>{t.pireAvis}</h3>
                <p className="avis">« {bilan.pireAvis.texte} »</p>
                <p className="sous">{bilan.pireAvis.client}</p>
              </>
            )}
            {partie.systemes.clientele && (
              <>
                <h3>{t.clientele}</h3>
                <dl className="bilan-segments">
                  {segmentsOuverts(partie).map((s) => {
                    const ecart = partie.clientele.satisfaction[s] - partie.clientele.satisfactionOuverture[s];
                    return (
                      <div key={s} style={{ display: 'contents' }}>
                        <dt>{SEGMENTS[s]}</dt>
                        <dd>
                          {Math.round(partie.clientele.satisfaction[s])}{' '}
                          <span className={ecart <= -0.5 ? 'negatif' : ecart >= 0.5 ? 'positif' : 'sous'}>({TEXTES.clientele.ecart(ecart)})</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </>
            )}
            <h3>{t.fatigue}</h3>
            {partie.personnel.map((e) => (
              <Jauge key={e.id} nom={e.prenom} valeur={e.fatigue} alerte={e.fatigue > 70} />
            ))}
          </section>
        </div>
        <p className="conseil">{conseil}</p>
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {t.continuer}
          </button>
        </div>
      </div>
    </div>
  );
}
