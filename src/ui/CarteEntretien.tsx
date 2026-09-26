import { PARTS_PROPOSEES, PERSONNEL_MAX } from '../content/balance';
import { TRAITS } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { nomAmbition, Portrait, Talents } from './Panneau';
import { useInterface } from './store';

/** Entretien d'embauche : une question révèle un trait, puis une proposition de part. En pause. */
export function CarteEntretien({ partie }: { partie: EtatJeu }) {
  const id = useInterface((s) => s.candidatOuvert);
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const candidat = partie.candidats.find((c) => c.id === id);
  const r = TEXTES.recrutement;

  // Candidat embauché, parti ou refusé : le store referme la carte.
  if (!candidat) return null;

  const question = candidat.questionPosee === null ? null : candidat.questions[candidat.questionPosee];
  const complet = partie.personnel.length >= PERSONNEL_MAX;
  const reflechir = () => {
    ordonner({ type: 'reflechir', candidatId: candidat.id });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-entretien">
      <div className="carte-modale carte-large carte-entretien">
        <div className="carte-colonnes">
          <section>
            <p className="surtitre">{candidat.genre === 'f' ? r.titreCandidate : r.titreCandidat}</p>
            <div className="employe-entete">
              <Portrait personne={candidat} />
              <div>
                <h2 id="titre-entretien">
                  {candidat.prenom} <small>{TEXTES.personnel.ans(candidat.age)}</small>
                </h2>
                <p className="sous">{candidat.accroche}</p>
                <p className="sous laiton">{TEXTES.personnel.reve(nomAmbition(candidat))}</p>
              </div>
            </div>
            <p className="intro">{candidat.intro}</p>
            <Talents talents={candidat.talents} />
          </section>
          <section>
            <h3>{r.uneQuestion}</h3>
            {question ? (
              <>
                <p className="reponse">{question.reponse}</p>
                <p className="sous">
                  {r.traitRevele} <b className="tag">{question.trait}</b> {TRAITS[question.trait]}
                </p>
              </>
            ) : (
              candidat.questions.map((q, i) => (
                <button key={q.question} className="choix" onClick={() => ordonner({ type: 'questionCandidat', candidatId: candidat.id, question: i })}>
                  {q.question}
                </button>
              ))
            )}
            <h3>{r.proposition}</h3>
            {complet ? (
              <p className="sous negatif">{r.complet(PERSONNEL_MAX)}</p>
            ) : candidat.contreOffre !== null ? (
              <>
                <p className="sous">{r.contreOffre(candidat.prenom, Math.round(candidat.contreOffre * 100))}</p>
                <div className="boutons-ligne">
                  <button
                    className="bouton principal"
                    onClick={() => ordonner({ type: 'proposer', candidatId: candidat.id, part: candidat.contreOffre! })}
                  >
                    {r.accepterContre(Math.round(candidat.contreOffre * 100))}
                  </button>
                  {PARTS_PROPOSEES.filter((p) => p < candidat.contreOffre!).map((p) => (
                    <button key={p} className="choix-court" onClick={() => ordonner({ type: 'proposer', candidatId: candidat.id, part: p })}>
                      {r.proposer(Math.round(p * 100))}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="boutons-ligne" role="group" aria-label={r.proposition}>
                  {PARTS_PROPOSEES.map((p) => (
                    <button
                      key={p}
                      className="choix-court"
                      disabled={!question}
                      aria-label={r.proposerLabel(Math.round(p * 100))}
                      onClick={() => ordonner({ type: 'proposer', candidatId: candidat.id, part: p })}
                    >
                      {r.proposer(Math.round(p * 100))}
                    </button>
                  ))}
                </div>
                <p className="sous">{question ? r.detailsParts : r.propositionAvantQuestion}</p>
              </>
            )}
            <div className="boutons-ligne">
              <button className="bouton discret" onClick={reflechir}>
                {r.reflechir}
              </button>
              <button className="bouton discret" onClick={() => ordonner({ type: 'refuserCandidat', candidatId: candidat.id })}>
                {r.refuser}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
