import { useState } from 'react';
import { CIBLES_LINGE_AUTO, COMMANDE_BAR, FORMULES, PACKS_LINGE, PLAFOND, SEUIL_BAR, THEMES, HEURE_FERMETURE, HEURE_OUVERTURE, RDV_MAX_CRANS } from '../content/balance';
import { OFFRES, type Offre } from '../content/clientele';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { manqueAuto, prixLinge } from '../engine/linge';
import { facteurFournisseurs, prixFournisseur } from '../engine/relations';
import { fatigueFinDeNuit, fatigueLendemain, reponsePlafond, type AccordPlafond } from '../engine/plafond';
import { AIDE_CRANS, etatFinDeNuit, repliquePlafond, TEXTES_PLAFOND } from '../content/plafond';
import type { Employe } from '../engine/etat';
import type { IdFormule } from '../content/balance';
import { jourDeLaSemaine } from '../engine/temps';
import { Avatar } from '../scene/Avatar';
import { formaterEuros, formaterHeure } from './format';
import { TEXTES_DIDACTICIEL } from '../content/didacticiel';
import { JoseeLigne } from './Josee';
import { resumeRegles } from './OngletClientele';
import { TEXTES_FORMULES } from '../content/regles';
import { trouverTendance } from '../content/tendances';
import { THEMES_SOIREE } from '../content/themes';
import { forceSiProgramme } from '../engine/themes';
import { formuleActive } from '../engine/regles';
import { useInterface } from './store';

