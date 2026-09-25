/** Jauge horizontale de 0 à 100. */
export function Jauge({ nom, valeur, alerte = false }: { nom: string; valeur: number; alerte?: boolean }) {
  return (
    <div className="jauge">
      <span>
        {nom} <b>{Math.round(valeur)} %</b>
      </span>
      <div className={alerte ? 'jauge-barre basse' : 'jauge-barre'}>
        <i style={{ width: `${Math.max(0, Math.min(100, valeur))}%` }} />
      </div>
    </div>
  );
}
