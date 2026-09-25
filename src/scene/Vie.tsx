import { PATIENCE_CLIENT } from '../content/balance';
import { CLIENTS } from '../content/clientele';
import { trouverChambre } from '../content/maison';
import { SANNE, SILHOUETTE_MENAGE } from '../content/personnel';
import { TEXTES } from '../content/textes';
import type { Alerte } from '../engine/alertes';
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

const SILHOUETTES_EMPLOYES = { [SANNE.id]: SANNE.silhouette };

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
          const silhouette = SILHOUETTES_EMPLOYES[e.id];
          const place = POSITIONS.salon[i];
          if (!silhouette || !place || occupes.has(e.id)) return null;
          return (
            <g key={e.id} opacity={e.repos ? 0.45 : 1}>
              <Figurine silhouette={silhouette} x={place.x} y={place.y} />
            </g>
          );
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
          <Bulle key={cleAlerte(a)} alerte={a} libelle={libelle(a)} x={position.x} y={position.y} onClick={() => onAlerte(a)} />
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
    case 'epuisement': {
      const i = partie.personnel.findIndex((e) => e.id === a.employeId);
      const place = POSITIONS.salon[i];
      return place ? { x: place.x, y: place.y - 54 } : null;
    }
    case 'dispute':
      return POSITIONS.bulleDispute;
  }
}

function libelle(a: Alerte): string {
  const t = TEXTES.alertes;
  switch (a.type) {
    case 'chambreSale':
      return t.chambreSale(trouverChambre(a.chambreId)?.nom ?? a.chambreId);
    case 'linge':
      return t.linge;
    case 'epuisement':
      return t.epuisement(a.employeId === SANNE.id ? SANNE.prenom : a.employeId);
    case 'dispute':
      return t.dispute;
  }
}

/** Bulle d'alerte : un pictogramme, un anneau de délai pour les alertes minutées, une grande zone tactile. */
function Bulle({ alerte, libelle, x, y, onClick }: { alerte: Alerte; libelle: string; x: number; y: number; onClick: () => void }) {
  const R = 11;
  const circonference = 2 * Math.PI * R;
  const part = alerte.type === 'dispute' ? alerte.restant / alerte.total : 1;
  const urgente = alerte.type === 'dispute' || (alerte.type === 'chambreSale' && alerte.inutilisable);
  return (
    <g className="bulle" transform={`translate(${x} ${y})`} onClick={onClick} role="button" aria-label={libelle}>
      <circle r="24" fill="transparent" />
      <g className="bulle-flotte">
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
        <Pictogramme type={alerte.type} />
      </g>
    </g>
  );
}

function Pictogramme({ type }: { type: Alerte['type'] }) {
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
  }
}
