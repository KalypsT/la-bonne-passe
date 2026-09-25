import { VITESSES } from '../content/balance';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { estOuvert, jourDeLaSemaine } from '../engine/temps';
import { formaterEuros, formaterHeure } from './format';
import { IconePause } from './Icones';
import { useInterface, type Vitesse } from './store';

export function BarreHaut({ partie }: { partie: EtatJeu }) {
  const vitesse = useInterface((s) => s.vitesse);
  const choisirVitesse = useInterface((s) => s.choisirVitesse);
  const retourTitre = useInterface((s) => s.retourTitre);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const t = TEXTES.jeu;
  const ouvert = estOuvert(partie);
  const jourSemaine = TEXTES.jours[jourDeLaSemaine(partie.jour)] ?? '';

  return (
    <header className="barre-haut">
      <span className="barre-maison">{partie.maison.nom}</span>
      <span className="pastille regime">{t.regime}</span>
      <span className="espace" />
      <span className={partie.tresorerie < 0 ? 'barre-argent negatif' : 'barre-argent'}>
        {formaterEuros(partie.tresorerie)}
      </span>
      <span className="barre-reputation" aria-label={`${t.reputationLabel} ${Math.floor(partie.reputation)}`}>
        {t.reputation(Math.floor(partie.reputation))}
      </span>
      <span className="horloge">
        <b>{formaterHeure(partie.minuteDuJour)}</b>
        <span>{TEXTES.date(jourSemaine, partie.jour)}</span>
      </span>
      <span className={ouvert ? 'pastille ouverte' : 'pastille'}>{ouvert ? t.ouvert : t.ferme}</span>
      <div className="vitesses" role="group" data-tuto="vitesses">
        {([0, ...VITESSES] as Vitesse[]).map((v) => (
          <button
            key={v}
            aria-pressed={vitesse === v}
            aria-label={v === 0 ? t.pause : t.vitesseLabel(v)}
            onClick={() => choisirVitesse(v)}
          >
            {v === 0 ? <IconePause /> : t.vitesse(v)}
          </button>
        ))}
      </div>
      <button className="bouton discret bouton-aide" aria-label={TEXTES.aide.titre} onClick={() => ouvrirCarte('aide')}>
        {TEXTES.aide.bouton}
      </button>
      <button className="bouton discret bouton-menu" onClick={retourTitre}>
        {t.menu}
      </button>
    </header>
  );
}
