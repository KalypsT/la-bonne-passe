import { describe, expect, it } from 'vitest';
import { LIMITES_NOMS } from '../content/partie';
import { estInjurieux, nettoyerNom, validerNomMaison, validerPrenom } from './identite';

describe('prénom', () => {
  it('est obligatoire', () => {
    expect(validerPrenom('')).toBe('vide');
    expect(validerPrenom('   ')).toBe('vide');
  });

  it('accepte les prénoms usuels, accents et traits d’union compris', () => {
    for (const prenom of ['Anouk', 'Hélène', 'Jean-Luc', 'Zoë', 'Maël', "D'Artagnan"]) {
      expect(validerPrenom(prenom)).toBeNull();
    }
  });

  it('refuse un prénom trop long', () => {
    expect(validerPrenom('A'.repeat(LIMITES_NOMS.prenom))).toBeNull();
    expect(validerPrenom('A'.repeat(LIMITES_NOMS.prenom + 1))).toBe('long');
  });

  it('refuse les caractères spéciaux', () => {
    expect(validerPrenom('Anouk<3')).toBe('caracteres');
    expect(validerPrenom('😘')).toBe('caracteres');
  });
});

describe('nom de la maison', () => {
  it('accepte le nom par défaut et des noms élégants', () => {
    for (const nom of ['La bonne passe', 'Le Velours', 'Chez Josée', 'Les 3 Tulipes', 'Rouge & Or', 'La Culture !']) {
      expect(validerNomMaison(nom)).toBeNull();
    }
  });

  it('refuse un nom trop long', () => {
    expect(validerNomMaison('Le très très grand salon rouge')).toBe('long');
  });

  it('nettoie les espaces en trop', () => {
    expect(nettoyerNom('  Le   Velours ')).toBe('Le Velours');
  });
});

describe('filtre des noms injurieux', () => {
  it('bloque les insultes, même en majuscules ou avec accents', () => {
    for (const nom of ['Chez les cons', 'SALOPE', 'Le Bâtard', 'La Pute', 'Maison de merde']) {
      expect(estInjurieux(nom)).toBe(true);
    }
  });

  it('bloque les insultes déguisées', () => {
    for (const nom of ['s4l0pe', 'Les connards', 'c o n n a r d', 'F.u.c.k', 'Enculé']) {
      expect(estInjurieux(nom)).toBe(true);
    }
  });

  it('bloque toute allusion à des mineurs', () => {
    for (const nom of ['Lolita', 'Chez les écolières', 'La mineure']) {
      expect(estInjurieux(nom)).toBe(true);
    }
  });

  it('ne bloque pas les mots innocents qui contiennent une insulte', () => {
    for (const nom of ['La Culture', 'Le Cocktail', 'Constance', 'Le Concorde', 'La Bitterie', 'Scunthorpe']) {
      expect(estInjurieux(nom)).toBe(false);
    }
  });

  it('renvoie l’erreur « injurieux » à la validation', () => {
    expect(validerNomMaison('Les connasses')).toBe('injurieux');
    expect(validerPrenom('Connard')).toBe('injurieux');
  });
});
