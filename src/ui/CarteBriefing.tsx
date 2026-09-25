import { HEURE_FERMETURE, HEURE_OUVERTURE } from '../content/balance';
import { trouverChambre } from '../content/maison';
import { PALIERS } from '../content/paliers';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import { Avatar } from '../scene/Avatar';
import { formaterEuros, formaterHeure } from './format';
import { useInterface } from './store';

/** Briefing de 19 h, en pause. Le planning et l'offre du soir arriveront à l'étape suivante. */
export function CarteBriefing({ partie }: { partie: EtatJeu }) {
  const validerBriefing = useInterface((s) => s.validerBriefing);
  const t = TEXTES.briefing;
  const p = TEXTES.panneau;
  const ouvertes = partie.chambres.filter((c) => c.ouverte);
  const suivant = PALIERS.find((x) => x.numero === partie.palier + 1);
  const jourSemaine = TEXTES.jours[jourDeLaSemaine(partie.jour)] ?? '';

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-briefing">
      <div className="carte-modale carte-briefing">
        <header className="briefing-entete">
          <Avatar avatar={partie.joueur.avatar} tenue={partie.joueur.tenue} taille={44} />
          <div>
            <h2 id="titre-briefing">{t.titre}</h2>
            <p className="sous">{TEXTES.date(jourSemaine, partie.jour)}</p>
          </div>
        </header>
        {partie.jour === 1 && (
          <p className="briefing-accueil">
            {TEXTES.jeu.bienvenue(partie.joueur.prenom, partie.joueur.genre, partie.maison.nom)}
          </p>
        )}
        <div className="briefing-colonnes">
          <section>
            <h3>{t.ceSoir}</h3>
            <p>{t.horaires(formaterHeure(HEURE_OUVERTURE), formaterHeure(HEURE_FERMETURE))}</p>
            <p>{t.chambresEnService(ouvertes.length, partie.chambres.length)}</p>
            <ul>
              {ouvertes.map((c) => (
                <li key={c.id}>
                  {trouverChambre(c.id)?.nom} · {p.proprete.toLowerCase()} {Math.round(c.proprete)} %
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3>{t.laMaison}</h3>
            <p>
              {p.tresorerie} : <b>{formaterEuros(partie.tresorerie)}</b>
            </p>
            <p>
              {TEXTES.jeu.reputationLabel} : <b>{Math.floor(partie.reputation)}</b>
            </p>
            {suivant && (
              <p>
                {p.prochainPalier} : <b>{suivant.nom}</b>. {suivant.objectif}
              </p>
            )}
            <p className="sous">{t.bientot}</p>
          </section>
        </div>
        <div className="carte-actions">
          <button className="bouton principal" onClick={validerBriefing}>
            {t.lancer}
          </button>
        </div>
      </div>
    </div>
  );
}
