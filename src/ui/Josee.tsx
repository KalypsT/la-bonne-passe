import { JOSEE } from '../content/josee';
import { Figurine } from '../scene/Figurine';

/** Portrait de Madame Josée. */
export function PortraitJosee({ taille = 40 }: { taille?: number }) {
  return (
    <svg className="portrait-josee" width={taille} height={taille} viewBox="4 -1 16 20" aria-hidden="true">
      <Figurine silhouette={JOSEE.silhouette} x={12} y={50} hauteur={50} />
    </svg>
  );
}

/** Une réplique de Josée, avec son portrait. */
export function JoseeLigne({ texte }: { texte: string }) {
  return (
    <div className="josee">
      <PortraitJosee />
      <p>
        <b>{JOSEE.nom}</b>
        {texte}
      </p>
    </div>
  );
}
