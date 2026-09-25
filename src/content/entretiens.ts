// Entretien individuel : ce que dit la personne selon son humeur, et les réponses possibles.
// Accords : {e} vaut « e » pour une femme, rien pour un homme.

export type Humeur = 'basse' | 'moyenne' | 'haute';

export const REPLIQUES: Record<Humeur, string[]> = {
  basse: [
    '« Franchement ? Je me demande ce que je fais encore ici. »',
    '« Je suis fatigué{e} d’être fatigué{e}. »',
    '« Le Chat Noir m’a fait un signe. Je n’ai pas répondu. Pas encore. »',
  ],
  moyenne: [
    '« Ça va. Enfin, ça pourrait aller mieux. »',
    '« Les clients sont gentils. C’est le planning qui l’est moins. »',
    '« Tu voulais me voir ? Je n’ai rien cassé, promis. »',
  ],
  haute: [
    '« Tout roule ! Tu voulais me féliciter, c’est ça ? »',
    '« J’adore cette maison. Ne le répète pas. »',
    '« On devrait ouvrir une deuxième chambre premium. Je dis ça… »',
  ],
};

export const REPONSES = {
  ecouter: { texte: 'Écouter', detail: 'Moral en hausse, un peu de loyauté' },
  promettre: { texte: 'Promettre une soirée de repos', detail: 'Gros coup de moral… si tu tiens parole sous 3 jours' },
  recadrer: { texte: 'Recadrer', detail: 'Moral en baisse, mais plus concentré{e} ce soir' },
};
