import { TEXTES } from '../content/textes';
import { EnseigneNeon } from '../scene/EnseigneNeon';

export function EcranTitre() {
  return (
    <main className="ecran-titre">
      <EnseigneNeon texte={TEXTES.titreJeu} />
      <p className="sous-titre">{TEXTES.sousTitre}</p>
      <p className="mention">{TEXTES.mentionProvisoire}</p>
    </main>
  );
}
