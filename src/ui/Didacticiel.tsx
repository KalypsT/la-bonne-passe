import { useEffect, useState } from 'react';
import { ETAPES_DIDACTICIEL, TEXTES_DIDACTICIEL } from '../content/didacticiel';
import type { EtatJeu } from '../engine/etat';
import { PortraitJosee } from './Josee';
import { JOSEE } from '../content/josee';
import { useInterface } from './store';

interface Cadre {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Suit la position d'un élément marqué data-tuto, à chaque image (la scène et le panneau bougent). */
function useCadre(cible: string | undefined): Cadre | null {
  const [cadre, setCadre] = useState<Cadre | null>(null);
  useEffect(() => {
    if (!cible) {
      setCadre(null);
      return;
    }
    let image = 0;
    const mesurer = () => {
      const el = document.querySelector(`[data-tuto="${cible}"]`);
      const r = el?.getBoundingClientRect();
      setCadre((avant) => {
        if (!r || r.width === 0) return avant === null ? avant : null;
        if (avant && avant.x === r.x && avant.y === r.y && avant.w === r.width && avant.h === r.height) return avant;
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      image = requestAnimationFrame(mesurer);
    };
    mesurer();
    return () => cancelAnimationFrame(image);
  }, [cible]);
  return cadre;
}

/**
 * La soirée guidée de Madame Josée : sa carte, et un cadre lumineux autour de l'élément à toucher.
 * Le cadre ne bloque rien ; la carte se place du côté opposé à l'élément.
 */
export function Didacticiel({ partie }: { partie: EtatJeu }) {
  const signalerDidacticiel = useInterface((s) => s.signalerDidacticiel);
  const passerDidacticiel = useInterface((s) => s.passerDidacticiel);
  const carte = useInterface((s) => s.carte);
  const etape = partie.didacticiel === null ? null : ETAPES_DIDACTICIEL[partie.didacticiel];
  const cadre = useCadre(etape?.texte && !carte ? etape.cible : undefined);
  if (!etape?.texte || carte) return null;

  const aDroite = cadre ? cadre.x + cadre.w / 2 < window.innerWidth / 2 : false;
  const texte = etape.texte.replaceAll('{prenom}', partie.joueur.prenom);

  return (
    <>
      {cadre && (
        <div
          className="tuto-cadre"
          aria-hidden="true"
          style={{ left: cadre.x - 4, top: cadre.y - 4, width: cadre.w + 8, height: cadre.h + 8 }}
        />
      )}
      <div className={aDroite ? 'tuto-carte a-droite' : 'tuto-carte'} role="dialog" aria-live="polite" aria-label={JOSEE.nom}>
        <div className="josee">
          <PortraitJosee />
          <p>
            <b>{JOSEE.nom}</b>
            {texte}
          </p>
        </div>
        <div className="boutons-ligne">
          <button className="bouton discret" onClick={passerDidacticiel}>
            {TEXTES_DIDACTICIEL.passer}
          </button>
          {etape.attend === 'suivant' && (
            <button className="bouton principal" onClick={() => signalerDidacticiel('suivant')}>
              {etape.bouton}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
