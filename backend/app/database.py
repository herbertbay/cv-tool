"""
SQLite store for user profiles. User identified by cookie (user_id).
Only the source profile from CV upload is stored here; tailored content
is never persisted. Each job gets a fresh, optimized CV from this source.
"""
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Optional

_UNSET = object()

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
        for col in ("tailored_summary", "tailored_experience", "motivation_letter", "keywords_to_highlight", "template"):
            try:
                conn.execute(f"ALTER TABLE cv_generations ADD COLUMN {col} TEXT")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ats_match_results (
                token TEXT PRIMARY KEY,
                profile_json TEXT NOT NULL,
                job_text TEXT NOT NULL,
                score INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS job_applications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                company_name TEXT,
                description TEXT,
                salary_from REAL,
                salary_to REAL,
                job_title TEXT,
                application_status TEXT NOT NULL DEFAULT 'Interested',
                archived INTEGER NOT NULL DEFAULT 0,
                full_job_description TEXT,
                session_id TEXT,
                application_date TEXT,
                job_url TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        try:
            conn.execute("ALTER TABLE users ADD COLUMN welcome_email_sent_at TEXT DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        try:
            conn.execute("ALTER TABLE users ADD COLUMN profile_incomplete_reminder_sent_at TEXT DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        for col, default in [("application_date", "NULL"), ("job_url", "NULL")]:
            try:
                conn.execute(f"ALTER TABLE job_applications ADD COLUMN {col} TEXT DEFAULT {default}")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
        try:
            conn.execute("ALTER TABLE job_applications ADD COLUMN ats_score INTEGER DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        try:
            conn.execute("ALTER TABLE job_applications ADD COLUMN ats_score_summary TEXT DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        try:
            conn.execute("ALTER TABLE job_applications ADD COLUMN ats_score_breakdown TEXT DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        for col in ("tailored_headline", "tailored_skills", "tailored_education"):
            try:
                conn.execute(f"ALTER TABLE job_applications ADD COLUMN {col} TEXT DEFAULT NULL")
            except sqlite3.OperationalError as e:
                if "duplicate column" not in str(e).lower():
                    raise
        try:
            conn.execute("ALTER TABLE job_applications ADD COLUMN cv_section_includes TEXT DEFAULT NULL")
        except sqlite3.OperationalError as e:
            if "duplicate column" not in str(e).lower():
                raise
        for col in ["ats_summary", "ats_breakdown"]:
            try:
                conn.execute(f"ALTER TABLE ats_match_results ADD COLUMN {col} TEXT DEFAULT NULL")
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


def mark_welcome_email_sent(user_id: str) -> None:
    """Set welcome_email_sent_at after Resend accepts the welcome email."""
    init_db()
    import time

    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        conn.execute("UPDATE users SET welcome_email_sent_at = ? WHERE id = ?", (ts, user_id))
        conn.commit()


def mark_profile_incomplete_reminder_sent(user_id: str) -> None:
    """Set profile_incomplete_reminder_sent_at after the one-time incomplete-profile reminder is sent."""
    init_db()
    import time

    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        conn.execute("UPDATE users SET profile_incomplete_reminder_sent_at = ? WHERE id = ?", (ts, user_id))
        conn.commit()


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Return user row (id, email, created_at, welcome_email_sent_at, profile_incomplete_reminder_sent_at) or None."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, created_at, welcome_email_sent_at, profile_incomplete_reminder_sent_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "created_at": row["created_at"],
        "welcome_email_sent_at": row["welcome_email_sent_at"],
        "profile_incomplete_reminder_sent_at": row["profile_incomplete_reminder_sent_at"],
    }


def get_user_by_email(email: str) -> Optional[dict]:
    """Return user row including password_hash or None."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash, created_at, welcome_email_sent_at FROM users WHERE email = ?",
            (email.lower().strip(),),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def get_user_with_password_hash(user_id: str) -> Optional[dict]:
    """Return id, email, password_hash for session user (password change)."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return dict(row)


def update_user_password_hash(user_id: str, password_hash: str) -> None:
    init_db()
    with _get_conn() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        conn.commit()


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
    tailored_summary: Optional[str] = None,
    tailored_experience: Optional[list] = None,
    motivation_letter: Optional[str] = None,
    keywords_to_highlight: Optional[list] = None,
    template: Optional[str] = None,
) -> None:
    """Record a generated CV/letter for the user (PDFs already written to paths). Persists tailored content for later edit/regenerate."""
    import time
    init_db()
    te_json = json.dumps(tailored_experience) if tailored_experience is not None else None
    kw_json = json.dumps(keywords_to_highlight) if keywords_to_highlight is not None else None
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO cv_generations (
                session_id, user_id, created_at, cv_path, letter_path, job_description, language,
                tailored_summary, tailored_experience, motivation_letter, keywords_to_highlight, template
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id, user_id, time.strftime("%Y-%m-%d %H:%M:%S"), cv_path, letter_path,
                job_description or "", language or "",
                tailored_summary or "", te_json, motivation_letter or "", kw_json, template or "cv_base.html",
            ),
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
    """Return cv_generation row if session exists and belongs to user. Includes tailored content (tailored_experience and keywords_to_highlight as lists)."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            """SELECT session_id, created_at, cv_path, letter_path, job_description, language,
                      tailored_summary, tailored_experience, motivation_letter, keywords_to_highlight, template
               FROM cv_generations WHERE session_id = ? AND user_id = ?""",
            (session_id, user_id),
        ).fetchone()
    if not row:
        return None
    te = row["tailored_experience"]
    kw = row["keywords_to_highlight"]
    return {
        "session_id": row["session_id"],
        "created_at": row["created_at"],
        "cv_path": row["cv_path"],
        "letter_path": row["letter_path"],
        "job_description": row["job_description"] or "",
        "language": row["language"] or "",
        "tailored_summary": row["tailored_summary"] or "",
        "tailored_experience": json.loads(te) if isinstance(te, str) and te.strip() else (te if isinstance(te, list) else []),
        "motivation_letter": row["motivation_letter"] or "",
        "keywords_to_highlight": json.loads(kw) if isinstance(kw, str) and kw.strip() else (kw if isinstance(kw, list) else []),
        "template": row["template"] or "cv_base.html",
    }


def get_last_cv_generation_for_user(user_id: str) -> Optional[dict]:
    """Return the newest cv_generation for a user (session_id, created_at, cv_path)."""
    init_db()
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT session_id, created_at, cv_path FROM cv_generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "session_id": row["session_id"],
        "created_at": row["created_at"],
        "cv_path": row["cv_path"],
    }


def update_cv_generation_tailored(
    session_id: str,
    user_id: str,
    *,
    tailored_summary: Optional[str] = None,
    tailored_experience: Optional[list] = None,
    motivation_letter: Optional[str] = None,
) -> bool:
    """Update tailored content for a cv_generation. Returns True if a row was updated."""
    init_db()
    updates = []
    params = []
    if tailored_summary is not None:
        updates.append("tailored_summary = ?")
        params.append(tailored_summary)
    if tailored_experience is not None:
        updates.append("tailored_experience = ?")
        params.append(json.dumps(tailored_experience))
    if motivation_letter is not None:
        updates.append("motivation_letter = ?")
        params.append(motivation_letter)
    if not updates:
        return False
    params.extend([session_id, user_id])
    with _get_conn() as conn:
        cur = conn.execute(
            f"UPDATE cv_generations SET {', '.join(updates)} WHERE session_id = ? AND user_id = ?",
            params,
        )
        conn.commit()
        return cur.rowcount > 0


def update_cv_generation_template(session_id: str, user_id: str, template: str) -> bool:
    """Update template for a cv_generation. Returns True if a row was updated."""
    init_db()
    with _get_conn() as conn:
        cur = conn.execute(
            "UPDATE cv_generations SET template = ? WHERE session_id = ? AND user_id = ?",
            (template, session_id, user_id),
        )
        conn.commit()
        return cur.rowcount > 0


def insert_ats_match_result(
    token: str,
    profile_json: str,
    job_text: str,
    score: int,
    ats_summary: str | None = None,
    ats_breakdown: str | None = None,
) -> None:
    """Store ATS match result for later retrieval (1h TTL implied). Uses same ats_scorer as rest of app."""
    init_db()
    import time
    created = time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        try:
            conn.execute(
                """INSERT INTO ats_match_results (token, profile_json, job_text, score, created_at, ats_summary, ats_breakdown)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (token, profile_json, job_text, score, created, ats_summary, ats_breakdown),
            )
        except sqlite3.OperationalError as e:
            if "no such column" in str(e).lower():
                conn.execute(
                    "INSERT INTO ats_match_results (token, profile_json, job_text, score, created_at) VALUES (?, ?, ?, ?, ?)",
                    (token, profile_json, job_text, score, created),
                )
            else:
                raise
        conn.commit()


def get_ats_match_result(token: str) -> Optional[dict]:
    """Return ats_match_result row or None. Prunes results older than 24h on read."""
    init_db()
    import time
    cutoff = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(time.time() - 24 * 3600))
    with _get_conn() as conn:
        conn.execute("DELETE FROM ats_match_results WHERE created_at < ?", (cutoff,))
        conn.commit()
        try:
            row = conn.execute(
                "SELECT token, profile_json, job_text, score, created_at, ats_summary, ats_breakdown FROM ats_match_results WHERE token = ?",
                (token,),
            ).fetchone()
        except sqlite3.OperationalError as e:
            if "no such column" in str(e).lower():
                row = conn.execute(
                    "SELECT token, profile_json, job_text, score, created_at FROM ats_match_results WHERE token = ?",
                    (token,),
                ).fetchone()
            else:
                raise
    if not row:
        return None
    keys = row.keys() if hasattr(row, "keys") else []
    return {
        "token": row["token"],
        "profile_json": row["profile_json"],
        "job_text": row["job_text"],
        "score": row["score"],
        "created_at": row["created_at"],
        "ats_summary": row["ats_summary"] if "ats_summary" in keys else None,
        "ats_breakdown": row["ats_breakdown"] if "ats_breakdown" in keys else None,
    }


def delete_ats_match_result(token: str) -> None:
    """Remove result after use (e.g. after optimize)."""
    init_db()
    with _get_conn() as conn:
        conn.execute("DELETE FROM ats_match_results WHERE token = ?", (token,))
        conn.commit()


def get_admin_stats() -> dict:
    """Return counts from users, profiles, cv_generations. For admin endpoint only."""
    init_db()
    with _get_conn() as conn:
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        try:
            profile_count = conn.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
        except sqlite3.OperationalError:
            profile_count = 0
        try:
            gen_count = conn.execute("SELECT COUNT(*) FROM cv_generations").fetchone()[0]
        except sqlite3.OperationalError:
            gen_count = 0
    return {"users": user_count, "profiles": profile_count, "cv_generations": gen_count}


def get_all_users_for_admin() -> list[dict]:
    """Return all users for admin view.

    Includes per-user CV generation stats and required-profile completeness
    (same rules as the dashboard / Edit profile).
    """
    from app.profile_completeness import count_required_empty_fields

    init_db()
    with _get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                u.id,
                u.email,
                u.created_at,
                u.welcome_email_sent_at,
                u.profile_incomplete_reminder_sent_at,
                p.profile_json,
                COUNT(g.session_id) AS cv_generations_count,
                MAX(g.created_at) AS last_used_at,
                (
                    SELECT g2.session_id
                    FROM cv_generations g2
                    WHERE g2.user_id = u.id
                    ORDER BY g2.created_at DESC
                    LIMIT 1
                ) AS last_cv_session_id
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN cv_generations g ON g.user_id = u.id
            GROUP BY u.id, u.email, u.created_at, u.welcome_email_sent_at,
                     u.profile_incomplete_reminder_sent_at, p.profile_json
            ORDER BY u.created_at DESC
            """
        ).fetchall()
    out: list[dict] = []
    for r in rows:
        pj = r["profile_json"]
        try:
            profile = Profile(**json.loads(pj)) if pj else Profile()
        except Exception:
            profile = Profile()
        empty_req = count_required_empty_fields(profile)
        out.append(
            {
                "id": r["id"],
                "email": r["email"],
                "created_at": r["created_at"],
                "welcome_email_sent_at": r["welcome_email_sent_at"],
                "profile_incomplete_reminder_sent_at": r["profile_incomplete_reminder_sent_at"],
                "cv_generations_count": r["cv_generations_count"],
                "last_used_at": r["last_used_at"],
                "last_cv_session_id": r["last_cv_session_id"],
                "profile_required_empty_count": empty_req,
                "profile_incomplete": empty_req > 0,
            }
        )
    return out


def list_users_eligible_for_profile_incomplete_reminder() -> list[dict]:
    """Users who have not been sent the one-time incomplete-profile reminder (may still be complete)."""
    init_db()
    with _get_conn() as conn:
        rows = conn.execute(
            """
            SELECT u.id, u.email, u.created_at, p.profile_json
            FROM users u
            LEFT JOIN profiles p ON p.user_id = u.id
            WHERE u.profile_incomplete_reminder_sent_at IS NULL
               OR TRIM(COALESCE(u.profile_incomplete_reminder_sent_at, '')) = ''
            """
        ).fetchall()
    return [dict(r) for r in rows]


def insert_job_application(
    id: str,
    user_id: str,
    *,
    company_name: str | None = None,
    description: str | None = None,
    salary_from: float | None = None,
    salary_to: float | None = None,
    job_title: str | None = None,
    application_status: str = "Interested",
    archived: bool = False,
    full_job_description: str | None = None,
    session_id: str | None = None,
    application_date: str | None = None,
    job_url: str | None = None,
    tailored_headline: str | None = None,
    tailored_skills: list[str] | None = None,
    tailored_education: list[dict] | None = None,
) -> None:
    """Insert a job application. created_at set automatically."""
    init_db()
    import time
    created = time.strftime("%Y-%m-%d %H:%M:%S")
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO job_applications (
                id, user_id, company_name, description, salary_from, salary_to,
                job_title, application_status, archived, full_job_description, session_id, application_date, job_url,
                tailored_headline, tailored_skills, tailored_education, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                id,
                user_id,
                company_name or None,
                description or None,
                salary_from,
                salary_to,
                job_title or None,
                application_status,
                1 if archived else 0,
                full_job_description or None,
                session_id or None,
                application_date or None,
                job_url or None,
                tailored_headline or None,
                json.dumps(tailored_skills) if tailored_skills is not None else None,
                json.dumps(tailored_education) if tailored_education is not None else None,
                created,
            ),
        )
        conn.commit()


def get_job_application_by_id(application_id: str, user_id: str) -> dict | None:
    """Return one job application if it belongs to the user, else None."""
    init_db()
    base_cols = (
        "id, user_id, company_name, description, salary_from, salary_to, job_title, application_status, "
        "archived, full_job_description, session_id, application_date, job_url, created_at"
    )
    full_cols = (
        base_cols + ", ats_score, ats_score_summary, ats_score_breakdown, tailored_headline, tailored_skills, "
        "tailored_education, cv_section_includes"
    )
    with _get_conn() as conn:
        try:
            row = conn.execute(
                f"SELECT {full_cols} FROM job_applications WHERE id = ? AND user_id = ?",
                (application_id, user_id),
            ).fetchone()
        except sqlite3.OperationalError as e:
            if "no such column" not in str(e).lower():
                raise
            row = conn.execute(
                f"SELECT {base_cols} FROM job_applications WHERE id = ? AND user_id = ?",
                (application_id, user_id),
            ).fetchone()
    if not row:
        return None
    if "ats_score" in row.keys():
        return _row_to_job_application(row)
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "company_name": row["company_name"] or "",
        "description": row["description"] or "",
        "salary_from": row["salary_from"],
        "salary_to": row["salary_to"],
        "job_title": row["job_title"] or "",
        "application_status": row["application_status"] or "Interested",
        "archived": bool(row["archived"]),
        "full_job_description": row["full_job_description"] or "",
        "session_id": row["session_id"],
        "application_date": row["application_date"],
        "job_url": row["job_url"],
        "created_at": row["created_at"],
        "ats_score": None,
        "ats_score_summary": None,
        "ats_score_breakdown": None,
        "tailored_headline": None,
        "tailored_skills": None,
        "tailored_education": None,
        "cv_section_includes": None,
    }


def get_job_application_by_session_id(session_id: str, user_id: str) -> dict | None:
    """Return the most recent job application linked to this CV session for the user, if any."""
    if not session_id or not session_id.strip():
        return None
    init_db()
    base_cols = (
        "id, user_id, company_name, description, salary_from, salary_to, job_title, application_status, "
        "archived, full_job_description, session_id, application_date, job_url, created_at"
    )
    full_cols = (
        base_cols + ", ats_score, ats_score_summary, ats_score_breakdown, tailored_headline, tailored_skills, "
        "tailored_education, cv_section_includes"
    )
    sid = session_id.strip()
    with _get_conn() as conn:
        try:
            row = conn.execute(
                f"SELECT {full_cols} FROM job_applications WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
                (sid, user_id),
            ).fetchone()
        except sqlite3.OperationalError as e:
            if "no such column" not in str(e).lower():
                raise
            row = conn.execute(
                f"SELECT {base_cols} FROM job_applications WHERE session_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
                (sid, user_id),
            ).fetchone()
    if not row:
        return None
    if "ats_score" in row.keys():
        return _row_to_job_application(row)
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "company_name": row["company_name"] or "",
        "description": row["description"] or "",
        "salary_from": row["salary_from"],
        "salary_to": row["salary_to"],
        "job_title": row["job_title"] or "",
        "application_status": row["application_status"] or "Interested",
        "archived": bool(row["archived"]),
        "full_job_description": row["full_job_description"] or "",
        "session_id": row["session_id"],
        "application_date": row["application_date"],
        "job_url": row["job_url"],
        "created_at": row["created_at"],
        "ats_score": None,
        "ats_score_summary": None,
        "ats_score_breakdown": None,
        "tailored_headline": None,
        "tailored_skills": None,
        "tailored_education": None,
        "cv_section_includes": None,
    }


def _row_to_job_application(r: sqlite3.Row) -> dict:
    """Map a job_applications row to dict; works even if ats_* columns are missing (old DB). sqlite3.Row has no .get()."""
    keys = r.keys() if hasattr(r, "keys") else []
    skills_raw = r["tailored_skills"] if "tailored_skills" in keys else None
    education_raw = r["tailored_education"] if "tailored_education" in keys else None
    # NULL column => None (use base profile); explicit JSON [] => empty list
    parsed_skills: list[str] | None
    if "tailored_skills" not in keys or skills_raw is None or (isinstance(skills_raw, str) and not str(skills_raw).strip()):
        parsed_skills = None
    else:
        try:
            if isinstance(skills_raw, str):
                v = json.loads(skills_raw)
                parsed_skills = v if isinstance(v, list) else None
            elif isinstance(skills_raw, list):
                parsed_skills = skills_raw
            else:
                parsed_skills = None
        except Exception:
            parsed_skills = None
    parsed_education: list | None
    if "tailored_education" not in keys or education_raw is None or (isinstance(education_raw, str) and not str(education_raw).strip()):
        parsed_education = None
    else:
        try:
            if isinstance(education_raw, str):
                v = json.loads(education_raw)
                parsed_education = v if isinstance(v, list) else None
            elif isinstance(education_raw, list):
                parsed_education = education_raw
            else:
                parsed_education = None
        except Exception:
            parsed_education = None
    parsed_includes: dict | None = None
    if "cv_section_includes" in keys:
        includes_raw = r["cv_section_includes"]
        if includes_raw is not None and not (isinstance(includes_raw, str) and not str(includes_raw).strip()):
            try:
                if isinstance(includes_raw, str):
                    v = json.loads(includes_raw)
                    parsed_includes = v if isinstance(v, dict) else None
                elif isinstance(includes_raw, dict):
                    parsed_includes = includes_raw
            except Exception:
                parsed_includes = None
    return {
        "id": r["id"],
        "user_id": r["user_id"],
        "company_name": r["company_name"] or "",
        "description": r["description"] or "",
        "salary_from": r["salary_from"],
        "salary_to": r["salary_to"],
        "job_title": r["job_title"] or "",
        "application_status": r["application_status"] or "Interested",
        "archived": bool(r["archived"]),
        "full_job_description": r["full_job_description"] or "",
        "session_id": r["session_id"],
        "application_date": r["application_date"],
        "job_url": r["job_url"],
        "created_at": r["created_at"],
        "ats_score": r["ats_score"] if "ats_score" in keys and r["ats_score"] is not None else None,
        "ats_score_summary": (r["ats_score_summary"] or None) if "ats_score_summary" in keys else None,
        "ats_score_breakdown": (r["ats_score_breakdown"] or None) if "ats_score_breakdown" in keys else None,
        "tailored_headline": (r["tailored_headline"] or None) if "tailored_headline" in keys else None,
        "tailored_skills": parsed_skills,
        "tailored_education": parsed_education,
        "cv_section_includes": parsed_includes if "cv_section_includes" in keys else None,
    }


def get_job_applications_by_user(user_id: str, include_archived: bool = False) -> list[dict]:
    """Return job applications for user, newest first. If include_archived is False, only non-archived."""
    init_db()
    base_cols = (
        "id, user_id, company_name, description, salary_from, salary_to, job_title, application_status, "
        "archived, full_job_description, session_id, application_date, job_url, created_at"
    )
    optional_cols = (
        ", ats_score, ats_score_summary, ats_score_breakdown, tailored_headline, tailored_skills, "
        "tailored_education, cv_section_includes"
    )
    with _get_conn() as conn:
        try:
            cols = base_cols + optional_cols
            if include_archived:
                rows = conn.execute(
                    f"SELECT {cols} FROM job_applications WHERE user_id = ? ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    f"SELECT {cols} FROM job_applications WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
        except sqlite3.OperationalError as e:
            if "no such column" not in str(e).lower():
                raise
            # Old DB without ats_* columns: re-query with base columns only
            if include_archived:
                rows = conn.execute(
                    f"SELECT {base_cols} FROM job_applications WHERE user_id = ? ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    f"SELECT {base_cols} FROM job_applications WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
            return [
                {
                    "id": r["id"],
                    "user_id": r["user_id"],
                    "company_name": r["company_name"] or "",
                    "description": r["description"] or "",
                    "salary_from": r["salary_from"],
                    "salary_to": r["salary_to"],
                    "job_title": r["job_title"] or "",
                    "application_status": r["application_status"] or "Interested",
                    "archived": bool(r["archived"]),
                    "full_job_description": r["full_job_description"] or "",
                    "session_id": r["session_id"],
                    "application_date": r["application_date"],
                    "job_url": r["job_url"],
                    "created_at": r["created_at"],
                    "ats_score": None,
                    "ats_score_summary": None,
                    "ats_score_breakdown": None,
                    "tailored_headline": None,
                    "tailored_skills": None,
                    "tailored_education": None,
                    "cv_section_includes": None,
                }
                for r in rows
            ]
    return [_row_to_job_application(r) for r in rows]


def update_job_application(
    application_id: str,
    user_id: str,
    *,
    company_name: str | None = None,
    description: str | None = None,
    salary_from: float | None = None,
    salary_to: float | None = None,
    job_title: str | None = None,
    application_status: str | None = None,
    archived: bool | None = None,
    full_job_description: str | None = None,
    application_date: str | None = None,
    job_url: str | None = None,
    ats_score: int | None = None,
    ats_score_summary: str | None = None,
    ats_score_breakdown: str | None = None,
    tailored_headline: str | None = None,
    tailored_skills: list[str] | None = None,
    tailored_education: list[dict] | None = None,
    cv_section_includes: Any = _UNSET,
) -> bool:
    """Update job application fields. Returns True if a row was updated."""
    init_db()
    updates = []
    params = []
    if company_name is not None:
        updates.append("company_name = ?")
        params.append(company_name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if salary_from is not None:
        updates.append("salary_from = ?")
        params.append(salary_from)
    if salary_to is not None:
        updates.append("salary_to = ?")
        params.append(salary_to)
    if job_title is not None:
        updates.append("job_title = ?")
        params.append(job_title)
    if application_status is not None:
        updates.append("application_status = ?")
        params.append(application_status)
    if archived is not None:
        updates.append("archived = ?")
        params.append(1 if archived else 0)
    if full_job_description is not None:
        updates.append("full_job_description = ?")
        params.append(full_job_description)
    if application_date is not None:
        updates.append("application_date = ?")
        params.append(application_date)
    if job_url is not None:
        updates.append("job_url = ?")
        params.append(job_url)
    if ats_score is not None:
        updates.append("ats_score = ?")
        params.append(ats_score)
    if ats_score_summary is not None:
        updates.append("ats_score_summary = ?")
        params.append(ats_score_summary)
    if ats_score_breakdown is not None:
        updates.append("ats_score_breakdown = ?")
        params.append(ats_score_breakdown)
    if tailored_headline is not None:
        updates.append("tailored_headline = ?")
        params.append(tailored_headline)
    if tailored_skills is not None:
        updates.append("tailored_skills = ?")
        params.append(json.dumps(tailored_skills))
    if tailored_education is not None:
        updates.append("tailored_education = ?")
        params.append(json.dumps(tailored_education))
    if cv_section_includes is not _UNSET:
        updates.append("cv_section_includes = ?")
        if cv_section_includes is None:
            params.append(None)
        elif isinstance(cv_section_includes, str):
            params.append(cv_section_includes.strip() or None)
        else:
            params.append(json.dumps(cv_section_includes))
    if not updates:
        return False
    params.extend([application_id, user_id])
    with _get_conn() as conn:
        cur = conn.execute(
            f"UPDATE job_applications SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params,
        )
        conn.commit()
        return cur.rowcount > 0


def delete_user(user_id: str) -> None:
    """Permanently delete user and all their data (profile, cv_generations, job_applications). Order: profiles, cv_generations, job_applications, then users."""
    init_db()
    with _get_conn() as conn:
        conn.execute("DELETE FROM profiles WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM cv_generations WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM job_applications WHERE user_id = ?", (user_id,))
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
