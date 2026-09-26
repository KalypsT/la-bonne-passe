import { EVENEMENTS_QUARTIER } from '../content/quartier';
import { useState } from 'react';
import { trouverIntrigue } from '../content/intrigues';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { choixPossibles } from '../engine/intrigues';
import { texteEvenement } from './journal';
import { remplir } from './modeles';
import { Portrait } from './Panneau';
import { useInterface } from './store';

/** Ce que la carte montre une fois le choix fait : son issue, et le dénouement si l'histoire s'achève. */
interface Resultat {
  titre: string;
  issue: string | null;
  denouement: string | null;
}

/** Une étape d'intrigue : 2 ou 3 choix, en pause. Après le choix, la carte raconte ce qui s'est passé. */
export function CarteIntrigue({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const t = TEXTES.intrigue;

  if (resultat) {
    return (
      <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-intrigue">
        <div className="carte-modale">
          <h2 id="titre-intrigue" className="titre-neon">
            {resultat.titre}
          </h2>
          {resultat.issue && <p>{resultat.issue}</p>}
          {resultat.denouement && (
            <>
              <h3>{t.denouement}</h3>
              <p>{resultat.denouement}</p>
            </>
          )}
          <div className="carte-actions fin">
            <button
              className="bouton principal"
              onClick={() => {
                // Une autre carte d'intrigue peut suivre : on repart d'une carte vierge.
                setResultat(null);
                ouvrirCarte(null);
              }}
            >
              {t.continuer}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const active = partie.intrigues.actives.find((a) => a.id === partie.intrigues.carte);
  const def = active && trouverIntrigue(active.id);
  const etape = active && def?.etapes[active.etape];
  if (!active || !def || !etape) return null;
  const e = partie.personnel.find((x) => x.id === active.employeId);
  const texte = (s: string) => remplir(s, partie, e);
  const possibles = choixPossibles(partie);

  const choisir = (choix: number) => {
    ordonner({ type: 'choixIntrigue', choix });
    const apres = useInterface.getState().partie;
    if (!apres) return ouvrirCarte(null);
    // Les dernières lignes du journal racontent l'issue du choix, et le dénouement s'il y en a un.
    const recentes = apres.journal.slice(0, 4).map((l) => l.evenement);
    const tranchee = recentes.find((x) => x.type === 'intrigueTranchee' && x.id === active.id);
    const finie = recentes.find((x) => x.type === 'intrigueFinie' && x.id === active.id);
    setResultat({
      titre: texte(etape.titre),
      issue: tranchee ? texteEvenement(tranchee, apres) : null,
      denouement: finie ? texteEvenement(finie, apres) : null,
    });
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-intrigue">
      <div className="carte-modale">
        {EVENEMENTS_QUARTIER.some((q) => q.id === def.id) ? (
          <p className="sous etiquette-intrigue">{t.quartier}</p>
        ) : (
          def.titre !== etape.titre && <p className="sous etiquette-intrigue">{t.etiquette(texte(def.titre))}</p>
        )}
        <h2 id="titre-intrigue" className="titre-neon">
          {texte(etape.titre)}
        </h2>
        {e ? (
          <div className="intrigue-personne">
            <Portrait personne={e} petit />
            <p>{texte(etape.texte)}</p>
          </div>
        ) : (
          <p>{texte(etape.texte)}</p>
        )}
        {etape.choix.map((c, i) => (
          <button key={c.texte} className="choix" disabled={possibles[i] === false} onClick={() => choisir(i)}>
            {texte(c.texte)}
            <small>{possibles[i] === false ? t.tropCher : texte(c.detail)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
