import { trouverImprevu } from '../content/imprevus';
import { TEXTES_DIDACTICIEL } from '../content/didacticiel';
import type { EtatJeu } from '../engine/etat';
import { JoseeLigne } from './Josee';
import { remplir } from './modeles';
import { useInterface } from './store';

/** Imprévu de la soirée : 2 ou 3 choix, en pause. */
export function CarteImprevu({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const imprevu = partie.imprevu;
  const def = imprevu && trouverImprevu(imprevu.id);
  if (!imprevu || !def) return null;
  const e = partie.personnel.find((x) => x.id === imprevu.employeId);
  const e2 = partie.personnel.find((x) => x.id === imprevu.employe2Id);
  const texte = (t: string) => remplir(t, partie, e, e2);
  const choisir = (choix: number) => {
    ordonner({ type: 'choixImprevu', choix });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-imprevu">
      <div className="carte-modale">
        <h2 id="titre-imprevu" className="titre-neon">
          {texte(def.titre)}
        </h2>
        <p>{texte(def.texte)}</p>
        {partie.didacticiel !== null && <JoseeLigne texte={TEXTES_DIDACTICIEL.imprevu} />}
        {def.choix.map((c, i) => (
          <button key={c.texte} className="choix" onClick={() => choisir(i)}>
            {texte(c.texte)}
            <small>{texte(c.detail)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
