import { TEXTES_DIDACTICIEL } from '../content/didacticiel';
import { JOSEE_PALIERS } from '../content/josee';
import { PALIERS } from '../content/paliers';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Annonce d'un palier atteint, présentée par Josée. En pause. */
export function CartePalier({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const numero = partie.annonces[0];
  const palier = PALIERS.find((p) => p.numero === numero);
  if (!palier) return null;
  const suivant = PALIERS.find((p) => p.numero === palier.numero + 1);
  const t = TEXTES.palierCarte;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-palier">
      <div className="carte-modale carte-large">
        <h2 id="titre-palier" className="titre-neon">
          {t.titre(palier.numero, palier.nom)}
        </h2>
        <div className="carte-colonnes">
          <section>
            <p className="sous">{t.ouvre}</p>
            <ul className="liste-palier">
              {(palier.details ?? [palier.ouvre]).map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
          <section>
            <JoseeLigne
              texte={
                partie.didacticiel !== null && palier.numero === 1 ? TEXTES_DIDACTICIEL.palier : (JOSEE_PALIERS[palier.numero] ?? '')
              }
            />
            {suivant && <p className="sous">{t.suivant(suivant.numero, suivant.nom, suivant.objectif)}</p>}
          </section>
        </div>
        <div className="carte-actions fin">
          <button className="bouton principal" onClick={() => ouvrirCarte(null)}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
