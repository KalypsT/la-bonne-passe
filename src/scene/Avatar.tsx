interface Props {
  avatar: string;
  taille?: number;
}

/**
 * Portrait provisoire : un buste vectoriel simple.
 * Les 6 avatars détaillés arriveront avec l'écran de création du personnage.
 */
export function Avatar({ avatar, taille = 48 }: Props) {
  const patronne = avatar.startsWith('patronne');
  return (
    <svg className="avatar" width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#5C1530" stroke="#D4A64A" strokeWidth="2" />
      {patronne && <path d="M17 34 C15 16 49 16 47 34 L47 44 L17 44 Z" fill="#2A1520" />}
      <path d="M12 60 C14 46 50 46 52 60 Z" fill={patronne ? '#FF4F8B' : '#0E2229'} />
      <circle cx="32" cy="29" r="11" fill="#E9B99A" />
      {patronne ? (
        <path d="M21 27 C21 15 43 15 43 27 C38 22 28 22 21 27 Z" fill="#2A1520" />
      ) : (
        <path d="M21 26 C21 16 43 16 43 26 C39 21 26 21 21 26 Z" fill="#3B2A22" />
      )}
    </svg>
  );
}
