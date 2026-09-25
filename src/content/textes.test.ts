import { describe, expect, it } from 'vitest';
import { accord, de, TEXTES } from './textes';

describe('accords des textes', () => {
  it('contracte « de » devant le nom de la maison', () => {
    expect(de('Le Velours')).toBe('du Velours');
    expect(de('Les 3 Tulipes')).toBe('des 3 Tulipes');
    expect(de('La bonne passe')).toBe('de La bonne passe');
    expect(de('Chez Josée')).toBe('de Chez Josée');
    expect(de('Aphrodite')).toBe('d’Aphrodite');
    expect(de('Lena')).toBe('de Lena');
  });

  it('accorde selon l’avatar : patronne ou patron', () => {
    expect(accord('patronne', 'la patronne', 'le patron')).toBe('la patronne');
    expect(accord('patron', 'la patronne', 'le patron')).toBe('le patron');
    expect(TEXTES.jeu.bienvenue('Bram', 'patron', 'Le Velours')).toBe('Bienvenue, Bram. Te voilà patron du Velours.');
    expect(TEXTES.jeu.bienvenue('Inès', 'patronne', 'La bonne passe')).toBe(
      'Bienvenue, Inès. Te voilà patronne de La bonne passe.',
    );
  });
});
