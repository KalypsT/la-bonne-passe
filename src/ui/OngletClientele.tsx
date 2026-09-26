import { useState } from 'react';
import { BUDGET_CLIENTS, PATIENCE_CLIENT, PRIX_ECART, PRIX_MIN, SEUILS_HUMEUR } from '../content/balance';
import { CLIENTS, INFOS_SEGMENTS, OFFRES, SEGMENTS, SEGMENTS_A_VENIR, type Segment } from '../content/clientele';
import { TALENTS } from '../content/personnel';
import { trouverTendance } from '../content/tendances';
import { TEXTES_FORMULES, TEXTES_PRIORITES, TEXTES_SELECTIONS, TEXTES_TARIFS, TEXTES_VISIBILITES, type TexteOption } from '../content/regles';
import { TEXTES } from '../content/textes';
import { frequentation, segmentsOuverts } from '../engine/clientele';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';
import { Cadenas } from './Icones';
import { Jauge } from './Jauge';
import { JoseeLigne } from './Josee';
import type { OrdreRegle } from '../engine/regles';
import { useInterface } from './store';

const t = TEXTES.clientele;

/** Onglet Clientèle (palier 2) : la satisfaction de chaque segment, qui compose la réputation. */
export function OngletClientele({ partie }: { partie: EtatJeu }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const cumul = frequentation(partie);
  const nuits = partie.clientele.historique.length;
  return (
    <>
      <div className="encart-reputation">
        <b>{t.reputation(Math.floor(partie.reputation))}</b>
        <span>{t.reputationDetail}</span>
      </div>
      {partie.systemes.tarifs && (
        <button className="ligne ligne-regles" onClick={() => ouvrirFiche({ type: 'regles', id: 'regles' })}>
          <span>{t.regles}</span>
          <small>{resumeRegles(partie)}</small>
        </button>
      )}
      {partie.systemes.tendances && (
        <div className="encart-tendances">
          <span>{TEXTES.semaine.tendances}</span>
          {partie.semaine.tendances.length === 0 && <span>{TEXTES.semaine.aucuneTendance}</span>}
          {partie.semaine.tendances.flatMap((id) => trouverTendance(id) ?? []).map((td) => (
            <div key={td.id}>
              <b>{td.nom}</b>
              <span> · {td.texte}</span>
            </div>
          ))}
        </div>
      )}
      <h3>{t.segments}</h3>
      {segmentsOuverts(partie).map((s) => {
        const valeur = partie.clientele.satisfaction[s];
        const ecart = valeur - partie.clientele.satisfactionOuverture[s];
        return (
          <button
            key={s}
            className="ligne ligne-segment"
            aria-label={`${SEGMENTS[s]}, ${t.satisfaction.toLowerCase()} ${Math.round(valeur)}`}
            onClick={() => ouvrirFiche({ type: 'segment', id: s })}
          >
            <span className="ligne-segment-haut">
              <span>{SEGMENTS[s]}</span>
              <span>
                <b>{Math.round(valeur)}</b>{' '}
                <small className={ecart <= -0.5 ? 'negatif' : ecart >= 0.5 ? 'positif' : ''}>{t.ecart(ecart)}</small>
              </span>
            </span>
            <span className={valeur < SEUILS_HUMEUR[0] ? 'jauge-barre basse' : 'jauge-barre'}>
              <i style={{ width: `${Math.max(0, Math.min(100, valeur))}%` }} />
            </span>
            <small>{nuits > 0 ? t.frequentation(cumul.servis[s], cumul.perdus[s]) : t.aucuneNuit}</small>
          </button>
        );
      })}
      <p className="sous">{t.ecartDetail}{nuits > 0 ? ` · ${t.frequentationDetail(nuits)}` : ''}</p>
      <h3>{t.aVenir}</h3>
      {SEGMENTS_A_VENIR.map((a) => (
        <p key={a.nom} className="verrou-ligne">
          <Cadenas /> {a.nom} · {t.aVenirDetail(a.palier)}
        </p>
      ))}
    </>
  );
}

