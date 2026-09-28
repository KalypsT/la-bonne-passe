import { TEXTES } from '../content/textes';
import type { Emplacement } from '../save/emplacements';
import { useInterface } from './store';

/** Fenêtre d'options d'une partie : l'exporter en fichier, ou la supprimer (avec confirmation). */
export function OptionsEmplacement({ numero, emplacement }: { numero: number; emplacement: Emplacement }) {
  const ouvrirOptions = useInterface((s) => s.ouvrirOptions);
  const exporterPartie = useInterface((s) => s.exporterPartie);
  const demanderSuppression = useInterface((s) => s.demanderSuppression);
  const t = TEXTES.optionsEmplacement;
  const resume = emplacement.statut === 'partie' ? emplacement.resume : null;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-options">
      <div className="carte-modale">
        <h2 id="titre-options">{t.titre}</h2>
        {resume && (
          <p>
            {resume.nomMaison} · {resume.prenom}
          </p>
        )}
        <p className="carte-detail">{t.exporterDetail}</p>
        <div className="carte-actions">
          <button className="bouton discret" onClick={() => ouvrirOptions(null)}>
            {t.fermer}
          </button>
          <button className="bouton discret" onClick={() => demanderSuppression(numero)}>
            {t.supprimer}
          </button>
          <button className="bouton principal" onClick={() => exporterPartie(numero)}>
            {t.exporter}
          </button>
        </div>
      </div>
    </div>
  );
}
