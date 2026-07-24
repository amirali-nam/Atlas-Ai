import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Atlas palette — black · red · steel-white
        void: "#050506",
        panel: "#0c0d0f",
        "panel-2": "#131518",
        line: "#242830",
        gold: "#e5342b", // primary accent (red) — class names kept for stability
        amber: "#ff5a3d", // hot / alert red
        cyan: "#dfe7ef", // secondary accent (steel white)
        steel: "#8a94a0",
        ghost: "#d3d9e0",
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-rajdhani)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 12px rgba(229,52,43,0.40), 0 0 34px rgba(229,52,43,0.15)",
        "glow-cyan": "0 0 12px rgba(223,231,239,0.30), 0 0 30px rgba(223,231,239,0.10)",
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
