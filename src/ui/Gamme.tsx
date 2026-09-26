import { useState } from 'react';
import { MENSUALITE, NOUVELLE_ENSEIGNE, PLACEMENT } from '../content/balance';
import { TEXTES_GAMME } from '../content/gamme';
import { LIMITES_NOMS } from '../content/partie';
import { TEXTES } from '../content/textes';
import type { EtatChambre, EtatJeu } from '../engine/etat';
import { fourchettePlacement, prixFormation, prochainConfort, type EquipeFormable } from '../engine/gamme';
import { validerNomMaison } from '../engine/identite';
import { jourProchaineMensualite } from '../engine/soiree';
import { heureDeInstant } from '../engine/temps';
import { formaterEuros, formaterHeure } from './format';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

const t = TEXTES_GAMME;

/** Dans la fiche d'une chambre ouverte : son niveau de confort, et le suivant (palier 4). */
export function ConfortChambre({ partie, chambre }: { partie: EtatJeu; chambre: EtatChambre }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!chambre.ouverte) return null;
  const c = t.confort;
  if (!partie.systemes.confort) return <p className="sous">{c.verrou}</p>;
  const suivant = prochainConfort(chambre);
  const occupee = partie.rendezVous.some((r) => r.chambreId === chambre.id);
  return (
    <>
      <h3>{c.titre}</h3>
      <p className="sous">
        <b>
          {c.niveaux[chambre.confort - 1]} · {c.niveau(chambre.confort)}
        </b>
        <br />
        {c.effet}
      </p>
      {chambre.confortAVenir !== null && chambre.travaux !== null && (
        <p className="statut">
          {c.enCours(c.niveaux[chambre.confortAVenir - 1] ?? '')} {formaterHeure(heureDeInstant(chambre.travaux))}
        </p>
      )}
      {chambre.travaux === null &&
        (suivant ? (
          <button
            className="bouton discret pleine-largeur"
            disabled={occupee || partie.tresorerie < suivant.prix}
            onClick={() => ordonner({ type: 'ameliorerConfort', chambreId: chambre.id })}
          >
            {c.ameliorer(c.niveaux[suivant.niveau - 1] ?? '', formaterEuros(suivant.prix), suivant.heures)}
          </button>
        ) : (
          <p className="sous">{chambre.confort >= 3 ? c.maximum : c.jacuzziPremium}</p>
        ))}
    </>
  );
}

/** Le niveau d'une équipe et sa prochaine formation (au lundi qui suit le palier 4). */
export function Formation({ partie, equipe }: { partie: EtatJeu; equipe: EquipeFormable }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!partie.systemes.formations) return null;
  const f = t.formation;
  const niveau = partie.niveauxEquipes[equipe];
  const prix = prixFormation(partie, equipe);
  return (
    <div className="formation">
      <p className="sous">
        <b>{f.niveau(niveau)}</b> · {f.effets[equipe]}
      </p>
      {prix === null ? (
        <p className="sous">{f.maximum}</p>
      ) : (
        <button className="bouton discret pleine-largeur" disabled={partie.tresorerie < prix} onClick={() => ordonner({ type: 'former', equipe })}>
          {f.former(niveau + 1, formaterEuros(prix))}
        </button>
      )}
    </div>
  );
}

/** Placement de l'excédent (deuxième lundi après le palier 4), dans l'onglet Finances. */
export function PlacementExcedent({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const [montant, setMontant] = useState<number>(PLACEMENT.montants[0]);
  const [profil, setProfil] = useState<'prudent' | 'risque'>('prudent');
  if (!partie.systemes.placement) return null;
  const p = t.placement;
  const echeance = partie.jour + PLACEMENT.jours;
  const f = fourchettePlacement(partie, montant);
  const mensualite = jourProchaineMensualite(partie);
  const tropPres = mensualite !== null && mensualite <= echeance && partie.tresorerie + partie.reserve - montant < MENSUALITE;
  return (
    <>
      <h3>{p.titre}</h3>
      <p className="sous">{p.detail}</p>
      {partie.placement ? (
        <p className="statut">
          {p.enCours(formaterEuros(partie.placement.montant), partie.placement.profil === 'prudent' ? p.prudent : p.risque, partie.placement.echeance)}
        </p>
      ) : partie.gestionJosee ? (
        <p className="sous">{p.josee}</p>
      ) : (
        <>
          <div className="boutons-ligne" role="group" aria-label={p.montant}>
            {PLACEMENT.montants.map((m) => (
              <button key={m} className={montant === m ? 'choix-court choisi' : 'choix-court'} aria-pressed={montant === m} onClick={() => setMontant(m)}>
                {formaterEuros(m)}
              </button>
            ))}
          </div>
          <div className="boutons-ligne" role="group" aria-label={p.titre}>
            {(['prudent', 'risque'] as const).map((x) => (
              <button key={x} className={profil === x ? 'choix-court choisi' : 'choix-court'} aria-pressed={profil === x} onClick={() => setProfil(x)}>
                {x === 'prudent' ? p.prudent : p.risque}
              </button>
            ))}
          </div>
          <p className="sous">
            {profil === 'prudent'
              ? p.apercuPrudent(formaterEuros(f.prudent), echeance)
              : p.apercuRisque(formaterEuros(f.min), formaterEuros(f.max), echeance)}
          </p>
          <JoseeLigne texte={tropPres ? p.joseeTrop : profil === 'prudent' ? p.joseePrudent : p.joseeRisque} />
          <button
            className="bouton principal pleine-largeur"
            disabled={partie.tresorerie < montant}
            onClick={() => ordonner({ type: 'placer', montant, profil })}
          >
            {partie.tresorerie < montant ? p.tropCher : p.placer(formaterEuros(montant))}
          </button>
        </>
      )}
    </>
  );
}

/** Changer le nom de la maison (palier 4), dans la fiche du bureau. */
export function RenommerMaison({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const [nom, setNom] = useState('');
  if (!partie.systemes.renommer) return null;
  const r = t.renommer;
  const erreur = nom.trim() ? validerNomMaison(nom) : null;
  const possible = nom.trim() !== '' && erreur === null && partie.tresorerie >= NOUVELLE_ENSEIGNE;
  return (
    <>
      <h3>{r.titre}</h3>
      <p className="sous">{r.detail(formaterEuros(NOUVELLE_ENSEIGNE))}</p>
      <label className="champ">
        <span>{r.placeholder}</span>
        <input
          value={nom}
          maxLength={LIMITES_NOMS.maison + 4}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={erreur !== null}
          onChange={(e) => setNom(e.target.value)}
        />
        {erreur && <em className="erreur">{erreur === 'long' ? TEXTES.creation.erreurs.maison.long(LIMITES_NOMS.maison) : TEXTES.creation.erreurs.maison[erreur]}</em>}
      </label>
      <button
        className="bouton principal pleine-largeur"
        disabled={!possible}
        onClick={() => {
          ordonner({ type: 'renommerMaison', nom });
          setNom('');
        }}
      >
        {r.valider(formaterEuros(NOUVELLE_ENSEIGNE))}
      </button>
      <JoseeLigne texte={r.josee} />
    </>
  );
}
