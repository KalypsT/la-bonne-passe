import { ASSURANCES, EQUIPES } from '../content/balance';
import { TEXTES_EQUIPES as t } from '../content/equipes';
import type { EtatJeu } from '../engine/etat';
import { partReglee, type EquipeQuartier } from '../engine/equipes';
import { Cadenas } from './Icones';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

/** Équipes Accueil et Sécurité (palier 3), dans l'onglet Personnel : effectif de 0 au maximum, salaire, effet. */
export function EquipesQuartier({ partie }: { partie: EtatJeu }) {
  if (!partie.systemes.accueil && !partie.systemes.securite) {
    return (
      <>
        <h3>{t.titre}</h3>
        <p className="verrou-ligne">
          <Cadenas /> {t.accueil.nom}, {t.securite.nom.toLowerCase()} · {t.verrou}
        </p>
      </>
    );
  }
  return (
    <>
      <h3>{t.titre}</h3>
      <Equipe partie={partie} equipe="accueil" />
      <Equipe partie={partie} equipe="securite" />
    </>
  );
}

function Equipe({ partie, equipe }: { partie: EtatJeu; equipe: EquipeQuartier }) {
  const ordonner = useInterface((s) => s.ordonner);
  const n = partie.equipes[equipe];
  const textes = t[equipe];
  const max = EQUIPES[equipe].max;
  return (
    <section className="equipe">
      <b>{textes.nom}</b>
      <p className="sous">{textes.effectif(n)}</p>
      <p className="sous">{textes.role}</p>
      {n > 0 && <p className="sous positif">{t.regle(partReglee(partie, equipe))}</p>}
      <div className="boutons-ligne">
        <button className="bouton discret" disabled={n <= 0} onClick={() => ordonner({ type: 'equipeQuartier', equipe, effectif: n - 1 })}>
          {t.retirer}
        </button>
        <button className="bouton discret" disabled={n >= max} onClick={() => ordonner({ type: 'equipeQuartier', equipe, effectif: n + 1 })}>
          {t.ajouter}
        </button>
      </div>
      <JoseeLigne texte={textes.josee} />
    </section>
  );
}

/** Assurance (au premier lundi après le palier 3), dans l'onglet Finances : 3 crans, effet et avis de Josée. */
export function Assurance({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const a = t.assurance;
  if (!partie.systemes.assurance) {
    return partie.palier >= 3 ? (
      <p className="verrou-ligne">
        <Cadenas /> {a.titre} · {a.verrou}
      </p>
    ) : null;
  }
  const niveau = a.niveaux[partie.assurance] ?? a.niveaux[0]!;
  return (
    <>
      <h3>{a.titre}</h3>
      <div className="boutons-ligne" role="group" aria-label={a.titre}>
        {ASSURANCES.map((_, i) => (
          <button
            key={i}
            className={partie.assurance === i ? 'choix-court choisi' : 'choix-court'}
            aria-pressed={partie.assurance === i}
            onClick={() => ordonner({ type: 'assurance', niveau: i })}
          >
            {a.niveaux[i]!.nom}
          </button>
        ))}
      </div>
      <p className="sous">{niveau.effet}</p>
      <JoseeLigne texte={niveau.josee} />
    </>
  );
}
