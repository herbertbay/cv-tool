#!/usr/bin/env bash
# Stop CV-Tool backend and frontend services started by start.sh.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.cv-tool-pids"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file found. Services may not be running."
  exit 0
fi

read -r BACKEND_PID < "$PID_FILE"
FRONTEND_PID=$(sed -n '2p' "$PID_FILE")

kill "$BACKEND_PID" 2>/dev/null || true
kill "$FRONTEND_PID" 2>/dev/null || true

# Kill any child processes (e.g. node for Next, uvicorn worker)
for pid in $BACKEND_PID $FRONTEND_PID; do
  pkill -P "$pid" 2>/dev/null || true
done

rm -f "$PID_FILE"
echo "Stopped CV-Tool services (backend PID $BACKEND_PID, frontend PID $FRONTEND_PID)."
