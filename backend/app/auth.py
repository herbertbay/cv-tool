"""Minimal auth: password hashing and signed session cookie."""
from typing import Optional

import bcrypt
import itsdangerous


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_session_token(user_id: str, secret_key: str) -> str:
    """Create a signed token containing user_id (for cookie value)."""
    s = itsdangerous.URLSafeTimedSerializer(secret_key, salt="cv-tool-session")
    return s.dumps({"user_id": user_id})


def verify_session_token(token: str, secret_key: str, max_age_seconds: int = 30 * 24 * 3600) -> Optional[str]:
    """Verify token and return user_id or None. max_age default 30 days."""
    s = itsdangerous.URLSafeTimedSerializer(secret_key, salt="cv-tool-session")
    try:
        data = s.loads(token, max_age=max_age_seconds)
        return data.get("user_id")
    except itsdangerous.BadSignature:
        return None
    except itsdangerous.SignatureExpired:
        return None
