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
