import { AGRANDISSEMENT, GERANTE, PALIER_5, PERSONNEL_MAX_AGRANDI } from '../content/balance';
import { LIEUX, TEXTES_AGRANDIR, type IdAgrandissement } from '../content/agrandir';
import type { Employe, EtatJeu } from '../engine/etat';
import { accepteGerance, gerante, optionsAgrandissement, peutDemanderPermis, peutPromouvoir } from '../engine/agrandir';
import { formaterEuros } from './format';
import { JoseeLigne } from './Josee';
import { useInterface } from './store';

const t = TEXTES_AGRANDIR;
const accord = (e: { genre: 'f' | 'm' }) => (e.genre === 'm' ? '' : 'e');

/** Dans la fiche de la mairie (onglet Relations) : le dossier du permis d'agrandir (palier 4 → 5). */
export function PermisMairie({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (partie.palier !== 4) return null;
  const p = t.permis;
  const statut = partie.permis.statut;
  return (
    <>
      <h3>{p.titre}</h3>
      <p className="sous">{p.detail(formaterEuros(PALIER_5.fraisDossier))}</p>
      {statut === 'depose' ? (
        <p className="statut">{p.depose}</p>
      ) : (
        <>
          {statut === 'refuse' && <p className="sous negatif">{p.refuse(PALIER_5.mairie)}</p>}
          {partie.reputation < PALIER_5.reputation && <p className="sous">{p.reputation(PALIER_5.reputation)}</p>}
          <button className="bouton principal pleine-largeur" disabled={!peutDemanderPermis(partie)} onClick={() => ordonner({ type: 'demanderPermis' })}>
            {p.deposer(formaterEuros(PALIER_5.fraisDossier))}
          </button>
        </>
      )}
      <JoseeLigne texte={p.josee} />
    </>
  );
}

/** Fiche du bâtiment voisin (palier 5) : ce qui se rachète, les travaux, ou la maison agrandie. */
export function FicheVoisin({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const a = t.agrandissement;
  const options = optionsAgrandissement(partie);
  const enCours = partie.agrandissement.enCours;
  return (
    <>
      <h2>{a.titre}</h2>
      <p className="sous">{a.detail}</p>
      {enCours && <p className="statut">{a.enCours(Math.floor(enCours.fin / 1440) + 1)}</p>}
      {!enCours && partie.agrandissement.achete.length > 0 && <p className="statut">{options.length > 0 ? a.etagesSeuls : a.fini}</p>}
      {options.map((id: IdAgrandissement) => {
        const def = AGRANDISSEMENT[id];
        return (
          <div key={id} className="option-voisin">
            <p className="sous">
              <b>{a.options[id].nom}</b> · {a.options[id].effet}
            </p>
            <button className="bouton principal pleine-largeur" disabled={partie.tresorerie < def.prix} onClick={() => ordonner({ type: 'agrandir', option: id })}>
              {a.acheter(a.options[id].nom, formaterEuros(def.prix), Math.round(def.heures / 24))}
            </button>
          </div>
        );
      })}
      {options.length > 0 && options.every((id) => partie.tresorerie < AGRANDISSEMENT[id].prix) && <p className="sous negatif">{a.tropCher}</p>}
      <p className="sous">{a.personnel(PERSONNEL_MAX_AGRANDI)}</p>
      <JoseeLigne texte={a.josee} />
    </>
  );
}

export function statutVoisin(partie: EtatJeu): string {
  const a = t.agrandissement;
  if (partie.agrandissement.enCours) return a.enCours(Math.floor(partie.agrandissement.enCours.fin / 1440) + 1);
  if (partie.agrandissement.achete.length > 0) return optionsAgrandissement(partie).length > 0 ? a.etagesSeuls : a.fini;
  return a.options.batiment.nom;
}

/** Dans la fiche d'une personne : la gérance (au lundi qui suit le palier 5). */
export function Gerance({ partie, employe }: { partie: EtatJeu; employe: Employe }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!partie.systemes.gerante) return null;
  const g = t.gerante;
  const actuelle = gerante(partie);
  if (actuelle && actuelle.id !== employe.id) return null;
  return (
    <>
      <h3>{g.titre}</h3>
      {actuelle ? (
        <>
          <p className="statut">{g.actuelle(employe.prenom, accord(employe))}</p>
          <ul className="liste-effets">
            {g.effets.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <button className="bouton discret pleine-largeur" onClick={() => ordonner({ type: 'retrograder' })}>
            {g.retour(employe.prenom)}
          </button>
        </>
      ) : (
        <>
          <p className="sous">{g.detail(formaterEuros(GERANTE.salaire))}</p>
          <ul className="liste-effets">
            {g.effets.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          {!peutPromouvoir(partie, employe.id) && <p className="sous">{g.conditions(GERANTE.nuitsMin)}</p>}
          <button className="bouton principal pleine-largeur" disabled={!peutPromouvoir(partie, employe.id)} onClick={() => ordonner({ type: 'promouvoir', employeId: employe.id })}>
            {g.promouvoir(employe.prenom, accord(employe))}
          </button>
          {peutPromouvoir(partie, employe.id) && !accepteGerance(employe) && <p className="sous">{g.hesite(employe.prenom)}</p>}
          <JoseeLigne texte={g.josee} />
        </>
      )}
    </>
  );
}

/** Dans la fiche du bureau : le projet d'une deuxième maison (deux lundis après le palier 5). */
export function DeuxiemeMaison({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  if (!partie.systemes.etablissement) return null;
  const m = partie.etablissement;
  const e = t.etablissement;
  const lieu = (id: string | null) => LIEUX.find((l) => l.id === id);
  const choisi = lieu(m.lieu);
  const offreChoisie = m.offres.find((o) => o.id === m.lieu);
  return (
    <>
      <h3>{e.titre}</h3>
      {m.statut === 'offres' ? (
        <>
          <p className="sous">{e.detail}</p>
          {m.offres.map((o) => {
            const def = lieu(o.id);
            if (!def) return null;
            return (
              <div key={o.id} className="lieu">
                <p className="sous">
                  <b>{def.nom}</b> · {e.lieu(def.quartier, def.chambres)}
                  <br />
                  {def.description} {e.clientele[def.segment]}
                  <br />
                  {e.prix(formaterEuros(o.achat), formaterEuros(o.travaux), o.jours)}
                </p>
                <button className="bouton discret pleine-largeur" disabled={partie.tresorerie < o.achat} onClick={() => ordonner({ type: 'signerLieu', lieu: o.id })}>
                  {partie.tresorerie < o.achat ? e.tropCher : e.signer(formaterEuros(o.achat))}
                </button>
              </div>
            );
          })}
        </>
      ) : (
        choisi &&
        offreChoisie && (
          <>
            <p className="statut">{e.signe(choisi.nom, choisi.quartier)}</p>
            {m.statut === 'signe' && (
              <button
                className="bouton principal pleine-largeur"
                disabled={partie.tresorerie < offreChoisie.travaux}
                onClick={() => ordonner({ type: 'lancerTravauxEtablissement' })}
              >
                {e.lancer(formaterEuros(offreChoisie.travaux), offreChoisie.jours)}
              </button>
            )}
            {m.statut === 'travaux' && <p className="sous">{e.enTravaux(m.fin)}</p>}
            {m.statut === 'pret' && <p className="sous positif">{e.pret}</p>}
          </>
        )
      )}
      <JoseeLigne texte={e.josee} />
    </>
  );
}
