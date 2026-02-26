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

from app.config import settings
from app.models import Profile

DB_PATH = Path(settings.db_path) if settings.db_path else Path(__file__).parent.parent / "cv_tool.db"


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
        for col, default in [
            ("additional_urls", "'[]'"),
            ("personal_summary", "''"),
            ("onboarding_complete", "0"),
        ]:
            try:
                if col == "onboarding_complete":
                    conn.execute(f"ALTER TABLE profiles ADD COLUMN {col} INTEGER DEFAULT 0")
                else:
                    conn.execute(f"ALTER TABLE profiles ADD COLUMN {col} TEXT DEFAULT {default}")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cv_generations (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                cv_path TEXT NOT NULL,
                letter_path TEXT,
                job_description TEXT,
                language TEXT
            )
        """)
        for col in ("job_description", "language"):
            try:
                conn.execute(f"ALTER TABLE cv_generations ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
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
    data = get_user_data(user_id)
    return data["profile"] if data else None


def get_user_data(user_id: str) -> Optional[dict]:
    """Load profile, additional_urls, personal_summary. Returns None if no row."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT profile_json, additional_urls, personal_summary, onboarding_complete FROM profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    profile = Profile(**json.loads(row["profile_json"]))
    additional_urls = json.loads(row["additional_urls"] or "[]")
    if not isinstance(additional_urls, list):
        additional_urls = []
    personal_summary = row["personal_summary"] or ""
    onboarding_complete = bool(row["onboarding_complete"] or 0)
    return {
        "profile": profile,
        "additional_urls": additional_urls,
        "personal_summary": personal_summary,
        "onboarding_complete": onboarding_complete,
    }


def save_profile(user_id: str, profile: Profile) -> None:
    """Save profile for user_id. Creates row if missing."""
    init_db()
    import time
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


def save_user_data(
    user_id: str,
    profile: Optional[Profile] = None,
    additional_urls: Optional[list] = None,
    personal_summary: Optional[str] = None,
    onboarding_complete: Optional[bool] = None,
) -> None:
    """Update one or more of profile, additional_urls, personal_summary, onboarding_complete."""
    import time
    init_db()
    data = get_user_data(user_id)
    if not data:
        if not profile:
            profile = Profile()
        data = {
            "profile": profile,
            "additional_urls": additional_urls if additional_urls is not None else [],
            "personal_summary": personal_summary if personal_summary is not None else "",
            "onboarding_complete": onboarding_complete if onboarding_complete is not None else False,
        }
    else:
        if profile is not None:
            data["profile"] = profile
        if additional_urls is not None:
            data["additional_urls"] = additional_urls
        if personal_summary is not None:
            data["personal_summary"] = personal_summary
        if onboarding_complete is not None:
            data["onboarding_complete"] = onboarding_complete
    with _get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profiles (user_id, profile_json, additional_urls, personal_summary, onboarding_complete, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                profile_json = excluded.profile_json,
                additional_urls = excluded.additional_urls,
                personal_summary = excluded.personal_summary,
                onboarding_complete = excluded.onboarding_complete,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                json.dumps(data["profile"].model_dump()),
                json.dumps(data["additional_urls"]),
                data["personal_summary"] or "",
                1 if data["onboarding_complete"] else 0,
                time.strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.commit()


def insert_cv_generation(
    user_id: str,
    session_id: str,
    cv_path: str,
    letter_path: Optional[str] = None,
    job_description: Optional[str] = None,
    language: Optional[str] = None,
) -> None:
    """Record a generated CV/letter for the user (PDFs already written to paths)."""
    import time
    init_db()
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO cv_generations (session_id, user_id, created_at, cv_path, letter_path, job_description, language) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session_id, user_id, time.strftime("%Y-%m-%d %H:%M:%S"), cv_path, letter_path, job_description or "", language or ""),
        )
        conn.commit()


def get_cv_generations_by_user(user_id: str) -> list[dict]:
    """Return list of cv_generations for user, newest first."""
    init_db()
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT session_id, created_at, cv_path, letter_path, job_description, language FROM cv_generations WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [
        {
            "session_id": r["session_id"],
            "created_at": r["created_at"],
            "cv_path": r["cv_path"],
            "letter_path": r["letter_path"],
            "job_description": r["job_description"] or "",
            "language": r["language"] or "",
        }
        for r in rows
    ]


def get_cv_generation(session_id: str, user_id: str) -> Optional[dict]:
    """Return cv_generation row if session exists and belongs to user."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT session_id, created_at, cv_path, letter_path FROM cv_generations WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        ).fetchone()
    if not row:
        return None
    return {"session_id": row["session_id"], "created_at": row["created_at"], "cv_path": row["cv_path"], "letter_path": row["letter_path"]}


def delete_user(user_id: str) -> None:
    """Permanently delete user and all their data (profile, cv_generations). Order: profiles, cv_generations, then users."""
    init_db()
    with _get_conn() as conn:
        conn.execute("DELETE FROM profiles WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM cv_generations WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
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
