"use client";

/** Central AI presence: concentric animated rings that react to state. */
export default function AtlasCore({
  active,
  listening,
  level,
}: {
  active: boolean;
  listening: boolean;
  level: number;
}) {
  const glow = listening ? "border-cyan shadow-glow-cyan" : "border-gold shadow-glow-gold";
  const scale = 1 + Math.min(level * 2.5, 0.35);

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      {(active || listening) && (
        <span className={`absolute inset-0 rounded-full border ${listening ? "border-cyan/60" : "border-gold/60"} animate-pulseRing`} />
      )}
      <span className="absolute inset-2 rounded-full border border-line" />
      <span
        className={`absolute inset-4 rounded-full border-2 ${glow} transition-transform duration-100`}
        style={{ transform: `scale(${scale})` }}
      />
      <span className="absolute inset-0 animate-[spin_14s_linear_infinite] rounded-full border border-dashed border-steel/30" />
      <span className="font-display text-xs font-bold tracking-[0.25em] text-gold text-glow-gold">
        ATLAS
      </span>
    </div>
  );
}
