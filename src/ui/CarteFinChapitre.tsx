import { LIEUX } from '../content/agrandir';
import { TEXTES_FIN, TITRES } from '../content/fin';
import { trouverIntrigue } from '../content/intrigues';
import { trouverChambre } from '../content/maison';
import { PALIERS } from '../content/paliers';
import type { Moment } from '../engine/chronique';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { remplir } from './modeles';
import { useInterface } from './store';

const f = TEXTES_FIN;

/** Un moment de la chronique, raconté en une ligne. */
export function texteMoment(m: Moment, partie: EtatJeu): string {
  const t = f.moment;
  switch (m.type) {
    case 'palier':
      return t.palier(PALIERS.find((p) => p.numero === m.numero)?.nom ?? String(m.numero));
    case 'embauche':
      return t.embauche(m.prenom);
    case 'depart':
      return t.depart(m.prenom);
    case 'chambre':
      return t.chambre(trouverChambre(m.chambreId)?.nom ?? m.chambreId);
    case 'bar':
      return t.bar;
    case 'emprunt':
      return t.emprunt(formaterEuros(m.montant));
    case 'impayee':
      return t.impayee;
    case 'sursis':
      return t.sursis;
    case 'intrigue': {
      const def = trouverIntrigue(m.id);
      const texte = def?.fins[m.fin]?.texte;
      // Le dénouement de l'histoire ; accordé au féminin par défaut quand la personne n'est plus là.
      const genre = partie.personnel.find((e) => e.prenom === m.prenom)?.genre ?? 'f';
      return texte ? remplir(texte, partie, m.prenom ? { prenom: m.prenom, genre } : undefined) : (def?.titre ?? m.id);
    }
    case 'agrandissement':
      return t.agrandissement;
    case 'gerance':
      return t.gerance(m.prenom);
    case 'achatLieu': {
      const l = LIEUX.find((x) => x.id === m.lieu);
      return t.achatLieu(l?.nom ?? '', l?.quartier ?? '');
    }
    case 'inauguration':
      return t.inauguration(m.prenom);
  }
}

/** L'écran de fin du chapitre 1, raconté par Madame Josée. En pause ; le jeu continue ensuite. */
export function CarteFinChapitre({ partie }: { partie: EtatJeu }) {
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const retourTitre = useInterface((s) => s.retourTitre);
  const fin = partie.finChapitre;
  if (!fin) return null;
  const lieu = LIEUX.find((l) => l.id === fin.lieu);
  const quartier = lieu?.quartier ?? '';
  const titre = TITRES[fin.titre];
  const nomTitre = partie.joueur.genre === 'patron' ? titre.patron : titre.patronne;
  const depuis = partie.chronique.depuis;
  const heures = Math.floor(fin.tempsJoue / 3600);
  const minutes = Math.floor((fin.tempsJoue % 3600) / 60);
  const fermer = () => ouvrirCarte(null);

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-fin">
      <div className="carte-modale carte-large carte-fin">
        <h2 id="titre-fin" className="titre-neon">
          {f.titre}
        </h2>
        <p className="sous laiton">{f.sousTitre}</p>
        <JoseeLigne texte={remplir(depuis > 1 ? f.introDepuis(depuis, quartier) : f.intro(fin.jour, quartier), partie)} />
        <div className="carte-colonnes">
          <section>
            <dl className="comptes">
              <div>
                <dt>{f.duree}</dt>
                <dd>{f.jours(fin.jour)}</dd>
              </div>
              {fin.tempsJoue >= 60 && (
                <div>
                  <dt />
                  <dd>{f.tempsReel(heures, minutes)}</dd>
                </div>
              )}
              <div>
                <dt>{depuis > 1 ? f.recettesDepuis(depuis) : f.recettes}</dt>
                <dd>{formaterEuros(fin.recettes)}</dd>
              </div>
              <div>
                <dt>{f.reputation}</dt>
                <dd>★ {fin.reputation}</dd>
              </div>
            </dl>
            <h3>{f.fideles}</h3>
            <p className="sous">{fin.fideles.length ? fin.fideles.join(', ') : f.aucunFidele}</p>
            {fin.gerante && <p className="sous">{f.gerante(fin.gerante, quartier)}</p>}
            <h3>{f.partis}</h3>
            <p className="sous">{fin.partis.length ? fin.partis.join(', ') : f.aucunParti}</p>
          </section>
          <section>
            <h3>{f.moments}</h3>
            <ul className="liste-moments">
              {fin.moments.map((m, i) => (
                <li key={i}>
                  <span className="laiton">{f.moment.jour(m.jour)}</span> · {texteMoment(m, partie)}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="sous">{f.titreIntro}</p>
        <p className="titre-final">{nomTitre}</p>
        <JoseeLigne texte={`${titre.raison} ${f.conclusion}`} />
        <p className="avertissement">{f.avertissement}</p>
        <div className="carte-actions fin">
          <button
            className="bouton discret"
            onClick={() => {
              fermer();
              retourTitre();
            }}
          >
            {f.titreEcran}
          </button>
          <button className="bouton principal" onClick={fermer}>
            {f.continuer}
          </button>
        </div>
      </div>
    </div>
  );
}
