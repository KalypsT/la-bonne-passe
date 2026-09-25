import type { ReactNode } from 'react';
import { trouverChambre, trouverPiece } from '../content/maison';
import { TEXTES } from '../content/textes';
import type { EtatChambre, EtatJeu } from '../engine/etat';
import { heureDeInstant } from '../engine/soiree';
import { estOuvert, momentDeLaJournee } from '../engine/temps';
import { formaterHeure } from '../ui/format';
import type { Alerte } from '../engine/alertes';
import { Avatar } from './Avatar';
import { DecorChambre } from './DecorChambres';
import { GEOMETRIE_CHAMBRES, GEOMETRIE_PIECES, type Rect } from './geometrie';
import { Vie, type Montant } from './Vie';

interface Props {
  partie: EtatJeu;
  alertes: Alerte[];
  montants: Montant[];
  onAlerte: (alerte: Alerte) => void;
  /** Pièce mise en évidence (fiche ouverte dans le panneau). */
  selection: string | null;
  onChoisir: (id: string) => void;
}

/** Part de lumière du jour selon l'heure : 0 la nuit, 1 en plein jour. */
function lumiereDuJour(minute: number): number {
  const h = minute / 60;
  if (h < 6 || h > 21) return 0;
  if (h < 8) return (h - 6) / 2;
  if (h < 19) return 1;
  return (21 - h) / 2;
}

