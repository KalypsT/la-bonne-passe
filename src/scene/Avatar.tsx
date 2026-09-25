import { useId } from 'react';
import {
  trouverAvatar,
  type Accessoire,
  type DefinitionAvatar,
  type FormeCoiffure,
  type Tenue,
} from '../content/avatars';

interface Props {
  avatar: string;
  tenue?: number;
  taille?: number;
}

const ENCRE = '#1A1014';
const OR = '#D4A64A';

/** Portrait vectoriel du joueur, assemblé à partir des pièces décrites dans src/content/avatars.ts. */
export function Avatar({ avatar, tenue = 0, taille = 48 }: Props) {
  const def = trouverAvatar(avatar);
  const habit = def.tenues[tenue === 1 ? 1 : 0];
  const clip = useId();

  return (
    <svg className="avatar" width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#3A1426" stroke={OR} strokeWidth="2" />
      <g clipPath={`url(#${clip})`}>
        <circle cx="32" cy="18" r="26" fill="#5C1530" opacity=".7" />
        <CheveuxArriere forme={def.coiffure} couleur={def.cheveux} />
        <rect x="28" y="33" width="8" height="12" rx="3" fill={def.teint} />
        <path d="M28 40 Q32 43 36 40 L36 44 L28 44 Z" fill="#000" opacity=".15" />
        <Habit tenue={habit} teint={def.teint} />
        <Visage def={def} />
        <CheveuxAvant forme={def.coiffure} couleur={def.cheveux} />
        {def.accessoires.map((a) => (
          <AccessoireSvg key={a} accessoire={a} tenue={habit} />
        ))}
      </g>
    </svg>
  );
}

function CheveuxArriere({ forme, couleur }: { forme: FormeCoiffure; couleur: string }) {
  switch (forme) {
    case 'longue':
      return <path d="M20 27 C17 11 47 11 44 27 C47 37 49 46 46 54 L18 54 C15 46 17 37 20 27 Z" fill={couleur} />;
    case 'carre':
      return <path d="M20 25 C19 11 45 11 44 25 L46 39 C40 42 24 42 18 39 Z" fill={couleur} />;
    case 'boucles':
      return (
        <g fill={couleur}>
          <circle cx="32" cy="20" r="15" />
          <circle cx="19" cy="25" r="7" />
          <circle cx="45" cy="25" r="7" />
          <circle cx="20" cy="33" r="5.5" />
          <circle cx="44" cy="33" r="5.5" />
        </g>
      );
    default:
      return null;
  }
}

function CheveuxAvant({ forme, couleur }: { forme: FormeCoiffure; couleur: string }) {
  switch (forme) {
    case 'longue':
      return (
        <g fill={couleur}>
          <path d="M22 27 C21 14 40 12 43 24 C38 21 33 17 29 17 C27 21 25 24 22 27 Z" />
          <path d="M22 22 C20 30 21 38 23 44 L20 44 C18 37 18 28 22 22 Z" />
        </g>
      );
    case 'carre':
      return <path d="M21.5 26 C21 13 43 13 42.5 26 C40 23 36 22.5 32 22.5 C28 22.5 24 23 21.5 26 Z" fill={couleur} />;
    case 'boucles':
      return <path d="M22 25 C23 16 41 16 42 25 C38 21 26 21 22 25 Z" fill={couleur} />;
    case 'plaquee':
      return (
        <g>
          <path d="M22.5 25 C21.5 13 42.5 12.5 41.5 25 C39.5 19 33 18 28 19 C25 20 23.5 22 22.5 25 Z" fill={couleur} />
          <path d="M27 16.5 C31 15 36 15.5 39 18" stroke="#fff" strokeOpacity=".25" strokeWidth="1" fill="none" />
        </g>
      );
    case 'courte':
      return <path d="M22.5 26 C20.5 13 43.5 13 41.5 26 C40.5 21 37 19.5 32 19.5 C27 19.5 23.5 21 22.5 26 Z" fill={couleur} />;
    case 'degarnie':
      return (
        <g fill={couleur}>
          <path d="M22.4 28 C21.5 21 23 17.5 25.5 16.5 C24.8 19.5 24.3 23 24 28 Z" />
          <path d="M41.6 28 C42.5 21 41 17.5 38.5 16.5 C39.2 19.5 39.7 23 40 28 Z" />
          <path d="M25.5 16.5 C29 14.5 35 14.5 38.5 16.5 C35 16 29 16 25.5 16.5 Z" />
        </g>
      );
  }
}

