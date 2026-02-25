"""
SQLite store for user profiles. User identified by cookie (user_id).
Only the source profile from CV upload is stored here; tailored content
is never persisted. Each job gets a fresh, optimized CV from this source.
"""
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Optional

from app.models import Profile

DB_PATH = Path(__file__).parent.parent / "cv_tool.db"


def _get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create profiles and users tables if not exists."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY,
                profile_json TEXT NOT NULL DEFAULT '{}',
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()


def create_user(email: str, password_hash: str) -> str:
    """Create a user; returns user id. Raises if email exists."""
    init_db()
    user_id = str(uuid.uuid4())
    import time
    created = time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
            (user_id, email.lower().strip(), password_hash, created),
        )
        conn.commit()
    return user_id


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Return user row (id, email, created_at) or None."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}


def get_user_by_email(email: str) -> Optional[dict]:
    """Return user row including password_hash or None."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def get_profile(user_id: str) -> Optional[Profile]:
    """Load profile for user_id. Returns None if not found."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT profile_json FROM profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    data = json.loads(row["profile_json"])
    return Profile(**data)


def save_profile(user_id: str, profile: Profile) -> None:
    """Save profile for user_id. Creates row if missing."""
    import time
    init_db()
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profiles (user_id, profile_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                updated_at = excluded.updated_at
            """,
            (user_id, json.dumps(profile.model_dump()), time.strftime("%Y-%m-%d %H:%M:%S")),
        )
        conn.commit()


def ensure_user_id(user_id: Optional[str]) -> str:
    """Return user_id if valid, else new UUID."""
    if user_id and len(user_id) == 36:
        try:
            uuid.UUID(user_id)
            return user_id
        except ValueError:
            pass
    return str(uuid.uuid4())
