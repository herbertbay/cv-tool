#!/usr/bin/env bash
# Call the profile-incomplete reminder cron (Railway Cron, local cron, or CI).
# Usage:
#   export BACKEND_URL=https://your-backend.example.com
#   export ADMIN_SECRET=your-secret
#   ./scripts/send-profile-incomplete-reminders.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
: "${BACKEND_URL:?Set BACKEND_URL (e.g. https://api.example.com)}"
: "${ADMIN_SECRET:?Set ADMIN_SECRET (same as backend ADMIN_SECRET)}"
base="${BACKEND_URL%/}"
curl -sS -X POST "${base}/api/admin/cron/send-profile-incomplete-reminders" \
  -H "X-Admin-Secret: ${ADMIN_SECRET}" \
  -H "Accept: application/json"
echo
