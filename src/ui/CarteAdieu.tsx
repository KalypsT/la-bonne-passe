import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { useInterface } from './store';

/** Une personne a quitté la maison. */
export function CarteAdieu({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const prenom = partie.adieux[0];
  if (!prenom) return null;
  const t = TEXTES.adieu;
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-adieu">
      <div className="carte-modale">
        <h2 id="titre-adieu" className="titre-neon">
          {t.titre(prenom)}
        </h2>
        <p>{t.texte(prenom)}</p>
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
