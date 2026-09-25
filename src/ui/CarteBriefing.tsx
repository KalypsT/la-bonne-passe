import { useState } from 'react';
import { COMMANDE_LINGE, HEURE_FERMETURE, HEURE_OUVERTURE, RDV_MAX_CRANS } from '../content/balance';
import { OFFRES, type Offre } from '../content/clientele';
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
  // Planning : une personne promise au repos est proposée au repos d'office.
  const [repos, setRepos] = useState<string[]>(() => partie.personnel.filter((e) => e.promesseRepos !== null).map((e) => e.id));
  const [rdvMax, setRdvMax] = useState(partie.rdvMax);
  const planning = partie.systemes.planning;
  const basculer = (id: string) => {
    const suivant = repos.includes(id) ? repos.filter((x) => x !== id) : [...repos, id];
    if (suivant.length < partie.personnel.length) setRepos(suivant);
  };
  const pl = TEXTES.planning;
  const indiceRdv = Math.max(0, RDV_MAX_CRANS.findIndex((n) => n === rdvMax));
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
          <button className="bouton principal" onClick={() => validerBriefing({ offre, commanderLinge, repos: planning ? repos : [], rdvMax })}>
            {t.lancer}
          </button>
        </header>
        {premierSoir && (
          <p className="carte-accueil">{TEXTES.jeu.bienvenue(partie.joueur.prenom, partie.joueur.genre, partie.maison.nom)}</p>
        )}
        <div className="carte-colonnes">
          <section>
            <h3>{t.ceSoir}</h3>
            {partie.personnel.map((e) => {
              const auRepos = repos.includes(e.id);
              return (
                <div key={e.id} className="ligne-planning">
                  <p className="mini-fiche">
                    <b>{e.prenom}</b>
                    {e.menaceDepart !== null && <span className="negatif"> · {pl.menace}</span>}
                    {e.promesseRepos !== null && <span className="laiton"> · {pl.promesse}</span>}
                    <br />
                    {p.fatigue.toLowerCase()} <span className={e.fatigue > 70 ? 'negatif' : ''}>{Math.round(e.fatigue)} %</span> ·{' '}
                    {p.moral.toLowerCase()} <span className={e.moral < 35 ? 'negatif' : ''}>{Math.round(e.moral)} %</span>
                  </p>
                  {planning && (
                    <button
                      className={auRepos ? 'choix-court choisi' : 'choix-court'}
                      aria-pressed={auRepos}
                      aria-label={`${e.prenom} : ${auRepos ? pl.repos : pl.travaille}`}
                      onClick={() => basculer(e.id)}
                    >
                      {auRepos ? pl.repos : pl.travaille}
                    </button>
                  )}
                </div>
              );
            })}
            {planning && (
              <>
                <h3>{pl.rdvMax}</h3>
                <div className="boutons-ligne" role="group" aria-label={pl.rdvMax}>
                  {RDV_MAX_CRANS.map((n) => (
                    <button key={n} className={rdvMax === n ? 'choix-court choisi' : 'choix-court'} aria-pressed={rdvMax === n} onClick={() => setRdvMax(n)}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="sous">{pl.rdvMaxAide[indiceRdv]}</p>
              </>
            )}
            {!partie.systemes.planning && <p className="sous">{t.planningVerrouille(partie.personnel[0]?.prenom ?? '')}</p>}
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
