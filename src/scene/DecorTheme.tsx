import { trouverTheme } from '../content/themes';
import { TEXTES } from '../content/textes';

/** Le salon habillé pour la soirée à thème, et une affichette dans la vitrine de droite. Purement visuel. */
export function DecorTheme({ id }: { id: string }) {
  const theme = trouverTheme(id);
  if (!theme) return null;
  const { principale, accent } = theme.couleurs;
  return (
    <g className="decor-theme" pointerEvents="none">
      {/* Lumière du salon aux couleurs du thème */}
      <rect x="96" y="236" width="234" height="70" fill={accent} opacity=".08" />
      {/* Guirlande commune, puis l'accessoire propre au thème */}
      <path d="M100 242Q155 254 213 242Q271 254 326 242" stroke={accent} strokeWidth="1" fill="none" opacity=".8" />
      {id === 'masquee' &&
        [130, 190, 250, 300].map((x) => (
          <g key={x} transform={`translate(${x} 250)`}>
            <path d="M-7 0Q-7 -4 -2 -3L0 -1L2 -3Q7 -4 7 0Q6 4 2 3L0 1L-2 3Q-6 4 -7 0Z" fill={principale} stroke={accent} strokeWidth=".7" />
          </g>
        ))}
      {id === 'burlesque' &&
        [120, 160, 200, 240, 280, 316].map((x, i) => (
          <path key={x} d={`M${x} 246q3 ${4 + (i % 2) * 3} 0 ${9 + (i % 3) * 2}`} stroke={accent} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".85" />
        ))}
      {id === 'jazz' && (
        <g fill={accent} opacity=".9">
          {[
            [140, 252],
            [175, 258],
            [250, 250],
            [290, 256],
          ].map(([x, y]) => (
            <g key={x}>
              <ellipse cx={x} cy={y! + 5} rx="2.2" ry="1.6" />
              <path d={`M${x! + 2} ${y! + 5}V${y}l4 1.5`} stroke={accent} strokeWidth=".9" fill="none" />
            </g>
          ))}
        </g>
      )}
      {id === 'anneesFolles' && (
        <g stroke={accent} strokeWidth=".8" fill="none" opacity=".9">
          {[140, 213, 286].map((x) => (
            <g key={x}>
              <path d={`M${x - 10} 254A10 10 0 0 1 ${x + 10} 254`} />
              <path d={`M${x} 254V245M${x - 7} 254L${x - 5} 247M${x + 7} 254L${x + 5} 247`} />
            </g>
          ))}
        </g>
      )}
      {/* Affichette dans la vitrine de droite */}
      <rect x="392" y="337" width="66" height="24" rx="2" fill={principale} stroke={accent} strokeWidth="1" />
      <text x="425" y="346" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="5.5" fill="#F4DCC8">
        {TEXTES.scene.ceSoir}
      </text>
      <text x="425" y="355" textAnchor="middle" fontFamily="Yellowtail, 'Brush Script MT', cursive" fontSize="8.5" fill={accent}>
        {theme.nom}
      </text>
    </g>
  );
}
