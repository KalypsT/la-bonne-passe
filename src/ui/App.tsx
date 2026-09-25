import { useEffect } from 'react';
import { EcranCreation } from './EcranCreation';
import { EcranJeu } from './EcranJeu';
import { EcranTitre } from './EcranTitre';
import { useInterface } from './store';
import { TourneTelephone } from './TourneTelephone';

export function App() {
  const ecran = useInterface((s) => s.ecran);
  const sauvegarderPartie = useInterface((s) => s.sauvegarderPartie);

  // Sauvegarde automatique quand l'appli passe en arrière-plan ou se ferme.
  useEffect(() => {
    const auMasquage = () => {
      if (document.visibilityState === 'hidden') sauvegarderPartie();
    };
    document.addEventListener('visibilitychange', auMasquage);
    window.addEventListener('pagehide', sauvegarderPartie);
    return () => {
      document.removeEventListener('visibilitychange', auMasquage);
      window.removeEventListener('pagehide', sauvegarderPartie);
    };
  }, [sauvegarderPartie]);

  return (
    <>
      <div className="jeu">
        {ecran === 'titre' && <EcranTitre />}
        {ecran === 'creation' && <EcranCreation />}
        {ecran === 'jeu' && <EcranJeu />}
      </div>
      <TourneTelephone />
    </>
  );
}
