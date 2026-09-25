import { useState } from 'react';
import { COMMANDE_LINGE, HEURE_FERMETURE, HEURE_OUVERTURE } from '../content/balance';
import { OFFRES, type Offre } from '../content/clientele';
import { SANNE } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { jourDeLaSemaine } from '../engine/temps';
import { Avatar } from '../scene/Avatar';
import { formaterEuros, formaterHeure } from './format';
import { useInterface } from './store';

/** Briefing de 19 h, en pause : qui travaille, l'offre du soir, le linge. */
export function CarteBriefing({ partie }: { partie: EtatJeu }) {
  const validerBriefing = useInterface((s) => s.validerBriefing);
  const [offre, setOffre] = useState<Offre>(partie.offre);
  const [commanderLinge, setCommanderLinge] = useState(false);
  const t = TEXTES.briefing;
  const p = TEXTES.personnel;
  const jourSemaine = TEXTES.jours[jourDeLaSemaine(partie.jour)] ?? '';
  const premierSoir = partie.nuitsBouclees === 0;

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-briefing">
      <div className="carte-modale carte-large">
        <header className="carte-entete">
          <Avatar avatar={partie.joueur.avatar} tenue={partie.joueur.tenue} taille={40} />
          <div className="carte-titre-bloc">
            <h2 id="titre-briefing">{t.titre}</h2>
            <p className="sous">
              {TEXTES.date(jourSemaine, partie.jour)} · {t.horaires(formaterHeure(HEURE_OUVERTURE), formaterHeure(HEURE_FERMETURE))}
            </p>
          </div>
          <button className="bouton principal" onClick={() => validerBriefing({ offre, commanderLinge })}>
            {t.lancer}
          </button>
        </header>
        {premierSoir && (
          <p className="carte-accueil">{TEXTES.jeu.bienvenue(partie.joueur.prenom, partie.joueur.genre, partie.maison.nom)}</p>
        )}
        <div className="carte-colonnes">
          <section>
            <h3>{t.ceSoir}</h3>
            {partie.personnel.map((e) => (
              <p key={e.id} className="mini-fiche">
                <b>{e.id === SANNE.id ? SANNE.prenom : e.id}</b> · {p.fatigue.toLowerCase()}{' '}
                <span className={e.fatigue > 70 ? 'negatif' : ''}>{Math.round(e.fatigue)} %</span> · {p.moral.toLowerCase()}{' '}
                <span className={e.moral < 35 ? 'negatif' : ''}>{Math.round(e.moral)} %</span>
              </p>
            ))}
            {!partie.systemes.recrutement && <p className="sous">{t.planningVerrouille(SANNE.prenom)}</p>}
            <h3>{t.linge}</h3>
            <p className="sous">{t.stockLinge(partie.linge)}</p>
            <button
              className={commanderLinge ? 'choix choisi' : 'choix'}
              aria-pressed={commanderLinge}
              onClick={() => setCommanderLinge(!commanderLinge)}
            >
              {t.commanderLinge(COMMANDE_LINGE.draps, formaterEuros(COMMANDE_LINGE.prix))}
            </button>
          </section>
          <section>
            <h3>{t.offre}</h3>
            {OFFRES.map((o) => (
              <button
                key={o.id}
                className={offre === o.id ? 'choix choisi' : 'choix'}
                aria-pressed={offre === o.id}
                onClick={() => setOffre(o.id)}
              >
                {o.nom}
                <small>{o.description}</small>
              </button>
            ))}
            {premierSoir && <p className="conseil">{t.conseilPremierSoir}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
