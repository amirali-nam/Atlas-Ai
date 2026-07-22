#!/usr/bin/env bash
# Launch backend (:8000) + frontend (:3000). Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v ollama >/dev/null 2>&1 && ! curl -s localhost:11434 >/dev/null && (ollama serve &>/dev/null &)

(cd backend && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACK_PID=$!
(cd frontend && npm run dev) &
FRONT_PID=$!

trap 'kill $BACK_PID $FRONT_PID 2>/dev/null' EXIT INT TERM
echo ""
echo "═══ ATLAS COMMAND OPERATIONAL ═══"
echo "  UI:  http://localhost:3000"
echo "  API: http://localhost:8000/docs"
wait
