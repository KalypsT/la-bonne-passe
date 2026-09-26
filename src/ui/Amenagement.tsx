import { BUANDERIE, CHANGER_DECOR, LOGES, RAFRAICHIR } from '../content/balance';
import { TEXTES_AMENAGEMENT } from '../content/amenagement';
import { ANNEXES, DECORS, ORDRE_DECORS } from '../content/maison';
import { PALIERS } from '../content/paliers';
import type { IdAnnexe } from '../engine/amenagement';
import type { EtatChambre, EtatJeu } from '../engine/etat';
import { heureDeInstant } from '../engine/temps';
import { formaterEuros, formaterHeure } from './format';
import { Cadenas } from './Icones';
import { useInterface } from './store';

const t = TEXTES_AMENAGEMENT;

/** Dans la fiche d'une chambre ouverte : décor, rafraîchir, refaire le décor, fermer pour l'instant (v0.6). */
export function AmenagementChambre({ partie, chambre }: { partie: EtatJeu; chambre: EtatChambre }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!chambre.ouverte) return null;
  const decor = DECORS[chambre.decor];
  const occupee = partie.rendezVous.some((r) => r.chambreId === chambre.id);
  const enTravaux = chambre.travaux !== null;
  const possible = (prix: number) => partie.systemes.renovation && !occupee && !enTravaux && partie.tresorerie >= prix;
  return (
    <>
      <h3>{t.decor}</h3>
      <p className="sous">
        <b>{t.decorActuel(decor.nom, chambre.decorRefait)}</b>
        <br />
        {chambre.decorRefait ? t.plaitRefait(decor.plait) : t.plaitAncien}
      </p>
      {enTravaux && chambre.travaux !== null && (
        <p className="statut">
          {chambre.decorAVenir ? t.decorEnCours(DECORS[chambre.decorAVenir].nom) : ''} {t.travauxFin(formaterHeure(heureDeInstant(chambre.travaux)))}
        </p>
      )}
      {partie.systemes.renovation && !enTravaux && (
        <>
          <button className="bouton discret pleine-largeur" disabled={!possible(RAFRAICHIR.prix) || chambre.etat >= 100} onClick={() => ordonner({ type: 'rafraichir', chambreId: chambre.id })}>
            {t.rafraichir(formaterEuros(RAFRAICHIR.prix), RAFRAICHIR.heures)}
          </button>
          <p className="sous">{occupee ? t.occupee : t.rafraichirDetail}</p>
          <p className="sous">{t.refaire(formaterEuros(CHANGER_DECOR.prix), CHANGER_DECOR.heures)}</p>
          <div className="grille-decors" role="group" aria-label={t.decor}>
            {ORDRE_DECORS.map((d) => {
              const deja = d === chambre.decor && chambre.decorRefait;
              return (
                <button
                  key={d}
                  className={d === chambre.decor ? 'choix-court choisi' : 'choix-court'}
                  aria-pressed={d === chambre.decor}
                  disabled={deja || !possible(CHANGER_DECOR.prix)}
                  onClick={() => ordonner({ type: 'changerDecor', chambreId: chambre.id, decor: d })}
                >
                  {DECORS[d].nom}
                </button>
              );
            })}
          </div>
          <p className="sous">{partie.tresorerie < CHANGER_DECOR.prix ? t.tropCher(formaterEuros(CHANGER_DECOR.prix)) : t.refaireDetail}</p>
        </>
      )}
      {!enTravaux && (
        <>
          <button
            className="bouton discret pleine-largeur"
            disabled={!chambre.fermee && occupee}
            onClick={() => ordonner({ type: 'fermerChambre', chambreId: chambre.id, fermee: !chambre.fermee })}
          >
            {chambre.fermee ? t.rouvrir : t.fermer}
          </button>
          <p className="sous">{t.fermerDetail}</p>
        </>
      )}
    </>
  );
}

export function statutAnnexe(partie: EtatJeu, id: IdAnnexe): string {
  const a = partie.annexes[id];
  if (a.ouverte) return id === 'buanderie' ? t.linge(partie.linge, partie.annexes.buanderie.sale) : t.annexeOuverte;
  if (a.travaux !== null) return t.annexeTravaux;
  return t.annexeFermee;
}

/** Fiche des loges ou de la buanderie : à aménager, en travaux, ou en service. */
export function FicheAnnexe({ partie, id }: { partie: EtatJeu; id: IdAnnexe }) {
  const ordonner = useInterface((s) => s.ordonner);
  const def = ANNEXES[id];
  const a = partie.annexes[id];
  const prix = id === 'loges' ? LOGES : BUANDERIE;
  const palier = PALIERS.find((p) => p.numero === (id === 'loges' ? 3 : 2))!;
  return (
    <>
      <h2>{def.nom}</h2>
      <p className="sous">{a.ouverte ? def.descriptionOuverte : def.description}</p>
      <h3>{t.effet}</h3>
      <p className="sous">{def.effet}</p>
      {a.ouverte && id === 'buanderie' && <p className="statut">{t.linge(partie.linge, partie.annexes.buanderie.sale)}</p>}
      {a.ouverte && id === 'loges' && <p className="statut">{t.annexeOuverte}</p>}
      {!a.ouverte && a.travaux !== null && <p className="statut">{t.travauxFin(formaterHeure(heureDeInstant(a.travaux)))}</p>}
      {!a.ouverte && a.travaux === null && !partie.systemes[id] && (
        <p className="verrou-ligne">
          <Cadenas /> {t.verrou(palier.numero, palier.nom)}
        </p>
      )}
      {!a.ouverte && a.travaux === null && partie.systemes[id] && (
        <>
          <button className="bouton principal pleine-largeur" disabled={partie.tresorerie < prix.prix} onClick={() => ordonner({ type: 'renoverAnnexe', annexe: id })}>
            {t.renover(formaterEuros(prix.prix), prix.heures)}
          </button>
          {partie.tresorerie < prix.prix && <p className="sous negatif">{t.tropCher(formaterEuros(prix.prix))}</p>}
        </>
      )}
    </>
  );
}
