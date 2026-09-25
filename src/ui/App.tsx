import { EcranTitre } from './EcranTitre';
import { useInterface } from './store';
import { TourneTelephone } from './TourneTelephone';

export function App() {
  const ecran = useInterface((s) => s.ecran);
  return (
    <>
      <div className="jeu">{ecran === 'titre' && <EcranTitre />}</div>
      <TourneTelephone />
    </>
  );
}
