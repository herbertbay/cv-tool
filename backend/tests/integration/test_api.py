"""
Integration tests for FastAPI endpoints.
Mocks OpenAI and optional PDF generation so tests don't require API key or WeasyPrint.
"""
import io
import json
from unittest.mock import patch, MagicMock, AsyncMock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_health(client: TestClient):
    """GET /health returns 200, status ok, and openai_configured (for Railway deploy check)."""
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "openai_configured" in data
    assert isinstance(data["openai_configured"], bool)


def test_parse_cv_success(client: TestClient, sample_linkedin_json: str):
    """POST /api/parse-cv with valid JSON returns profile."""
    r = client.post(
        "/api/parse-cv",
        files={"file": ("profile.json", io.BytesIO(sample_linkedin_json.encode()), "application/json")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["full_name"] == "Alice Smith"
    assert data["headline"] == "Data Scientist"
    assert len(data["experience"]) == 1
    assert data["experience"][0]["title"] == "Data Scientist"
    assert "Python" in data["skills"]


def test_parse_cv_wrong_extension(client: TestClient):
    """POST /api/parse-cv with non-PDF/JSON file returns 400."""
    r = client.post(
        "/api/parse-cv",
        files={"file": ("data.txt", io.BytesIO(b"not json"), "text/plain")},
    )
    assert r.status_code == 400
    detail = r.json().get("detail") or ""
    assert "PDF" in detail or "JSON" in detail or "file" in detail.lower()


def test_parse_cv_invalid_json(client: TestClient):
    """POST /api/parse-cv with invalid JSON returns 400."""
    r = client.post(
        "/api/parse-cv",
        files={"file": ("x.json", io.BytesIO(b"{ invalid }"), "application/json")},
    )
    assert r.status_code == 400


def test_get_profile_returns_empty_or_profile(client: TestClient):
    """GET /api/profile returns profile dict (empty if new user)."""
    r = client.get("/api/profile")
    assert r.status_code == 200
    data = r.json()
    assert "full_name" in data
    assert "experience" in data
    assert "skills" in data


def test_put_profile_returns_profile(client: TestClient, sample_profile_dict: dict):
    """PUT /api/profile returns profile (no DB write; only CV upload updates DB)."""
    sample_profile_dict["full_name"] = "Edited User"
    r = client.put("/api/profile", json=sample_profile_dict)
    assert r.status_code == 200
    assert r.json()["full_name"] == "Edited User"


def test_parse_cv_saves_to_db(client: TestClient, sample_linkedin_json: str):
    """POST /api/parse-cv saves parsed profile to DB; GET /api/profile returns it."""
    r = client.post(
        "/api/parse-cv",
        files={"file": ("profile.json", io.BytesIO(sample_linkedin_json.encode()), "application/json")},
    )
    assert r.status_code == 200
    assert r.json()["full_name"] == "Alice Smith"
    r2 = client.get("/api/profile")
    assert r2.status_code == 200
    assert r2.json()["full_name"] == "Alice Smith"
    assert "Python" in r2.json()["skills"]


def test_fetch_job_description_text(client: TestClient):
    """POST /api/fetch-job-description with text returns content as-is."""
    r = client.post(
        "/api/fetch-job-description",
        json={"text": "We need a Python developer."},
    )
    assert r.status_code == 200
    assert r.json()["content"] == "We need a Python developer."
    assert r.json()["source"] == "text"


def test_fetch_job_description_no_url_or_text(client: TestClient):
    """POST /api/fetch-job-description without url or text returns 400."""
    r = client.post("/api/fetch-job-description", json={})
    assert r.status_code == 422 or r.status_code == 400


def test_fetch_additional_urls_empty(client: TestClient):
    """POST /api/fetch-additional-urls with empty urls returns empty contents."""
    r = client.post("/api/fetch-additional-urls", json={"urls": []})
    assert r.status_code == 200
    assert r.json()["contents"] == {}


@patch("app.main.generate_letter_pdf")
@patch("app.main.tailor_cv_and_letter")
@patch("app.main.generate_cv_pdf")
def test_generate_cv_success(
    mock_pdf: MagicMock,
    mock_tailor: MagicMock,
    mock_letter_pdf: MagicMock,
    client: TestClient,
    sample_profile_dict: dict,
):
    """POST /api/generate-cv with valid body returns session and tailored content."""
    mock_pdf.return_value = b"%PDF-fake"
    mock_letter_pdf.return_value = b"%PDF-letter"
    mock_tailor.return_value = (
        "Tailored summary.",
        [{"title": "Engineer", "company": "Tech Co", "start_date": "2020", "end_date": "Present", "description": "Done."}],
        "Dear hiring manager, ...",
        ["Python", "API"],
    )
    r = client.post(
        "/api/generate-cv",
        json={
            "profile": sample_profile_dict,
            "job_description": "Looking for Python developer.",
            "personal_summary": None,
            "additional_urls": [],
            "language": "en",
            "template": "cv_base.html",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "session_id" in data
    assert data["tailored_summary"] == "Tailored summary."
    assert data["motivation_letter"] == "Dear hiring manager, ..."
    assert "Python" in data["suggested_skills_highlight"]
    assert data["status"] == "success"


@patch("app.main.generate_letter_pdf")
@patch("app.main.tailor_cv_and_letter")
@patch("app.main.generate_cv_pdf")
def test_generate_cv_pdf_attached_to_session(
    mock_pdf: MagicMock,
    mock_tailor: MagicMock,
    mock_letter_pdf: MagicMock,
    client: TestClient,
    sample_profile_dict: dict,
):
    """After generate-cv, session has CV PDF and letter PDF; download works."""
    mock_pdf.return_value = b"%PDF-fake-bytes"
    mock_letter_pdf.return_value = b"%PDF-letter-bytes"
    mock_tailor.return_value = ("S", [{"title": "E", "company": "C", "start_date": "2020", "end_date": "Present", "description": "D"}], "L", [])
    r = client.post(
        "/api/generate-cv",
        json={
            "profile": sample_profile_dict,
            "job_description": "Job text",
            "additional_urls": [],
            "language": "en",
        },
    )
    assert r.status_code == 200
    session_id = r.json()["session_id"]
    # Get session
    r2 = client.get(f"/api/session/{session_id}")
    assert r2.status_code == 200
    assert r2.json()["has_pdf"] is True
    # Download CV PDF
    r3 = client.get(f"/api/download-pdf/{session_id}")
    assert r3.status_code == 200
    assert r3.headers["content-type"] == "application/pdf"
    assert r3.content == b"%PDF-fake-bytes"
    # Download letter PDF
    r4 = client.get(f"/api/download-letter/{session_id}")
    assert r4.status_code == 200
    assert r4.content == b"%PDF-letter-bytes"


@patch("app.main.settings")
def test_generate_cv_missing_openai_key(mock_settings: MagicMock, client: TestClient, sample_profile_dict: dict):
    """When OPENAI_API_KEY is not set, generate-cv returns 503."""
    mock_settings.openai_api_key = ""
    mock_settings.session_ttl_seconds = 3600
    r = client.post(
        "/api/generate-cv",
        json={
            "profile": sample_profile_dict,
            "job_description": "Job",
            "additional_urls": [],
            "language": "en",
        },
    )
    assert r.status_code == 503


def test_get_session_not_found(client: TestClient):
    """GET /api/session/{id} for unknown id returns 404."""
    r = client.get("/api/session/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


def test_download_pdf_not_found(client: TestClient):
    """GET /api/download-pdf/{id} for unknown id returns 404."""
    r = client.get("/api/download-pdf/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404


@patch("app.main.tailor_cv_and_letter")
def test_download_pdf_no_pdf_ready(
    mock_tailor: MagicMock,
    client: TestClient,
    sample_profile_dict: dict,
):
    """When PDF generation failed, download returns 404."""
    mock_tailor.return_value = ("S", [{"title": "E", "company": "C", "start_date": "2020", "end_date": "Present", "description": "D"}], "L", [])
    with patch("app.main.generate_cv_pdf", side_effect=Exception("WeasyPrint failed")):
        r = client.post(
            "/api/generate-cv",
            json={
                "profile": sample_profile_dict,
                "job_description": "Job",
                "additional_urls": [],
                "language": "en",
            },
        )
    assert r.status_code == 200
    session_id = r.json()["session_id"]
    r2 = client.get(f"/api/download-pdf/{session_id}")
    assert r2.status_code == 404


def test_update_profile_post(client: TestClient, sample_profile_dict: dict):
    """POST /api/profile with ProfileUpdateRequest saves and returns profile."""
    sample_profile_dict["full_name"] = "Updated Name"
    r = client.post("/api/profile", json={"profile": sample_profile_dict})
    assert r.status_code == 200
    assert r.json()["full_name"] == "Updated Name"


def test_fetch_job_description_with_url_calls_fetcher(client: TestClient):
    """POST /api/fetch-job-description with url triggers fetch (mocked)."""
    with patch("app.main.fetch_job_description", return_value="Fetched job text") as mock_fetch:
        r = client.post("/api/fetch-job-description", json={"url": "https://example.com/job"})
    assert r.status_code == 200
    assert r.json()["content"] == "Fetched job text"
    mock_fetch.assert_called_once()
