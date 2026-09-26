import { OBJECTIFS_MOIS, SEGMENTS_OBJECTIF, type DefinitionDefi } from '../content/defis';
import type { Mois } from '../engine/bilans';
import type { EtatJeu } from '../engine/etat';
import { formaterEuros } from './format';

/** Une valeur de défi ou d'objectif, en clair (euros, pourcentage, nombre). */
export function formaterMesure(mesure: DefinitionDefi['mesure']['type'] | Mois['objectif'], valeur: number): string {
  if (mesure === 'bar' || mesure === 'avoir') return formaterEuros(valeur);
  if (mesure === 'perdus') return `${valeur} %`;
  return String(valeur);
}

/** Le texte d'un défi, avec sa cible. */
export function texteDefi(def: DefinitionDefi, partie: EtatJeu): string {
  return def.texte.replaceAll('{cible}', String(def.cible)).replaceAll('{maison}', partie.maison.nom);
}

export function texteReussiteDefi(texte: string, partie: EtatJeu): string {
  return texte.replaceAll('{maison}', partie.maison.nom);
}

/** Le texte d'un objectif du mois, avec sa cible et son segment. */
export function texteObjectif(mois: Pick<Mois, 'objectif' | 'cible' | 'segment'>): string {
  return OBJECTIFS_MOIS[mois.objectif].texte
    .replaceAll('{cible}', formaterMesure(mois.objectif, mois.cible))
    .replaceAll('{segment}', mois.segment ? SEGMENTS_OBJECTIF[mois.segment] : '');
}
