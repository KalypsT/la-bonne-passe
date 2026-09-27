import { beforeAll, describe, expect, it } from 'vitest';
import * as B from '../content/balance';
import { valeurNette } from './banque';
import { simuler, type OptionsSimulation } from './simulation';

// Palier 5, « S'agrandir » (v0.6, partie 7) : quand il arrive, et ce que rapportent le bâtiment voisin et la gérante.
// Joueur classique à 3 rendez-vous qui entretient ses relations et dépose le permis dès qu'il le peut, 168 nuits.

// v1.0, partie 4 : 12 graines (6 auparavant). Les arcs d'Inès et de Sanne rebattent le hasard des parties : sur les
// graines 1 à 6, la réputation atteignait 80 vers le jour 97 (83 avant), sur les graines 7 à 18 vers le jour 89 (85 sans
// l'arc d'Inès). Six parties ne suffisaient plus à séparer l'effet du hasard.
const GRAINES = Array.from({ length: 12 }, (_, i) => i + 1);
const NUITS = 168;
type Mesure = { jourPalier5: number; valeur: number; netFin: number; personnel: number };
const mesures = new Map<string, Mesure[]>();

const BASE: Omit<OptionsSimulation, 'graine' | 'nuits' | 'offre'> = { rdvMax: 3, permis: true, relations: 'entretien', lingeAuto: 20 };
const BATIMENT = { ...BASE, agrandir: 'batiment' as const, recruterJusqua: 8, empruntAgrandir: { montant: 20000, duree: 24 } };

function jouer(nom: string, options: Omit<OptionsSimulation, 'graine' | 'nuits' | 'offre'>) {
  mesures.set(
    nom,
    GRAINES.map((graine) => {
      const r = simuler({ graine, offre: 'classique', nuits: NUITS, ...options });
      const fin = r.nuits.slice(112);
      return {
        jourPalier5: r.nuits.findIndex((n) => n.palier >= 5) + 1,
        valeur: valeurNette(r.etat),
        netFin: fin.reduce((s, n) => s + n.net, 0) / fin.length,
        personnel: r.etat.personnel.length,
      };
    }),
  );
}
const moyenne = (nom: string, f: (m: Mesure) => number) => mesures.get(nom)!.reduce((s, m) => s + f(m), 0) / GRAINES.length;

beforeAll(() => {
  jouer('permis', BASE);
  jouer('batiment', BATIMENT);
  jouer('gerante', { ...BATIMENT, gerante: true });
}, 300_000);

describe('palier 5 : s’agrandir', () => {
  it('arrive entre le deuxième et le quatrième mois pour le joueur qui dépose son dossier', () => {
    // Mesuré (8 graines) : jours 57 à 120, vers le jour 79 en moyenne.
    const jours = mesures.get('permis')!.map((m) => m.jourPalier5);
    expect(jours.every((j) => j > 0)).toBe(true);
    expect(Math.min(...jours)).toBeGreaterThan(40);
    expect(moyenne('permis', (m) => m.jourPalier5)).toBeLessThan(100);
  });

  it('racheter tout le bâtiment à crédit et recruter jusqu’à 8 rapporte nettement plus, sans être une rente', () => {
    // Mesuré : 1 335 € net par nuit aux mois 5 et 6, contre 767 € sans agrandir.
    expect(moyenne('batiment', (m) => m.personnel)).toBeGreaterThan(7);
    expect(moyenne('batiment', (m) => m.netFin)).toBeGreaterThan(moyenne('permis', (m) => m.netFin) * 1.3);
    expect(moyenne('batiment', (m) => m.netFin)).toBeLessThan(moyenne('permis', (m) => m.netFin) * 2.2);
    expect(moyenne('batiment', (m) => m.valeur)).toBeGreaterThan(moyenne('permis', (m) => m.valeur));
  });

  it('la gérante ne coûte guère plus que son salaire : ses rotations compensent la personne qui ne reçoit plus', () => {
    // Le joueur simulé répond à toutes les alertes : ce qu'elle épargne en attention ne se voit pas ici.
    // v1.0, partie 4 : le joueur simulé ne promeut plus la personne la plus loyale (toujours Sanne après son arc, la
    // meilleure hôtesse) mais la moins douée qui accepte.
    expect(moyenne('gerante', (m) => m.netFin)).toBeGreaterThan(moyenne('batiment', (m) => m.netFin) * 0.95);
    // Mesuré (6 graines) : 11 600 € sur 168 nuits, pour une gérante en poste environ 90 nuits (9 900 € de salaire).
    const cout = moyenne('batiment', (m) => m.valeur) - moyenne('gerante', (m) => m.valeur);
    expect(cout).toBeLessThan(B.GERANTE.salaire * 120);
  });
});
