import { TEXTES } from '../content/textes';
import type { Emplacement } from '../save/emplacements';
import { Avatar } from '../scene/Avatar';
import { EnseigneNeon } from '../scene/EnseigneNeon';
import { ConfirmationSuppression } from './ConfirmationSuppression';
import { formaterDernierePartie, formaterEuros, formaterHeure } from './format';
import { useInterface } from './store';

export function EcranTitre() {
  const emplacements = useInterface((s) => s.emplacements);
  const suppressionDemandee = useInterface((s) => s.suppressionDemandee);
  const maintenant = Date.now();

  return (
    <main className="ecran-titre">
      <EnseigneNeon texte={TEXTES.titreJeu} />
      <p className="sous-titre">{TEXTES.sousTitre}</p>
      <ol className="emplacements">
        {emplacements.map((emplacement, i) => (
          <li key={i}>
            <CarteEmplacement numero={i} emplacement={emplacement} maintenant={maintenant} />
          </li>
        ))}
      </ol>
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
  const t = TEXTES.emplacements;

  if (emplacement.statut === 'vide') {
    return (
      <div className="carte-emplacement vide">
        <p className="carte-titre">{t.libre}</p>
        <p className="carte-detail">{t.libreDetail}</p>
        <button className="bouton principal" onClick={() => nouvellePartie(numero)}>
          {t.nouvellePartie}
        </button>
      </div>
    );
  }

  if (emplacement.statut === 'illisible') {
    return (
      <div className="carte-emplacement illisible">
        <p className="carte-titre">{t.illisible}</p>
        <p className="carte-detail">{t.illisibleDetail}</p>
        <button className="bouton discret" onClick={() => demanderSuppression(numero)}>
          {t.supprimer}
        </button>
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
        {t.chapitre(r.chapitre)} · {t.jour(r.jour)} · {formaterHeure(r.minuteDuJour)}
      </p>
      <p className="carte-ligne attenue">
        {t.dernierePartie} : {formaterDernierePartie(r.dernierePartie, maintenant)}
      </p>
      <p className={r.tresorerie < 0 ? 'carte-argent negatif' : 'carte-argent'}>{formaterEuros(r.tresorerie)}</p>
      <div className="carte-actions">
        <button className="bouton principal" onClick={() => continuer(numero)}>
          {t.continuer}
        </button>
        <button className="bouton discret" onClick={() => demanderSuppression(numero)}>
          {t.supprimer}
        </button>
      </div>
    </div>
  );
}
