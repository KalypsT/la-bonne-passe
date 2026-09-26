import { PATIENCE_CLIENT } from '../content/balance';
import { CLIENTS } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import { SILHOUETTE_MENAGE, SILHOUETTES_BAR } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { Alerte } from '../engine/alertes';
import { TEXTES_ALERTES, type IdAlerte } from '../content/alertes';
import { remplir } from '../ui/modeles';
import type { EtatJeu } from '../engine/etat';
import { estOuvert, momentDeLaJournee } from '../engine/temps';
import { Figurine } from './Figurine';
import { GEOMETRIE_CHAMBRES, POSITIONS } from './geometrie';

export interface Montant {
  id: number;
  chambreId: string;
  texte: string;
  positif: boolean;
}

interface Props {
  partie: EtatJeu;
  alertes: Alerte[];
  montants: Montant[];
  onAlerte: (alerte: Alerte) => void;
}

/** Personnages, rideaux, bulles et montants : tout ce qui bouge. Purement visuel. */
export function Vie({ partie, alertes, montants, onAlerte }: Props) {
  const ouvert = estOuvert(partie);
  const enService = ouvert || momentDeLaJournee(partie) === 'briefing';
  const occupes = new Set(partie.rendezVous.map((r) => r.employeId));
  const chambresOccupees = new Set(partie.rendezVous.map((r) => r.chambreId));
  // Une personne de ménage par chambre à nettoyer, les plus sales d'abord.
  const enMenage = partie.chambres
    .filter((c) => c.ouverte && c.proprete < 99.5 && !chambresOccupees.has(c.id))
    .sort((a, b) => a.proprete - b.proprete)
    .slice(0, partie.equipes.menage);

  return (
    <g className="vie">
      {/* Rideaux de velours sur chaque rendez-vous */}
      {partie.rendezVous.map((rdv) => {
        const r = GEOMETRIE_CHAMBRES[rdv.chambreId];
        if (!r) return null;
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const progression = 1 - rdv.restant / rdv.duree;
        return (
          <g key={rdv.chambreId} className="rideaux">
            <rect className="rideau gauche" x={r.x} y={r.y + 4} width={r.w / 2} height={r.h - 4} fill="url(#velours)" />
            <rect className="rideau droit" x={cx} y={r.y + 4} width={r.w / 2} height={r.h - 4} fill="url(#velours)" />
            <g className="plaque">
              <rect x={cx - 24} y={cy - 7} width="48" height="13" rx="3" fill="#D4A64A" />
              <text x={cx} y={cy + 2} textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="6.5" fontWeight="600" fill="#2A1218">
                {TEXTES.scene.occupe}
              </text>
            </g>
            <rect x={r.x + 12} y={r.y + r.h - 7} width={r.w - 24} height="2" rx="1" fill="rgba(0,0,0,.4)" />
            <rect x={r.x + 12} y={r.y + r.h - 7} width={(r.w - 24) * progression} height="2" rx="1" fill="#FF4F8B" />
          </g>
        );
      })}

      {/* Personnel au salon */}
      {enService &&
        partie.personnel.map((e, i) => {
          const place = POSITIONS.salon[i];
          if (!place || occupes.has(e.id)) return null;
          return (
            <g key={e.id} opacity={e.repos ? 0.45 : 1}>
              <Figurine silhouette={e.silhouette} x={place.x} y={place.y} />
            </g>
          );
        })}

      {/* Équipe Bar, derrière le comptoir */}
      {enService &&
        partie.bar.ouvert &&
        SILHOUETTES_BAR.slice(0, partie.equipes.bar).map((silhouette, i) => {
          const place = POSITIONS.bar[i];
          if (!place) return null;
          return <Figurine key={`bar-${i}`} silhouette={silhouette} x={place.x} y={place.y} hauteur={38} />;
        })}

      {/* Ménage */}
      {enMenage.map((chambre) => {
        const r = GEOMETRIE_CHAMBRES[chambre.id];
        if (!r) return null;
        return <Figurine key={chambre.id} silhouette={SILHOUETTE_MENAGE} x={r.x + r.w - 26} y={r.y + r.h - 2} hauteur={40} balai />;
      })}

      {/* Clients sur le quai */}
      {partie.file.map((client, i) => {
        const modele = CLIENTS.find((c) => c.id === client.modele);
        const place = POSITIONS.file[i];
        if (!modele || !place) return null;
        const patience = Math.max(0, client.patience / PATIENCE_CLIENT);
        return (
          <g key={client.id} className="client">
            <Figurine silhouette={modele.silhouette} x={place.x} y={place.y} hauteur={42} />
            <rect x={place.x - 9} y={place.y - 50} width="18" height="2.4" rx="1.2" fill="rgba(255,255,255,.2)" />
            <rect
              x={place.x - 9}
              y={place.y - 50}
              width={18 * patience}
              height="2.4"
              rx="1.2"
              fill={patience < 0.3 ? '#FF4F8B' : '#8FE0BA'}
            />
          </g>
        );
      })}

      {/* Montants qui s'envolent */}
      {montants.map((m) => {
        const r = GEOMETRIE_CHAMBRES[m.chambreId];
        if (!r) return null;
        return (
          <text
            key={m.id}
            className="montant"
            x={r.x + r.w / 2}
            y={r.y + 30}
            textAnchor="middle"
            fontFamily="Jost, sans-serif"
            fontSize="11"
            fontWeight="600"
            fill={m.positif ? '#D4A64A' : '#FF9DBE'}
          >
            {m.texte}
          </text>
        );
      })}

      {/* Bulles d'alerte, à toucher */}
      {alertes.map((a) => {
        const position = positionBulle(a, partie);
        if (!position) return null;
        return (
          <Bulle key={cleAlerte(a)} alerte={a} libelle={libelle(a, partie)} x={position.x} y={position.y} onClick={() => onAlerte(a)} />
        );
      })}
    </g>
  );
}

