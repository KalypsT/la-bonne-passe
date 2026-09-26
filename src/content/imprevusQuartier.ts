// Imprévus du quartier (v0.5) : des cartes de soirée qui viennent de dehors (voisins, police, presse, le Chat Noir,
// la visibilité), et quelques soirées calmes qui ont enfin leurs histoires (soirée feutrée, porte stricte).
// Même format que src/content/imprevus.ts ; les textes acceptent {joueur} et {maison}.

import * as B from './balance';
import type { DefinitionImprevu } from './imprevus';

const A = B.IMPREVU_QUARTIER_ARGENT;
const euros = (n: number) => `${n.toLocaleString('fr-FR')} €`;

export const IMPREVUS_QUARTIER: DefinitionImprevu[] = [
  {
    id: 'agentRonde',
    titre: 'La ronde de l’agent Visser',
    texte: 'L’agent Visser pose son vélo contre la vitrine et passe la tête par la porte : « Tout va bien ce soir, {joueur} ? On m’a parlé de chants sur le quai. »',
    condition: { systeme: 'relations' },
    choix: [
      {
        texte: 'Lui offrir un café sur le perron',
        detail: `−${euros(A.cafeAgent)} ; il repart rassuré`,
        effet: { argent: -A.cafeAgent, relations: { police: 3 } },
        journal: 'L’agent Visser boit son café sur le perron, raconte sa ronde, et repart en sifflotant.',
      },
      {
        texte: 'L’inviter à faire le tour de la maison',
        detail: 'La police apprécie ; les clients d’affaires, pas du tout',
        effet: { relations: { police: 6 }, satisfaction: { affaires: -3 } },
        journal: 'Visite guidée pour l’agent Visser. Au salon, deux costumes-cravates se cachent derrière leur journal.',
      },
      {
        texte: '« Tout va très bien, merci »',
        detail: 'Poli, et un peu sec',
        effet: { relations: { police: -2 } },
        journal: 'L’agent Visser note quelque chose dans son carnet, remonte sur son vélo, et s’éloigne lentement.',
      },
    ],
  },
  {
    id: 'voisineInsomniaque',
    titre: 'Une voisine en peignoir',
    texte: 'Madame de Jong, du troisième, en peignoir à pois et bigoudis : « Je ne dors pas, {joueur}. Ce n’est pas votre faute, enfin pas seulement. Vous auriez une tisane ? »',
    condition: { systeme: 'relations' },
    bonus: { offre: ['feutree'] },
    choix: [
      {
        texte: 'Une tisane et des bouchons d’oreille',
        detail: `−${euros(A.tisane)} ; elle remonte apaisée`,
        effet: { argent: -A.tisane, relations: { voisins: 4 } },
        journal: 'Madame de Jong remonte avec une tisane au tilleul et une paire de bouchons en velours. Elle est ravie.',
      },
      {
        texte: 'L’inviter au salon',
        detail: 'Elle adore ; les habitués sont un peu surpris',
        effet: { relations: { voisins: 7 }, satisfaction: { habitue: -1 } },
        journal: 'Madame de Jong passe une heure au salon, raconte ses années de danseuse, et repart à deux heures, conquise.',
      },
      {
        texte: 'La renvoyer gentiment se coucher',
        detail: 'Elle le prend mal',
        effet: { relations: { voisins: -4 } },
        journal: 'Madame de Jong remonte en claquant ses mules sur chaque marche.',
      },
    ],
  },
  {
    id: 'journalisteIncognito',
    opportunite: true,
    titre: 'Un journaliste au bar',
    texte: 'Au bar, un homme en velours côtelé prend des notes sur un sous-verre. Tu reconnais le chroniqueur de « Nuits d’Amsterdam », celui qui ne dit jamais qu’il écrit.',
    condition: { systeme: 'relations', reputationMin: 30 },
    bonus: { offre: ['feutree'], selection: ['stricte'] },
    choix: [
      {
        texte: 'Le traiter en roi, sans rien dire',
        detail: `−${euros(A.journaliste)} de champagne ; il écrira, en bien sans doute`,
        chance: 0.7,
        effet: { argent: -A.journaliste, relations: { presse: 6 }, reputation: 0.5 },
        journal: 'Le chroniqueur repart à trois heures, ravi. Son billet parle d’« une maison où l’on se sent attendu ».',
        echec: { argent: -A.journaliste, relations: { presse: -4 } },
        journalEchec: 'Le chroniqueur a tout vu, surtout la coupe de trop : son billet parle de « champagne de séduction ».',
      },
      {
        texte: 'Aller le saluer, franchement',
        detail: 'Il apprécie la franchise, moins d’être reconnu',
        effet: { relations: { presse: 3 }, satisfaction: { affaires: 1 } },
        journal: 'Il range son sous-verre en riant : « Démasqué. » La conversation dure une heure, et elle est bonne.',
      },
      {
        texte: 'Faire comme si de rien n’était',
        detail: 'Il écrira ce qu’il voit',
        effet: {},
        journal: 'Le chroniqueur finit son verre et repart sans un mot. On lira bien.',
      },
    ],
  },
  {
    id: 'espionChatNoir',
    titre: 'Un compteur de clients',
    texte: 'Sur le quai, un jeune homme en imperméable compte les clients qui entrent, un carnet à la main. Au revers de son col, un petit chat doré.',
    condition: { systeme: 'rivale' },
    bonus: { offre: ['feutree'] },
    choix: [
      {
        texte: 'L’inviter à entrer compter au chaud',
        detail: `−${euros(A.espion)} ; Colette Vos appréciera l’humour`,
        effet: { argent: -A.espion, rivale: { relation: 6 } },
        journal: 'Le jeune homme boit un chocolat au bar et compte à voix haute. Colette Vos t’envoie un mot le lendemain : « Touchée. »',
      },
      {
        texte: 'Le faire déguerpir',
        detail: 'Le Chat Noir le prendra mal',
        effet: { rivale: { relation: -5, agressivite: 4 } },
        journal: 'Le jeune homme s’enfuit en semant des pages de son carnet. On y lit « 23 h 10 : deux costumes, un chapeau ».',
      },
      {
        texte: 'Lui dicter de faux chiffres',
        detail: 'Une chance sur deux de semer le doute au Chat Noir',
        chance: 0.5,
        effet: { rivale: { agressivite: -6 } },
        journal: 'Tu lui dictes des chiffres désastreux. Au Chat Noir, on se détend un peu.',
        echec: { rivale: { agressivite: 6, relation: -4 } },
        journalEchec: 'Le jeune homme n’est pas dupe. « Madame Vos sera ravie de savoir que vous mentez si mal. »',
      },
    ],
  },
  {
    id: 'transfugeClient',
    opportunite: true,
    titre: 'Un déçu du Chat Noir',
    texte: 'Un monsieur aux tempes grises, habitué du Chat Noir depuis vingt ans, hésite sur le seuil : « Colette m’a fait attendre une heure. Une heure ! Vous auriez de la place pour un vieil ami ? »',
    condition: { systeme: 'rivale', segment: 'habitue' },
    bonus: { offre: ['feutree'] },
    choix: [
      {
        texte: 'L’accueillir avec une coupe',
        detail: `−${euros(A.transfuge)} ; un habitué de plus, et le Chat Noir le saura`,
        effet: { argent: -A.transfuge, clients: 1, clientsSegment: 'habitue', satisfaction: { habitue: 2 }, rivale: { agressivite: 5 } },
        journal: 'Le vieux monsieur s’installe au salon comme chez lui. « Enfin, une maison qui sait recevoir. »',
      },
      {
        texte: 'Le renvoyer vers Colette Vos',
        detail: 'Élégant ; elle te le revaudra',
        effet: { rivale: { relation: 6, agressivite: -4 } },
        journal: 'Tu lui conseilles de laisser une seconde chance au Chat Noir. Colette Vos l’apprend, et en sourit.',
      },
    ],
  },
  {
    id: 'colisChatNoir',
    titre: 'Un colis noir',
    texte: 'Un coursier dépose un paquet noué d’un ruban doré : « Pour la direction de {maison}, de la part du Chat Noir. » Il repart sans attendre.',
    condition: { systeme: 'rivale' },
    choix: [
      {
        texte: 'L’ouvrir au salon',
        detail: 'Un cadeau, ou une farce ?',
        chance: 0.6,
        effet: { stockBar: 2, moralEquipe: 2, rivale: { relation: 3 } },
        journal: 'Deux bouteilles de champagne et une carte : « Bonne chance. Vous en aurez besoin. C. V. » On trinque quand même.',
        echec: { satisfaction: { touriste: -3, habitue: -2 }, reputation: -0.5, rivale: { relation: -3 } },
        journalEchec: 'Une souris mécanique jaillit du paquet et file sous les canapés. Les clients hurlent, puis rient, mais pas tous.',
      },
      {
        texte: 'Le renvoyer sans l’ouvrir',
        detail: 'Prudent ; un peu vexant',
        effet: { rivale: { relation: -3 } },
        journal: 'Le colis repart au Chat Noir, ruban intact. On ne saura jamais.',
      },
    ],
  },
  {
    id: 'coupureCourant',
    titre: 'Panne de courant',
    texte: 'Un claquement, puis le noir : tout le quai est privé d’électricité. Le néon de {maison} s’éteint dans un dernier grésillement.',
    bonus: { offre: ['feutree'] },
    choix: [
      {
        texte: 'Des bougies partout',
        detail: `−${euros(A.bougies)} ; l’ambiance devient divine, l’équipe s’amuse`,
        effet: { argent: -A.bougies, satisfaction: { habitue: 2, touriste: 1, affaires: -2 }, moralEquipe: 2 },
        journal: 'Cent bougies au salon et dans les chambres. Les habitués parlent déjà de « la nuit des chandelles ».',
      },
      {
        texte: 'Appeler l’électricien de garde',
        detail: `−${euros(A.electricien)} ; la lumière revient vite`,
        effet: { argent: -A.electricien, sinistre: 'casse' },
        journal: 'L’électricien arrive en vingt minutes, en pyjama sous son bleu. Le néon se rallume sous les applaudissements.',
      },
      {
        texte: 'Attendre que ça revienne',
        detail: 'Gratuit ; certains clients partent dans le noir',
        effet: { satisfaction: { touriste: -3, affaires: -3 }, affluenceSoir: 0.8 },
        journal: 'Une heure dans le noir. Quelques clients repartent à tâtons ; les autres ne se plaignent pas.',
      },
    ],
  },
  {
    id: 'pianiste',
    opportunite: true,
    titre: 'Un pianiste de passage',
    texte: 'Un jeune homme en smoking fatigué propose de jouer au salon « pour les pourboires ». Il a des mains de pianiste et des chaussures de vagabond.',
    condition: { palierMin: 1 },
    bonus: { offre: ['feutree'], theme: ['jazz'] },
    choix: [
      {
        texte: 'Le laisser jouer, et le payer',
        detail: `−${euros(A.pianiste)} ; les habitués fondent, les voisins entendent`,
        effet: { argent: -A.pianiste, satisfaction: { habitue: 3, groupe: -1 }, relations: { voisins: -1 } },
        journal: 'Le pianiste joue Satie, puis Gershwin. Au salon, plus personne ne regarde sa montre.',
      },
      {
        texte: 'Le laisser jouer pour les pourboires',
        detail: 'Gratuit ; il joue un peu moins bien quand personne ne donne',
        effet: { satisfaction: { habitue: 1 }, relations: { voisins: -1 } },
        journal: 'Le pianiste joue une heure pour trois pièces et un verre d’eau. Il reviendra peut-être.',
      },
      {
        texte: 'Décliner',
        detail: 'Le salon garde son calme',
        effet: {},
        journal: 'Le pianiste s’incline et repart sous la pluie, les mains dans les poches.',
      },
    ],
  },
  {
    id: 'retraite',
    titre: 'Un départ à la retraite',
    texte: 'Monsieur Visscher, habitué depuis toujours, annonce au salon qu’il prend sa retraite demain. Il a mis sa cravate des grands jours.',
    condition: { segmentPresent: 'habitue' },
    bonus: { offre: ['feutree'] },
    unique: true,
    opportunite: true,
    choix: [
      {
        texte: 'Champagne pour tout le salon',
        detail: `−${euros(A.retraite)} ; les habitués s’en souviendront`,
        effet: { argent: -A.retraite, satisfaction: { habitue: 3 }, moralEquipe: 2 },
        journal: 'Tout le salon trinque à la retraite de monsieur Visscher. Il pleure un peu, et promet de revenir le mardi.',
      },
      {
        texte: 'Un mot gentil, discrètement',
        detail: 'Il apprécie la discrétion',
        effet: { satisfaction: { habitue: 1 } },
        journal: 'Tu glisses un mot à monsieur Visscher. Il te serre la main longtemps.',
      },
    ],
  },
  {
    id: 'celebrite',
    opportunite: true,
    titre: 'Une célébrité à la porte',
    texte: 'Le portier vient de refuser l’entrée à un homme en lunettes noires, sans réservation. Sur le quai, deux passants chuchotent : c’est l’acteur de la série policière du dimanche soir.',
    condition: { selection: ['stricte'], palierMin: 2 },
    choix: [
      {
        texte: 'Le faire entrer, avec des excuses',
        detail: 'La presse adorera ; la porte perd un peu de son sérieux',
        effet: { clients: 1, clientsSegment: 'affaires', relations: { presse: 4 }, satisfaction: { habitue: -1 } },
        journal: 'L’acteur entre sous les regards. Demain, tout le quartier saura qu’il est venu.',
      },
      {
        texte: 'La règle est la règle',
        detail: 'Les habitués apprécient ; la presse moins',
        effet: { satisfaction: { habitue: 2, affaires: 2 }, relations: { presse: -3 } },
        journal: 'L’acteur repart vexé. « Même Hollywood fait la queue chez {maison} », titrera un blog le lendemain.',
      },
    ],
  },
  {
    id: 'fleuriste',
    opportunite: true,
    titre: 'La fleuriste d’en face',
    texte: 'La fleuriste d’en face ferme boutique avec trois seaux d’invendus : « Des pivoines, des roses, des tubéreuses. Pour votre salon, à moitié prix ? »',
    condition: { systeme: 'relations' },
    bonus: { offre: ['feutree'] },
    choix: [
      {
        texte: 'Tout prendre',
        detail: `−${euros(A.fleuriste)} ; le salon embaume, la voisine est ravie`,
        effet: { argent: -A.fleuriste, satisfaction: { habitue: 1 }, relations: { voisins: 3 } },
        journal: 'Le salon croule sous les pivoines. La fleuriste repart les seaux vides et le sourire aux lèvres.',
      },
      {
        texte: 'Un seul bouquet',
        detail: 'Un geste',
        effet: { argent: -Math.round(A.fleuriste / 3), relations: { voisins: 1 } },
        journal: 'Un bouquet de tubéreuses sur le comptoir. Le parfum monte jusqu’aux chambres.',
      },
      {
        texte: 'Merci, pas ce soir',
        detail: 'Elle comprend',
        effet: {},
        journal: 'La fleuriste hausse les épaules et remonte la rue avec ses seaux.',
      },
    ],
  },
  {
    id: 'echevinIncognito',
    opportunite: true,
    titre: 'L’échevin en goguette',
    texte: 'L’échevin du quartier entre avec un ami, chapeau enfoncé et col relevé. Il te fait un clin d’œil appuyé : ce soir, il n’est pas là.',
    condition: { systeme: 'relations', relationMin: { mairie: 10 } },
    bonus: { selection: ['stricte'], offre: ['feutree'] },
    choix: [
      {
        texte: 'Le salon privé, et du champagne',
        detail: `−${euros(A.echevin)} ; la mairie s’en souviendra`,
        effet: { argent: -A.echevin, relations: { mairie: 8 }, satisfaction: { affaires: 1 } },
        journal: 'L’échevin et son ami passent la soirée au salon privé. Au départ, une poignée de main très appuyée.',
      },
      {
        texte: 'Le traiter comme tout le monde',
        detail: 'Discret, et juste ; il n’en attendait pas moins… ou si',
        chance: 0.5,
        effet: { relations: { mairie: 3 } },
        journal: 'L’échevin apprécie de n’être personne. « C’est si reposant. »',
        echec: { relations: { mairie: -4 } },
        journalEchec: 'L’échevin a attendu vingt minutes sur le quai. Il ne l’oubliera pas.',
      },
    ],
  },
  {
    id: 'violoncelle',
    titre: 'Un concert à l’étage',
    texte: 'Monsieur Bakker descend avec son violoncelle : « Puisque nous sommes amis, {joueur}, je vous offre un concert. Au salon, si vous voulez bien. »',
    condition: { relationMin: { voisins: 20 } },
    bonus: { offre: ['feutree'] },
    opportunite: true,
    choix: [
      {
        texte: 'Avec plaisir',
        detail: 'Les habitués adorent ; les groupes, un peu moins',
        effet: { satisfaction: { habitue: 4, groupe: -2 }, relations: { voisins: 5 } },
        journal: 'Bach au salon de {maison}. Monsieur Bakker salue sous les applaudissements, rouge de bonheur.',
      },
      {
        texte: 'Une autre fois, peut-être',
        detail: 'Il est un peu déçu',
        effet: { relations: { voisins: -2 } },
        journal: 'Monsieur Bakker remonte son violoncelle, marche après marche.',
      },
    ],
  },
  {
    id: 'liveQuai',
    opportunite: true,
    titre: 'Un direct sur le quai',
    texte: 'Une influenceuse, venue grâce à ta campagne, filme la façade en direct : « Je suis devant LA maison du canal. On entre ? » Des clients discrets remontent leur col.',
    condition: { visibilite: ['influenceurs'] },
    choix: [
      {
        texte: 'La faire entrer, sans filmer dedans',
        detail: 'La presse aime ; les clients d’affaires tiquent',
        effet: { relations: { presse: 3 }, satisfaction: { touriste: 2, affaires: -3 } },
        journal: 'L’influenceuse range son téléphone au vestiaire, à contrecœur. Ses abonnés imagineront le reste.',
      },
      {
        texte: 'Lui demander de couper',
        detail: 'Les clients discrets respirent',
        effet: { relations: { presse: -2 }, satisfaction: { affaires: 2 } },
        journal: 'L’influenceuse coupe le direct en boudant. « Vous êtes vraiment vieux jeu. »',
      },
    ],
  },
  {
    id: 'conciergeCommission',
    titre: 'Le concierge du Grand Hôtel',
    texte: 'Le concierge du Grand Hôtel, gants blancs et moustache cirée, passe en fin de soirée : « Mes clients sont ravis. Mais la concurrence propose davantage, vous comprenez. »',
    condition: { visibilite: ['concierges'] },
    choix: [
      {
        texte: 'Une enveloppe pour la saison',
        detail: `−${euros(A.journaliste)} ; il continue d’envoyer ses clients`,
        effet: { argent: -A.journaliste, satisfaction: { affaires: 2 }, clients: 1, clientsSegment: 'affaires' },
        journal: 'L’enveloppe disparaît dans un gant blanc. Un client du Grand Hôtel arrive dans la foulée.',
      },
      {
        texte: 'Lui rappeler vos accords',
        detail: 'Il enverra peut-être ses clients au Chat Noir',
        chance: 0.5,
        effet: {},
        journal: 'Le concierge lisse sa moustache : « Vous avez raison, un accord est un accord. »',
        echec: { satisfaction: { affaires: -3 }, rivale: { agressivite: -3 } },
        journalEchec: 'Le concierge s’en va vexé. Les jours suivants, ses clients prennent la direction du Chat Noir.',
      },
    ],
  },
];
