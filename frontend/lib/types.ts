export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

export interface ConversationSummary {
  id: number;
  title: string;
  created_at: string;
}

export interface SystemStats {
  cpu: { percent: number; cores: number; per_core: number[] };
  memory: { percent: number; used_gb: number; total_gb: number };
  disk: { percent: number; used_gb: number; total_gb: number };
  network: { sent_mb: number; recv_mb: number };
  uptime_seconds: number;
  platform: string;
  hostname: string;
}

export interface HealthStatus {
  backend: string;
  ollama: { online: boolean; models: string[]; active_model: string };
  tts_ready: boolean;
}

export type SseEvent =
  | { type: "meta"; conversation_id: number }
  | { type: "token"; content: string }
  | { type: "error"; content: string }
  | { type: "done" };
