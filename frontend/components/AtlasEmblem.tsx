"use client";

/**
 * ATLAS emblem — an original upward-arrowhead "A" mark (not the trademarked
 * game logo). Reads clearly as an "A": a hollow steel chevron with a red
 * pinstripe and a solid red arrowhead core, wrapped in a subtle HUD ring.
 */
export default function AtlasEmblem({ size = 96, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="ATLAS emblem" className="shrink-0">
      <defs>
        <linearGradient id="atlasRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff4b3e" />
          <stop offset="100%" stopColor="#b81d16" />
        </linearGradient>
        <filter id="atlasRedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* subtle rotating HUD ring */}
      <g style={{ transformOrigin: "50px 50px", animation: "atlasSpin 30s linear infinite" }}>
        <circle cx="50" cy="50" r="47" fill="none" stroke="#2a323b" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="3"
            x2="50"
            y2="7"
            stroke="#e5342b"
            strokeWidth="1.4"
            transform={`rotate(${i * 30} 50 50)`}
            opacity="0.8"
          />
        ))}
      </g>

      {/* hollow steel chevron — the big "A" */}
      <path
        d="M50 8 L90 88 L72 88 L50 44 L28 88 L10 88 Z"
        fill="#0e1216"
        stroke="#c9d3dd"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* red pinstripe just inside the outline */}
      <path
        d="M50 19 L83 82 L69 82 L50 51 L31 82 L17 82 Z"
        fill="none"
        stroke="#e5342b"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* solid red arrowhead core */}
      <path
        d="M50 30 L63 60 L50 51 L37 60 Z"
        fill="url(#atlasRed)"
        filter="url(#atlasRedGlow)"
        style={active ? { animation: "atlasPulse 1.4s ease-in-out infinite" } : undefined}
      />
    </svg>
  );
}
