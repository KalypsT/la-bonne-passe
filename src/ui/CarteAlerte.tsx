import { TEXTES_ALERTES } from '../content/alertes';
import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { instant } from '../engine/temps';
import { remplir } from './modeles';
import { useInterface } from './store';

/** Une alerte minutée : ce qui se passe, une ou deux façons d'y répondre, ou la laisser courir. */
export function CarteAlerte({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const cle = useInterface((s) => s.alerteOuverte);
  const alerte = partie.minuteries.find((m) => m.cle === cle);
  if (!alerte) return null;
  const t = TEXTES_ALERTES[alerte.id];
  const e = partie.personnel.find((x) => x.id === alerte.cible);
  const texte = (s: string) => remplir(s, partie, e);
  const client = alerte.id === 'presse' ? partie.file.find((c) => String(c.id) === alerte.cible) : undefined;
  const restant = client ? client.patience : Math.max(0, alerte.expire - instant(partie));
  const choisir = (action: number) => {
    ordonner({ type: 'traiterAlerte', cle: alerte.cle, action });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-alerte">
      <div className="carte-modale">
        <h2 id="titre-alerte">{texte(t.titre)}</h2>
        <p>{texte(t.texte)}</p>
        <p className="sous">{TEXTES.alerteCarte.restant(restant)}</p>
        {t.actions.map((a, i) => (
          <button key={a.texte} className="choix" onClick={() => choisir(i)}>
            {texte(a.texte)}
            <small>{texte(a.detail)}</small>
          </button>
        ))}
        <div className="carte-actions">
          <button className="bouton discret" onClick={() => ouvrirCarte(null)}>
            {TEXTES.alerteCarte.plusTard}
          </button>
        </div>
      </div>
    </div>
  );
}
