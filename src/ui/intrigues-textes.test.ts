import { describe, expect, it } from 'vitest';
import { INTRIGUES } from '../content/intrigues';
import { creerEtatInitial } from '../engine/etat';
import { texteEvenement } from './journal';

/** Tous les textes d'une intrigue, pour les vérifier d'un coup. */
function textes(): string[] {
  return INTRIGUES.flatMap((d) => [
    d.titre,
    ...Object.values(d.etapes).flatMap((e) => [
      e.titre,
      e.texte,
      e.enCours,
      ...e.choix.flatMap((c) => [c.texte, c.detail, c.journal, c.journalEchec ?? '']),
    ]),
    ...Object.values(d.fins).map((f) => f.texte ?? ''),
  ]);
}

describe('textes des intrigues', () => {
  it('apostrophes typographiques, et seulement des champs connus', () => {
    for (const texte of textes()) {
      expect(texte, texte).not.toContain("'");
      for (const champ of texte.match(/\{[^}]*\}/g) ?? []) expect(['{prenom}', '{joueur}', '{maison}', '{e}', '{Il}'], texte).toContain(champ);
    }
  });

  it('le journal raconte chaque carte, chaque choix et chaque dénouement', () => {
    const partie = creerEtatInitial({ joueur: { prenom: 'Bram', avatar: 'a', tenue: 0, genre: 'patron' }, nomMaison: 'Le Velours' });
    expect(texteEvenement({ type: 'intrigue', id: 'voisin', etape: 'avocat', employeId: null }, partie)).toBe('Une lettre recommandée.');
    expect(texteEvenement({ type: 'intrigueTranchee', id: 'voisin', etape: 'avocat', choix: 2, reussite: false }, partie)).toContain('amende');
    expect(texteEvenement({ type: 'intrigueFinie', id: 'voisin', fin: 'apaise' }, partie)).toContain('sonomètre');
    // Une suite qui s'achève sans texte ne remplit pas le journal.
    expect(texteEvenement({ type: 'intrigueFinie', id: 'costume', fin: 'econduit', prenom: 'Mila' }, partie)).toBeNull();
    expect(
      texteEvenement({ type: 'intrigueTranchee', id: 'costume', etape: 'retour', choix: 1, reussite: true, prenom: 'Jonas' }, { ...partie, personnel: [] }),
    ).toContain('Jonas t’adresse');
  });
});
