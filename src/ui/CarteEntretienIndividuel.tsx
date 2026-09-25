import { REPLIQUES, REPONSES, type Humeur } from '../content/entretiens';
import { SEUIL_MORAL_BAS } from '../content/balance';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import type { ReponseEntretien } from '../engine/personnel';
import { remplir } from './modeles';
import { Portrait } from './Panneau';
import { useInterface } from './store';

function humeur(moral: number): Humeur {
  return moral < SEUIL_MORAL_BAS + 10 ? 'basse' : moral < 70 ? 'moyenne' : 'haute';
}

/** Entretien individuel : la personne parle selon son humeur, trois réponses possibles. En pause. */
export function CarteEntretienIndividuel({ partie }: { partie: EtatJeu }) {
  const id = useInterface((s) => s.employeOuvert);
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const employe = partie.personnel.find((e) => e.id === id);
  if (!employe) return null;
  const su = TEXTES.suivi;
  const repliques = REPLIQUES[humeur(employe.moral)];
  // La réplique change d'un jour à l'autre, sans tirage : on reste en dehors du moteur.
  const replique = repliques[(partie.jour + employe.prenom.length) % repliques.length] ?? '';
  const repondre = (reponse: ReponseEntretien) => {
    ordonner({ type: 'entretienIndividuel', employeId: employe.id, reponse });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-entretien-individuel">
      <div className="carte-modale">
        <div className="employe-entete">
          <Portrait personne={employe} />
          <div>
            <h2 id="titre-entretien-individuel">{su.titreEntretien(employe.prenom)}</h2>
            <p className="sous">
              {TEXTES.personnel.moral} {Math.round(employe.moral)} % · {TEXTES.personnel.loyaute.toLowerCase()} {Math.round(employe.loyaute)} %
            </p>
          </div>
        </div>
        <p className="replique">{remplir(replique, partie, employe)}</p>
        {(Object.keys(REPONSES) as ReponseEntretien[]).map((r) => (
          <button key={r} className="choix" onClick={() => repondre(r)}>
            {REPONSES[r].texte}
            <small>{remplir(REPONSES[r].detail, partie, employe)}</small>
          </button>
        ))}
        <div className="carte-actions fin">
          <button className="bouton discret" onClick={() => ouvrirCarte(null)}>
            {su.fermer}
          </button>
        </div>
      </div>
    </div>
  );
}
