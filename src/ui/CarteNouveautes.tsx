import { JOSEE_NOUVEAUTES, trouverNouveaute } from '../content/nouveautes';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Nouveautés d'une mise à jour pour un palier déjà atteint, présentées par Josée au chargement. En pause. */
export function CarteNouveautes({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const t = TEXTES.nouveautes;
  const liste = partie.nouveautes.flatMap((id) => trouverNouveaute(id) ?? []);

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-nouveautes">
      <div className="carte-modale carte-large">
        <h2 id="titre-nouveautes" className="titre-neon">
          {t.titre}
        </h2>
        <div className="carte-colonnes">
          <section>
            <p className="sous">{t.intro}</p>
            <ul className="liste-palier">
              {liste.map((n) => (
                <li key={n.id}>{n.texte}</li>
              ))}
            </ul>
          </section>
          <section>
            <JoseeLigne texte={JOSEE_NOUVEAUTES} />
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
