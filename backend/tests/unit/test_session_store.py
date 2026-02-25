"""
Unit tests for in-memory session store.
"""
import time

import pytest

from app.session_store import (
    create_session_id,
    save_session,
    get_session,
    set_session_pdf,
    cleanup_old_sessions,
)


def test_create_session_id_is_uuid_like():
    """Session ID is string and looks like UUID."""
    sid = create_session_id()
    assert isinstance(sid, str)
    assert len(sid) == 36
    assert sid.count("-") == 4


def test_save_and_get_session():
    """Save session and retrieve it."""
    sid = create_session_id()
    save_session(
        session_id=sid,
        profile={"full_name": "Test"},
        tailored_summary="Summary",
        tailored_experience=[],
        motivation_letter="Letter",
        keywords_to_highlight=[],
        pdf_bytes=None,
    )
    session = get_session(sid)
    assert session is not None
    assert session["profile"]["full_name"] == "Test"
    assert session["tailored_summary"] == "Summary"
    assert session["motivation_letter"] == "Letter"
    assert "created_at" in session


def test_get_session_missing_returns_none():
    """Unknown session_id returns None."""
    assert get_session("nonexistent-id-12345") is None


def test_set_session_pdf():
    """set_session_pdf adds pdf_bytes to existing session."""
    sid = create_session_id()
    save_session(
        session_id=sid,
        profile={},
        tailored_summary="",
        tailored_experience=[],
        motivation_letter="",
        keywords_to_highlight=[],
        pdf_bytes=None,
    )
    set_session_pdf(sid, b"fake-pdf-bytes")
    session = get_session(sid)
    assert session["pdf_bytes"] == b"fake-pdf-bytes"


def test_set_session_pdf_ignores_unknown_id():
    """set_session_pdf on unknown id does not crash."""
    set_session_pdf("unknown-id", b"bytes")


def test_cleanup_old_sessions():
    """cleanup_old_sessions removes sessions older than TTL."""
    sid = create_session_id()
    save_session(
        session_id=sid,
        profile={},
        tailored_summary="",
        tailored_experience=[],
        motivation_letter="",
        keywords_to_highlight=[],
    )
    assert get_session(sid) is not None
    # Create session with old timestamp by patching
    from app import session_store
    session_store._sessions[sid]["created_at"] = time.time() - 4000
    removed = cleanup_old_sessions(ttl_seconds=3600)
    assert removed >= 1
    assert get_session(sid) is None
