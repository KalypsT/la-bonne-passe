import { useState } from 'react';
import { TEXTES_BANQUE } from '../content/banque';
import { TEXTES } from '../content/textes';
import { VERSION_JEU } from '../content/version';
import { AVERTISSEMENT_TITRE, TEXTES_FIN } from '../content/fin';
import type { Emplacement } from '../save/emplacements';
import { Avatar } from '../scene/Avatar';
import { EnseigneNeon } from '../scene/EnseigneNeon';
import { ConfirmationSuppression } from './ConfirmationSuppression';
import { actualiserJeu, choisirFichier } from './fichiers';
import { OptionsEmplacement } from './OptionsEmplacement';
import { formaterDernierePartie, formaterEuros, formaterHeure } from './format';
import { useInterface } from './store';

export function EcranTitre() {
  const emplacements = useInterface((s) => s.emplacements);
  const suppressionDemandee = useInterface((s) => s.suppressionDemandee);
  const avisTitre = useInterface((s) => s.avisTitre);
  const optionsOuvertes = useInterface((s) => s.optionsOuvertes);
  const maintenant = Date.now();

  return (
    <main className="ecran-titre">
      <VersionJeu />
      <EnseigneNeon texte={TEXTES.titreJeu} />
      {avisTitre ? (
        <p className="sous-titre avis-titre" role="status">
          {TEXTES.avisTitre[avisTitre]}
        </p>
      ) : (
        <p className="sous-titre">{TEXTES.sousTitre}</p>
      )}
      <ol className="emplacements">
        {emplacements.map((emplacement, i) => (
          <li key={i}>
            <CarteEmplacement numero={i} emplacement={emplacement} maintenant={maintenant} />
          </li>
        ))}
      </ol>
      <p className="avertissement-titre">{AVERTISSEMENT_TITRE}</p>
      {optionsOuvertes !== null && (
        <OptionsEmplacement numero={optionsOuvertes} emplacement={emplacements[optionsOuvertes] ?? { statut: 'vide' }} />
      )}
      {suppressionDemandee !== null && (
        <ConfirmationSuppression emplacement={emplacements[suppressionDemandee] ?? { statut: 'vide' }} />
      )}
    </main>
  );
}

interface PropsCarte {
  numero: number;
  emplacement: Emplacement;
  maintenant: number;
}

function CarteEmplacement({ numero, emplacement, maintenant }: PropsCarte) {
  const nouvellePartie = useInterface((s) => s.nouvellePartie);
  const continuer = useInterface((s) => s.continuer);
  const demanderSuppression = useInterface((s) => s.demanderSuppression);
  const ouvrirOptions = useInterface((s) => s.ouvrirOptions);
  const exporterPartie = useInterface((s) => s.exporterPartie);
  const importerFichier = useInterface((s) => s.importerFichier);
  const t = TEXTES.emplacements;

  const importer = async () => {
    const texte = await choisirFichier();
    if (texte !== null) importerFichier(numero, texte);
  };

  if (emplacement.statut === 'vide') {
    return (
      <div className="carte-emplacement vide">
        <p className="carte-titre">{t.libre}</p>
        <p className="carte-detail">{t.libreDetail}</p>
        <div className="carte-actions colonne">
          <button className="bouton principal" onClick={() => nouvellePartie(numero)}>
            {t.nouvellePartie}
          </button>
          <button className="bouton discret" onClick={() => void importer()}>
            {t.importer}
          </button>
        </div>
      </div>
    );
  }

  if (emplacement.statut === 'illisible') {
    return (
      <div className="carte-emplacement illisible">
        <p className="carte-titre">{t.illisible}</p>
        <p className="carte-detail">{t.illisibleDetail}</p>
        <div className="carte-actions">
          <button className="bouton discret" onClick={() => exporterPartie(numero)}>
            {t.exporter}
          </button>
          <button className="bouton discret" onClick={() => demanderSuppression(numero)}>
            {t.supprimer}
          </button>
        </div>
      </div>
    );
  }

  const r = emplacement.resume;
  return (
    <div className="carte-emplacement">
      <div className="carte-entete">
        <Avatar avatar={r.avatar} tenue={r.tenue ?? 0} taille={44} />
        <div className="carte-noms">
          <p className="carte-maison">{r.nomMaison}</p>
          <p className="carte-prenom">{r.prenom}</p>
        </div>
      </div>
      <p className="carte-ligne">
        {r.chapitreFini ? TEXTES_FIN.emplacement : t.chapitre(r.chapitre)} · {t.jour(r.jour)} · {formaterHeure(r.minuteDuJour)}
      </p>
      <p className="carte-ligne attenue">
        {t.dernierePartie} : {formaterDernierePartie(r.dernierePartie, maintenant)}
      </p>
      {r.faillite !== undefined ? (
        <p className="carte-argent negatif">{TEXTES_BANQUE.titreEcran.faillite(r.faillite)}</p>
      ) : (
        <p className={r.tresorerie < 0 ? 'carte-argent negatif' : 'carte-argent'}>{formaterEuros(r.tresorerie)}</p>
      )}
      <div className="carte-actions">
        <button className="bouton principal" onClick={() => continuer(numero)}>
          {t.continuer}
        </button>
        <button className="bouton discret" onClick={() => ouvrirOptions(numero)}>
          {t.options}
        </button>
      </div>
    </div>
  );
}

/** Numéro de version et bouton pour recharger le jeu après une mise à jour, en haut à droite. */
function VersionJeu() {
  const [enCours, setEnCours] = useState(false);
  const t = TEXTES.versionJeu;
  return (
    <div className="version-jeu">
      <span>{t.version(VERSION_JEU)}</span>
      <button
        className="bouton discret"
        aria-label={t.actualiserLabel}
        disabled={enCours}
        onClick={() => {
          setEnCours(true);
          void actualiserJeu();
        }}
      >
        {enCours ? t.actualisation : t.actualiser}
      </button>
    </div>
  );
}
