/** Petites icônes vectorielles de l'interface. */

export function Cadenas({ taille = 12 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 12 12" aria-hidden="true" className="icone">
      <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconePause() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="icone">
      <rect x="2.5" y="2" width="2.5" height="8" rx=".6" fill="currentColor" />
      <rect x="7" y="2" width="2.5" height="8" rx=".6" fill="currentColor" />
    </svg>
  );
}
