import { MENTIONS_MOIS, OBJECTIFS_MOIS } from '../content/defis';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { formaterMesure, texteObjectif } from './objectifs';
import { useInterface } from './store';

/** Bilan de fin de mois, le jour de la mensualité : la mensualité, l'objectif jugé, le mois qui commence. En pause. */
export function CarteMois({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const b = partie.bilanMois;
  if (!b) return null;
  const t = TEXTES.bilanMois;
  const mention = b.reussi
    ? b.decouvert
      ? MENTIONS_MOIS.reussiDecouvert
      : MENTIONS_MOIS.reussiSerein
    : b.decouvert
      ? MENTIONS_MOIS.manqueDecouvert
      : MENTIONS_MOIS.manqueSerein;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-mois">
      <div className="carte-modale carte-large">
        <h2 id="titre-mois" className="titre-neon">
          {t.titre(b.numero)}
        </h2>
        <div className="carte-colonnes">
          <section>
            <dl className="comptes">
              <div>
                <dt>{t.mensualite}</dt>
                <dd>−{formaterEuros(b.mensualite)}</dd>
              </div>
              <div className="total">
                <dt>{t.avoir}</dt>
                <dd className={b.avoir < 0 ? 'negatif' : ''}>{formaterEuros(b.avoir)}</dd>
              </div>
            </dl>
            {b.depuisReserve > 0 && <p className="sous">{t.depuisReserve(formaterEuros(b.depuisReserve))}</p>}
            {b.decouvert && <p className="alerte-ligne">{t.lettre(partie.maison.nom)}</p>}
            <h3>{t.objectif}</h3>
            <b>
              {OBJECTIFS_MOIS[b.objectif].titre} ·{' '}
              <span className={b.reussi ? 'positif' : 'negatif'}>{b.reussi ? TEXTES.objectifs.reussi : TEXTES.objectifs.rate}</span>
            </b>
            <p className="sous">{texteObjectif(b)}</p>
            <p className="sous">{t.atteint(formaterMesure(b.objectif, b.valeur), formaterMesure(b.objectif, b.cible))}</p>
            {b.reussi && <p className="sous laiton">{t.recompense}</p>}
          </section>
          <section>
            <JoseeLigne texte={mention} />
            {b.prochain && (
              <>
                <h3>{t.prochain}</h3>
                <b>{OBJECTIFS_MOIS[b.prochain.objectif].titre}</b>
                <p className="sous">{texteObjectif(b.prochain)}</p>
              </>
            )}
            {b.numero === 1 && <p className="sous laiton">{t.palierAVenir}</p>}
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