/** Fiche d'un segment : ce qu'il attend, ce qui le fâche, ce qui l'attire, et son humeur. */
export function FicheSegment({ partie, id }: { partie: EtatJeu; id: Segment }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const info = INFOS_SEGMENTS[id];
  const clients = CLIENTS.filter((c) => c.segment === id);
  const budgets = clients.map((c) => c.budget * BUDGET_CLIENTS);
  const talents = [...new Set(clients.map((c) => TALENTS[c.attend].toLowerCase()))].join(', ');
  const patiences = clients.map((c) => c.patience ?? PATIENCE_CLIENT);
  const patience = Math.round(patiences.reduce((a, b) => a + b, 0) / Math.max(1, patiences.length));
  const satisfaction = partie.clientele.satisfaction[id];
  const humeur = info.humeurs[satisfaction < SEUILS_HUMEUR[0] ? 0 : satisfaction < SEUILS_HUMEUR[1] ? 1 : 2];
  const offres = OFFRES.filter((o) => (o.attire[id] ?? 1) > 1);
  // Le prix varie avec la qualité : on montre la fourchette des clients du segment.
  const min = Math.round((Math.min(...budgets) * PRIX_MIN) / 5) * 5;
  const max = Math.round((Math.max(...budgets) * (PRIX_MIN + PRIX_ECART)) / 5) * 5;

  return (
    <div className="fiche">
      <button className="retour" onClick={() => ouvrirFiche(null)}>
        {TEXTES.panneau.retour}
      </button>
      <h2>{SEGMENTS[id]}</h2>
      <Jauge nom={t.satisfaction} valeur={satisfaction} alerte={satisfaction < SEUILS_HUMEUR[0]} />
      <p className="avis">« {humeur} »</p>
      <h3>{t.budget}</h3>
      <p className="sous">{t.budgetDetail(formaterEuros(min), formaterEuros(max))}</p>
      <h3>{t.attend}</h3>
      <p className="sous">{info.attend}</p>
      <p className="sous">{t.talents(talents)}</p>
      <h3>{t.sensible}</h3>
      <p className="sous">{info.sensible}</p>
      <p className="sous">{t.patience(patience)}</p>
      <h3>{t.attire}</h3>
      {offres.length === 0 && !info.attire && <p className="sous">{t.rienDeSpecial}</p>}
      {offres.map((o) => (
        <p key={o.id} className="sous">
          {t.offreAttire(o.nom)}
        </p>
      ))}
      {info.attire && <p className="sous">{info.attire}</p>}
    </div>
  );
}

type CleRegle = 'tarif' | 'formule' | 'selection' | 'priorite' | 'visibilite';

/** Fiche des règles de la maison : 4 réglages en 3 crans, effet affiché, avis de Josée. */
export function FicheRegles({ partie }: { partie: EtatJeu }) {
  const ouvrirFiche = useInterface((s) => s.ouvrirFiche);
  const ordonner = useInterface((s) => s.ordonner);
  const [derniere, setDerniere] = useState<CleRegle>('tarif');
  const r = partie.regles;
  const groupes: { cle: CleRegle; titre: string; options: { valeur: number | string; texte: TexteOption }[]; actuelle: number | string }[] = [
    { cle: 'tarif', titre: t.tarif, options: TEXTES_TARIFS.map((texte, valeur) => ({ valeur, texte })), actuelle: r.tarif },
    { cle: 'formule', titre: t.formule, options: entrees(TEXTES_FORMULES), actuelle: r.formule },
    { cle: 'selection', titre: t.selection, options: entrees(TEXTES_SELECTIONS), actuelle: r.selection },
    { cle: 'priorite', titre: t.priorite, options: entrees(TEXTES_PRIORITES), actuelle: r.priorite },
    ...(partie.systemes.visibilite
      ? [{ cle: 'visibilite' as const, titre: t.visibilite, options: entrees(TEXTES_VISIBILITES), actuelle: r.visibilite }]
      : []),
  ];
  const choisir = (cle: CleRegle, valeur: number | string) => {
    setDerniere(cle);
    ordonner({ type: 'regle', regle: cle, valeur } as OrdreRegle);
  };
  const commentee = groupes.find((g) => g.cle === derniere)!;

  return (
    <div className="fiche">
      <button className="retour" onClick={() => ouvrirFiche(null)}>
        {TEXTES.panneau.retour}
      </button>
      <h2>{t.regles}</h2>
      <p className="sous">{t.reglesAide}</p>
      {groupes.map((g) => (
        <section key={g.cle}>
          <h3>{g.titre}</h3>
          <div className={g.options.length > 3 ? 'boutons-ligne quatre' : 'boutons-ligne'} role="group" aria-label={g.titre}>
            {g.options.map((o) => (
              <button
                key={String(o.valeur)}
                className={g.actuelle === o.valeur ? 'choix-court choisi' : 'choix-court'}
                aria-pressed={g.actuelle === o.valeur}
                aria-label={o.texte.nom}
                disabled={o.valeur === 'champagne' && !partie.bar.ouvert}
                onClick={() => choisir(g.cle, o.valeur)}
              >
                {o.texte.court}
              </button>
            ))}
          </div>
          <p className="sous">{g.options.find((o) => o.valeur === g.actuelle)?.texte.effet}</p>
        </section>
      ))}
      <JoseeLigne texte={commentee.options.find((o) => o.valeur === commentee.actuelle)?.texte.josee ?? ''} />
    </div>
  );
}

function entrees<K extends string>(textes: Record<K, TexteOption>): { valeur: K; texte: TexteOption }[] {
  return (Object.keys(textes) as K[]).map((valeur) => ({ valeur, texte: textes[valeur] }));
}

/** Résumé des règles en vigueur, pour l'onglet et le briefing. */
export function resumeRegles(partie: EtatJeu): string {
  const r = partie.regles;
  return t.reglesResume(
    TEXTES_TARIFS[r.tarif]?.nom ?? '',
    TEXTES_FORMULES[r.formule].nom,
    TEXTES_SELECTIONS[r.selection].nom,
    TEXTES_PRIORITES[r.priorite].nom,
  );
}
