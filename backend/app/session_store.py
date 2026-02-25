"""
In-memory session store for generated CV data and PDFs.
Keys: session_id (UUID). Values: dict with tailored content, profile, pdf_bytes, created_at.
For production, replace with Redis or DB.
"""
import time
import uuid
from typing import Any

# In-memory store: session_id -> { created_at, profile, tailored_summary, tailored_experience,
# motivation_letter, keywords_to_highlight, pdf_bytes (CV), letter_pdf_bytes (optional) }
_sessions: dict[str, dict[str, Any]] = {}


def create_session_id() -> str:
    return str(uuid.uuid4())


def save_session(
    session_id: str,
    profile: dict,
    tailored_summary: str,
    tailored_experience: list,
    motivation_letter: str,
    keywords_to_highlight: list[str],
    pdf_bytes: bytes | None = None,
) -> None:
    _sessions[session_id] = {
        "created_at": time.time(),
        "profile": profile,
        "tailored_summary": tailored_summary,
        "tailored_experience": tailored_experience,
        "motivation_letter": motivation_letter,
        "keywords_to_highlight": keywords_to_highlight,
        "pdf_bytes": pdf_bytes,
    }


def get_session(session_id: str) -> dict | None:
    return _sessions.get(session_id)


def set_session_pdf(session_id: str, pdf_bytes: bytes) -> None:
    if session_id in _sessions:
        _sessions[session_id]["pdf_bytes"] = pdf_bytes


def set_session_letter_pdf(session_id: str, pdf_bytes: bytes) -> None:
    if session_id in _sessions:
        _sessions[session_id]["letter_pdf_bytes"] = pdf_bytes


def cleanup_old_sessions(ttl_seconds: int = 3600) -> int:
    """Remove sessions older than ttl_seconds. Returns count removed."""
    now = time.time()
    to_remove = [sid for sid, data in _sessions.items() if (now - data["created_at"]) > ttl_seconds]
    for sid in to_remove:
        del _sessions[sid]
    return len(to_remove)
