import { TEXTES } from '../content/textes';
import type { Emplacement } from '../save/emplacements';
import { useInterface } from './store';

export function ConfirmationSuppression({ emplacement }: { emplacement: Emplacement }) {
  const demanderSuppression = useInterface((s) => s.demanderSuppression);
  const confirmerSuppression = useInterface((s) => s.confirmerSuppression);
  const t = TEXTES.confirmationSuppression;
  const detail =
    emplacement.statut === 'partie'
      ? t.detail(emplacement.resume.prenom, emplacement.resume.nomMaison)
      : t.detailIllisible;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-suppression">
      <div className="carte-modale">
        <h2 id="titre-suppression">{t.titre}</h2>
        <p>{detail}</p>
        <div className="carte-actions">
          <button className="bouton discret" onClick={() => demanderSuppression(null)}>
            {t.annuler}
          </button>
          <button className="bouton danger" onClick={confirmerSuppression}>
            {t.confirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
