// SVG portrait of "Coach" — stoic, focused, sport vibe.
// No asset files, scales crisp at any size.

interface Props {
  size?: number;
  /** Idle / talking pose — talking adds a subtle highlight around the head. */
  talking?: boolean;
}

export function CoachAvatar({ size = 96, talking = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Coach"
      style={{ display: "block" }}
    >
      <defs>
        {/* Soft halo for the talking state */}
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(216,32,44,0)" />
          <stop offset="100%" stopColor="rgba(216,32,44,0.45)" />
        </radialGradient>
      </defs>

      {/* Card background */}
      <rect width="100" height="100" rx="22" fill="#1A1330" />

      {/* Talking halo */}
      {talking && (
        <circle cx="50" cy="44" r="44" fill="url(#halo)" />
      )}

      {/* Neck */}
      <rect x="42" y="58" width="16" height="12" fill="#D9A57E" />

      {/* Shirt (accent red) */}
      <path
        d="M 18 100 Q 18 76 36 70 L 64 70 Q 82 76 82 100 Z"
        fill="#D8202C"
      />
      {/* Shirt collar */}
      <path
        d="M 36 70 Q 50 78 64 70 L 64 74 Q 50 80 36 74 Z"
        fill="#B81A24"
      />

      {/* Whistle string */}
      <path
        d="M 42 70 Q 50 86 60 76"
        stroke="#F2B84B"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Whistle */}
      <rect x="55" y="74" width="9" height="5" rx="2" fill="#F2B84B" />
      <rect x="63" y="75" width="2" height="3" fill="#A47A2A" />

      {/* Head */}
      <ellipse cx="50" cy="42" rx="18" ry="20" fill="#E8B894" />

      {/* Ears */}
      <ellipse cx="31" cy="44" rx="2.5" ry="3.5" fill="#D9A57E" />
      <ellipse cx="69" cy="44" rx="2.5" ry="3.5" fill="#D9A57E" />

      {/* Cap (sport hat) */}
      <path
        d="M 30 32 Q 50 20 70 32 L 70 38 L 30 38 Z"
        fill="#1A1330"
        stroke="#3A2D5F"
        strokeWidth="0.5"
      />
      {/* Cap brim */}
      <path
        d="M 28 38 Q 50 42 72 38 L 72 41 Q 50 45 28 41 Z"
        fill="#0F0A1F"
      />
      {/* Cap accent stripe */}
      <rect x="48" y="24" width="4" height="14" fill="#D8202C" />

      {/* Sunglasses — frame */}
      <path
        d="M 36 46 L 46 46 L 46 51 Q 46 53 44 53 L 38 53 Q 36 53 36 51 Z"
        fill="#1A1330"
      />
      <path
        d="M 54 46 L 64 46 L 64 51 Q 64 53 62 53 L 56 53 Q 54 53 54 51 Z"
        fill="#1A1330"
      />
      {/* Bridge */}
      <line x1="46" y1="48" x2="54" y2="48" stroke="#1A1330" strokeWidth="1.5" />

      {/* Lens highlight */}
      <line x1="38" y1="47" x2="42" y2="47" stroke="#3A2D5F" strokeWidth="0.8" />
      <line x1="56" y1="47" x2="60" y2="47" stroke="#3A2D5F" strokeWidth="0.8" />

      {/* Mouth — neutral set */}
      <path
        d="M 44 58 Q 50 60 56 58"
        stroke="#A06B4E"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Stubble shading */}
      <ellipse cx="50" cy="56" rx="9" ry="3" fill="#D9A57E" opacity="0.5" />
    </svg>
  );
}
