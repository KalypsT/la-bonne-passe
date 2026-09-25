interface Props {
  texte: string;
  /** Texte grisé, néon éteint (aperçu d'un nom encore vide). */
  eteinte?: boolean;
}

const LARGEUR_UTILE = 500;
/** Largeur moyenne d'un caractère en Yellowtail à 92 px, pour savoir s'il faut resserrer le texte. */
const LARGEUR_CARACTERE = 40;

/** Enseigne néon vectorielle : texte en Yellowtail, halo rose et léger grésillement. */
export function EnseigneNeon({ texte, eteinte = false }: Props) {
  const tropLong = texte.length * LARGEUR_CARACTERE > LARGEUR_UTILE;
  return (
    <svg className={eteinte ? 'enseigne eteinte' : 'enseigne'} viewBox="0 0 600 170" role="img" aria-label={texte}>
      <defs>
        <filter id="halo-neon" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="flou" />
          <feMerge>
            <feMergeNode in="flou" />
            <feMergeNode in="flou" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="14" y="14" width="572" height="142" rx="28" className="enseigne-cadre" />
      <text
        x="300"
        y="112"
        textAnchor="middle"
        textLength={tropLong ? LARGEUR_UTILE : undefined}
        lengthAdjust={tropLong ? 'spacingAndGlyphs' : undefined}
        className="enseigne-texte"
        filter={eteinte ? undefined : 'url(#halo-neon)'}
      >
        {texte}
      </text>
    </svg>
  );
}
