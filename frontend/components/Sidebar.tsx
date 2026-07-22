"use client";
import type { ConversationSummary, HealthStatus, SystemStats } from "@/lib/types";

import SystemMonitor from "./SystemMonitor";

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  stats,
  health,
  open,
  onClose,
}: {
  conversations: ConversationSummary[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  stats: SystemStats | null;
  health: HealthStatus | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* mobile scrim */}
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col gap-4 overflow-y-auto border-r border-line bg-panel/95 p-4 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          onClick={onNew}
          className="hud-panel hud-corner w-full px-4 py-3 font-display text-xs font-bold tracking-[0.25em] text-gold transition-colors hover:bg-panel-2 hover:shadow-glow-gold"
        >
          + NEW OPERATION
        </button>

        <div className="min-h-32 flex-1">
          <h2 className="mb-2 font-display text-[10px] font-bold tracking-[0.3em] text-steel">
            OPERATION LOG
          </h2>
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id} className="group flex items-center">
                <button
                  onClick={() => onSelect(c.id)}
                  className={`flex-1 truncate px-3 py-2 text-left text-sm transition-colors ${
                    c.id === activeId
                      ? "border-l-2 border-gold bg-panel-2 text-gold"
                      : "border-l-2 border-transparent text-ghost/80 hover:bg-panel-2"
                  }`}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  aria-label="Delete conversation"
                  className="px-2 text-steel opacity-0 transition-opacity hover:text-amber group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className="px-3 py-2 font-mono text-xs text-steel/60">NO PRIOR OPERATIONS</li>
            )}
          </ul>
        </div>

        <SystemMonitor stats={stats} health={health} />
      </aside>
    </>
  );
}
