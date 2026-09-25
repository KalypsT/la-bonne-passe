import { alertes as calculerAlertes, type Alerte } from '../engine/alertes';
import { Maison } from '../scene/Maison';
import { BarreHaut } from './BarreHaut';
import { CarteBilan } from './CarteBilan';
import { CarteBriefing } from './CarteBriefing';
import { CarteDispute } from './CarteDispute';
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
  const montants = useInterface((s) => s.montants);
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const choisirOnglet = useInterface((s) => s.choisirOnglet);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  useBoucle();
  if (!partie) return null;

  const surAlerte = (alerte: Alerte) => {
    switch (alerte.type) {
      case 'chambreSale':
        ouvrirFiche({ type: 'chambre', id: alerte.chambreId });
        break;
      case 'linge':
        choisirOnglet('maison');
        break;
      case 'epuisement':
        choisirOnglet('personnel');
        break;
      case 'dispute':
        ouvrirCarte('dispute');
        break;
    }
  };

  return (
    <div className="ecran-jeu">
      <BarreHaut partie={partie} />
      <div className="jeu-principal">
        <div className="scene">
          <Maison
            partie={partie}
            alertes={calculerAlertes(partie)}
            montants={montants}
            onAlerte={surAlerte}
            selection={fiche?.id ?? null}
            onChoisir={(id) => ouvrirFiche(ficheDe(id))}
          />
        </div>
        <Panneau partie={partie} />
      </div>
      {carte === 'briefing' && <CarteBriefing partie={partie} />}
      {carte === 'bilan' && <CarteBilan partie={partie} />}
      {carte === 'dispute' && <CarteDispute />}
    </div>
  );
}
