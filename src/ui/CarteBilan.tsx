import { SANNE } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { Jauge } from './Jauge';
import { useInterface } from './store';

/** Bilan de fermeture : un écran, en pause. */
export function CarteBilan({ partie }: { partie: EtatJeu }) {
  const bilan = useInterface((s) => s.bilan);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  if (!bilan) return null;
  const t = TEXTES.bilan;
  const ecart = Math.round(partie.reputation - bilan.reputationDebut);
  const conseil = bilan.perdus > bilan.servis ? t.conseilPerdus : bilan.recettes >= 400 ? t.conseilBon : t.conseilMoyen;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-bilan">
      <div className="carte-modale carte-large">
        <h2 id="titre-bilan" className="titre-neon">
          {t.titre(bilan.numero)}
        </h2>
        <div className="carte-colonnes">
          <dl className="chiffres">
            <div>
              <dt>{t.recettes}</dt>
              <dd>{formaterEuros(bilan.recettes)}</dd>
            </div>
            <div>
              <dt>{t.partPersonnel}</dt>
              <dd>{formaterEuros(bilan.partPersonnel)}</dd>
            </div>
            <div>
              <dt>{t.depenses}</dt>
              <dd>{formaterEuros(bilan.depenses)}</dd>
            </div>
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
          <section>
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
            <h3>{t.fatigue}</h3>
            {partie.personnel.map((e) => (
              <Jauge key={e.id} nom={e.id === SANNE.id ? SANNE.prenom : e.id} valeur={e.fatigue} alerte={e.fatigue > 70} />
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
