import { BAR_MAX, LIVRAISON_EXPRESS_BAR, RENOVATION_BAR, SALAIRE_BAR, SEUIL_BAR } from '../content/balance';
import { PALIERS } from '../content/paliers';
import { TEXTES } from '../content/textes';
import { barSert } from '../engine/bar';
import { comptesDeLaNuit } from '../engine/comptes';
import type { EtatJeu } from '../engine/etat';
import { heureDeInstant } from '../engine/temps';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
import { useInterface } from './store';

const t = TEXTES.bar;

/** Ce que dit la ligne du bar dans l'onglet Maison. */
export function etatDuBar(partie: EtatJeu): string {
  const b = partie.bar;
  if (b.travaux !== null) return TEXTES.panneau.travaux;
  if (!b.ouvert) return TEXTES.panneau.sousDraps;
  if (partie.equipes.bar === 0) return t.sansEquipe;
  return `${barSert(partie) ? t.ouvert : t.vide} · ${t.bouteilles(Math.floor(b.stock))}`;
}

/** Fiche du bar : rénovation, puis équipe, stock et recette. */
export function FicheBar({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const b = partie.bar;
  const recetteBar = comptesDeLaNuit(partie)?.recettes.bar ?? 0;

  if (!partie.systemes.bar) {
    const p = PALIERS.find((x) => x.numero === 2)!;
    return (
      <p className="verrou-ligne">
        <Cadenas /> {TEXTES.panneau.barVerrouille(p.numero, p.nom)}
      </p>
    );
  }

  if (b.travaux !== null) return <p className="statut">{t.travaux(formaterHeure(heureDeInstant(b.travaux)))}</p>;

  if (!b.ouvert) {
    const assez = partie.tresorerie >= RENOVATION_BAR.prix;
    return (
      <>
        <button className="bouton principal pleine-largeur" disabled={!assez} onClick={() => ordonner({ type: 'renoverBar' })}>
          {t.renover(formaterEuros(RENOVATION_BAR.prix), RENOVATION_BAR.heures)}
        </button>
        <p className={assez ? 'sous' : 'sous negatif'}>{assez ? t.renoverDetail : t.renoverTropCher(formaterEuros(RENOVATION_BAR.prix))}</p>
      </>
    );
  }

  const n = partie.equipes.bar;
  const stock = Math.floor(b.stock);
  return (
    <>
      <p className="statut">{n === 0 ? t.sansEquipe : barSert(partie) ? t.sert : t.vide}</p>
      <h3>{t.stock}</h3>
      <p className={stock < SEUIL_BAR ? 'sous negatif' : 'sous'}>
        {t.bouteilles(stock)}
        {b.commande > 0 && ` · ${TEXTES.bar.bouteilles(b.commande)} en commande`}
      </p>
      <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'livraisonBar' })}>
        {t.livraison(LIVRAISON_EXPRESS_BAR.bouteilles, formaterEuros(LIVRAISON_EXPRESS_BAR.prix))}
      </button>
      <h3>{t.equipe}</h3>
      <p className="sous">{t.effectif(n, formaterEuros(SALAIRE_BAR))}</p>
      <div className="boutons-ligne">
        <button className="bouton discret" disabled={n <= 0} onClick={() => ordonner({ type: 'equipeBar', effectif: n - 1 })}>
          {t.separer}
        </button>
        <button className="bouton discret" disabled={n >= BAR_MAX} onClick={() => ordonner({ type: 'equipeBar', effectif: n + 1 })}>
          {t.embaucher}
        </button>
      </div>
      <p className="sous">{t.equipeAide}</p>
      {recetteBar > 0 && (
        <>
          <h3>{t.recette}</h3>
          <p className="sous">{formaterEuros(recetteBar)}</p>
        </>
      )}
      <p className="sous">{t.recetteDetail}</p>
    </>
  );
}
