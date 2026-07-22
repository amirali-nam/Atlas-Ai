import type { ConversationSummary, HealthStatus, SseEvent, SystemStats } from "./types";

/** Stream a chat message; invokes onEvent for every SSE payload. */
export async function streamChat(
  message: string,
  conversationId: number | null,
  onEvent: (e: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Chat request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.trim();
      if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as SseEvent);
    }
  }
}

export const getConversations = (): Promise<ConversationSummary[]> =>
  fetch("/api/conversations").then((r) => r.json());

export const getConversation = (id: number) =>
  fetch(`/api/conversations/${id}`).then((r) => r.json());

export const deleteConversation = (id: number) =>
  fetch(`/api/conversations/${id}`, { method: "DELETE" });

export const getSystemStats = (): Promise<SystemStats> =>
  fetch("/api/system/stats").then((r) => r.json());

export const getHealth = (): Promise<HealthStatus> =>
  fetch("/api/system/health").then((r) => r.json());

/** Binary payloads travel as base64 JSON, direct to FastAPI: some security
 *  software / filtering proxies block multipart bodies, while JSON passes. */
export const BACKEND_URL = "http://127.0.0.1:8000";

/** Blob/File → base64 (without the data: URL prefix). */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve((fr.result as string).split(",", 2)[1] ?? "");
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const audio_b64 = await toBase64(blob);
  const res = await fetch(`${BACKEND_URL}/api/voice/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio_b64 }),
  });
  if (!res.ok) throw new Error("Transcription failed");
  return (await res.json()).text as string;
}

export async function speak(text: string): Promise<Blob | null> {
  const res = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.ok ? res.blob() : null;
}
