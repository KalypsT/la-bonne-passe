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
  /** Places du personnel qui attend au salon. */
  salon: [{ x: 150, y: 304 }, { x: 184, y: 304 }, { x: 218, y: 304 }, { x: 252, y: 304 }],
  bulleLinge: { x: 112, y: 262 },
  bulleBar: { x: 408, y: 262 },
  /** Derrière le comptoir du bar. */
  bar: [{ x: 366, y: 290 }, { x: 392, y: 290 }],
  bulleDispute: { x: 231, y: 356 },
};
