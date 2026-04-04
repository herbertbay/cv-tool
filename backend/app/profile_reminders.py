"""One-time email reminder for users with incomplete required profile (cron)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from app.database import (
    list_users_eligible_for_profile_incomplete_reminder,
    mark_profile_incomplete_reminder_sent,
)
from app.mail import send_profile_incomplete_reminder_email
from app.models import Profile
from app.profile_completeness import count_required_empty_fields

logger = logging.getLogger(__name__)


def _parse_created_at(s: str | None) -> datetime | None:
    if not s or not str(s).strip():
        return None
    raw = str(s).strip()[:19]
    try:
        return datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _account_at_least_one_day_old(created_at: str | None) -> bool:
    dt = _parse_created_at(created_at)
    if not dt:
        return False
    return dt + timedelta(days=1) <= datetime.now()


def run_profile_incomplete_reminders() -> dict:
    """
    For each user: account ≥1 day old, reminder not sent yet, required profile incomplete → send one email and mark sent.
    Idempotent per user via profile_incomplete_reminder_sent_at.
    """
    import json

    rows = list_users_eligible_for_profile_incomplete_reminder()
    sent = 0
    failed = 0
    skipped_complete = 0
    skipped_too_new = 0

    for row in rows:
        if not _account_at_least_one_day_old(row.get("created_at")):
            skipped_too_new += 1
            continue
        pj = row.get("profile_json")
        try:
            profile = Profile(**json.loads(pj)) if pj else Profile()
        except Exception:
            profile = Profile()
        if count_required_empty_fields(profile) == 0:
            skipped_complete += 1
            continue
        uid = row["id"]
        email = row["email"]
        logger.info("Profile incomplete reminder: attempting user_id=%s email=%s", uid, email)
        if send_profile_incomplete_reminder_email(email):
            mark_profile_incomplete_reminder_sent(uid)
            sent += 1
            logger.info("Profile incomplete reminder: sent user_id=%s", uid)
        else:
            failed += 1
            logger.warning("Profile incomplete reminder: send failed user_id=%s", uid)

    return {
        "sent": sent,
        "failed": failed,
        "skipped_complete": skipped_complete,
        "skipped_too_new": skipped_too_new,
        "candidates": len(rows),
    }
