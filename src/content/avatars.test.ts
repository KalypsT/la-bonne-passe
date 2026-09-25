import { describe, expect, it } from 'vitest';
import { AVATARS, trouverAvatar } from './avatars';
import { PARTIE_PAR_DEFAUT } from './partie';

describe('avatars du joueur', () => {
  it('propose 3 patronnes et 3 patrons, chacun avec 2 tenues', () => {
    expect(AVATARS.filter((a) => a.genre === 'patronne')).toHaveLength(3);
    expect(AVATARS.filter((a) => a.genre === 'patron')).toHaveLength(3);
    for (const a of AVATARS) expect(a.tenues).toHaveLength(2);
  });

  it('a des identifiants uniques, dont celui de la partie par défaut', () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(trouverAvatar(PARTIE_PAR_DEFAUT.avatar).id).toBe(PARTIE_PAR_DEFAUT.avatar);
  });

  it('retombe sur le premier avatar si l’identifiant est inconnu', () => {
    expect(trouverAvatar('inconnu')).toBe(AVATARS[0]);
  });
});
