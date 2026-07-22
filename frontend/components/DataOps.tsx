"use client";
import { useRef, useState } from "react";

import {
  askDataset,
  uploadDataset,
  type ChartData,
  type DatasetProfile,
} from "@/lib/analysis";
import { sfxReply, sfxSend } from "@/lib/sfx";

/** HUD-styled SVG bar chart — no chart library needed. */
function HudChart({ chart }: { chart: ChartData }) {
  const max = Math.max(...chart.values, 1);
  const barW = 100 / chart.values.length;
  return (
    <div className="hud-panel hud-corner p-3">
      <p className="mb-2 font-display text-[10px] font-bold tracking-[0.25em] text-gold">
        {chart.column.toUpperCase()} {chart.type === "histogram" ? "· DISTRIBUTION" : "· TOP VALUES"}
      </p>
      <svg viewBox="0 0 100 46" className="w-full" preserveAspectRatio="none">
        {chart.values.map((v, i) => {
          const h = (v / max) * 38;
          return (
            <rect
              key={i}
              x={i * barW + barW * 0.15}
              y={40 - h}
              width={barW * 0.7}
              height={h}
              className={chart.type === "histogram" ? "fill-cyan/70" : "fill-gold/70"}
            >
              <title>{`${chart.labels[i]}: ${v}`}</title>
            </rect>
          );
        })}
        <line x1="0" y1="40" x2="100" y2="40" stroke="#1f262e" strokeWidth="0.5" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-steel/70">
        <span className="truncate">{chart.labels[0]}</span>
        <span className="truncate text-right">{chart.labels[chart.labels.length - 1]}</span>
      </div>
    </div>
  );
}

export default function DataOps() {
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setAnswer("");
    try {
      setProfile(await uploadDataset(file));
      sfxReply();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const ask = async () => {
    if (!profile || !question.trim() || asking) return;
    sfxSend();
    setAsking(true);
    setAnswer("");
    try {
      await askDataset(profile.dataset_id, question.trim(), (t) =>
        setAnswer((a) => a + t),
      );
      sfxReply();
    } catch {
      setAnswer("⚠ Analysis link failure — verify the backend is running.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="hud-grid flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
      {/* Upload zone */}
      <div
        className="hud-panel hud-corner cursor-pointer p-6 text-center transition-all hover:shadow-glow-gold"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <p className="font-display text-sm font-bold tracking-[0.3em] text-gold">
          {uploading ? "PROCESSING INTEL…" : "⬢ UPLOAD INTEL"}
        </p>
        <p className="mt-1 text-xs text-steel">
          Drop a CSV / Excel file or click to browse. Processed locally — never leaves this machine.
        </p>
        {error && <p className="mt-2 font-mono text-xs text-amber">✖ {error}</p>}
      </div>

      {profile && (
        <>
          {/* Briefing strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["RECORDS", profile.rows.toLocaleString()],
              ["FIELDS", String(profile.cols)],
              ["MISSING VALUES", profile.missing_total.toLocaleString()],
              ["SOURCE", profile.filename],
            ].map(([label, value]) => (
              <div key={label} className="hud-panel p-3">
                <p className="font-display text-[9px] tracking-[0.25em] text-steel">{label}</p>
                <p className="mt-1 truncate font-mono text-lg text-cyan text-glow-cyan">{value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          {profile.charts.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {profile.charts.map((c) => (
                <HudChart key={c.column + c.type} chart={c} />
              ))}
            </div>
          )}

          {/* Correlations */}
          {profile.correlations.length > 0 && (
            <div className="hud-panel hud-corner p-4">
              <p className="mb-2 font-display text-[10px] font-bold tracking-[0.25em] text-gold">
                CORRELATION INTEL
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.correlations.map((c) => (
                  <span
                    key={c.a + c.b}
                    className={`hud-panel px-3 py-1 font-mono text-xs ${
                      Math.abs(c.r) > 0.7 ? "text-amber" : "text-ghost/80"
                    }`}
                  >
                    {c.a} ↔ {c.b} · r={c.r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Q&A */}
          <div className="hud-panel hud-corner p-4">
            <p className="mb-2 font-display text-[10px] font-bold tracking-[0.25em] text-gold">
              INTERROGATE THE DATA
            </p>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void ask()}
                placeholder="e.g. Which column has the most missing data? What drives salary?"
                className="hud-panel flex-1 bg-transparent px-3 py-2 text-sm text-ghost placeholder:text-steel/50 focus:border-gold/60 focus:outline-none"
              />
              <button
                onClick={() => void ask()}
                disabled={asking || !question.trim()}
                className="hud-panel px-4 font-display text-xs font-bold tracking-[0.2em] text-gold hover:shadow-glow-gold disabled:opacity-40"
              >
                {asking ? "…" : "ANALYZE"}
              </button>
            </div>
            {(answer || asking) && (
              <div className="msg-rise mt-3 border-l-2 border-gold/60 pl-3 text-sm leading-relaxed text-ghost/95">
                <p className="mb-1 font-display text-[9px] font-bold tracking-[0.3em] text-gold">
                  ATLAS ANALYSIS
                </p>
                <p className={`whitespace-pre-wrap ${asking && !answer ? "caret" : ""}`}>
                  {answer}
                  {asking && answer && <span className="caret" />}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