function Visage({ def }: { def: DefinitionAvatar }) {
  const feminin = def.genre === 'patronne';
  const levres = def.accessoires.includes('rouge-levres');
  return (
    <g>
      <ellipse cx="22.4" cy="28.5" rx="1.8" ry="2.6" fill={def.teint} />
      <ellipse cx="41.6" cy="28.5" rx="1.8" ry="2.6" fill={def.teint} />
      <ellipse cx="32" cy="27" rx="9.6" ry="11.6" fill={def.teint} />
      {/* Sourcils */}
      <g stroke={ENCRE} strokeWidth={feminin ? 0.9 : 1.3} strokeLinecap="round" fill="none" opacity=".85">
        <path d="M26 23.6 Q28 22.4 30 23.4" />
        <path d="M34 23.4 Q36 22.4 38 23.6" />
      </g>
      {/* Yeux */}
      <g fill={ENCRE}>
        <ellipse cx="28" cy="26.6" rx="1.25" ry={feminin ? 1.15 : 1} />
        <ellipse cx="36" cy="26.6" rx="1.25" ry={feminin ? 1.15 : 1} />
      </g>
      {feminin && (
        <g stroke={ENCRE} strokeWidth=".7" strokeLinecap="round">
          <path d="M26.6 25.8 L26 25.2" />
          <path d="M37.4 25.8 L38 25.2" />
        </g>
      )}
      {/* Nez */}
      <path d="M32 27.5 L31 31.4 Q32 32 33 31.4" stroke="#000" strokeOpacity=".22" strokeWidth=".9" fill="none" />
      {/* Joues */}
      <circle cx="26.5" cy="31" r="2" fill="#FF4F8B" opacity={feminin ? 0.18 : 0.08} />
      <circle cx="37.5" cy="31" r="2" fill="#FF4F8B" opacity={feminin ? 0.18 : 0.08} />
      {def.pilosite === 'barbe' && (
        <path
          d="M22.6 27 C22.6 37 27 40.5 32 40.5 C37 40.5 41.4 37 41.4 27 C40.5 31 38 34.5 32 34.5 C26 34.5 23.5 31 22.6 27 Z"
          fill={def.cheveux}
        />
      )}
      {def.pilosite && (
        <path d="M28.4 33.1 Q32 31.3 35.6 33.1 Q32 34.2 28.4 33.1 Z" fill={def.cheveux} />
      )}
      {/* Bouche */}
      {levres ? (
        <path d="M29.4 34.6 Q31 33.6 32 34.2 Q33 33.6 34.6 34.6 Q32 36.8 29.4 34.6 Z" fill="#C3143F" />
      ) : (
        <path
          d="M29.6 34.8 Q32 36.2 34.4 34.8"
          stroke={def.pilosite === 'barbe' ? '#E9A48F' : '#8A4A3E'}
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </g>
  );
}

const EPAULES = 'M4 64 C6 50 17 45 32 45 C47 45 58 50 60 64 Z';

function Habit({ tenue, teint }: { tenue: Tenue; teint: string }) {
  switch (tenue.forme) {
    case 'robe':
      return (
        <g>
          <path d={EPAULES} fill={teint} />
          <path d="M13 64 C14 56 18 51 23 50 Q32 56 41 50 C46 51 50 56 51 64 Z" fill={tenue.couleur} />
          <path d="M23 50 L21.5 45.5 M41 50 L42.5 45.5" stroke={tenue.couleur} strokeWidth="1.4" />
        </g>
      );
    case 'cuir':
      return (
        <g>
          <path d={EPAULES} fill={tenue.couleur} />
          <path d="M26 45 L32 58 L38 45 Z" fill={tenue.accent} />
          <path d="M26 45 L22 52 L27 53 L32 60 M38 45 L42 52 L37 53 L32 60" stroke="#000" strokeOpacity=".45" strokeWidth="1" fill="none" />
          <path d="M16 52 Q18 50 20 51" stroke="#fff" strokeOpacity=".2" strokeWidth="1" fill="none" />
        </g>
      );
    case 'tailleur':
      return (
        <g>
          <path d={EPAULES} fill={tenue.couleur} />
          <path d="M26.5 45 L32 57 L37.5 45 Z" fill={tenue.accent} />
          <path d="M26.5 45 L24 53 L32 60 M37.5 45 L40 53 L32 60" stroke="#000" strokeOpacity=".3" strokeWidth="1" fill="none" />
        </g>
      );
    case 'costume':
      return (
        <g>
          <path d={EPAULES} fill={tenue.couleur} />
          <path d="M27 45 L32 58 L37 45 Z" fill="#F4F0EA" />
          <path d="M27 45 L24.5 52 L32 61 M37 45 L39.5 52 L32 61" stroke="#000" strokeOpacity=".35" strokeWidth="1" fill="none" />
        </g>
      );
    case 'col-roule':
      return (
        <g>
          <path d={EPAULES} fill={tenue.accent} />
          <path d="M22 46.5 C25 45.5 28 45 32 45 C36 45 39 45.5 42 46.5 L40 64 L24 64 Z" fill={tenue.couleur} />
          <rect x="26.5" y="40" width="11" height="7" rx="3" fill={tenue.couleur} />
          <path d="M27 42.5 H37 M27 44.5 H37" stroke="#000" strokeOpacity=".2" strokeWidth=".7" />
        </g>
      );
    case 'chemise':
      return (
        <g>
          <path d={EPAULES} fill={tenue.couleur} />
          <path d="M25.5 45 L32 60 L38.5 45 Z" fill={tenue.accent} />
          <path d="M28.5 44.5 L32 51 L35.5 44.5 Z" fill="#000" opacity=".12" />
          <path d="M25.5 45 L28.5 49.5 L30 45.5 M38.5 45 L35.5 49.5 L34 45.5" fill={tenue.accent} stroke="#000" strokeOpacity=".2" strokeWidth=".6" />
        </g>
      );
  }
}

function AccessoireSvg({ accessoire, tenue }: { accessoire: Accessoire; tenue: Tenue }) {
  switch (accessoire) {
    case 'perles':
      return (
        <g fill="#F7F1E6">
          {[-8, -5.4, -2.7, 0, 2.7, 5.4, 8].map((dx) => (
            <circle key={dx} cx={32 + dx} cy={45.2 + (dx * dx) / 22} r="1.15" />
          ))}
        </g>
      );
    case 'pendants':
      return (
        <g stroke={OR} strokeWidth=".8" fill={tenue.accent}>
          <path d="M22.3 31 V34.5 M41.7 31 V34.5" />
          <circle cx="22.3" cy="35.6" r="1.2" />
          <circle cx="41.7" cy="35.6" r="1.2" />
        </g>
      );
    case 'creoles':
      return (
        <g stroke={OR} strokeWidth="1" fill="none">
          <circle cx="21.8" cy="33.4" r="2.2" />
          <circle cx="42.2" cy="33.4" r="2.2" />
        </g>
      );
    case 'noeud':
      return (
        <g fill={tenue.accent}>
          <path d="M32 47.5 L27.5 45.2 L27.5 49.8 Z M32 47.5 L36.5 45.2 L36.5 49.8 Z" />
          <circle cx="32" cy="47.5" r="1.2" />
        </g>
      );
    case 'lunettes':
      return (
        <g stroke={OR} strokeWidth=".9" fill="#fff" fillOpacity=".12">
          <circle cx="28" cy="26.8" r="3" />
          <circle cx="36" cy="26.8" r="3" />
          <path d="M31 26.6 Q32 25.9 33 26.6 M25 26.4 L22.5 25.8 M39 26.4 L41.5 25.8" fill="none" />
        </g>
      );
    case 'rouge-levres':
      return null;
  }
}
