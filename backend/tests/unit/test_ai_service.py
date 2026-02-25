"""
Unit tests for AI service (tailor_cv_and_letter).
OpenAI client is mocked to avoid API calls.
"""
from unittest.mock import patch, MagicMock

import pytest

from app.models import Profile, Position, EducationEntry
from app.ai_service import tailor_cv_and_letter, _profile_to_context, LANG_NAMES


@pytest.fixture
def minimal_profile():
    """Profile with minimal required fields."""
    return Profile(
        full_name="Test User",
        headline="Developer",
        summary="I code.",
        email="test@example.com",
        experience=[
            Position(title="Dev", company="Co", start_date="2020", end_date="Present", description="Coded.")
        ],
        education=[
            EducationEntry(school="Uni", degree="BS", field="CS", start_date="2016", end_date="2020")
        ],
        skills=["Python", "SQL"],
        certifications=[],
        languages=[],
    )


def test_profile_to_context_includes_name_and_summary(minimal_profile):
    """_profile_to_context includes name, headline, summary."""
    ctx = _profile_to_context(minimal_profile)
    assert "Test User" in ctx
    assert "Developer" in ctx
    assert "I code." in ctx
    assert "Dev" in ctx
    assert "Co" in ctx
    assert "Python" in ctx
    assert "Uni" in ctx


def test_lang_names():
    """Supported languages are defined."""
    assert LANG_NAMES["en"] == "English"
    assert LANG_NAMES["de"] == "German"
    assert LANG_NAMES["fr"] == "French"


@patch("app.ai_service._get_client")
def test_tailor_cv_and_letter_returns_four_tuple(mock_get_client, minimal_profile):
    """tailor_cv_and_letter returns (summary, experience_list, letter, keywords)."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = '''{
        "tailored_summary": "Tailored summary text.",
        "tailored_experience": [
            {"title": "Dev", "company": "Co", "start_date": "2020", "end_date": "Present", "description": "Tailored desc"}
        ],
        "motivation_letter": "Dear hiring manager...",
        "keywords_to_highlight": ["Python", "API"]
    }'''
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp
    mock_get_client.return_value = mock_client

    summary, exp_list, letter, keywords = tailor_cv_and_letter(
        profile=minimal_profile,
        job_description="Looking for Python developer.",
        personal_summary_override=None,
        additional_context="",
        language="en",
    )
    assert isinstance(summary, str)
    assert "Tailored summary" in summary or "summary" in summary.lower()
    assert isinstance(exp_list, list)
    assert len(exp_list) == 1
    assert exp_list[0]["title"] == "Dev"
    assert "Tailored desc" in (exp_list[0].get("description") or "")
    assert "Dear" in letter or "hiring" in letter.lower()
    assert "Python" in keywords or "API" in keywords


@patch("app.ai_service._get_client")
def test_tailor_cv_and_letter_invalid_json_fallback(mock_get_client, minimal_profile):
    """If GPT returns invalid JSON, fallback to profile data."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = "This is not JSON at all"
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp
    mock_get_client.return_value = mock_client

    summary, exp_list, letter, keywords = tailor_cv_and_letter(
        profile=minimal_profile,
        job_description="Job",
        personal_summary_override=None,
        additional_context="",
        language="en",
    )
    assert summary == minimal_profile.summary or len(summary) > 0
    assert len(exp_list) == 1
    assert exp_list[0]["title"] == "Dev"
    assert isinstance(keywords, list)


@patch("app.ai_service._get_client")
def test_tailor_cv_and_letter_personal_summary_included(mock_get_client, minimal_profile):
    """personal_summary_override is included in context sent to API."""
    mock_resp = MagicMock()
    mock_resp.choices = [MagicMock()]
    mock_resp.choices[0].message.content = '''{"tailored_summary": "S", "tailored_experience": [{"title": "Dev", "company": "Co", "start_date": "2020", "end_date": "Present", "description": "D"}], "motivation_letter": "L", "keywords_to_highlight": []}'''
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_resp
    mock_get_client.return_value = mock_client

    tailor_cv_and_letter(
        profile=minimal_profile,
        job_description="Job",
        personal_summary_override="I love Python and APIs.",
        additional_context="",
        language="de",
    )
    call_args = mock_client.chat.completions.create.call_args
    messages = call_args[1]["messages"]
    user_content = next(m["content"] for m in messages if m["role"] == "user")
    assert "I love Python" in user_content
    assert "German" in user_content or "de" in str(messages).lower()