export function cleAlerte(a: Alerte): string {
  switch (a.type) {
    case 'chambreSale':
      return `sale-${a.chambreId}`;
    case 'epuisement':
      return `epuisement-${a.employeId}`;
    case 'menace':
      return `menace-${a.employeId}`;
    case 'minuterie':
      return `minuterie-${a.cle}`;
    default:
      return a.type;
  }
}

function positionBulle(a: Alerte, partie: EtatJeu) {
  switch (a.type) {
    case 'chambreSale': {
      const r = GEOMETRIE_CHAMBRES[a.chambreId];
      return r ? { x: r.x + r.w / 2, y: r.y + 24 } : null;
    }
    case 'linge':
      return POSITIONS.bulleLinge;
    case 'barVide':
      return POSITIONS.bulleBar;
    case 'epuisement': {
      const i = partie.personnel.findIndex((e) => e.id === a.employeId);
      const place = POSITIONS.salon[i];
      return place ? { x: place.x, y: place.y - 54 } : null;
    }
    case 'dispute':
      return POSITIONS.bulleDispute;
    case 'menace': {
      // Au-dessus de la personne au salon, décalée pour ne pas couvrir une bulle d’épuisement.
      const i = partie.personnel.findIndex((e) => e.id === a.employeId);
      const place = POSITIONS.salon[i];
      return place ? { x: place.x + 14, y: place.y - 56 } : null;
    }
    case 'minuterie':
      return positionMinuterie(a, partie);
  }
}

