import type { Silhouette } from '../content/personnel';

interface Props {
  silhouette: Silhouette;
  /** Position des pieds dans la scène. */
  x: number;
  y: number;
  /** Hauteur en unités de la scène. */
  hauteur?: number;
  balai?: boolean;
}

/**
 * Personnage vectoriel en pied, dessiné dans une boîte de 24 × 50 puis placé par ses pieds.
 * Les pièces (coiffure, haut, bas, accessoires) viennent de la silhouette.
 */
export function Figurine({ silhouette: s, x, y, hauteur = 44, balai = false }: Props) {
  const echelle = hauteur / 50;
  return (
    <g className="figurine" style={{ transform: `translate(${x - 12 * echelle}px, ${y - 50 * echelle}px) scale(${echelle})` }}>
      {/* Cheveux longs, derrière */}
      {s.coiffure === 'longue' && <path d="M6.5 8C6 2 18 2 17.5 8L18.5 17L5.5 17Z" fill={s.cheveux} />}
      {/* Jambes et chaussures */}
      {s.robe ? (
        <g fill={s.teint}>
          <rect x="9.3" y="36" width="2.2" height="11" rx="1" />
          <rect x="12.5" y="36" width="2.2" height="11" rx="1" />
        </g>
      ) : (
        <g fill={s.bas}>
          <rect x="8.4" y="29" width="3.4" height="18.5" rx="1.2" />
          <rect x="12.2" y="29" width="3.4" height="18.5" rx="1.2" />
        </g>
      )}
      <g fill="#1A1014">
        <ellipse cx="9.6" cy="48.4" rx="2.4" ry="1.1" />
        <ellipse cx="14.4" cy="48.4" rx="2.4" ry="1.1" />
      </g>
      {/* Bras */}
      <g fill={s.haut}>
        <rect x="4.6" y="15" width="3" height="13" rx="1.5" />
        <rect x="16.4" y="15" width="3" height="13" rx="1.5" />
      </g>
      <g fill={s.teint}>
        <circle cx="6.1" cy="28.6" r="1.4" />
        <circle cx="17.9" cy="28.6" r="1.4" />
      </g>
      {/* Buste ou robe */}
      {s.robe ? (
        <path d="M8 14.5H16L17.5 25L19 37H5L6.5 25Z" fill={s.haut} />
      ) : (
        <path d="M7.4 14.5H16.6L17 30H7Z" fill={s.haut} />
      )}
      {s.accent && s.robe && <rect x="7.2" y="24" width="9.6" height="1.4" fill={s.accent} />}
      {/* Cou et tête */}
      <rect x="10.8" y="11" width="2.4" height="4" fill={s.teint} />
      <ellipse cx="12" cy="7.6" rx="4" ry="4.6" fill={s.teint} />
      <Coiffure silhouette={s} />
      {s.lunettes && (
        <g stroke="#1A1014" strokeWidth=".5" fill="none">
          <circle cx="10.4" cy="7.6" r="1.3" />
          <circle cx="13.6" cy="7.6" r="1.3" />
          <path d="M11.7 7.6H12.3" />
        </g>
      )}
      <g fill="#1A1014">
        <circle cx="10.5" cy="7.8" r=".45" />
        <circle cx="13.5" cy="7.8" r=".45" />
      </g>
      {balai && (
        <g>
          <path d="M20 12L21 45" stroke="#8A6A45" strokeWidth="1" />
          <path d="M18.5 45H23.5L23 49H19Z" fill="#D8D4CC" />
        </g>
      )}
    </g>
  );
}

function Coiffure({ silhouette: s }: { silhouette: Silhouette }) {
  switch (s.coiffure) {
    case 'longue':
      return <path d="M7.8 7C7.6 2.4 16.4 2.4 16.2 7C14.5 4.8 11 4.4 7.8 7Z" fill={s.cheveux} />;
    case 'courte':
      return <path d="M7.9 7.2C7.5 2.3 16.5 2.3 16.1 7.2C15 4.6 9 4.6 7.9 7.2Z" fill={s.cheveux} />;
    case 'chignon':
      return (
        <g fill={s.cheveux}>
          <circle cx="12" cy="2.4" r="2.2" />
          <path d="M7.9 7.2C7.5 2.8 16.5 2.8 16.1 7.2C15 5 9 5 7.9 7.2Z" />
        </g>
      );
    case 'casquette':
      return (
        <g fill={s.accent ?? s.cheveux}>
          <path d="M7.8 6.4C7.8 2.2 16.2 2.2 16.2 6.4Z" />
          <rect x="12" y="5.5" width="6.5" height="1.4" rx=".7" />
        </g>
      );
    case 'chapeau':
      return (
        <g fill={s.accent ?? '#1A1A1A'}>
          <rect x="6" y="4.6" width="12" height="1.4" rx=".7" />
          <path d="M8.6 4.8V1.8Q12 0.6 15.4 1.8V4.8Z" />
        </g>
      );
    case 'degarnie':
      return (
        <g fill={s.cheveux}>
          <path d="M7.9 8.5C7.7 6 8.2 4.6 9 4.2C8.7 5.6 8.6 7 8.6 8.5Z" />
          <path d="M16.1 8.5C16.3 6 15.8 4.6 15 4.2C15.3 5.6 15.4 7 15.4 8.5Z" />
        </g>
      );
  }
}
