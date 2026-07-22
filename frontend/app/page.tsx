"use client";
import { useCallback, useEffect, useState } from "react";

import AtlasEmblem from "@/components/AtlasEmblem";
import BootSequence from "@/components/BootSequence";
import GlobeBackground from "@/components/GlobeBackground";
import ChatInput from "@/components/ChatInput";
import ChatPanel from "@/components/ChatPanel";
import DataOps from "@/components/DataOps";
import Sidebar from "@/components/Sidebar";
import { useChat } from "@/hooks/useChat";
import { useSystemStats } from "@/hooks/useSystemStats";
import { useVoice } from "@/hooks/useVoice";
import { deleteConversation, getConversations } from "@/lib/api";
import type { ConversationSummary } from "@/lib/types";

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [mode, setMode] = useState<"comms" | "dataops">("comms");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [liveText, setLiveText] = useState("");

  const { stats, health } = useSystemStats();
  const { messages, send, busy, conversationId, loadConversation, newConversation } =
    useChat(voiceEnabled);

  const handleTranscript = useCallback(
    (text: string) => {
      setLiveText(text);
      void send(text);
      setTimeout(() => setLiveText(""), 2000);
    },
    [send],
  );

  const voice = useVoice(handleTranscript);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await getConversations());
    } catch {
      /* backend offline */
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations, busy]);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteConversation(id);
      if (id === conversationId) newConversation();
      void refreshConversations();
    },
    [conversationId, newConversation, refreshConversations],
  );

  if (!booted) return <BootSequence onDone={() => setBooted(true)} />;

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* rotating holographic globe, fixed behind everything */}
      <GlobeBackground />

      {/* moving scanline overlay */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent animate-scanline" />

      <Sidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={(id) => {
          void loadConversation(id);
          setSidebarOpen(false);
        }}
        onNew={() => {
          newConversation();
          setSidebarOpen(false);
        }}
        onDelete={(id) => void handleDelete(id)}
        stats={stats}
        health={health}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top command bar */}
        <header className="flex items-center gap-4 border-b border-line bg-panel/70 px-4 py-3 backdrop-blur-sm md:px-6">
          <button
            className="text-steel hover:text-gold lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <AtlasEmblem size={72} active={busy || voice.listening || voice.recording} />
          <div className="min-w-0">
            <h1 className="font-display text-lg font-black tracking-[0.35em] text-gold text-glow-gold md:text-xl">
              ATLAS COMMAND
            </h1>
            <p className="truncate font-mono text-[11px] tracking-widest text-steel">
              {health?.ollama.online
                ? `NEURAL LINK ACTIVE · ${health.ollama.active_model.toUpperCase()} · ZERO EGRESS`
                : "NEURAL LINK OFFLINE — START OLLAMA"}
            </p>
          </div>
          {/* Mode tabs */}
          <nav className="ml-auto flex gap-1">
            {(
              [
                ["comms", "COMMS"],
                ["dataops", "DATA OPS"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`hud-panel px-3 py-1.5 font-display text-[10px] font-bold tracking-[0.2em] transition-all ${
                  mode === key
                    ? "border-gold/70 text-gold shadow-glow-gold"
                    : "text-steel hover:text-gold"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="hidden text-right font-mono text-[11px] text-steel md:block">
            <p className="text-cyan text-glow-cyan">ADMINISTRATOR</p>
            <p>CLEARANCE: LEVEL 5</p>
          </div>
        </header>

        {mode === "dataops" ? (
          <DataOps />
        ) : (
          <>
            <ChatPanel messages={messages} />
            <ChatInput
              onSend={(t) => void send(t)}
              busy={busy}
              recording={voice.recording}
              listening={voice.listening}
              transcribing={voice.transcribing}
              onPushStart={() => void voice.startPushToTalk()}
              onPushEnd={voice.stopPushToTalk}
              onToggleListening={() => void voice.toggleListening()}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => setVoiceEnabled((v) => !v)}
              liveText={liveText}
            />
          </>
        )}
      </main>
    </div>
  );
}
