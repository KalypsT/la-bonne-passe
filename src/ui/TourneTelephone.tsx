import { TEXTES } from '../content/textes';

/** Affiché uniquement en portrait (voir la règle CSS). */
export function TourneTelephone() {
  return (
    <div className="tourne-telephone" role="alert">
      <svg viewBox="0 0 120 120" className="tourne-icone" aria-hidden="true">
        <g className="tourne-tel">
          <rect x="38" y="16" width="44" height="88" rx="8" />
          <line x1="54" y1="94" x2="66" y2="94" />
        </g>
        <path d="M22 70 A40 40 0 0 1 36 34" className="tourne-fleche" />
        <path d="M30 32 L37 33 L36 41" className="tourne-fleche" />
      </svg>
      <h1>{TEXTES.tourneTelephone.titre}</h1>
      <p>{TEXTES.tourneTelephone.detail}</p>
    </div>
  );
}
