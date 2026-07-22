"use client";
import { useCallback, useRef, useState } from "react";

import { getConversation, speak, streamChat } from "@/lib/api";
import { sfxReply, sfxSend } from "@/lib/sfx";
import type { ChatMessage } from "@/lib/types";

let nextId = 0;
const uid = () => `m${++nextId}-${Date.now()}`;

export function useChat(voiceEnabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playReply = useCallback(async (text: string) => {
    const wav = await speak(text);
    if (!wav) return;
    audioRef.current?.pause();
    const audio = new Audio(URL.createObjectURL(wav));
    audioRef.current = audio;
    void audio.play().catch(() => undefined);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
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
    [busy, conversationId, voiceEnabled, playReply],
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
