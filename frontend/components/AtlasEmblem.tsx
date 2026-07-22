"use client";

/**
 * Original ATLAS emblem — a custom heraldic mark (not the trademarked game logo).
 * Concentric orbital rings + an upward "A" chevron of a load-bearing titan,
 * echoing the "Atlas holding the world" idea. Pure animated SVG.
 */
export default function AtlasEmblem({ size = 96, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0"
      role="img"
      aria-label="ATLAS emblem"
    >
      <defs>
        <radialGradient id="atlasCore" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#ffcf7a" />
          <stop offset="55%" stopColor="#e8a33d" />
          <stop offset="100%" stopColor="#8a5a12" />
        </radialGradient>
        <linearGradient id="atlasChevron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe0a3" />
          <stop offset="100%" stopColor="#e8a33d" />
        </linearGradient>
        <filter id="atlasGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* outer tick ring — slow spin */}
      <g style={{ transformOrigin: "50px 50px", animation: "atlasSpin 26s linear infinite" }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1f262e" strokeWidth="1" />
        {Array.from({ length: 48 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="4"
            x2="50"
            y2={i % 4 === 0 ? 9 : 7}
            stroke={i % 4 === 0 ? "#e8a33d" : "#4a5560"}
            strokeWidth={i % 4 === 0 ? 1 : 0.6}
            transform={`rotate(${i * 7.5} 50 50)`}
          />
        ))}
      </g>

      {/* mid orbital ring — counter spin, dashed */}
      <g style={{ transformOrigin: "50px 50px", animation: "atlasSpinRev 18s linear infinite" }}>
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#37d5e5"
          strokeWidth="0.8"
          strokeDasharray="3 6"
          opacity="0.6"
        />
      </g>

      {/* inner ring + glowing hub */}
      <circle cx="50" cy="50" r="30" fill="none" stroke="#e8a33d" strokeWidth="1.2" opacity="0.85" />
      <circle
        cx="50"
        cy="50"
        r="30"
        fill="none"
        stroke="#37d5e5"
        strokeWidth="0.6"
        opacity={active ? "0.9" : "0.3"}
        style={active ? { animation: "atlasPulse 1.6s ease-in-out infinite" } : undefined}
      />

      {/* the ATLAS chevron — a stylized load-bearing "A" */}
      <g filter="url(#atlasGlow)">
        <path
          d="M50 30 L64 68 L56 68 L50 50 L44 68 L36 68 Z"
          fill="url(#atlasChevron)"
        />
        {/* crossbar + world-bearing arc */}
        <path d="M43 58 L57 58" stroke="#0b0e10" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M38 40 A16 16 0 0 1 62 40"
          fill="none"
          stroke="url(#atlasCore)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* corner registration marks */}
      {[
        [12, 12, 1, 1],
        [88, 12, -1, 1],
        [12, 88, 1, -1],
        [88, 88, -1, -1],
      ].map(([x, y, dx, dy], i) => (
        <path
          key={i}
          d={`M${x} ${y + dy * 6} L${x} ${y} L${x + dx * 6} ${y}`}
          fill="none"
          stroke="#e8a33d"
          strokeWidth="1"
          opacity="0.7"
        />
      ))}
    </svg>
  );
}
