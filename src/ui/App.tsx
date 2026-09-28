import { useEffect } from 'react';
import { EcranCreation } from './EcranCreation';
import { EcranJeu } from './EcranJeu';
import { EcranTitre } from './EcranTitre';
import { useInterface } from './store';
import { TourneTelephone } from './TourneTelephone';

export function App() {
  const ecran = useInterface((s) => s.ecran);
  const sauvegarderPartie = useInterface((s) => s.sauvegarderPartie);
  const verifierAutreOnglet = useInterface((s) => s.verifierAutreOnglet);

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

  // Un autre onglet a écrit dans le stockage : si c'est la partie ouverte ici, la lâcher avant de l'écraser.
  useEffect(() => {
    const auChangement = () => void verifierAutreOnglet();
    window.addEventListener('storage', auChangement);
    return () => window.removeEventListener('storage', auChangement);
  }, [verifierAutreOnglet]);

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
