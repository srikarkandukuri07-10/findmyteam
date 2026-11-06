const SPARKLES = [
  { x: 210, y: 52, size: 10, delay: "0s" },
  { x: 440, y: 168, size: 8, delay: "0.7s" },
  { x: 118, y: 200, size: 7, delay: "1.3s" },
  { x: 530, y: 30, size: 9, delay: "1.9s" },
  { x: 300, y: 24, size: 6, delay: "2.4s" },
];

/**
 * The home banner illustration: three students building together at a laptop, with a code tile,
 * an idea bulb and a trophy floating around them. Drawn in FMT's palette; the floating and
 * twinkling come from the .float / .float-slow / .twinkle / .type-line classes in globals.css.
 */
export function BannerArt({ className = "" }: { className?: string }) {
  const skin = "#efc7a4";
  const skinShade = "#e2b08b";
  const hair = "#2a2338";
  const ink = "#1f1d24";
  return (
    <svg viewBox="0 0 560 320" className={className} role="img" aria-label="Three students building a project together">
      <defs>
        <linearGradient id="ba-blob" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e4ddf0" />
          <stop offset="1" stopColor="#cfc2ea" />
        </linearGradient>
        <linearGradient id="ba-hoodie-a" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4a3f6b" />
          <stop offset="1" stopColor="#2f2848" />
        </linearGradient>
        <linearGradient id="ba-hoodie-b" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#c3b2ea" />
          <stop offset="1" stopColor="#a18ccd" />
        </linearGradient>
        <linearGradient id="ba-hoodie-c" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8f7ac6" />
          <stop offset="1" stopColor="#66549f" />
        </linearGradient>
        <linearGradient id="ba-screen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5a4b8f" />
          <stop offset="1" stopColor="#3b3163" />
        </linearGradient>
        <linearGradient id="ba-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d9c9f5" />
          <stop offset="1" stopColor="#9a83d4" />
        </linearGradient>
      </defs>

      {/* Soft shapes behind */}
      <path d="M70 250C40 170 90 70 200 52s210 0 280 60 60 150-10 170-370 40-400-32z" fill="url(#ba-blob)" opacity="0.85" />
      <circle cx="470" cy="70" r="46" fill="#e4ddf0" opacity="0.7" />
      <path d="M455 205c40-30 95-12 92 30" stroke="#a18ccd" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />

      {/* Middle student, behind the laptop */}
      <g>
        <path d="M222 250c4-58 28-92 58-92s54 34 58 92z" fill="url(#ba-hoodie-b)" />
        <path d="M262 160c6 10 30 10 36 0" stroke="#8f7ac6" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="270" y="132" width="20" height="24" rx="8" fill={skinShade} />
        <circle cx="280" cy="108" r="31" fill={skin} />
        <path d="M249 106c-3-28 16-44 36-42 22 2 34 20 28 44-8-14-22-20-36-18-12 2-20 8-28 16z" fill={hair} />
        <path d="M309 100c14 6 18 26 6 40" stroke={hair} strokeWidth="11" fill="none" strokeLinecap="round" />
        <circle cx="269" cy="112" r="3.2" fill={ink} />
        <circle cx="292" cy="112" r="3.2" fill={ink} />
        <path d="M271 124c5 5 14 5 19 0" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="262" cy="121" r="4" fill="#f2a7a7" opacity="0.55" />
        <circle cx="299" cy="121" r="4" fill="#f2a7a7" opacity="0.55" />
      </g>

      {/* Desk and laptop */}
      <rect x="120" y="248" width="330" height="14" rx="7" fill="#c9bfe0" />
      <g>
        <rect x="205" y="152" width="150" height="94" rx="10" fill="url(#ba-screen)" />
        <rect x="213" y="160" width="134" height="78" rx="6" fill="#2b2447" />
        <rect className="type-line" x="222" y="172" width="64" height="6" rx="3" fill="#a18ccd" />
        <rect className="type-line" style={{ animationDelay: "0.6s" }} x="222" y="186" width="92" height="6" rx="3" fill="#e4ddf0" opacity="0.8" />
        <rect className="type-line" style={{ animationDelay: "1.2s" }} x="232" y="200" width="54" height="6" rx="3" fill="#c3b2ea" />
        <rect className="type-line" style={{ animationDelay: "1.8s" }} x="232" y="214" width="76" height="6" rx="3" fill="#a18ccd" opacity="0.8" />
        <path d="M190 246h180l-12 10H202z" fill="#8f7ac6" />
        <circle cx="280" cy="199" r="9" fill="none" stroke="#f6f4e8" strokeWidth="2" opacity="0.25" />
      </g>

      {/* Left student, with glasses */}
      <g>
        <path d="M96 262c2-56 26-86 56-86s52 30 56 86z" fill="url(#ba-hoodie-a)" />
        <path d="M188 214c18 6 26 18 30 30" stroke="#3c3459" strokeWidth="16" fill="none" strokeLinecap="round" />
        <circle cx="220" cy="246" r="8" fill={skin} />
        <rect x="142" y="150" width="20" height="24" rx="8" fill={skinShade} />
        <circle cx="152" cy="128" r="31" fill={skin} />
        <path d="M120 126c-6-30 20-46 42-40 18 4 28 18 23 34-6-8-14-10-22-9 6 4 7 10 5 14-8-8-22-10-34-6-6 2-10 4-14 7z" fill={hair} />
        <circle cx="141" cy="133" r="8.5" fill="none" stroke={ink} strokeWidth="2.4" />
        <circle cx="164" cy="133" r="8.5" fill="none" stroke={ink} strokeWidth="2.4" />
        <path d="M149.5 133h6" stroke={ink} strokeWidth="2.4" />
        <circle cx="141" cy="133" r="2.6" fill={ink} />
        <circle cx="164" cy="133" r="2.6" fill={ink} />
        <path d="M145 146c4 4 10 4 14 0" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>

      {/* Right student */}
      <g>
        <path d="M352 262c2-56 26-86 56-86s52 30 56 86z" fill="url(#ba-hoodie-c)" />
        <path d="M372 214c-18 6-26 18-30 30" stroke="#6f5bab" strokeWidth="16" fill="none" strokeLinecap="round" />
        <circle cx="340" cy="246" r="8" fill={skin} />
        <rect x="398" y="150" width="20" height="24" rx="8" fill={skinShade} />
        <circle cx="408" cy="128" r="31" fill={skin} />
        <path d="M377 122c0-26 16-38 34-38 20 0 32 14 30 36-10-12-20-14-30-12-10 2-14 8-18 14-6-2-12-2-16 0z" fill={hair} />
        <path d="M393 132c2-3 7-3 9 0M414 132c2-3 7-3 9 0" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M398 143c5 6 13 6 18 0" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="391" cy="140" r="4" fill="#f2a7a7" opacity="0.55" />
        <circle cx="425" cy="140" r="4" fill="#f2a7a7" opacity="0.55" />
      </g>

      {/* Floating code tile */}
      <g className="float" style={{ transformOrigin: "86px 92px" }}>
        <rect x="56" y="62" width="62" height="58" rx="14" fill="#8f7ac6" transform="rotate(-10 87 91)" />
        <path d="M78 82l-9 9 9 9M96 82l9 9-9 9M90 78l-6 26" stroke="#f6f4e8" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-10 87 91)" />
      </g>

      {/* Idea bulb */}
      <g className="float-slow" style={{ transformOrigin: "352px 40px", animationDelay: "0.8s" }}>
        <circle cx="352" cy="40" r="24" fill="#f6f4e8" opacity="0.7" />
        <path d="M352 20c-11 0-19 8-19 18 0 7 4 11 8 15 2 2 3 5 3 8h16c0-3 1-6 3-8 4-4 8-8 8-15 0-10-8-18-19-18z" fill="#fff6d8" stroke="#a18ccd" strokeWidth="2.4" />
        <path d="M345 66h14M347 71h10" stroke="#8f7ac6" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M346 42l6 6 6-6" stroke="#e0b44f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>

      {/* Trophy */}
      <g className="float" style={{ transformOrigin: "500px 120px", animationDelay: "1.4s" }}>
        <path d="M484 96h32v14c0 12-7 20-16 20s-16-8-16-20z" fill="url(#ba-gold)" />
        <path d="M484 100h-8c0 10 4 16 10 16M516 100h8c0 10-4 16-10 16" stroke="#9a83d4" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <rect x="496" y="130" width="8" height="10" fill="#9a83d4" />
        <rect x="488" y="140" width="24" height="7" rx="3" fill="#7d68b8" />
      </g>

      {/* Sparkles */}
      {SPARKLES.map(({ x, y, size, delay }) => (
        // The position lives on the group, so the CSS scale on the star never moves it.
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${size})`}>
          <path
            className="twinkle"
            style={{ animationDelay: delay, transformBox: "fill-box", transformOrigin: "center" }}
            d="M0-1C.12-.12.12-.12 1 0 .12.12.12.12 0 1-.12.12-.12.12-1 0-.12-.12-.12-.12 0-1z"
            fill="#a18ccd"
          />
        </g>
      ))}
    </svg>
  );
}