/** La maison en coupe : décor du prototype, piloté par l'état du jeu. */
export function Maison({ partie, alertes, montants, onAlerte, selection, onChoisir }: Props) {
  const ouvert = estOuvert(partie);
  const moment = momentDeLaJournee(partie);
  const jour = lumiereDuJour(partie.minuteDuJour);
  const salonEclaire = ouvert || moment === 'briefing';
  const enseigneLongue = partie.maison.nom.length > 18;

  return (
    <svg className="maison" viewBox="0 0 600 410" preserveAspectRatio="xMidYMid meet" role="img" aria-label={partie.maison.nom}>
      <Motifs />
      {/* Ciel, étoiles, lune */}
      <rect width="600" height="410" fill="url(#ciel)" />
      <rect width="600" height="410" fill="#86B6C4" opacity={jour * 0.55} />
      <g fill="#F4DCC8" opacity={0.6 * (1 - jour)}>
        <circle cx="40" cy="30" r=".8" />
        <circle cx="140" cy="18" r=".6" />
        <circle cx="470" cy="14" r=".7" />
        <circle cx="520" cy="60" r=".6" />
        <circle cx="30" cy="80" r=".6" />
        <circle cx="430" cy="40" r=".5" />
      </g>
      <g opacity={1 - jour}>
        <circle cx="555" cy="36" r="22" fill="url(#chaud)" opacity=".5" />
        <circle cx="555" cy="36" r="11" fill="#F4DCC8" opacity=".9" />
        <circle cx="560" cy="33" r="10" fill="#0F2830" />
      </g>

      {/* Maisons voisines */}
      <path d="M0 410V120H14V104H30V88H48V104H62V120H88V410Z" fill="#17303A" />
      <g fill="#E8B45A" opacity={(1 - jour) * 0.55}>
        <rect x="16" y="150" width="10" height="15" />
        <rect x="50" y="150" width="10" height="15" opacity=".35" />
        <rect x="16" y="215" width="10" height="15" opacity=".4" />
        <rect x="50" y="275" width="10" height="15" />
      </g>
      <path d="M512 410V96H530V80H548V64H566V80H584V96H600V410Z" fill="#1A3640" />
      <g fill="#E8B45A" opacity={(1 - jour) * 0.5}>
        <rect x="530" y="130" width="10" height="15" />
        <rect x="566" y="130" width="10" height="15" opacity=".3" />
        <rect x="530" y="200" width="10" height="15" opacity=".35" />
        <rect x="566" y="265" width="10" height="15" />
      </g>

      {/* Pignon à gradins et poutre de levage */}
      <path d="M200 70V52H220V34H240V16H360V34H380V52H400V70Z" fill="url(#brique)" />
      <g fill="#D9CBB8">
        <rect x="198" y="50" width="24" height="3" />
        <rect x="218" y="32" width="24" height="3" />
        <rect x="238" y="14" width="124" height="3" />
        <rect x="358" y="32" width="24" height="3" />
        <rect x="378" y="50" width="24" height="3" />
      </g>
      <circle cx="300" cy="44" r="11" fill="#D9CBB8" />
      <circle cx="300" cy="44" r="9" fill="#0E2630" />
      <circle cx="303" cy="41" r="2.5" fill="#F4DCC8" opacity=".7" />
      <rect x="295" y="17" width="10" height="7" fill="#2A1A14" />
      <path d="M300 24V30M297 30Q300 35 303 30" stroke="#2A1A14" strokeWidth="1.3" fill="none" />

      {/* Façade et planchers */}
      <rect x="88" y="70" width="424" height="302" fill="url(#brique)" />
      <rect x="84" y="66" width="432" height="5" fill="#D9CBB8" />
      <g fill="#2B1812">
        <rect x="88" y="148" width="424" height="8" />
        <rect x="88" y="228" width="424" height="8" />
        <rect x="88" y="306" width="424" height="8" />
        <rect x="298" y="76" width="4" height="152" />
      </g>

      {/* Chambres */}
      {partie.chambres.map((chambre) => (
        <Chambre key={chambre.id} chambre={chambre} />
      ))}

      {/* Salon */}
      <g>
        <rect x="96" y="236" width="234" height="70" fill="url(#rayures)" />
        <rect x="96" y="286" width="234" height="20" fill="#2C1020" />
        <rect x="96" y="285" width="234" height="1.4" fill="#D4A64A" opacity=".6" />
        <circle cx="213" cy="252" r="40" fill="url(#chaud)" opacity=".8" />
        <path d="M213 236V244M203 247Q213 255 223 247M206 247V244M213 249V244M220 247V244" stroke="#D4A64A" strokeWidth="1.1" fill="none" />
        <path d="M104 292V282Q106 276 114 276H176Q184 276 186 282V292Z" fill="#7A1F35" />
        <rect x="100" y="288" width="90" height="12" rx="4" fill="#8C2640" />
        <Etiquette x={101} y={246}>{trouverPiece('salon').nom}</Etiquette>
        <rect x="96" y="236" width="234" height="70" fill="#05080A" opacity={salonEclaire ? 0 : 0.45} />
      </g>

      {/* Bar, sous des draps au départ */}
      <g>
        <rect x="334" y="236" width="96" height="70" fill="#2A1520" />
        <rect x="342" y="244" width="80" height="24" fill="#1A0E14" />
        <rect x="342" y="256" width="80" height="1.4" fill="#D4A64A" />
        <g>
          <rect x="346" y="248" width="3" height="8" fill="#5FBF95" />
          <rect x="352" y="249" width="3" height="7" fill="#E8B45A" />
          <rect x="358" y="247" width="3" height="9" fill="#8C2640" />
          <rect x="400" y="248" width="3" height="8" fill="#E8B45A" />
          <rect x="408" y="247" width="3" height="9" fill="#FF4F8B" />
        </g>
        <rect x="338" y="280" width="92" height="26" fill="#2A1812" />
        <rect x="335" y="277" width="95" height="4" rx="1" fill="#D4A64A" />
        <Etiquette x={338} y={246}>{trouverPiece('bar').nom}</Etiquette>
        {!partie.systemes.bar && <Draps rect={GEOMETRIE_PIECES.bar} texte={TEXTES.scene.pieceFermee(trouverPiece('bar').nom)} />}
      </g>

      {/* Bureau, avec l'avatar du joueur */}
      <g>
        <rect x="434" y="236" width="70" height="70" fill="url(#bois)" />
        <rect x="440" y="258" width="16" height="18" rx="1" fill="#3A3A40" stroke="#6A6A70" strokeWidth=".8" />
        <circle cx="448" cy="267" r="2.4" fill="none" stroke="#D4A64A" strokeWidth=".8" />
        <g transform="translate(459 258)">
          <Avatar avatar={partie.joueur.avatar} tenue={partie.joueur.tenue} taille={28} />
        </g>
        <rect x="442" y="286" width="54" height="4" fill="#6B4A2B" />
        <rect x="446" y="290" width="4" height="16" fill="#5A3A22" />
        <rect x="488" y="290" width="4" height="16" fill="#5A3A22" />
        <path d="M494 286V276M490 276H498L496 270H492Z" fill="#F2C46A" stroke="#6B4A2B" strokeWidth=".6" />
        <circle cx="494" cy="276" r="10" fill="url(#chaud)" />
        <Etiquette x={438} y={246}>{trouverPiece('bureau').nom}</Etiquette>
      </g>

      {/* Rez-de-chaussée : porte verte, vitrine rouge, enseigne néon */}
      <circle cx="255" cy="350" r="60" fill="url(#halo)" opacity={ouvert ? 1 : 0} />
      <path d="M120 372V336Q135 320 150 336V372Z" fill="#1E3A30" stroke="#D9CBB8" strokeWidth="1.4" />
      <path d="M125 342H145M125 356H145M135 342V372" stroke="#16291F" strokeWidth=".9" />
      <circle cx="146" cy="354" r="1.4" fill="#D4A64A" />
      <rect x="180" y="336" width="150" height="32" rx="2" fill="url(#vitrine)" stroke="#D9CBB8" strokeWidth="1.8" opacity={ouvert ? 1 : 0.25} />
      <path d="M230 336V368M280 336V368" stroke="#D9CBB8" strokeWidth="1.2" />
      <path d="M255 368V360M249 360H261L257 353H253Z" fill="#5C0A1C" />
      <g className={ouvert ? 'neon allume' : 'neon'}>
        <text
          x="255"
          y="331"
          textAnchor="middle"
          fontFamily="Yellowtail, 'Brush Script MT', cursive"
          fontSize="17"
          fill="#FF4F8B"
          filter="url(#lueur)"
          textLength={enseigneLongue ? 150 : undefined}
          lengthAdjust={enseigneLongue ? 'spacingAndGlyphs' : undefined}
        >
          {partie.maison.nom}
        </text>
        <text
          x="255"
          y="331"
          textAnchor="middle"
          fontFamily="Yellowtail, 'Brush Script MT', cursive"
          fontSize="17"
          fill="#FFE3EE"
          textLength={enseigneLongue ? 150 : undefined}
          lengthAdjust={enseigneLongue ? 'spacingAndGlyphs' : undefined}
        >
          {partie.maison.nom}
        </text>
      </g>
      <rect x="370" y="334" width="110" height="30" rx="2" fill="#2A3A40" stroke="#D9CBB8" strokeWidth="1.4" />
      <path d="M425 334V364" stroke="#D9CBB8" strokeWidth="1" />
      <rect x="372" y="358" width="106" height="4" fill="#2F5A3A" />
      <g fill="#3E7A4A">
        <circle cx="380" cy="356" r="3" />
        <circle cx="396" cy="355" r="3.4" />
        <circle cx="455" cy="356" r="3" />
        <circle cx="470" cy="355" r="3.4" />
      </g>

      {/* Quai, réverbère, vélo et canal */}
      <rect x="0" y="372" width="600" height="22" fill="url(#paves)" />
      <rect x="114" y="372" width="42" height="4" fill="#8A7A6A" />
      <rect x="0" y="392" width="600" height="4" fill="#6B5E54" />
      <circle cx="66" cy="316" r="24" fill="url(#chaud)" opacity={1 - jour * 0.7} />
      <path d="M66 392V320" stroke="#12181A" strokeWidth="2" />
      <path d="M61 310H71L69 322H63Z" fill="#F2C46A" />
      <path d="M60 310H72" stroke="#12181A" strokeWidth="2" />
      <g stroke="#CFC6BA" strokeWidth="1.2" fill="none">
        <circle cx="530" cy="384" r="6.5" />
        <circle cx="554" cy="384" r="6.5" />
        <path d="M530 384L539 374H551L554 384M539 374L541 384H530M550 369V374M547 369H553M537 372H543" />
      </g>
      <rect x="0" y="396" width="600" height="14" fill="url(#eau)" />
      <g stroke="#F4DCC8" strokeOpacity=".14" strokeWidth="1" fill="none">
        <path className="vague" d="M20 401H90M150 404H250M300 400H380M430 405H520" />
      </g>
      <rect x="200" y="399" width="110" height="5" rx="2" fill="#FF4F8B" filter="url(#flou)" opacity={ouvert ? 0.35 : 0} />

      {/* Zones tactiles */}
      <g className="zones">
        {[...Object.entries(GEOMETRIE_CHAMBRES), ...Object.entries(GEOMETRIE_PIECES)].map(([id, r]) => (
          <rect
            key={id}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx="3"
            className={selection === id ? 'zone choisie' : 'zone'}
            onClick={() => onChoisir(id)}
          />
        ))}
      </g>

      <Vie partie={partie} alertes={alertes} montants={montants} onAlerte={onAlerte} />
    </svg>
  );
}

