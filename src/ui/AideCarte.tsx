import { useState } from 'react';
import { AIDE_CARTES, TEXTES_AIDE_CARTE } from '../content/didacticiel';
import { JoseeLigne } from './Josee';

/** Le bouton d'aide d'une carte (v1.0) : un « ? » en haut à droite, qui déplie l'explication courte de Josée. */
export function AideCarte({ id }: { id: keyof typeof AIDE_CARTES | string }) {
  const [ouverte, setOuverte] = useState(false);
  const texte = AIDE_CARTES[id];
  if (!texte) return null;
  return (
    <>
      <button
        className={ouverte ? 'aide-carte ouverte' : 'aide-carte'}
        aria-label={TEXTES_AIDE_CARTE.titre}
        aria-expanded={ouverte}
        onClick={() => setOuverte((x) => !x)}
      >
        {TEXTES_AIDE_CARTE.bouton}
      </button>
      {ouverte && (
        <div className="aide-carte-bulle" role="note" onClick={() => setOuverte(false)}>
          <JoseeLigne texte={texte} />
        </div>
      )}
    </>
  );
}
