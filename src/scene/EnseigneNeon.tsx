interface Props {
  texte: string;
}

/** Enseigne néon vectorielle : texte en Yellowtail, halo rose et léger grésillement. */
export function EnseigneNeon({ texte }: Props) {
  return (
    <svg className="enseigne" viewBox="0 0 600 170" role="img" aria-label={texte}>
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
        textLength="500"
        lengthAdjust="spacingAndGlyphs"
        className="enseigne-texte"
        filter="url(#halo-neon)"
      >
        {texte}
      </text>
    </svg>
  );
}
