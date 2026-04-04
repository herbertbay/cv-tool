"""
Cron endpoint tests. Stub weasyprint so app.main imports without native deps (CI / minimal venv).
"""
import sys
import types
from unittest.mock import patch

# Must run before `from app.main import app` (pdf_generator imports weasyprint.*)
if "weasyprint" not in sys.modules:

    class _HTML:
        def __init__(self, *a, **k):
            pass

        def write_pdf(self, *a, **k):
            return None

    class _FontConfiguration:
        def __init__(self, *a, **k):
            pass

    _wp = types.ModuleType("weasyprint")
    _wp.HTML = _HTML
    _text = types.ModuleType("weasyprint.text")
    _fonts = types.ModuleType("weasyprint.text.fonts")
    _fonts.FontConfiguration = _FontConfiguration
    sys.modules["weasyprint.text.fonts"] = _fonts
    sys.modules["weasyprint.text"] = _text
    sys.modules["weasyprint"] = _wp

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app

    return TestClient(app)


def test_profile_incomplete_cron_not_configured(client: TestClient, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "admin_secret", "")
    r = client.post("/api/admin/cron/send-profile-incomplete-reminders?secret=anything")
    assert r.status_code == 404


def test_profile_incomplete_cron_unauthorized(client: TestClient, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "admin_secret", "expected-secret")
    r = client.post("/api/admin/cron/send-profile-incomplete-reminders?secret=wrong")
    assert r.status_code == 401


def test_profile_incomplete_cron_ok_query_secret(client: TestClient, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "admin_secret", "cron-secret")
    fake = {"sent": 0, "failed": 0, "skipped_complete": 2, "skipped_too_new": 1, "candidates": 3}
    with patch("app.main.run_profile_incomplete_reminders", return_value=fake):
        r = client.post("/api/admin/cron/send-profile-incomplete-reminders?secret=cron-secret")
    assert r.status_code == 200
    assert r.json() == fake


def test_profile_incomplete_cron_ok_header_secret(client: TestClient, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "admin_secret", "hsecret")
    with patch(
        "app.main.run_profile_incomplete_reminders",
        return_value={"sent": 0, "failed": 0, "skipped_complete": 0, "skipped_too_new": 0, "candidates": 0},
    ):
        r = client.post(
            "/api/admin/cron/send-profile-incomplete-reminders",
            headers={"X-Admin-Secret": "hsecret"},
        )
    assert r.status_code == 200
