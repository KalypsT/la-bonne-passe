import type { EtatJeu } from '../engine/etat';

interface Personne {
  prenom: string;
  genre: 'f' | 'm';
}

/** Remplit un texte de contenu : {prenom}, {prenom2}, {joueur}, {maison}, et les accords {e}, {e2}, {Il}. */
export function remplir(texte: string, partie: EtatJeu, personne?: Personne, personne2?: Personne): string {
  return texte
    .replaceAll('{prenom2}', personne2?.prenom ?? '')
    .replaceAll('{prenom}', personne?.prenom ?? '')
    .replaceAll('{joueur}', partie.joueur.prenom)
    .replaceAll('{maison}', partie.maison.nom)
    .replaceAll('{e2}', personne2?.genre === 'm' ? '' : 'e')
    .replaceAll('{e}', personne?.genre === 'm' ? '' : 'e')
    .replaceAll('{Il}', personne?.genre === 'm' ? 'Il' : 'Elle');
}
