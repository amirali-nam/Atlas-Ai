#!/usr/bin/env bash
# ATLAS Command — one-shot local setup (macOS / Linux)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "═══ ATLAS COMMAND SETUP ═══"

# ── 0. Locate Python 3.10+ ───────────────────────────────────
PY=""
for candidate in python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1 &&
     "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)'; then
    PY="$candidate"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "✖ Python 3.10+ required. Install with: brew install python@3.12"
  exit 1
fi
echo "▸ Using $($PY --version)"

# ── 1. Backend ────────────────────────────────────────────────
echo "▸ [1/4] Python backend"
cd backend
rm -rf .venv
"$PY" -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
[ -f .env ] || cp .env.example .env
deactivate
cd ..

# ── 2. Frontend ───────────────────────────────────────────────
echo "▸ [2/4] Next.js frontend"
cd frontend && npm install --silent && cd ..

# ── 3. Ollama model ───────────────────────────────────────────
echo "▸ [3/4] Ollama model (llama3.2:3b — fast on modest hardware)"
if command -v ollama >/dev/null 2>&1; then
  ollama pull llama3.2:3b
else
  echo "  ⚠ Ollama not installed. Get it from https://ollama.com/download, then run: ollama pull llama3.2:3b"
fi

# ── 4. Piper voice ────────────────────────────────────────────
echo "▸ [4/4] Piper voice (en_US-ryan-high — deep, authoritative)"
VOICE_DIR="backend/models"
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high"
if [ ! -f "$VOICE_DIR/en_US-ryan-high.onnx" ]; then
  curl -L --fail -o "$VOICE_DIR/en_US-ryan-high.onnx" "$BASE/en_US-ryan-high.onnx"
  curl -L --fail -o "$VOICE_DIR/en_US-ryan-high.onnx.json" "$BASE/en_US-ryan-high.onnx.json"
fi

echo ""
echo "═══ SETUP COMPLETE — run ./scripts/run.sh ═══"
