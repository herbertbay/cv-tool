"""Transactional email via Resend (https://resend.com/docs)."""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"


def _site_origin() -> str:
    base = (settings.public_site_url or settings.frontend_url or "https://optimal.cv").strip().rstrip("/")
    return base or "https://optimal.cv"


def send_welcome_email(to_address: str) -> bool:
    """
    Send the post-signup welcome email. Returns True if Resend accepted the request.
    No-op (returns False) if Resend is not configured.
    """
    key = (settings.resend_api_key or "").strip()
    from_addr = (settings.resend_from_email or "").strip()
    if not key:
        logger.warning("Welcome email skipped: RESEND_API_KEY not set (set on the API backend, not Next.js)")
        return False
    if not from_addr:
        logger.warning("Welcome email skipped: RESEND_FROM_EMAIL not set")
        return False

    origin = _site_origin()
    dashboard = f"{origin}/dashboard?utm_source=email&utm_medium=email&utm_campaign=welcome_v1"

    subject = "Welcome to Optimal CV"
    text = (
        "Thanks for creating your Optimal CV account.\n\n"
        "Next step: open your dashboard and add your profile (or upload a resume), "
        "then paste a job description to generate a tailored resume and motivation letter.\n\n"
        f"Dashboard: {dashboard}\n\n"
        "— Optimal CV\n"
    )
    html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b;">
  <p>Thanks for creating your <strong>Optimal CV</strong> account.</p>
  <p>Next step: open your dashboard and add your profile (or upload a resume), then paste a job description to generate a tailored resume and motivation letter.</p>
  <p>
    <a href="{dashboard}" style="display: inline-block; margin: 8px 0; padding: 10px 16px; background: #1e40af; color: #fff; text-decoration: none; border-radius: 8px;">Go to dashboard</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #64748b;">— Optimal CV</p>
</body>
</html>"""

    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.post(
                RESEND_API,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": [to_address],
                    "subject": subject,
                    "text": text,
                    "html": html,
                },
            )
        if r.is_success:
            rid = ""
            try:
                rid = r.json().get("id") or ""
            except Exception:
                pass
            logger.info("Resend API OK status=%s email_id=%s", r.status_code, rid)
            return True
        logger.error(
            "Resend welcome email failed: %s %s",
            r.status_code,
            r.text[:500] if r.text else "",
        )
        return False
    except Exception as e:
        logger.exception("Resend welcome email error: %s", e)
        return False


def send_profile_incomplete_reminder_email(to_address: str) -> bool:
    """
    One-time nudge to complete required profile fields. Returns True if Resend accepted.
    """
    key = (settings.resend_api_key or "").strip()
    from_addr = (settings.resend_from_email or "").strip()
    if not key:
        logger.warning("Profile reminder skipped: RESEND_API_KEY not set")
        return False
    if not from_addr:
        logger.warning("Profile reminder skipped: RESEND_FROM_EMAIL not set")
        return False

    origin = _site_origin()
    profile_url = f"{origin}/profile?utm_source=email&utm_medium=email&utm_campaign=profile_incomplete_v1"

    subject = "Complete your Optimal CV profile"
    text = (
        "You signed up for Optimal CV a little while ago, but some required profile fields are still empty.\n\n"
        "Complete your base resume in Edit profile so you can generate tailored resumes and motivation letters.\n\n"
        f"Edit profile: {profile_url}\n\n"
        "— Optimal CV\n"
    )
    html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1e293b;">
  <p>You signed up for <strong>Optimal CV</strong> a little while ago, but some <strong>required</strong> profile fields are still empty.</p>
  <p>Complete your base resume in <strong>Edit profile</strong> so you can generate tailored resumes and motivation letters.</p>
  <p>
    <a href="{profile_url}" style="display: inline-block; margin: 8px 0; padding: 10px 16px; background: #1e40af; color: #fff; text-decoration: none; border-radius: 8px;">Complete profile</a>
  </p>
  <p style="margin-top: 24px; font-size: 14px; color: #64748b;">— Optimal CV</p>
</body>
</html>"""

    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.post(
                RESEND_API,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": [to_address],
                    "subject": subject,
                    "text": text,
                    "html": html,
                },
            )
        if r.is_success:
            logger.info("Resend profile reminder OK status=%s", r.status_code)
            return True
        logger.error(
            "Resend profile reminder failed: %s %s",
            r.status_code,
            r.text[:500] if r.text else "",
        )
        return False
    except Exception as e:
        logger.exception("Resend profile reminder error: %s", e)
        return False


def send_welcome_email_if_needed(user_id: str, email: str) -> None:
    """Send welcome once per user (idempotent). Called from a daemon thread after signup."""
    from app.database import get_user_by_id, mark_welcome_email_sent

    user = get_user_by_id(user_id)
    if not user:
        logger.warning("Welcome email skipped: user not found user_id=%s", user_id)
        return
    if user.get("welcome_email_sent_at"):
        logger.info("Welcome email skipped: already sent user_id=%s", user_id)
        return
    logger.info("Welcome email: sending via Resend user_id=%s", user_id)
    if send_welcome_email(email):
        mark_welcome_email_sent(user_id)
        logger.info("Welcome email: Resend accepted user_id=%s", user_id)
    else:
        logger.warning("Welcome email: send failed or Resend error user_id=%s", user_id)
