# Security & Privacy Model

## Principles

1. **Zero egress.** All inference (LLM, STT, TTS) runs on-device. The backend binds to `127.0.0.1`; CORS admits only the local frontend origin. No analytics, telemetry, or external API calls at runtime.
2. **Deny by default.** File search and command execution start disabled/empty and require explicit opt-in.
3. **The LLM is untrusted input.** Model output is rendered as plain text (no HTML injection path) and never interpreted as commands.

## Command execution

- Only IDs from a hard-coded allowlist (`core/security.py`) can run.
- Each entry is a **fixed argv list** — user input never reaches the command line.
- `shell=False` always; 10-second timeout; output capped at 8 KB.
- Adding a command requires a code change, reviewable in Git history.

## File search sandbox

- Disabled until `ALLOWED_SEARCH_ROOTS` is set in `backend/.env`.
- Every candidate path is `resolve()`d and re-checked against the approved roots (defense against symlink escapes).
- Read-only: the API exposes names/sizes/mtimes, never file contents.
- Hidden directories and dependency folders are skipped; results capped at 100.

## Data at rest

- Conversations and preferences live in `backend/data/atlas.db` (SQLite), owned by the OS user. Delete the file to erase all memory.
- Voice audio is processed in memory and never written to disk.

## Permissions required

| Permission | Used for | When |
|---|---|---|
| Microphone (browser) | Speech-to-text | Only while push-to-talk held or comms channel toggled on |
| Filesystem read | File search | Only inside roots you configure |
| Process/disk stats | Telemetry dashboard | Continuous, local only |

## Input validation

- Pydantic models bound every endpoint (message ≤ 8 000 chars, TTS text ≤ 4 000, audio ≤ 25 MB, query length limits).
- Preference writes accept only a fixed key set.