/** Où flotte une alerte minutée : au-dessus du client, de la personne, du bar ou du quai. */
function positionMinuterie(a: Extract<Alerte, { type: 'minuterie' }>, partie: EtatJeu) {
  switch (a.id) {
    case 'presse':
    case 'ivre': {
      // Au-dessus du client ; le client éméché plus haut, pour que deux bulles voisines ne se touchent pas.
      const i = partie.file.findIndex((c) => String(c.id) === a.cible);
      const place = POSITIONS.file[i];
      return place ? { x: place.x, y: place.y - (a.id === 'ivre' ? 76 : 50) } : POSITIONS.bulleQuai;
    }
    case 'bruit':
      return POSITIONS.bulleQuai;
    case 'sabotage':
      return POSITIONS.bulleSabotage;
    case 'photographe':
      return POSITIONS.bullePhotographe;
    case 'bouteille':
      return POSITIONS.bulleBouteille;
    case 'pause': {
      const i = partie.personnel.findIndex((e) => e.id === a.cible);
      const place = POSITIONS.salon[i];
      return place ? { x: place.x - 14, y: place.y - 56 } : null;
    }
  }
}

function libelle(a: Alerte, partie: EtatJeu): string {
  const t = TEXTES.alertes;
  switch (a.type) {
    case 'chambreSale':
      return t.chambreSale(trouverChambre(a.chambreId)?.nom ?? a.chambreId);
    case 'linge':
      return t.linge;
    case 'epuisement':
    {
      const e = partie.personnel.find((x) => x.id === a.employeId);
      return t.epuisement(e?.prenom ?? a.employeId, e?.genre ?? 'f');
    }
    case 'dispute':
      return t.dispute;
    case 'menace':
      return t.menace(partie.personnel.find((x) => x.id === a.employeId)?.prenom ?? a.employeId);
    case 'barVide':
      return t.barVide(a.stock);
    case 'minuterie': {
      const e = partie.personnel.find((x) => x.id === a.cible);
      return remplir(TEXTES_ALERTES[a.id].titre, partie, e);
    }
  }
}

/** Bulle d'alerte : un pictogramme, un anneau de délai pour les alertes minutées, une grande zone tactile. */
function Bulle({ alerte, libelle, x, y, onClick }: { alerte: Alerte; libelle: string; x: number; y: number; onClick: () => void }) {
  const R = 11;
  const circonference = 2 * Math.PI * R;
  const part = alerte.type === 'dispute' || alerte.type === 'minuterie' ? alerte.restant / Math.max(1, alerte.total) : 1;
  const urgente =
    alerte.type === 'dispute' ||
    (alerte.type === 'minuterie' && alerte.id !== 'bouteille') ||
    alerte.type === 'menace' ||
    (alerte.type === 'chambreSale' && alerte.inutilisable) ||
    (alerte.type === 'barVide' && alerte.stock <= 0);
  return (
    <g
      className="bulle"
      transform={`translate(${x} ${y})`}
      onClick={onClick}
      role="button"
      aria-label={libelle}
      data-tuto={alerte.type === 'chambreSale' ? 'bulle-sale' : undefined}
    >
      <circle r="24" fill="transparent" />
      <g className={alerte.type === 'minuterie' && alerte.id === 'bouteille' ? 'bulle-flotte opportunite' : 'bulle-flotte'}>
        <circle r={R} fill="rgba(255,255,255,.18)" />
        <circle
          r={R}
          fill="none"
          stroke={urgente ? '#FF4F8B' : '#D4A64A'}
          strokeWidth="2.4"
          strokeDasharray={`${circonference * part} ${circonference}`}
          transform="rotate(-90)"
        />
        <circle r={R - 2} fill="#FFF4EE" />
        {alerte.type === 'minuterie' ? <PictoMinuterie id={alerte.id} /> : <Pictogramme type={alerte.type} />}
      </g>
    </g>
  );
}

