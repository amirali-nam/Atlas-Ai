# Architecture

## Overview

ATLAS Command is a two-process system connected over localhost HTTP:

1. **Frontend** — Next.js 14 (App Router, TypeScript, Tailwind). Serves the HUD, owns all browser-side audio capture/playback, and proxies `/api/*` to the backend via a Next rewrite (no CORS in dev).
2. **Backend** — FastAPI. Stateless routers delegating to single-purpose service modules; SQLite for persistence; Ollama, faster-whisper, and Piper as local inference engines.

## Backend design

**Layering:** `routers` (HTTP concerns, validation via Pydantic) → `services` (business logic, inference clients) → `core` (persona + security policy) → `database` (SQLAlchemy 2.0 models). No service imports a router; no router touches an engine directly.

**Chat streaming.** `/api/chat` returns `text/event-stream`. Events: `meta` (conversation id, sent first so the client can bind immediately), `token` (incremental content), `error`, `done`. The full reply is persisted only after the stream ends, in a fresh session (the request-scoped session may already be closed).

**Context assembly.** Each call sends the persona system prompt (default or user-overridden preference) plus a sliding window of the last 20 messages. This keeps latency flat on long conversations while retaining recent context.

**Inference engines are lazy singletons.** Whisper and Piper models load on first use behind a lock, so cold start is fast and memory is only paid for features actually used. Blocking inference runs in FastAPI's threadpool (`run_in_threadpool`) to keep the event loop responsive.

## Frontend design

**State lives in three hooks:**
- `useChat` — message list, SSE consumption, conversation switching, optional TTS playback of replies.
- `useVoice` — MediaRecorder capture, Web Audio RMS metering for the visualizer, and silence-based segmentation (1.4 s under threshold ends a segment) for always-listening mode.
- `useSystemStats` — 3 s polling of telemetry + health.

**SSE parsing** is done with `fetch` + `ReadableStream` rather than `EventSource` because the endpoint is a POST.

**Design system.** The Atlas look is built from a small set of primitives in `globals.css` + Tailwind config: `hud-panel` (clipped corners), `hud-corner` (bracket accents), glow shadows/text, grid overlay, scanline/flicker/pulse keyframes, and an Orbitron/Rajdhani type pairing.

## Data model

```
conversations 1 ── * messages          preferences (key/value)
  id, title, created_at                  key PK, value
       messages: id, conversation_id FK, role, content, created_at
```

## Key trade-offs

- **SSE over WebSockets** — one-directional token flow needs no duplex channel; SSE is simpler, proxy-friendly, and auto-reconnects.
- **Filename search, not content indexing** — keeps the sandbox story simple and fast; content RAG is roadmap.
- **Sliding-window memory, not summarization** — predictable token budget; summarization can be layered on later without schema changes.
