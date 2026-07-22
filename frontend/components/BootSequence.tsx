"use client";
import { useEffect, useState } from "react";

const LINES = [
  "ATLAS KERNEL v1.0.0 ............ OK",
  "NEURAL LINK (OLLAMA) ........... PROBING",
  "AUDIO INTELLIGENCE (WHISPER) ... STANDBY",
  "VOCAL SYNTHESIS (PIPER) ........ STANDBY",
  "LOCAL DATASTORE (SQLITE) ....... MOUNTED",
  "PRIVACY PROTOCOL ............... ENFORCED — ZERO EGRESS",
  "AUTHENTICATING ADMINISTRATOR ... CONFIRMED",
];

/** Cinematic boot screen shown once per session. */
export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown < LINES.length) {
      const t = setTimeout(() => setShown((s) => s + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [shown, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void">
      <div className="w-full max-w-xl px-8">
        <h1 className="font-display text-3xl font-black tracking-[0.3em] text-gold text-glow-gold">
          ATLAS
        </h1>
        <p className="mb-8 mt-1 text-xs tracking-[0.5em] text-steel">COMMAND SYSTEM INITIALIZING</p>
        <div className="space-y-2 font-mono text-sm">
          {LINES.slice(0, shown).map((l) => (
            <p key={l} className="text-cyan/80">
              <span className="mr-2 text-gold">▸</span>
              {l}
            </p>
          ))}
        </div>
        <div className="mt-8 h-1 w-full overflow-hidden bg-line">
          <div
            className="h-full bg-gradient-to-r from-gold to-amber transition-all duration-300"
            style={{ width: `${(shown / LINES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
