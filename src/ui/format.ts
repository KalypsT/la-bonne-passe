import { TEXTES } from '../content/textes';

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function formaterEuros(montant: number): string {
  return euros.format(montant);
}

export function formaterHeure(minuteDuJour: number): string {
  const h = Math.floor(minuteDuJour / 60);
  const m = minuteDuJour % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

/** Date de dernière partie, relative à maintenant. */
export function formaterDernierePartie(date: number, maintenant: number): string {
  const d = TEXTES.dates;
  if (date <= 0) return d.jamais;
  const minutes = Math.floor((maintenant - date) / 60000);
  if (minutes < 1) return d.instant;
  if (minutes < 60) return d.minutes(minutes);
  if (minutes < 24 * 60) return d.heures(Math.floor(minutes / 60));
  if (minutes < 48 * 60) return d.hier;
  return d.le(new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
}
