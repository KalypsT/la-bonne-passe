import { AIDE_ONGLETS } from '../content/didacticiel';
import { TEXTES_CONSEILS } from '../content/conseils';
import { TEXTES } from '../content/textes';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Aide courte de l'onglet ouvert, donnée par Josée, et le réglage de ses conseils (v1.0). En pause. */
export function CarteAide() {
  const onglet = useInterface((s) => s.onglet);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const ordonner = useInterface((s) => s.ordonner);
  const actifs = useInterface((s) => s.partie?.conseils.actifs ?? true);
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-label={TEXTES.aide.titre}>
      <div className="carte-modale">
        <h2 className="titre-neon">{TEXTES.onglets[onglet]}</h2>
        <JoseeLigne texte={AIDE_ONGLETS[onglet] ?? ''} />
        <p className="sous">{TEXTES_CONSEILS.reglageDetail}</p>
        <div className="carte-actions">
          <button
            className={actifs ? 'bouton discret choisi' : 'bouton discret'}
            aria-pressed={actifs}
            onClick={() => ordonner({ type: 'conseilsActifs', actifs: !actifs })}
          >
            {TEXTES_CONSEILS.reglage(actifs)}
          </button>
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {TEXTES.aide.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
