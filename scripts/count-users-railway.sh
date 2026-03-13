#!/usr/bin/env bash
# Count users on Railway by running the backend script inside the backend service
# (uses the same DB_PATH / SQLite file as production).
#
# Prerequisites:
#   - Railway CLI installed: https://docs.railway.com/develop/cli
#   - Logged in: railway login
#   - Linked project: railway link  (choose project + backend service, e.g. cv-tool-api)
#
# Usage:
#   ./scripts/count-users-railway.sh
#   # or from repo root:
#   bash scripts/count-users-railway.sh
#
# If you have multiple services, target the backend explicitly:
#   cd backend && railway run --service cv-tool-api python scripts/count_users.py

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if ! command -v railway &>/dev/null; then
  echo "Railway CLI not found. Install: https://docs.railway.com/develop/cli"
  exit 1
fi

echo "Running count_users.py in Railway backend context (injects DB_PATH and env)..."
railway run python scripts/count_users.py
