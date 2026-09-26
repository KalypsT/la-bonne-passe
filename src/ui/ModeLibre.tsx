import { OBJECTIFS_LIBRES, SEGMENTS_PHRASE, TEXTES_MODE_LIBRE, type TypeObjectifLibre } from '../content/modeLibre';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { libreReussi, valeurLibre, type ObjectifLibre } from '../engine/modeLibre';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { remplir } from './modeles';

const t = TEXTES_MODE_LIBRE;

/** Une valeur d'objectif libre, en clair. */
function formater(type: TypeObjectifLibre, valeur: number): string {
  return type === 'recette' || type === 'record' ? formaterEuros(valeur) : String(valeur);
}

/** Le texte d'un objectif libre, avec sa cible et son segment. */
export function texteLibre(o: Pick<ObjectifLibre, 'type' | 'cible' | 'segment'>, partie: EtatJeu): string {
  return remplir(
    OBJECTIFS_LIBRES[o.type].texte.replaceAll('{cible}', formater(o.type, o.cible)).replaceAll('{segment}', o.segment ? SEGMENTS_PHRASE[o.segment] : ''),
    partie,
  );
}

/** Dans l'onglet Maison, en mode libre : l'objectif de la semaine et où on en est. */
export function ObjectifLibrePanneau({ partie }: { partie: EtatJeu }) {
  const o = partie.modeLibre.objectif;
  if (!o) return null;
  const def = OBJECTIFS_LIBRES[o.type];
  const valeur = valeurLibre(partie, o);
  const m = partie.modeLibre;
  return (
    <div className="objectif">
      <span className="palier-titre">{t.titre}</span>
      <b>{def.titre}</b>
      <span>{texteLibre(o, partie)}</span>
      <span className={libreReussi(o, valeur) ? 'positif' : 'sous'}>
        {o.type === 'calme' ? t.incidents(valeur) : t.progression(formater(o.type, valeur), formater(o.type, o.cible))}
      </span>
      <span className="palier-ouvre">
        {TEXTES.objectifs.recompense(def.recompense)}
        {m.serie > 0 && ` · ${t.serie(m.serie)}`}
      </span>
    </div>
  );
}

/** Au bilan du lundi : l'objectif de la semaine écoulée, jugé, et celui de la semaine qui commence. */
export function ModeLibreDuLundi({ partie }: { partie: EtatJeu }) {
  const b = partie.bilanSemaine?.modeLibre;
  if (!b || (!b.resultat && !b.nouveau)) return null;
  const o = TEXTES.objectifs;
  const m = partie.modeLibre;
  return (
    <>
      {b.resultat && (
        <div className="defi-bilan">
          <h3>{t.passe}</h3>
          <b>
            {OBJECTIFS_LIBRES[b.resultat.type].titre} ·{' '}
            <span className={b.resultat.reussi ? 'positif' : 'negatif'}>{b.resultat.reussi ? o.reussi : o.rate}</span>
          </b>
          <p className="sous">
            {b.resultat.type === 'calme'
              ? t.incidents(b.resultat.valeur)
              : t.progression(formater(b.resultat.type, b.resultat.valeur), formater(b.resultat.type, b.resultat.cible))}
          </p>
          <JoseeLigne texte={remplir(b.resultat.reussi ? OBJECTIFS_LIBRES[b.resultat.type].reussite : OBJECTIFS_LIBRES[b.resultat.type].echec, partie)} />
          <p className="sous laiton">
            {m.serie > 0 ? `${t.serie(m.serie)} ` : ''}
            {t.bilan(m.reussis, m.rates)}
          </p>
        </div>
      )}
      {b.nouveau && (
        <div className="defi-bilan">
          <h3>{t.nouveau}</h3>
          <b>{OBJECTIFS_LIBRES[b.nouveau.type].titre}</b>
          <p className="sous">{texteLibre(b.nouveau, partie)}</p>
          <p className="sous laiton">{o.recompense(OBJECTIFS_LIBRES[b.nouveau.type].recompense)}</p>
        </div>
      )}
    </>
  );
}