function Chambre({ chambre }: { chambre: EtatChambre }) {
  const r = GEOMETRIE_CHAMBRES[chambre.id];
  const def = trouverChambre(chambre.id);
  if (!r || !def) return null;
  return (
    <g>
      <DecorChambre id={chambre.id} />
      <Etiquette x={r.x + 5} y={r.y + r.h - 3}>
        {def.nom}
      </Etiquette>
      {/* Poussière : plus la chambre est sale, plus elle se voile */}
      {chambre.ouverte && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#3A2A10" opacity={((100 - chambre.proprete) / 100) * 0.55} />}
      {!chambre.ouverte && (
        <Draps
          rect={r}
          texte={
            chambre.travaux !== null
              ? TEXTES.scene.travaux(formaterHeure(heureDeInstant(chambre.travaux)))
              : TEXTES.scene.chambreFermee(def.nom)
          }
        />
      )}
      {chambre.travaux !== null && <Chantier rect={r} />}
      <Lambrequin rect={r} />
    </g>
  );
}

/** Échelle et bande de chantier sur une chambre en travaux. */
function Chantier({ rect: r }: { rect: Rect }) {
  const x = r.x + r.w - 40;
  const bas = r.y + r.h - 4;
  return (
    <g className="chantier">
      <g stroke="#C8913E" strokeWidth="1.6">
        <path d={`M${x} ${bas}L${x + 8} ${r.y + 22}M${x + 14} ${bas}L${x + 20} ${r.y + 22}`} />
        {[0.2, 0.4, 0.6, 0.8].map((k) => {
          const y = bas - (bas - r.y - 22) * k;
          return <path key={k} d={`M${x + 8 * k} ${y}H${x + 14 + 6 * k}`} strokeWidth="1.1" />;
        })}
      </g>
      <rect x={r.x + 10} y={bas - 7} width="60" height="5" fill="#D4A64A" />
      <path
        d={Array.from({ length: 6 }, (_, i) => `M${r.x + 12 + i * 10} ${bas - 2}l4 -5h4l-4 5Z`).join('')}
        fill="#1A1014"
      />
    </g>
  );
}

/** Draps posés sur une pièce fermée. */
function Draps({ rect: r, texte }: { rect: Rect; texte: string }) {
  const cx = r.x + r.w / 2;
  const bas = r.y + r.h - 4;
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#1C1C22" opacity=".92" />
      <path
        d={`M${r.x + r.w * 0.2} ${bas}Q${r.x + r.w * 0.22} ${r.y + r.h - 30} ${cx} ${r.y + r.h - 32}Q${r.x + r.w * 0.78} ${r.y + r.h - 30} ${r.x + r.w * 0.8} ${bas}Z`}
        fill="#D8D4CC"
        opacity=".85"
      />
      {r.w > 150 && (
        <path
          d={`M${r.x + 14} ${bas}Q${r.x + 16} ${r.y + r.h - 22} ${r.x + 28} ${r.y + r.h - 22}Q${r.x + 36} ${r.y + r.h - 20} ${r.x + 34} ${bas}Z`}
          fill="#C8C4BC"
          opacity=".8"
        />
      )}
      <text x={cx} y={r.y + 18} textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="7" fill="#B9B2AA">
        {texte}
      </text>
    </g>
  );
}

