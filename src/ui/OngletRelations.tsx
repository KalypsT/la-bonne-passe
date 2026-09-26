import { useState } from 'react';
import { ACTIONS_RELATIONS, RELATIONS } from '../content/balance';
import {
  ACTEURS,
  HUMEURS,
  TEXTES_ACTIONS_RELATIONS,
  TEXTES_RELATIONS as t,
  humeurRelation,
  type IdActeur,
} from '../content/relations';
import {
  ACTIONS_RIVALE,
  HUMEURS_RIVALE,
  RIVALE_DEF,
  TEXTES_REPONSES_RIVALE,
  TEXTES_RIVALE as tr,
  humeurRivale,
  type IdReponseRivale,
} from '../content/rivale';
import type { EtatJeu } from '../engine/etat';
import { acteursOuverts, actionPossible, prochaineAction, termes } from '../engine/relations';
import { chanceTreve, enTreve, prochaineReponse, reponsePossible } from '../engine/rivale';
import { remplir } from './modeles';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Jauge de −100 à +100, remplie depuis le centre, avec les seuils des bons et des mauvais termes. */
function JaugeRelation({ valeur }: { valeur: number }) {
  const v = Math.max(-100, Math.min(100, valeur));
  const largeur = Math.abs(v) / 2;
  const style = v >= 0 ? { left: '50%', width: `${largeur}%` } : { left: `${50 - largeur}%`, width: `${largeur}%` };
  const classe = termes(v) === 'bons' ? 'bons' : termes(v) === 'mauvais' ? 'mauvais' : v < 0 ? 'froid' : '';
  return (
    <span className="jauge-relation" aria-hidden="true">
      <i className={classe} style={style} />
      <em style={{ left: `${50 + RELATIONS.mauvais / 2}%` }} />
      <em className="milieu" style={{ left: '50%' }} />
      <em style={{ left: `${50 + RELATIONS.bons / 2}%` }} />
    </span>
  );
}

/** Onglet Relations (palier 3) : une ligne par acteur du quartier, avec sa jauge et son humeur. */
export function OngletRelations({ partie }: { partie: EtatJeu }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  return (
    <>
      <p className="sous">{t.intro}</p>
      {acteursOuverts(partie).map((id) => {
        const valeur = partie.relations.jauges[id];
        const ecart = Math.round(valeur - partie.relations.lundi[id]);
        const humeur = HUMEURS[humeurRelation(valeur)];
        return (
          <button
            key={id}
            className="ligne ligne-segment ligne-relation"
            aria-label={`${ACTEURS[id].nom} : ${humeur}, ${t.jauge(valeur)}`}
            onClick={() => ouvrirFiche({ type: 'acteur', id })}
          >
            <span className="ligne-segment-haut">
              <span>{ACTEURS[id].nom}</span>
              <span>
                <b>{t.jauge(valeur)}</b>{' '}
                <small className={ecart < 0 ? 'negatif' : ecart > 0 ? 'positif' : ''}>{t.cetteSemaine(ecart)}</small>
              </span>
            </span>
            <JaugeRelation valeur={valeur} />
            <small className={termes(valeur) === 'mauvais' ? 'negatif' : termes(valeur) === 'bons' ? 'positif' : ''}>{humeur}</small>
          </button>
        );
      })}
      {partie.systemes.rivale && <LigneRivale partie={partie} />}
    </>
  );
}

/** La rivale, sous les acteurs du quartier : son humeur, et ce qu'elle a fait cette semaine. */
function LigneRivale({ partie }: { partie: EtatJeu }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const r = partie.rivale;
  const humeur = HUMEURS_RIVALE[humeurRivale(r.agressivite)];
  return (
    <>
      <h3>{tr.titre}</h3>
      <button
        className="ligne ligne-segment ligne-relation"
        aria-label={`${RIVALE_DEF.nom} : ${humeur}`}
        onClick={() => ouvrirFiche({ type: 'rivale', id: 'chatNoir' })}
      >
        <span className="ligne-segment-haut">
          <span>{RIVALE_DEF.nom}</span>
          <span>
            <b className={r.agressivite >= 50 ? 'negatif' : ''}>{humeur}</b>
          </span>
        </span>
        <span className={r.agressivite >= 50 ? 'jauge-barre rivale basse' : 'jauge-barre rivale'}>
          <i style={{ width: `${r.agressivite}%` }} />
        </span>
        <small>{cetteSemaine(partie)}</small>
      </button>
    </>
  );
}

/** Ce que la rivale fait cette semaine, en une ligne. */
function cetteSemaine(partie: EtatJeu): string {
  const r = partie.rivale;
  if (enTreve(partie)) return tr.treve(r.treve);
  const a = r.derniereAction;
  if (!a) return tr.pasEncore;
  if (partie.jour - a.jour >= 7) return tr.rien;
  return remplir(ACTIONS_RIVALE[a.id]?.texte ?? tr.rien, partie);
}

