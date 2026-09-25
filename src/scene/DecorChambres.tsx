/** Décor propre à chaque chambre, repris du prototype. */
export function DecorChambre({ id }: { id: string }) {
  switch (id) {
    case 'boudoir':
      return (
        <g>
          <rect x="96" y="76" width="202" height="72" fill="url(#pois)" />
          <path d="M100 84Q197 102 294 84" stroke="#3A1426" strokeWidth=".6" fill="none" />
          <g fill="#F6C878">
            <circle cx="118" cy="88" r="1.5" />
            <circle cx="140" cy="92" r="1.5" />
            <circle cx="162" cy="95" r="1.5" />
            <circle cx="232" cy="95" r="1.5" />
            <circle cx="254" cy="92" r="1.5" />
            <circle cx="276" cy="88" r="1.5" />
          </g>
          <circle cx="197" cy="128" r="40" fill="url(#halo)" opacity=".6" />
          <path d="M165 140A32 28 0 0 1 229 140Z" fill="#C23B6B" />
          <ellipse cx="197" cy="142" rx="40" ry="6" fill="#F2D2C0" />
          <path d="M160 142Q197 152 234 142Q226 148 197 148Q168 148 160 142Z" fill="#FF4F8B" opacity=".75" />
        </g>
      );
    case 'orientale':
      return (
        <g>
          <rect x="302" y="76" width="202" height="72" fill="url(#orient)" />
          <g fill="#F6C878">
            <path d="M340 84V92M336 92H344L342 100H338Z" />
            <path d="M466 84V92M462 92H470L468 100H464Z" />
          </g>
          <circle cx="340" cy="98" r="12" fill="url(#chaud)" />
          <circle cx="466" cy="98" r="12" fill="url(#chaud)" />
          <rect x="360" y="130" width="90" height="12" rx="4" fill="#C9A24A" />
          <rect x="364" y="124" width="22" height="9" rx="4" fill="#B0294F" />
          <rect x="390" y="124" width="22" height="9" rx="4" fill="#2E6E6A" />
          <rect x="416" y="124" width="22" height="9" rx="4" fill="#7A1F35" />
        </g>
      );
    case 'velours':
      return (
        <g>
          <rect x="96" y="156" width="202" height="72" fill="url(#damas)" />
          <rect x="182" y="164" width="30" height="18" fill="#2A1218" stroke="#D4A64A" strokeWidth="1.5" />
          <path d="M186 178Q192 168 198 174T208 170" stroke="#FF4F8B" strokeWidth="1.2" fill="none" />
          <circle cx="112" cy="184" r="13" fill="url(#chaud)" />
          <circle cx="282" cy="184" r="13" fill="url(#chaud)" />
          <path d="M160 206V190Q197 180 234 190V206Z" fill="#8A2143" />
          <rect x="156" y="204" width="82" height="10" rx="3" fill="#F2D2C0" />
          <rect x="156" y="209" width="82" height="9" rx="2" fill="#B0294F" />
        </g>
      );
    case 'miroirs':
      return (
        <g>
          <rect x="302" y="156" width="202" height="72" fill="url(#losanges)" />
          <g stroke="#D4A64A" strokeWidth="1.1">
            <ellipse cx="370" cy="178" rx="8" ry="11" fill="url(#argent)" />
            <ellipse cx="403" cy="173" rx="9" ry="12" fill="url(#argent)" />
            <ellipse cx="436" cy="178" rx="8" ry="11" fill="url(#argent)" />
          </g>
          <path d="M364 206V192H442V206Z" fill="#141420" />
          <rect x="362" y="204" width="82" height="10" rx="3" fill="#F2D2C0" />
          <rect x="362" y="209" width="82" height="9" rx="2" fill="#FF4F8B" opacity=".85" />
        </g>
      );
    default:
      return null;
  }
}
