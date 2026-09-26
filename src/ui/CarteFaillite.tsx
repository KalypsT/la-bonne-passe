import { TEXTES_BANQUE } from '../content/banque';
import type { EtatJeu } from '../engine/etat';
import { Avatar } from '../scene/Avatar';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** La faillite : la partie est finie. On recommence, ou on retourne à l'écran titre. */
export function CarteFaillite({ partie }: { partie: EtatJeu }) {
  const nouvellePartie = useInterface((s) => s.nouvellePartie);
  const retourTitre = useInterface((s) => s.retourTitre);
  const emplacement = useInterface((s) => s.emplacementActif);
  const fin = partie.finDePartie;
  if (!fin) return null;
  const t = TEXTES_BANQUE.faillite;
  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-faillite">
      <div className="carte-modale carte-large">
        <header className="carte-entete">
          <Avatar avatar={partie.joueur.avatar} tenue={partie.joueur.tenue} taille={40} />
          <h2 id="titre-faillite" className="titre-neon">
            {t.titre}
          </h2>
        </header>
        <div className="carte-colonnes">
          <section>
            <p>{t.texte(partie.maison.nom, fin.jour)}</p>
            <ul className="liste-simple">
              <li>{t.duree(fin.jour)}</li>
              <li>{t.reputation(Math.floor(partie.reputation))}</li>
              <li>{t.equipe(partie.personnel.length)}</li>
            </ul>
          </section>
          <section>
            <JoseeLigne texte={t.josee(partie.joueur.prenom, partie.joueur.genre)} />
          </section>
        </div>
        <div className="carte-actions fin">
          <button className="bouton discret" onClick={retourTitre}>
            {t.titreEcran}
          </button>
          {emplacement !== null && (
            <button className="bouton principal" onClick={() => nouvellePartie(emplacement)}>
              {t.recommencer}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
