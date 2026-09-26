// Emplacement des pièces dans la scène (coordonnées du viewBox 600 × 410).

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const GEOMETRIE_CHAMBRES: Record<string, Rect> = {
  boudoir: { x: 96, y: 76, w: 202, h: 72 },
  orientale: { x: 302, y: 76, w: 202, h: 72 },
  velours: { x: 96, y: 156, w: 202, h: 72 },
  miroirs: { x: 302, y: 156, w: 202, h: 72 },
};

/** Pièces annexes (v0.6) : les loges dans le pignon, la buanderie derrière la fenêtre de droite du rez-de-chaussée.
 * Zones tactiles un peu plus hautes que le dessin, pour tenir 40 px en 667 × 375. */
export const GEOMETRIE_ANNEXES: Record<'loges' | 'buanderie', Rect> = {
  loges: { x: 200, y: 4, w: 200, h: 66 },
  buanderie: { x: 364, y: 314, w: 140, h: 66 },
};

/** Chambre d'origine de chaque décor : son dessin y est calé. */
export const CHAMBRE_DU_DECOR: Record<string, string> = { rose: 'boudoir', orientale: 'orientale', velours: 'velours', miroirs: 'miroirs' };

export const GEOMETRIE_PIECES: Record<'salon' | 'bar' | 'bureau', Rect> = {
  salon: { x: 96, y: 236, w: 234, h: 70 },
  bar: { x: 334, y: 236, w: 96, h: 70 },
  bureau: { x: 434, y: 236, w: 70, h: 70 },
};

/** Points de la scène où se tiennent les personnages (position des pieds). */
export const POSITIONS = {
  /** Places sur le quai, de la porte vers la droite. */
  file: [192, 218, 244, 270].map((x) => ({ x, y: 392 })),
  porte: { x: 135, y: 392 },
  /** Équipes Accueil (à droite de la porte) et Sécurité (à gauche), v0.5. */
  accueil: [{ x: 160, y: 394 }, { x: 172, y: 396 }],
  securite: [{ x: 108, y: 394 }, { x: 92, y: 396 }],
  /** Places du personnel qui attend au salon. */
  salon: [{ x: 150, y: 304 }, { x: 184, y: 304 }, { x: 218, y: 304 }, { x: 252, y: 304 }],
  bulleLinge: { x: 112, y: 262 },
  bulleBar: { x: 408, y: 262 },
  /** Derrière le comptoir du bar. */
  bar: [{ x: 366, y: 290 }, { x: 392, y: 290 }],
  bulleDispute: { x: 231, y: 356 },
  /** Alertes minutées : le quai (bruit), le bar (une bouteille à servir). */
  bulleQuai: { x: 300, y: 350 },
  bulleBouteille: { x: 360, y: 262 },
  bullePhotographe: { x: 520, y: 356 },
  bulleSabotage: { x: 170, y: 352 },
  bulleJournaliste: { x: 470, y: 356 },
  bulleFenetre: { x: 44, y: 140 },
};