/** Tringle et haut de rideau en velours au-dessus de chaque chambre. */
function Lambrequin({ rect: r }: { rect: Rect }) {
  let festons = '';
  for (let x = r.x; x < r.x + r.w; x += 8) festons += `M${x} ${r.y + 5}Q${x + 4} ${r.y + 9} ${x + 8} ${r.y + 5}`;
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height="5" fill="#5E0B22" />
      <rect x={r.x} y={r.y} width={r.w} height="1.2" fill="#D4A64A" />
      <path d={festons} fill="#5E0B22" />
    </g>
  );
}

function Etiquette({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} fontFamily="Jost, sans-serif" fontSize="6.5" fill="#F4DCC8" opacity=".7">
      {children}
    </text>
  );
}

function Motifs() {
  return (
    <defs>
      <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#081A20" />
        <stop offset=".75" stopColor="#16323B" />
        <stop offset="1" stopColor="#1B3A44" />
      </linearGradient>
      <linearGradient id="eau" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#123440" />
        <stop offset="1" stopColor="#06141A" />
      </linearGradient>
      <radialGradient id="vitrine" cx=".5" cy=".55" r=".7">
        <stop offset="0" stopColor="#FF6B7E" />
        <stop offset=".55" stopColor="#E0213F" />
        <stop offset="1" stopColor="#6E0A1E" />
      </radialGradient>
      <radialGradient id="halo">
        <stop offset="0" stopColor="#FF4F8B" stopOpacity=".5" />
        <stop offset="1" stopColor="#FF4F8B" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="chaud">
        <stop offset="0" stopColor="#F6C878" stopOpacity=".55" />
        <stop offset="1" stopColor="#F6C878" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="argent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#C9D6E2" />
        <stop offset=".5" stopColor="#6F8497" />
        <stop offset="1" stopColor="#A9B9C8" />
      </linearGradient>
      <pattern id="brique" width="12" height="6" patternUnits="userSpaceOnUse">
        <rect width="12" height="6" fill="#5E2626" />
        <path d="M0 5.5H12M6 0V2.8M0 2.8H12M0 2.8V5.5M12 2.8V5.5" stroke="#471B1C" strokeWidth=".6" />
      </pattern>
      <pattern id="paves" width="10" height="6" patternUnits="userSpaceOnUse">
        <rect width="10" height="6" fill="#2E2220" />
        <rect x=".6" y=".6" width="8.8" height="4.8" rx="2" fill="#3C2D2A" />
      </pattern>
      <pattern id="rayures" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#3A1826" />
        <rect width="4" height="10" fill="#43202F" />
      </pattern>
      <pattern id="damas" width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#5C1530" />
        <path d="M7 2L10 7L7 12L4 7Z" fill="#6A1B39" />
      </pattern>
      <pattern id="losanges" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#243548" />
        <path d="M6 0L12 6L6 12L0 6Z" fill="none" stroke="#2C4058" strokeWidth=".8" />
      </pattern>
      <pattern id="pois" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#6B2346" />
        <circle cx="5" cy="5" r="1.1" fill="#7E2C54" />
      </pattern>
      <pattern id="orient" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#1E4A4A" />
        <path d="M8 1Q12 8 8 15Q4 8 8 1Z" fill="none" stroke="#C9A24A" strokeWidth=".6" opacity=".6" />
      </pattern>
      <pattern id="bois" width="20" height="6" patternUnits="userSpaceOnUse">
        <rect width="20" height="6" fill="#3A2418" />
        <path d="M0 5.5H20" stroke="#2A180F" strokeWidth=".8" />
      </pattern>
      <filter id="lueur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="velours" width="8" height="10" patternUnits="userSpaceOnUse">
        <rect width="8" height="10" fill="#6A0C25" />
        <rect width="3" height="10" fill="#8C1733" />
        <rect x="6.4" width="1.2" height="10" fill="#4A0619" />
      </pattern>
      <filter id="flou">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
    </defs>
  );
}
