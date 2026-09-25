import { AVANCE_FOURNISSEUR } from '../content/balance';
import { TEXTES } from '../content/textes';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** L'avance du grossiste, le lendemain de la réouverture du bar. En pause. */
export function CarteGrossiste() {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const t = TEXTES.grossiste;
  const A = AVANCE_FOURNISSEUR;
  const decider = (accepter: boolean) => {
    ordonner({ type: 'avanceFournisseur', accepter });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-grossiste">
      <div className="carte-modale carte-large">
        <h2 id="titre-grossiste" className="titre-neon">
          {t.titre}
        </h2>
        <div className="carte-colonnes">
          <section>
            <p>{t.intro(A.bouteilles, formaterEuros(A.valeur))}</p>
            <p className="sous">{t.conditions(formaterEuros(Math.round(A.valeur * (1 + A.taux))), A.jours)}</p>
          </section>
          <section>
            <JoseeLigne texte={t.josee} />
          </section>
        </div>
        <div className="carte-actions fin">
          <button className="bouton discret" onClick={() => decider(false)}>
            {t.refuser}
          </button>
          <button className="bouton principal" onClick={() => decider(true)}>
            {t.accepter}
          </button>
        </div>
      </div>
    </div>
  );
}
