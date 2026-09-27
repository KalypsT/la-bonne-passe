import { CONSEILS, TEXTES_CONSEILS } from '../content/conseils';
import { trouverChambre } from '../content/maison';
import { SEGMENTS_PHRASE } from '../content/modeLibre';
import type { EtatJeu } from '../engine/etat';
import { JoseeLigne } from './Josee';
import { remplir } from './modeles';
import { useInterface } from './store';

/** Un conseil de Josée, la suite du didacticiel : ce qui manque, et un bouton qui y mène. En pause. */
export function CarteConseil({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const choisirOnglet = useInterface((s) => s.choisirOnglet);
  const conseil = partie.conseils.enCours;
  if (!conseil) return null;
  const def = CONSEILS[conseil.id];
  const chambre = conseil.chambreId ? (trouverChambre(conseil.chambreId)?.nom ?? '') : '';
  const segment = conseil.segment ? SEGMENTS_PHRASE[conseil.segment] : '';
  const texte = (x: string) => remplir(x.replaceAll('{chambre}', chambre).replaceAll('{segment}', segment), partie);
  const montrer = () => {
    const cible = def.cible;
    ouvrirCarte(null);
    if (!cible) return;
    if ('onglet' in cible) choisirOnglet(cible.onglet);
    else if (cible.fiche === 'chambre' && conseil.chambreId) ouvrirFiche({ type: 'chambre', id: conseil.chambreId });
    else if (cible.fiche === 'bureau') ouvrirFiche({ type: 'piece', id: 'bureau' });
    else if (cible.fiche === 'mairie') ouvrirFiche({ type: 'acteur', id: 'mairie' });
  };
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-conseil">
      <div className="carte-modale">
        <p className="sous laiton">{TEXTES_CONSEILS.etiquette}</p>
        <h2 id="titre-conseil" className="titre-neon">
          {texte(def.titre)}
        </h2>
        <JoseeLigne texte={texte(def.texte)} />
        <div className="carte-actions fin">
          <button className="bouton discret" onClick={() => ouvrirCarte(null)}>
            {TEXTES_CONSEILS.compris}
          </button>
          {def.cible && (
            <button className="bouton principal" onClick={montrer}>
              {texte(def.montrer)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
