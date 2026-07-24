#!/usr/bin/env bash
# ATLAS Command — double-click launcher for macOS.
# First run: installs everything. Every run: starts servers + opens the browser.
cd "$(dirname "$0")"

echo "═══════════════════════════════════════"
echo "   ATLAS COMMAND — starting up"
echo "═══════════════════════════════════════"

# First-time setup if the environment isn't built yet
if [ ! -d backend/.venv ] || [ ! -d frontend/node_modules ]; then
  echo "▸ First-time setup (a few minutes, one time only)…"
  bash scripts/setup.sh || { echo "Setup failed — see messages above."; read -r; exit 1; }
fi

# Free any ports left over from a previous run
kill $(lsof -t -i :8000 -i :3000 2>/dev/null) 2>/dev/null

# Open the browser as soon as the UI answers
(
  for _ in $(seq 1 90); do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
      open http://localhost:3000
      break
    fi
    sleep 1
  done
) &

echo "▸ Launching ATLAS…  (keep this window open; close it to stop)"
exec bash scripts/run.sh
