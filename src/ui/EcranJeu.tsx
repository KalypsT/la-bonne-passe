import { TEXTES } from '../content/textes';
import { Avatar } from '../scene/Avatar';
import { formaterEuros, formaterHeure } from './format';
import { useInterface } from './store';

/** Écran de jeu provisoire : la maison et l'horloge arriveront dans les prochaines étapes. */
export function EcranJeu() {
  const partie = useInterface((s) => s.partie);
  const retourTitre = useInterface((s) => s.retourTitre);
  const avancerUneHeure = useInterface((s) => s.avancerUneHeure);
  if (!partie) return null;
  const t = TEXTES.jeu;

  return (
    <div className="ecran-jeu">
      <header className="barre-haut">
        <span className="barre-maison">{partie.maison.nom}</span>
        <span className="barre-info">
          {TEXTES.emplacements.jour(partie.jour)} · <b>{formaterHeure(partie.minuteDuJour)}</b>
        </span>
        <span className="barre-info">
          <b>{formaterEuros(partie.tresorerie)}</b>
        </span>
        <button className="bouton discret" onClick={retourTitre}>
          {t.menu}
        </button>
      </header>
      <main className="jeu-provisoire">
        <Avatar avatar={partie.joueur.avatar} taille={64} />
        <p className="jeu-bienvenue">{t.bienvenue(partie.joueur.prenom, partie.joueur.genre, partie.maison.nom)}</p>
        <p className="carte-detail">{t.bientot}</p>
        <button className="bouton principal" onClick={avancerUneHeure}>
          {t.avancer}
        </button>
        <p className="mention">{t.provisoire}</p>
      </main>
    </div>
  );
}
