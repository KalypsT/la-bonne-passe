// Madame Josée : l'ancienne patronne, 68 ans, chignon gris, lunettes et perles.
// Elle t'a vendu la maison et ne peut pas s'empêcher de passer.

import type { Silhouette } from './personnel';

export const JOSEE = {
  nom: 'Madame Josée',
  silhouette: {
    teint: '#F1C7A5',
    cheveux: '#C9C3C9',
    coiffure: 'chignon',
    haut: '#5B2A6E',
    bas: '#5B2A6E',
    lunettes: true,
    robe: true,
    perles: true,
  } satisfies Silhouette as Silhouette,
};

/** Ce que Josée dit en présentant chaque palier. */
export const JOSEE_PALIERS: Record<number, string> = {
  1: 'Première nuit bouclée. Demain, des candidats vont passer : Sanne ne peut pas tout porter seule. Et ces chambres sous les draps, elles ne se rouvriront pas toutes seules.',
  2: 'On commence à parler de toi dans le quartier. Les costumes-cravates et les bandes de copains arrivent : les premiers sont pressés, les seconds bruyants. Chacun sa page dans le carnet : soigne ceux qui comptent pour toi.',
};

/** Remarques de Josée sur la réserve de sécurité. */
export const JOSEE_RESERVE = {
  retraitHorsUrgence: 'La réserve, c’est pour les coups durs. Là, c’était une envie, pas un coup dur.',
  retraitUrgence: 'Tu as bien fait. C’est à ça qu’elle sert.',
  taux: [
    'Rien de côté ? Le 28, la banque ne fera pas crédit à ton optimisme.',
    '10 %, c’est raisonnable. C’est ce que je faisais, les bonnes années.',
    '20 %, c’est prudent. Ta trésorerie va maigrir, mais tu dormiras mieux.',
  ],
};
