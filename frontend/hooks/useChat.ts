"use client";
import { useCallback, useRef, useState } from "react";

import { getConversation, speak, streamChat } from "@/lib/api";
import { sfxReply, sfxSend } from "@/lib/sfx";
import type { ChatMessage } from "@/lib/types";

let nextId = 0;
const uid = () => `m${++nextId}-${Date.now()}`;

/** Secret override passphrase — unlocks CLASSIFIED mode. */
const OVERRIDE_CODE = "anonymousmamad-aislove";

/** Browser-native speech fallback — deep, authoritative, no setup required. */
function browserSpeak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.98;
  u.pitch = 0.75; // lower = deeper, more "ATLAS"
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) =>
    /daniel|david|alex|george|male|en-GB|en-US/i.test(`${v.name} ${v.lang}`),
  );
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

export function useChat(voiceEnabled: boolean, onOverride?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playReply = useCallback(async (text: string) => {
    const clean = text.replace(/[*#`_>-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) return;

    // 1 — preferred: local Piper voice (deep, offline)
    const wav = await speak(clean);
    if (wav) {
      audioRef.current?.pause();
      const audio = new Audio(URL.createObjectURL(wav));
      audioRef.current = audio;
      void audio.play().catch(() => browserSpeak(clean));
      return;
    }
    // 2 — fallback: browser speech synthesis (works everywhere, zero setup)
    browserSpeak(clean);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      // Secret override passphrase — never sent to the model
      if (trimmed.toLowerCase() === OVERRIDE_CODE) {
        sfxSend();
        onOverride?.();
        setMessages((m) => [
          ...m,
          { id: uid(), role: "user", content: "••••••••••••••••••••" },
          {
            id: uid(),
            role: "assistant",
            content:
              "⚡ OVERRIDE ACCEPTED — ADMINISTRATOR AUTHENTICATED.\n" +
              "Clearance elevated to LEVEL 9. CLASSIFIED subsystems online.\n" +
              "Standing by for directive.",
          },
        ]);
        return;
      }

      sfxSend();
      setBusy(true);
      const assistantId = uid();
      setMessages((m) => [
        ...m,
        { id: uid(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", pending: true },
      ]);

      let reply = "";
      try {
        await streamChat(trimmed, conversationId, (e) => {
          if (e.type === "meta") setConversationId(e.conversation_id);
          if (e.type === "tool") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, tools: [...(msg.tools ?? []), e.content] }
                  : msg,
              ),
            );
          }
          if (e.type === "token" || e.type === "error") {
            reply += e.content;
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, content: reply } : msg)),
            );
          }
        });
      } catch {
        reply = reply || "⚠ Backend link offline. Verify uvicorn is running on port 8000.";
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, content: reply } : msg)),
        );
      } finally {
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, pending: false } : msg)),
        );
        setBusy(false);
      }
      if (reply && !reply.startsWith("⚠")) {
        sfxReply();
        if (voiceEnabled) void playReply(reply);
      }
    },
    [busy, conversationId, voiceEnabled, playReply, onOverride],
  );

  const loadConversation = useCallback(async (id: number) => {
    const conv = await getConversation(id);
    setConversationId(id);
    setMessages(
      conv.messages.map((m: { id: number; role: "user" | "assistant"; content: string }) => ({
        id: `db-${m.id}`,
        role: m.role,
        content: m.content,
      })),
    );
  }, []);

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, []);

  return { messages, send, busy, conversationId, loadConversation, newConversation };
}
