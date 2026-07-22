"use client";
import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/types";

/** Minimal formatter: renders **bold** without a markdown library. */
function renderLite(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-gold/90">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export default function ChatPanel({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="hud-grid flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="font-display text-sm tracking-[0.4em] text-steel">ATLAS ONLINE</p>
          <p className="mt-2 max-w-md text-sm text-steel/70">
            Awaiting your directive, Administrator. Type a command below or engage the comms channel
            with <span className="font-mono text-cyan">Ctrl+Space</span>.
          </p>
        </div>
      )}
      {messages.map((m) => (
        <div key={m.id} className={`msg-rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed md:max-w-[70%] ${
              m.role === "user"
                ? "hud-panel border-cyan/40 text-ghost"
                : "hud-panel hud-corner text-ghost/95"
            }`}
          >
            <p
              className={`mb-1 font-display text-[10px] font-bold tracking-[0.3em] ${
                m.role === "user" ? "text-cyan text-glow-cyan" : "text-gold text-glow-gold"
              }`}
            >
              {m.role === "user" ? "ADMINISTRATOR" : "ATLAS"}
            </p>
            <div className={`whitespace-pre-wrap ${m.pending && !m.content ? "caret" : ""}`}>
              {renderLite(m.content)}
              {m.pending && m.content && <span className="caret" />}
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
