#!/usr/bin/env python3
"""
Count users (and related rows) in the Optimal CV SQLite database.

Usage locally against Railway's DB:
  1. Install Railway CLI: https://docs.railway.com/develop/cli
  2. From repo root: railway link  (select your project + backend service)
  3. Run:
       cd backend && railway run python scripts/count_users.py

If DB_PATH is set on the backend service (e.g. /data/cv_tool.db with a volume),
this script uses that file. Without Railway, set DB_PATH or run from backend
with the default cv_tool.db next to the app.

Optional: copy the production DB locally and run:
  DB_PATH=/path/to/cv_tool.db python scripts/count_users.py
"""
from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

# Same default as app.database when db_path is empty
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
DEFAULT_DB = BACKEND_ROOT / "cv_tool.db"


def main() -> int:
    db_path = os.environ.get("DB_PATH", "").strip()
    if not db_path:
        db_path = str(DEFAULT_DB)
    path = Path(db_path)
    if not path.is_file():
        print(f"No database file at: {path}", file=sys.stderr)
        print("", file=sys.stderr)
        print("Why this happens on Railway:", file=sys.stderr)
        print("  `railway run` starts a one-off container. Volumes mounted on the", file=sys.stderr)
        print("  running service are often NOT mounted there, so /data/cv_tool.db", file=sys.stderr)
        print("  does not exist in that context.", file=sys.stderr)
        print("", file=sys.stderr)
        print("Fix: use the admin stats endpoint (reads the live app's DB):", file=sys.stderr)
        print("  1. Set ADMIN_SECRET on the backend service (e.g. openssl rand -hex 24)", file=sys.stderr)
        print("  2. Redeploy, then:", file=sys.stderr)
        print("     curl \"https://YOUR-BACKEND-URL/api/admin/stats?secret=YOUR_SECRET\"", file=sys.stderr)
        print("  Or set DB_PATH to a local file: DB_PATH=./cv_tool.db python scripts/count_users.py", file=sys.stderr)
        return 1

    print(f"Database: {path}")
    try:
        conn = sqlite3.connect(str(path))
        cur = conn.cursor()
        # users
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        # profiles (may equal users with saved profile)
        try:
            cur.execute("SELECT COUNT(*) FROM profiles")
            profile_count = cur.fetchone()[0]
        except sqlite3.OperationalError:
            profile_count = None
        # cv_generations
        try:
            cur.execute("SELECT COUNT(*) FROM cv_generations")
            gen_count = cur.fetchone()[0]
        except sqlite3.OperationalError:
            gen_count = None
        conn.close()
    except sqlite3.Error as e:
        print(f"SQLite error: {e}", file=sys.stderr)
        return 1

    print(f"Users:           {user_count}")
    if profile_count is not None:
        print(f"Profiles:        {profile_count}")
    if gen_count is not None:
        print(f"CV generations:  {gen_count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
