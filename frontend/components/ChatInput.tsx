"use client";
import { useEffect, useRef, useState } from "react";

export default function ChatInput({
  onSend,
  busy,
  recording,
  listening,
  transcribing,
  onPushStart,
  onPushEnd,
  onToggleListening,
  voiceEnabled,
  onToggleVoice,
  liveText,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  recording: boolean;
  listening: boolean;
  transcribing: boolean;
  onPushStart: () => void;
  onPushEnd: () => void;
  onToggleListening: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  liveText: string;
}) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcuts: "/" focus, Ctrl+Space toggles always-listening
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.code === "Space" && e.ctrlKey) {
        e.preventDefault();
        onToggleListening();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggleListening]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="border-t border-line bg-panel/90 p-3 md:p-4">
      {(recording || listening || transcribing) && (
        <p className="mb-2 font-mono text-xs text-cyan animate-flicker">
          {transcribing ? "▸ DECODING TRANSMISSION…" : listening ? "▸ COMMS CHANNEL OPEN — SPEAK FREELY" : "▸ RECORDING — RELEASE TO TRANSMIT"}
          {liveText && <span className="ml-2 text-ghost/80">{liveText}</span>}
        </p>
      )}
      <div className="flex items-end gap-2">
        {/* Push-to-talk */}
        <button
          onMouseDown={onPushStart}
          onMouseUp={onPushEnd}
          onMouseLeave={onPushEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            onPushStart();
          }}
          onTouchEnd={onPushEnd}
          disabled={listening}
          title="Hold to talk"
          className={`hud-panel h-11 w-11 shrink-0 font-bold transition-all ${
            recording ? "border-amber text-amber shadow-glow-gold" : "text-steel hover:text-gold"
          } disabled:opacity-40`}
        >
          ◉
        </button>
        {/* Always-listening toggle */}
        <button
          onClick={onToggleListening}
          title="Toggle always-listening (Ctrl+Space)"
          className={`hud-panel h-11 w-11 shrink-0 text-lg transition-all ${
            listening ? "border-cyan text-cyan shadow-glow-cyan" : "text-steel hover:text-cyan"
          }`}
        >
          ((•))
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Issue directive… ( / to focus · Enter to transmit )"
          className="hud-panel max-h-40 min-h-11 flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-ghost placeholder:text-steel/50 focus:border-gold/60 focus:outline-none"
        />

        {/* Voice replies toggle */}
        <button
          onClick={onToggleVoice}
          title="Toggle spoken replies"
          className={`hud-panel h-11 w-11 shrink-0 text-sm transition-all ${
            voiceEnabled ? "border-gold text-gold shadow-glow-gold" : "text-steel hover:text-gold"
          }`}
        >
          {voiceEnabled ? "🔊" : "🔇"}
        </button>

        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="hud-panel h-11 shrink-0 px-5 font-display text-xs font-bold tracking-[0.2em] text-gold transition-all hover:shadow-glow-gold disabled:opacity-40"
        >
          {busy ? "…" : "SEND"}
        </button>
      </div>
    </div>
  );
}
