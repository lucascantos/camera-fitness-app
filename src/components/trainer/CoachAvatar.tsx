// SVG portrait of "Coach" — stoic, focused, sport vibe.
// No asset files, scales crisp at any size. Two layouts:
//   chip     — square 100×100, head & chest only (avatar pills, picker)
//   portrait — 220×340, head/torso/arms hint (TrainerPanel)

interface Props {
  size?: number;
  /** Talking adds a soft halo around the head. */
  talking?: boolean;
  orientation?: "chip" | "portrait";
}

export function CoachAvatar({
  size = 96,
  talking = false,
  orientation = "chip",
}: Props) {
  if (orientation === "portrait") {
    return <CoachPortrait height={size} talking={talking} />;
  }
  return <CoachChip size={size} talking={talking} />;
}

// ── Chip (square) ──────────────────────────────────────────────────────────
function CoachChip({ size, talking }: { size: number; talking: boolean }) {
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
        <radialGradient id="halo-chip" cx="50%" cy="50%" r="50%">
          <stop offset="60%"  stopColor="rgba(216,32,44,0)" />
          <stop offset="100%" stopColor="rgba(216,32,44,0.45)" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="#1A1330" />
      {talking && <circle cx="50" cy="44" r="44" fill="url(#halo-chip)" />}

      {/* Neck */}
      <rect x="42" y="58" width="16" height="12" fill="#D9A57E" />
      {/* Shirt */}
      <path d="M 18 100 Q 18 76 36 70 L 64 70 Q 82 76 82 100 Z" fill="#D8202C" />
      <path d="M 36 70 Q 50 78 64 70 L 64 74 Q 50 80 36 74 Z" fill="#B81A24" />
      {/* Whistle */}
      <path d="M 42 70 Q 50 86 60 76" stroke="#F2B84B" strokeWidth="1.2" fill="none" />
      <rect x="55" y="74" width="9" height="5" rx="2" fill="#F2B84B" />
      <rect x="63" y="75" width="2" height="3" fill="#A47A2A" />
      {/* Head */}
      <ellipse cx="50" cy="42" rx="18" ry="20" fill="#E8B894" />
      <ellipse cx="31" cy="44" rx="2.5" ry="3.5" fill="#D9A57E" />
      <ellipse cx="69" cy="44" rx="2.5" ry="3.5" fill="#D9A57E" />
      {/* Cap */}
      <path d="M 30 32 Q 50 20 70 32 L 70 38 L 30 38 Z" fill="#1A1330" />
      <path d="M 28 38 Q 50 42 72 38 L 72 41 Q 50 45 28 41 Z" fill="#0F0A1F" />
      <rect x="48" y="24" width="4" height="14" fill="#D8202C" />
      {/* Sunglasses */}
      <path d="M 36 46 L 46 46 L 46 51 Q 46 53 44 53 L 38 53 Q 36 53 36 51 Z" fill="#1A1330" />
      <path d="M 54 46 L 64 46 L 64 51 Q 64 53 62 53 L 56 53 Q 54 53 54 51 Z" fill="#1A1330" />
      <line x1="46" y1="48" x2="54" y2="48" stroke="#1A1330" strokeWidth="1.5" />
      {/* Mouth */}
      <path d="M 44 58 Q 50 60 56 58" stroke="#A06B4E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ── Portrait (taller, shows arms/torso) ────────────────────────────────────
function CoachPortrait({ height, talking }: { height: number; talking: boolean }) {
  const width = (height * 220) / 340;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 220 340"
      role="img"
      aria-label="Coach"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="halo-port" cx="50%" cy="25%" r="40%">
          <stop offset="55%"  stopColor="rgba(216,32,44,0)" />
          <stop offset="100%" stopColor="rgba(216,32,44,0.45)" />
        </radialGradient>
      </defs>

      {/* Talking halo around the head */}
      {talking && <circle cx="110" cy="90" r="95" fill="url(#halo-port)" />}

      {/* ── Body ──────────────────────────────────────────────── */}
      {/* Hips / lower torso (peeking from the bottom) */}
      <path
        d="M 60 340 L 60 280 Q 110 250 160 280 L 160 340 Z"
        fill="#0F0A1F"
      />
      {/* Shirt (chest + arms) */}
      <path
        d="M 35 340
           L 35 220
           Q 35 200 60 192
           L 80 184
           Q 110 180 140 184
           L 160 192
           Q 185 200 185 220
           L 185 340 Z"
        fill="#D8202C"
      />
      {/* Shirt vertical accent stripe */}
      <rect x="107" y="184" width="6" height="156" fill="#FFFFFF" opacity="0.18" />
      {/* Sleeve hems */}
      <rect x="35"  y="226" width="20" height="6" rx="2" fill="#B81A24" />
      <rect x="165" y="226" width="20" height="6" rx="2" fill="#B81A24" />
      {/* Collar */}
      <path
        d="M 80 184 Q 110 200 140 184 L 140 192 Q 110 208 80 192 Z"
        fill="#B81A24"
      />

      {/* Whistle string */}
      <path
        d="M 88 196 Q 110 240 142 210"
        stroke="#F2B84B" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      {/* Whistle body */}
      <rect x="132" y="206" width="22" height="11" rx="4" fill="#F2B84B" />
      <rect x="152" y="208" width="4" height="7" fill="#A47A2A" />

      {/* ── Head ──────────────────────────────────────────────── */}
      {/* Neck */}
      <rect x="98" y="160" width="24" height="28" fill="#D9A57E" />
      {/* Head shape */}
      <ellipse cx="110" cy="100" rx="48" ry="58" fill="#E8B894" />
      {/* Ears */}
      <ellipse cx="62"  cy="106" rx="6" ry="10" fill="#D9A57E" />
      <ellipse cx="158" cy="106" rx="6" ry="10" fill="#D9A57E" />

      {/* Cap */}
      <path
        d="M 58 68 Q 110 36 162 68 L 162 84 L 58 84 Z"
        fill="#1A1330"
      />
      <path
        d="M 50 84 Q 110 96 170 84 L 170 90 Q 110 102 50 90 Z"
        fill="#0F0A1F"
      />
      {/* Cap centre stripe */}
      <rect x="106" y="48" width="8" height="36" fill="#D8202C" />

      {/* Sunglasses */}
      <path
        d="M 70 110 L 100 110 L 100 124 Q 100 128 96 128 L 74 128 Q 70 128 70 124 Z"
        fill="#1A1330"
      />
      <path
        d="M 120 110 L 150 110 L 150 124 Q 150 128 146 128 L 124 128 Q 120 128 120 124 Z"
        fill="#1A1330"
      />
      {/* Bridge */}
      <line x1="100" y1="115" x2="120" y2="115" stroke="#1A1330" strokeWidth="3" />
      {/* Lens highlights */}
      <line x1="76"  y1="114" x2="86"  y2="114" stroke="#3A2D5F" strokeWidth="1.5" />
      <line x1="126" y1="114" x2="136" y2="114" stroke="#3A2D5F" strokeWidth="1.5" />

      {/* Stubble shading */}
      <ellipse cx="110" cy="146" rx="22" ry="6" fill="#D9A57E" opacity="0.55" />
      {/* Mouth */}
      <path
        d="M 100 144 Q 110 148 120 144"
        stroke="#A06B4E" strokeWidth="2.4" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}
