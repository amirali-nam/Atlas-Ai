#!/usr/bin/env bash
# ATLAS Command — futuristic double-click launcher for macOS.
cd "$(dirname "$0")"

GREEN=$'\033[32m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'; GRAY=$'\033[90m'; RESET=$'\033[0m'
clear

cat <<'EOF'

     █████╗ ████████╗██╗      █████╗ ███████╗
    ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝
    ███████║   ██║   ██║     ███████║███████╗
    ██╔══██║   ██║   ██║     ██╔══██║╚════██║
    ██║  ██║   ██║   ███████╗██║  ██║███████║
    ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
EOF
echo "${CYAN}    TACTICAL AI COMMAND SYSTEM   //   ZERO EGRESS${RESET}"
echo

# ── First-time setup ────────────────────────────────────────────────
if [ ! -d backend/.venv ] || [ ! -d frontend/node_modules ]; then
  echo "${YELLOW}  First-time setup (one time only, a few minutes)…${RESET}"
  bash scripts/setup.sh || { echo "  Setup failed — see messages above."; read -r; exit 1; }
fi

# ── Free stale ports ────────────────────────────────────────────────
kill $(lsof -t -i :8000 -i :3000 2>/dev/null) 2>/dev/null

# ── Start services (quietly, in background) ─────────────────────────
command -v ollama >/dev/null 2>&1 && ! curl -s localhost:11434 >/dev/null 2>&1 && (ollama serve >/dev/null 2>&1 &)
(cd backend && source .venv/bin/activate && uvicorn app.main:app --host 127.0.0.1 --port 8000 >/dev/null 2>&1) &
BACK=$!
(cd frontend && npm run dev >/dev/null 2>&1) &
FRONT=$!
trap 'kill $BACK $FRONT 2>/dev/null; exit' INT TERM EXIT

# ── Animated boot progress (colour-cycling bar) ─────────────────────
make_bar() { local f=$1 i out=""; for ((i=0; i<40; i++)); do [ $i -lt $f ] && out+="█" || out+="░"; done; printf '%s' "$out"; }
colors=(36 33 91 96 92)   # cyan, gold, orange, bright-cyan, green
pct=0; ci=0
for _ in $(seq 1 160); do
  if curl -s http://localhost:3000 >/dev/null 2>&1; then pct=100; elif [ $pct -lt 95 ]; then pct=$((pct + 2)); fi
  f=$((pct * 40 / 100)); c=${colors[$((ci % 5))]}; ci=$((ci + 1))
  printf "\r  \033[1;${c}m[%s] %3d%%\033[0m  \033[2mbooting ATLAS…\033[0m" "$(make_bar $f)" "$pct"
  [ $pct -ge 100 ] && break
  sleep 0.35
done

printf "\n\n  ${GREEN}▸ ATLAS ONLINE — opening command interface${RESET}\n"
open http://localhost:3000
echo "  ${GRAY}Keep this window open; close it (or press Ctrl+C) to stop ATLAS.${RESET}"
wait