/** Fiche de la rivale : qui elle est, son humeur, vos rapports, et les réponses possibles (une par semaine). */
export function FicheRivale({ partie }: { partie: EtatJeu }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const ordonner = useInterface((s) => s.ordonner);
  const [commentee, setCommentee] = useState<IdReponseRivale>('treve');
  const r = partie.rivale;
  const prochaine = prochaineReponse(partie);
  const attendre = partie.jour < prochaine;
  const reponses: IdReponseRivale[] = ['debaucher', 'rumeur', 'treve'];
  return (
    <div className="fiche">
      <button className="retour" onClick={() => ouvrirFiche(null)}>
        {tr.retour}
      </button>
      <h2>{RIVALE_DEF.nom}</h2>
      <p className="sous">{RIVALE_DEF.portrait}</p>
      <p className="sous">{RIVALE_DEF.style}</p>
      <div className="jauge">
        <span>
          {tr.agressivite} <b>{HUMEURS_RIVALE[humeurRivale(r.agressivite)]}</b>
        </span>
        <span className={r.agressivite >= 50 ? 'jauge-barre rivale basse' : 'jauge-barre rivale'}>
          <i style={{ width: `${r.agressivite}%` }} />
        </span>
      </div>
      <p className="sous">{RIVALE_DEF.agace}</p>
      <div className="jauge">
        <span>
          {tr.relation} <b>{t.jauge(r.relation)}</b>
        </span>
        <JaugeRelation valeur={r.relation} />
      </div>
      <h3>{tr.semaine}</h3>
      <p className="sous">{cetteSemaine(partie)}</p>
      {r.transfuges.length > 0 && <p className="sous negatif">{tr.transfuges(r.transfuges.join(', '))}</p>}
      <h3>{tr.reponses}</h3>
      {attendre && <p className="sous">{tr.reponseFaite(prochaine)}</p>}
      {reponses.map((id) => {
        const texte = TEXTES_REPONSES_RIVALE[id];
        const possible = reponsePossible(partie, id);
        const raison = attendre ? '' : id === 'debaucher' && !partie.systemes.recrutement ? tr.sansRecrutement : !possible ? tr.tropCher : '';
        const detail = id === 'treve' ? `${texte.detail} ; ${tr.chance(Math.round(chanceTreve(partie) * 100))}` : texte.detail;
        return (
          <button
            key={id}
            className="choix"
            disabled={!possible}
            onClick={() => {
              setCommentee(id);
              ordonner({ type: 'reponseRivale', reponse: id });
            }}
          >
            {texte.texte}
            <small>{raison ? `${detail} · ${raison}` : detail}</small>
          </button>
        );
      })}
      <JoseeLigne texte={TEXTES_REPONSES_RIVALE[commentee].josee} />
    </div>
  );
}

/** Fiche d'un acteur : qui c'est, ce qu'il rend et ce qu'il coûte, et les actions pour soigner la relation. */
export function FicheActeur({ partie, id }: { partie: EtatJeu; id: IdActeur }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const ordonner = useInterface((s) => s.ordonner);
  const def = ACTEURS[id];
  const actions = Object.keys(ACTIONS_RELATIONS).filter((a) => ACTIONS_RELATIONS[a]!.acteur === id);
  const [commentee, setCommentee] = useState(actions[0] ?? '');
  const valeur = partie.relations.jauges[id];
  const etat = termes(valeur);
  const prochaine = prochaineAction(partie, id);
  const attendre = partie.jour < prochaine;

  return (
    <div className="fiche">
      <button className="retour" onClick={() => ouvrirFiche(null)}>
        {t.retour}
      </button>
      <h2>{def.nom}</h2>
      <p className="sous">{def.portrait}</p>
      <div className="jauge">
        <span>
          {HUMEURS[humeurRelation(valeur)]} <b>{t.jauge(valeur)}</b>
        </span>
        <JaugeRelation valeur={valeur} />
      </div>
      <h3>
        {t.bons}
        {etat === 'bons' && <small className="positif"> · {t.actif}</small>}
      </h3>
      <p className="sous">{def.bons}</p>
      <h3>
        {t.mauvais}
        {etat === 'mauvais' && <small className="negatif"> · {t.actif}</small>}
      </h3>
      <p className="sous">{def.mauvais}</p>
      <h3>{t.bouge}</h3>
      <p className="sous">{def.bouge}</p>
      <h3>{t.actions}</h3>
      {attendre && <p className="sous">{t.actionFaite(prochaine)}</p>}
      {actions.map((a) => {
        const texte = TEXTES_ACTIONS_RELATIONS[a]!;
        const possible = actionPossible(partie, a);
        const assez = partie.tresorerie >= ACTIONS_RELATIONS[a]!.cout;
        return (
          <button
            key={a}
            className="choix"
            disabled={!possible}
            onClick={() => {
              setCommentee(a);
              ordonner({ type: 'actionRelation', action: a });
            }}
            onFocus={() => setCommentee(a)}
          >
            {texte.texte}
            <small>{!assez && !attendre ? `${texte.detail} · ${t.tropCher}` : texte.detail}</small>
          </button>
        );
      })}
      {commentee && <JoseeLigne texte={TEXTES_ACTIONS_RELATIONS[commentee]?.josee ?? ''} />}
    </div>
  );
}
