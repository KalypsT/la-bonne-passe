import { AIDE_ONGLETS } from '../content/didacticiel';
import { TEXTES } from '../content/textes';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Aide courte de l'onglet ouvert, donnée par Josée. En pause. */
export function CarteAide() {
  const onglet = useInterface((s) => s.onglet);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-label={TEXTES.aide.titre}>
      <div className="carte-modale">
        <h2 className="titre-neon">{TEXTES.onglets[onglet]}</h2>
        <JoseeLigne texte={AIDE_ONGLETS[onglet] ?? ''} />
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {TEXTES.aide.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
