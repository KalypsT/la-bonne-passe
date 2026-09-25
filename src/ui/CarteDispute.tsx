import { DISPUTE_VERRE_OFFERT } from '../content/balance';
import { TEXTES } from '../content/textes';
import { formaterEuros } from './format';
import { useInterface } from './store';

/** Dispute sur le quai : deux façons de la régler, ou la laisser courir. */
export function CarteDispute() {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const t = TEXTES.disputeCarte;
  const choisir = (choix: 'verre' | 'calmer') => {
    ordonner({ type: 'regleDispute', choix });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-dispute">
      <div className="carte-modale">
        <h2 id="titre-dispute">{t.titre}</h2>
        <p>{t.texte}</p>
        <button className="choix" onClick={() => choisir('verre')}>
          {t.verre(formaterEuros(DISPUTE_VERRE_OFFERT))}
          <small>{t.verreDetail}</small>
        </button>
        <button className="choix" onClick={() => choisir('calmer')}>
          {t.calmer}
          <small>{t.calmerDetail}</small>
        </button>
        <div className="carte-actions">
          <button className="bouton discret" onClick={() => ouvrirCarte(null)}>
            {t.plusTard}
          </button>
        </div>
      </div>
    </div>
  );
}
