import { TEXTES } from '../content/textes';
import type { EtatJeu } from '../engine/etat';
import { Portrait } from './Panneau';
import { useInterface } from './store';

/** Fin de période d'essai : garder la personne ou se séparer, sans coût pour l'équipe. */
export function CarteEssai({ partie }: { partie: EtatJeu }) {
  const ordonner = useInterface((s) => s.ordonner);
  const ouvrirCarte = useInterface((s) => s.ouvrirCarte);
  const employe = partie.personnel.find((e) => e.id === partie.essaisATrancher[0]);
  const t = TEXTES.essai;
  if (!employe) return null;
  const enRdv = partie.rendezVous.some((r) => r.employeId === employe.id);
  const trancher = (garder: boolean) => {
    ordonner({ type: 'trancherEssai', employeId: employe.id, garder });
    ouvrirCarte(null);
  };

  return (
    <div className="voile" role="dialog" aria-modal="true" aria-labelledby="titre-essai">
      <div className="carte-modale">
        <div className="employe-entete">
          <Portrait personne={employe} />
          <h2 id="titre-essai">{t.titre(employe.prenom)}</h2>
        </div>
        <p>{t.texte(employe.prenom, employe.nuitsTravaillees)}</p>
        <button className="choix" onClick={() => trancher(true)}>
          {t.garder}
          <small>{t.garderDetail}</small>
        </button>
        <button className="choix" disabled={enRdv} onClick={() => trancher(false)}>
          {t.separer}
          <small>{enRdv ? t.occupe : t.separerDetail}</small>
        </button>
      </div>
    </div>
  );
}
