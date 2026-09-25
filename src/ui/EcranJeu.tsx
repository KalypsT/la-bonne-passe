import { Maison } from '../scene/Maison';
import { BarreHaut } from './BarreHaut';
import { CarteBriefing } from './CarteBriefing';
import { Panneau } from './Panneau';
import { useInterface, type Fiche } from './store';
import { useBoucle } from './useBoucle';

const PIECES_COMMUNES = ['salon', 'bar', 'bureau'] as const;

function ficheDe(id: string): Fiche {
  const piece = PIECES_COMMUNES.find((p) => p === id);
  return piece ? { type: 'piece', id: piece } : { type: 'chambre', id };
}

/** Écran principal : barre du haut, maison à gauche, panneau de gestion à droite. */
export function EcranJeu() {
  const partie = useInterface((s) => s.partie);
  const carte = useInterface((s) => s.carte);
  const fiche = useInterface((s) => s.fiche);
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  useBoucle();
  if (!partie) return null;

  return (
    <div className="ecran-jeu">
      <BarreHaut partie={partie} />
      <div className="jeu-principal">
        <div className="scene">
          <Maison partie={partie} selection={fiche?.id ?? null} onChoisir={(id) => ouvrirFiche(ficheDe(id))} />
        </div>
        <Panneau partie={partie} />
      </div>
      {carte === 'briefing' && <CarteBriefing partie={partie} />}
    </div>
  );
}
