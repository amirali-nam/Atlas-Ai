import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Atlas Corporation palette
        void: "#050607",
        panel: "#0b0e10",
        "panel-2": "#11151a",
        line: "#1f262e",
        gold: "#e8a33d",
        amber: "#ff8a2a",
        cyan: "#37d5e5",
        steel: "#8a97a5",
        ghost: "#c9d3dd",
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-rajdhani)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 12px rgba(232,163,61,0.35), 0 0 32px rgba(232,163,61,0.12)",
        "glow-cyan": "0 0 12px rgba(55,213,229,0.35), 0 0 32px rgba(55,213,229,0.12)",
      },
      keyframes: {
        scanline: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100vh)" } },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        flicker: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.72" } },
        typing: { from: { width: "0" }, to: { width: "100%" } },
      },
      animation: {
        scanline: "scanline 9s linear infinite",
        pulseRing: "pulseRing 1.8s ease-out infinite",
        flicker: "flicker 3.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
