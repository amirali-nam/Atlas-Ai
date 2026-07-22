"use client";
import type { HealthStatus, SystemStats } from "@/lib/types";

function Gauge({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  const color = percent > 85 ? "bg-amber" : percent > 60 ? "bg-gold" : "bg-cyan";
  return (
    <div>
      <div className="flex justify-between text-[11px] tracking-widest text-steel">
        <span>{label}</span>
        <span className="font-mono text-ghost">{percent.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-line">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-0.5 font-mono text-[10px] text-steel/70">{detail}</p>
    </div>
  );
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export default function SystemMonitor({ stats, health }: { stats: SystemStats | null; health: HealthStatus | null }) {
  return (
    <div className="hud-panel hud-corner space-y-4 p-4">
      <h2 className="font-display text-xs font-bold tracking-[0.3em] text-gold">SYSTEM TELEMETRY</h2>
      {stats ? (
        <>
          <Gauge label="CPU" percent={stats.cpu.percent} detail={`${stats.cpu.cores} cores`} />
          <Gauge label="MEMORY" percent={stats.memory.percent} detail={`${stats.memory.used_gb} / ${stats.memory.total_gb} GB`} />
          <Gauge label="STORAGE" percent={stats.disk.percent} detail={`${stats.disk.used_gb} / ${stats.disk.total_gb} GB`} />
          <div className="space-y-1 border-t border-line pt-3 font-mono text-[11px] text-steel">
            <p>NET ▲ {stats.network.sent_mb} MB ▼ {stats.network.recv_mb} MB</p>
            <p>UPTIME {fmtUptime(stats.uptime_seconds)}</p>
            <p className="truncate">{stats.platform}</p>
          </div>
        </>
      ) : (
        <p className="animate-flicker font-mono text-xs text-steel">AWAITING TELEMETRY LINK…</p>
      )}
      <div className="space-y-1.5 border-t border-line pt-3 text-[11px] tracking-widest">
        <StatusRow label="BACKEND" ok={health != null} />
        <StatusRow label="NEURAL LINK" ok={health?.ollama.online ?? false} detail={health?.ollama.active_model} />
        <StatusRow label="VOCAL SYNTH" ok={health?.tts_ready ?? false} />
      </div>
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-steel">{label}</span>
      <span className={`flex items-center gap-1.5 font-mono ${ok ? "text-cyan" : "text-amber"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-cyan shadow-glow-cyan" : "bg-amber animate-flicker"}`} />
        {ok ? (detail ?? "ONLINE") : "OFFLINE"}
      </span>
    </div>
  );
}
