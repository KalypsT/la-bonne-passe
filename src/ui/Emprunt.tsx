import { useState } from 'react';
import { EMPRUNT, MENSUALITE } from '../content/balance';
import { TEXTES_BANQUE } from '../content/banque';
import { apercuEmprunt, avoirNet, capaciteEmprunt, echeancesEmprunts, refusEmprunt } from '../engine/banque';
import type { EtatJeu } from '../engine/etat';
import { projeter } from '../engine/semaine';
import { jourProchaineMensualite, prochainesMensualites } from '../engine/soiree';
import { formaterEuros, formaterTaux } from './format';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

const t = TEXTES_BANQUE.emprunt;

/** Nouvel emprunt, dans l'onglet Finances : montant par tranches, durée en 3 crans, effet et avis de Josée avant de signer. */
export function NouvelEmprunt({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const capacite = capaciteEmprunt(partie);
  const [montant, setMontant] = useState(Math.min(EMPRUNT.tranche, capacite));
  const [duree, setDuree] = useState<number>(EMPRUNT.durees[1]);

  if (!partie.systemes.emprunt) {
    return partie.palier >= 3 ? <p className="sous">{t.verrouille}</p> : null;
  }
  const choisi = Math.min(montant, capacite);
  const a = apercuEmprunt(partie, choisi, duree);
  const refus = refusEmprunt(partie, choisi, duree);

  // L'effet sur les 4 semaines à venir, sur la base de la dernière semaine.
  const base = partie.bilanSemaine?.resultatCourant;
  let projection: { sans: number; avec: number } | null = null;
  if (base !== undefined && choisi > 0) {
    const mensualites = prochainesMensualites(partie, 2);
    const echeances = echeancesEmprunts(partie);
    const nouvelles = Array.from({ length: duree }, (_, k) => ({ jour: a.premiere + k * 28, montant: a.mensualite }));
    const sans = projeter(partie, avoirNet(partie), base, mensualites, echeances).at(-1) ?? 0;
    const avec = projeter(partie, avoirNet(partie) + choisi, base, mensualites, [...echeances, ...nouvelles]).at(-1) ?? 0;
    projection = { sans, avec };
  }

  // Josée : ce qu'il faudra payer chaque mois, face à ce que la maison gagne.
  const j = TEXTES_BANQUE.joseeEmprunt;
  const chaqueMois =
    (jourProchaineMensualite(partie) !== null ? MENSUALITE : 0) + partie.banque.emprunts.reduce((s, e) => s + e.mensualite, 0) + a.mensualite;
  const avis =
    refus === 'josee'
      ? TEXTES_BANQUE.refusJosee
      : refus === 'retard'
      ? j.retard
      : base !== undefined && chaqueMois > base * 4
        ? j.trop
        : a.taux >= 7.5
          ? j.cher
          : duree === 24
            ? j.long
            : j.sage;

  return (
    <>
      <h3>{t.titre}</h3>
      <p className="sous">{t.detail}</p>
      {capacite === 0 ? (
        <p className="sous">{t.plafond}</p>
      ) : (
        <>
          <p className="sous">{t.montant}</p>
          <div className="boutons-ligne compteur" role="group" aria-label={t.montant}>
            <button
              className="choix-court"
              aria-label={t.moins}
              disabled={choisi <= EMPRUNT.tranche}
              onClick={() => setMontant(Math.max(EMPRUNT.tranche, choisi - EMPRUNT.tranche))}
            >
              −
            </button>
            <b className="compteur-valeur">{formaterEuros(choisi)}</b>
            <button
              className="choix-court"
              aria-label={t.plus}
              disabled={choisi + EMPRUNT.tranche > capacite}
              onClick={() => setMontant(Math.min(capacite, choisi + EMPRUNT.tranche))}
            >
              +
            </button>
          </div>
          <p className="sous">{t.duree}</p>
          <div className="boutons-ligne" role="group" aria-label={t.duree}>
            {EMPRUNT.durees.map((d) => (
              <button key={d} className={duree === d ? 'choix-court choisi' : 'choix-court'} aria-pressed={duree === d} onClick={() => setDuree(d)}>
                {t.mois(d)}
              </button>
            ))}
          </div>
          <p className="sous">
            <b>{t.apercu(formaterTaux(a.taux), formaterEuros(a.mensualite), formaterEuros(a.cout))}</b>
            <br />
            {t.derniere(a.premiere, a.derniere, Math.ceil(a.derniere / 28))}
            {projection && (
              <>
                <br />
                <span className={projection.avec < 0 ? 'negatif' : ''}>{t.projection(formaterEuros(projection.sans), formaterEuros(projection.avec))}</span>
              </>
            )}
          </p>
          <JoseeLigne texte={avis} />
          <button
            className="bouton principal pleine-largeur"
            disabled={refus !== null}
            onClick={() => ordonner({ type: 'emprunter', montant: choisi, duree })}
          >
            {t.signer(formaterEuros(choisi))}
          </button>
          <p className="sous">{t.capacite(formaterEuros(capacite))}</p>
        </>
      )}
      {partie.banque.emprunts.length > 0 && (
        <>
          <h3>{t.enCours}</h3>
          {partie.banque.emprunts.map((e) => (
            <p key={e.id} className="sous">
              {t.ligne(formaterEuros(e.montant), formaterTaux(e.taux), formaterEuros(e.mensualite), e.restantes)}
            </p>
          ))}
        </>
      )}
    </>
  );
}
