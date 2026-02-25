#!/usr/bin/env bash
# Start CV-Tool backend (FastAPI) and frontend (Next.js).

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.cv-tool-pids"

if [ -f "$PID_FILE" ]; then
  echo "PID file exists. Services may already be running. Run ./stop.sh first."
  exit 1
fi

echo "Starting backend (http://localhost:8000)..."
(
  cd "$ROOT/backend"
  source venv/bin/activate
  exec uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$PID_FILE"

echo "Starting frontend (http://localhost:3000)..."
(
  cd "$ROOT/frontend"
  exec npm run dev
) &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"

echo ""
echo "Services started:"
echo "  Backend:  PID $BACKEND_PID  →  http://localhost:8000  (docs: http://localhost:8000/docs)"
echo "  Frontend: PID $FRONTEND_PID →  http://localhost:3000"
echo ""
echo "To stop both: ./stop.sh"