/** Briefing de 19 h, en pause : qui travaille, l'offre du soir, le linge. */
export function CarteBriefing({ partie }: { partie: EtatJeu }) {
  const validerBriefing = useInterface((s) => s.validerBriefing);
  const [offre, setOffre] = useState<Offre>(partie.offre);
  const [packLinge, setPackLinge] = useState(0);
  const [lingeAuto, setLingeAuto] = useState(partie.lingeAuto);
  const [commanderBar, setCommanderBar] = useState(false);
  const [theme, setTheme] = useState<string | null>(null);
  // Planning : une personne promise au repos est proposée au repos d'office.
  const [repos, setRepos] = useState<string[]>(() => partie.personnel.filter((e) => e.promesseRepos !== null).map((e) => e.id));
  const [rdvMax, setRdvMax] = useState(partie.rdvMax);
  // Au cran 6 : ta réponse à ceux qui négocient (par défaut, ils s'arrêtent à 5).
  const [accords, setAccords] = useState<Record<string, AccordPlafond>>({});
  const planning = partie.systemes.planning;
  const formule = formuleActive(partie);
  const tendances = partie.semaine.tendances.flatMap((id) => trouverTendance(id) ?? []);
  const basculer = (id: string) => {
    const suivant = repos.includes(id) ? repos.filter((x) => x !== id) : [...repos, id];
    if (suivant.length < partie.personnel.length) setRepos(suivant);
  };
  const pl = TEXTES.planning;
  const t = TEXTES.briefing;
  const p = TEXTES.personnel;
  const jourSemaine = TEXTES.jours[jourDeLaSemaine(partie.jour)] ?? '';
  const premierSoir = partie.nuitsBouclees === 0;
  // Prix d'ami ou prix gonflés, selon les fournisseurs (v0.6).
  const facteur = facteurFournisseurs(partie);
  // Ce que la commande automatique ajoutera après le pack choisi, et le linge disponible ce soir.
  const auto = manqueAuto({ ...partie, lingeAuto }, packLinge);
  const lingeCeSoir = partie.linge + partie.lingeCommande + packLinge + auto;

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
          <button className="bouton principal" onClick={() => validerBriefing({ offre, packLinge, lingeAuto, commanderBar, repos: planning ? repos : [], rdvMax, theme, accords })}>
            {t.lancer}
          </button>
        </header>
        {premierSoir && (
          <p className="carte-accueil">{TEXTES.jeu.bienvenue(partie.joueur.prenom, partie.joueur.genre, partie.maison.nom)}</p>
        )}
        <div className="carte-colonnes">
          <section>
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
                <p className="sous">
                  {AIDE_CRANS[rdvMax]}
                  {formule !== 'standard' && ` ${pl.charge(TEXTES_FORMULES[formule].nom, FORMULES[formule].charge)}`}
                </p>
              </>
            )}
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
                    {planning && !auRepos && <EstimationFatigue employe={e} cran={rdvMax} formule={formule} theme={theme} />}
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
                  {planning && !auRepos && (
                    <ReponseCran
                      partie={partie}
                      employe={e}
                      cran={rdvMax}
                      accord={accords[e.id] ?? 'refuser'}
                      choisir={(a) => setAccords({ ...accords, [e.id]: a })}
                    />
                  )}
                </div>
              );
            })}
            {!partie.systemes.planning && partie.didacticiel === null && <p className="sous">{t.planningVerrouille(partie.personnel[0]?.prenom ?? '')}</p>}
            <h3>{t.linge}</h3>
            <p className="sous">{t.stockLingeCommande(partie.linge, partie.lingeCommande)}</p>
            <p className="sous">{t.packLinge}</p>
            <div className="boutons-ligne quatre" role="group" aria-label={t.packLinge}>
              {[0, ...PACKS_LINGE.map((p) => p.parures)].map((n) => (
                <button
                  key={n}
                  className={packLinge === n ? 'choix-court choisi' : 'choix-court'}
                  aria-pressed={packLinge === n}
                  aria-label={n === 0 ? t.aucunPack : t.pack(n, formaterEuros(prixLinge(n, facteur)), formaterEuros(prixLinge(n, facteur) / n))}
                  onClick={() => setPackLinge(n)}
                >
                  {n === 0 ? t.aucunPack : `${n} · ${formaterEuros(prixLinge(n, facteur))}`}
                </button>
              ))}
            </div>
            <p className="sous">{t.lingeAuto}</p>
            <div className="boutons-ligne quatre" role="group" aria-label={t.lingeAuto}>
              {CIBLES_LINGE_AUTO.map((n) => (
                <button key={n} className={lingeAuto === n ? 'choix-court choisi' : 'choix-court'} aria-pressed={lingeAuto === n} onClick={() => setLingeAuto(n)}>
                  {t.cibleAuto(n)}
                </button>
              ))}
            </div>
            <p className="sous">{lingeAuto > 0 ? t.lingeAutoAide : ''} {t.apresCommande(lingeCeSoir, auto, formaterEuros(prixLinge(auto, facteur)))}</p>
            {partie.bar.ouvert && (
              <>
                <h3>{t.bar}</h3>
                <p className={partie.bar.stock < SEUIL_BAR ? 'sous negatif' : 'sous'}>
                  {t.stockBar(Math.floor(partie.bar.stock))}
                  {partie.equipes.bar === 0 && ` · ${t.barSansEquipe}`}
                </p>
                <button className={commanderBar ? 'choix choisi' : 'choix'} aria-pressed={commanderBar} onClick={() => setCommanderBar(!commanderBar)}>
                  {t.commanderBar(COMMANDE_BAR.bouteilles, formaterEuros(prixFournisseur(partie, COMMANDE_BAR.prix)))}
                </button>
              </>
            )}
            {partie.didacticiel !== null && <JoseeLigne texte={TEXTES_DIDACTICIEL.briefing} />}
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
            {partie.didacticiel === null && premierSoir && <p className="conseil">{t.conseilPremierSoir}</p>}
            {partie.systemes.themes && (
              <>
                <h3>{t.theme}</h3>
                <button className={theme === null ? 'choix choisi' : 'choix'} aria-pressed={theme === null} onClick={() => setTheme(null)}>
                  {t.sansTheme}
                  <small>{t.sansThemeDetail}</small>
                </button>
                {THEMES_SOIREE.map((th) => {
                  const cout = THEMES[th.id]?.cout ?? 0;
                  const force = forceSiProgramme(partie, th.id);
                  const tropCher = partie.tresorerie < cout;
                  return (
                    <button
                      key={th.id}
                      className={theme === th.id ? 'choix choisi' : 'choix'}
                      aria-pressed={theme === th.id}
                      disabled={tropCher}
                      onClick={() => setTheme(th.id)}
                    >
                      {th.nom} · {t.themePrix(formaterEuros(cout))}
                      <small>
                        {th.effet}
                        {force < 1 && ` ${t.themeLasse(Math.round(force * 100))}`}
                        {tropCher && ` ${t.themeTropCher}`}
                      </small>
                    </button>
                  );
                })}
                {theme && <JoseeLigne texte={THEMES_SOIREE.find((th) => th.id === theme)?.josee ?? ''} />}
              </>
            )}
            {partie.systemes.tarifs && (
              <p className="sous">
                <b>{t.regles}</b> {resumeRegles(partie)}
              </p>
            )}
            {tendances.length > 0 && (
              <>
                <p className="sous">
                  <b>{t.tendances}</b> {tendances.map((td) => td.nom).join(' · ')}
                </p>
                {jourDeLaSemaine(partie.jour) === 0 && partie.didacticiel === null && <JoseeLigne texte={tendances[0]!.josee} />}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Fatigue attendue en fin de nuit au cran choisi (Fêtarde, formule et thème compris). */
function EstimationFatigue({ employe, cran, formule, theme }: { employe: Employe; cran: number; formule: IdFormule; theme: string | null }) {
  const fin = fatigueFinDeNuit(employe, cran, formule, theme);
  const t = TEXTES_PLAFOND;
  return (
    <>
      <br />
      <span className={fin > 80 ? 'negatif' : fin > 75 ? 'laiton' : ''}>
        {t.finDeNuit(fin, etatFinDeNuit(fin, employe.genre))}
        {fin > 80 && fatigueLendemain(fin, employe) > 0 && t.pasRemis(employe.genre)}
      </span>
    </>
  );
}

/** Au cran 6 : le refus ou la négociation d'une personne, avec ta réponse. */
function ReponseCran({
  partie,
  employe,
  cran,
  accord,
  choisir,
}: {
  partie: EtatJeu;
  employe: Employe;
  cran: number;
  accord: AccordPlafond;
  choisir: (a: AccordPlafond) => void;
}) {
  const reponse = reponsePlafond(partie, employe, cran);
  if (reponse === 'accepte') return null;
  const t = TEXTES_PLAFOND;
  return (
    <div className="reponse-cran">
      <p className="mini-fiche">{repliquePlafond(reponse, employe, partie.jour)}</p>
      {reponse !== 'refuse' && (
        <div className="boutons-ligne" role="group" aria-label={employe.prenom}>
          <button className={accord === 'accepter' ? 'choix-court choisi' : 'choix-court'} aria-pressed={accord === 'accepter'} onClick={() => choisir('accepter')}>
            {reponse === 'negociePrime' ? t.primeAccepter(formaterEuros(PLAFOND.prime)) : t.reposAccepter}
          </button>
          <button className={accord === 'refuser' ? 'choix-court choisi' : 'choix-court'} aria-pressed={accord === 'refuser'} onClick={() => choisir('refuser')}>
            {t.resterACinq}
          </button>
        </div>
      )}
    </div>
  );
}