function PictoMinuterie({ id }: { id: IdAlerte }) {
  switch (id) {
    case 'presse':
      // Montre
      return (
        <g>
          <circle r="5" fill="none" stroke="#1C2A44" strokeWidth="1.3" />
          <path d="M0 -3V0L2.5 1.5" stroke="#8C2640" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bruit':
      // Note de musique
      return (
        <g fill="#5C1530">
          <path d="M-1 4V-5L4 -6V2" stroke="#5C1530" strokeWidth="1.2" fill="none" />
          <circle cx="-2.5" cy="4" r="2" />
          <circle cx="2.5" cy="2.5" r="2" />
        </g>
      );
    case 'ivre':
      // Verre penché
      return (
        <g transform="rotate(20)">
          <path d="M-4 -5H4L1 1V5M-2.5 5H2.5M-1 1V5" stroke="#8C2640" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M-3 -3H3L0.5 0H-0.5Z" fill="#D4A64A" />
        </g>
      );
    case 'bouteille':
      // Bouteille de champagne
      return (
        <g>
          <path d="M-1.5 -6H1.5V-3L3 -1V6H-3V-1L-1.5 -3Z" fill="#1F7A5C" />
          <rect x="-1.5" y="-6.5" width="3" height="1.5" fill="#D4A64A" />
        </g>
      );
    case 'photographe':
      // Appareil photo
      return (
        <g>
          <rect x="-5.5" y="-3" width="11" height="8" rx="1.5" fill="#1C1C22" />
          <rect x="-2" y="-5" width="4" height="2" fill="#1C1C22" />
          <circle cy="1" r="2.4" fill="#5FA3A8" />
        </g>
      );
    case 'sabotage':
      // Tête de chat noir
      return (
        <g>
          <path d="M-5 5V-3L-3.5 -6.5L-1.5 -3.5H1.5L3.5 -6.5L5 -3V5Z" fill="#1C1C22" />
          <circle cx="-2" cy="0" r="1" fill="#D4A64A" />
          <circle cx="2" cy="0" r="1" fill="#D4A64A" />
        </g>
      );
    case 'pause':
      // Tasse
      return (
        <g>
          <path d="M-4.5 -2H3V3Q3 5 1 5H-2.5Q-4.5 5 -4.5 3Z" fill="#8A5A2B" />
          <path d="M3 -0.5Q5.5 -0.5 5.5 1.5Q5.5 3 3 3" stroke="#8A5A2B" strokeWidth="1.1" fill="none" />
          <path d="M-2 -4Q-1 -5 -2 -6M0.5 -4Q1.5 -5 0.5 -6" stroke="#B6B6C2" strokeWidth=".8" fill="none" />
        </g>
      );
  }
}

function Pictogramme({ type }: { type: Exclude<Alerte['type'], 'minuterie'> }) {
  switch (type) {
    case 'chambreSale':
      // Balai
      return (
        <g>
          <path d="M3 -6L-1 3" stroke="#6B4A2B" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M-4 2L1 4L-1 7L-6 5Z" fill="#C8913E" />
        </g>
      );
    case 'linge':
      // Pile de draps
      return (
        <g fill="#5FA3A8">
          <rect x="-5" y="-4" width="10" height="3" rx="1" />
          <rect x="-5" y="0" width="10" height="3" rx="1" opacity=".7" />
          <rect x="-5" y="4" width="10" height="2" rx="1" opacity=".4" />
        </g>
      );
    case 'epuisement':
      // Visage fatigué
      return (
        <g stroke="#5C1530" strokeWidth="1.1" fill="none" strokeLinecap="round">
          <path d="M-4 -1.5H-1.5M1.5 -1.5H4" />
          <path d="M-2.5 3.5Q0 2 2.5 3.5" />
        </g>
      );
    case 'dispute':
      // Éclair
      return <path d="M1 -6L-4 1H0L-1 6L4 -1H0Z" fill="#FF4F8B" />;
    case 'barVide':
      // Verre vide
      return (
        <g>
          <path d="M-4 -5H4L1 1V5M-2.5 5H2.5M-1 1V5" stroke="#8C2640" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M-3 -4H3" stroke="#D4A64A" strokeWidth="1" />
        </g>
      );
    case 'menace':
      // Valise
      return (
        <g>
          <rect x="-5" y="-2.5" width="10" height="7" rx="1.2" fill="#8A5A2B" />
          <path d="M-2 -2.5V-4.5H2V-2.5" stroke="#5A3A22" strokeWidth="1.1" fill="none" />
        </g>
      );
  }
}
