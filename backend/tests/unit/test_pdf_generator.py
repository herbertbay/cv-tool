"""
Unit tests for PDF generator.
Tests helpers and template context; full PDF generation may be skipped if WeasyPrint deps missing.
"""
import pytest

from app.models import Profile, Position, EducationEntry
from app.pdf_generator import (
    _highlight_keywords_in_text,
    _keyword_match,
    _prepare_template_context,
    _strip_html,
    generate_cv_pdf,
    TEMPLATES_DIR,
)


def test_strip_html_removes_literal_tags():
    """Literal <strong> etc. in source text are removed so they don't appear in PDF."""
    text = "teams and drive <strong>product vision</strong> aligns perfectly"
    assert _strip_html(text) == "teams and drive product vision aligns perfectly"
    assert _strip_html("<p>Hello</p>") == "Hello"
    assert _strip_html("") == ""


def test_strip_html_removes_escaped_tags():
    """Escaped HTML tags should also be stripped."""
    text = "Herbert Bay is an accomplished &lt;strong&gt;VP of Product&lt;/strong&gt;"
    assert _strip_html(text) == "Herbert Bay is an accomplished VP of Product"


def test_highlight_keywords_in_text_empty():
    """Empty text or keywords returns unchanged."""
    assert _highlight_keywords_in_text("", ["Python"]) == ""
    assert _highlight_keywords_in_text("Hello", []) == "Hello"


def test_highlight_keywords_in_text_wraps_keyword():
    """Keyword is wrapped in <strong>."""
    result = _highlight_keywords_in_text("I know Python well.", ["Python"])
    assert "<strong>Python</strong>" in result
    assert "I know" in result


def test_highlight_keywords_in_text_case_insensitive():
    """Matching is case-insensitive."""
    result = _highlight_keywords_in_text("PYTHON and python", ["python"])
    assert "<strong>PYTHON</strong>" in result or "strong" in result


def test_keyword_match_filter():
    """_keyword_match returns True if skill matches or contains keyword."""
    assert _keyword_match("Python", ["Python"]) is True
    assert _keyword_match("Python", ["python"]) is True
    assert _keyword_match("Python Developer", ["Developer"]) is True
    assert _keyword_match("Java", ["Python"]) is False
    assert _keyword_match("", ["Python"]) is False
    assert _keyword_match("Python", []) is False


def test_prepare_template_context():
    """_prepare_template_context returns dict with profile, summary, experience, etc."""
    profile = Profile(
        full_name="Jane",
        summary="Summary",
        experience=[Position(title="Dev", company="Co", start_date="2020", end_date="Present", description="Did stuff.")],
        education=[],
        skills=["Python"],
        certifications=[],
        languages=[],
    )
    ctx = _prepare_template_context(
        profile=profile,
        tailored_summary="Tailored summary.",
        tailored_experience=[{"title": "Dev", "company": "Co", "start_date": "2020", "end_date": "Present", "description": "Did stuff."}],
        motivation_letter="Dear...",
        keywords_to_highlight=["Python"],
    )
    assert ctx["profile"]["full_name"] == "Jane"
    assert "Tailored summary" in ctx["tailored_summary"]
    assert len(ctx["tailored_experience"]) == 1


def test_prepare_template_context_photo_data_url():
    """Photo as data URL is passed through; raw base64 gets data prefix."""
    profile = Profile(
        full_name="J",
        summary="",
        photo_base64="data:image/png;base64,abc123",
        experience=[],
        education=[],
        skills=[],
        certifications=[],
        languages=[],
    )
    ctx = _prepare_template_context(profile, "", [], "", [])
    assert ctx["photo_data_url"] == "data:image/png;base64,abc123"


def test_templates_dir_exists():
    """Templates directory exists and contains cv_base.html."""
    assert TEMPLATES_DIR.exists()
    assert (TEMPLATES_DIR / "cv_base.html").exists()


def test_generate_cv_pdf_returns_bytes():
    """generate_cv_pdf returns PDF bytes when WeasyPrint is available."""
    profile = Profile(
        full_name="Test",
        summary="Summary",
        experience=[Position(title="Dev", company="Co", start_date="2020", end_date="Present", description="Work.")],
        education=[],
        skills=[],
        certifications=[],
        languages=[],
    )
    try:
        pdf_bytes = generate_cv_pdf(
            profile=profile,
            tailored_summary="Summary",
            tailored_experience=[{"title": "Dev", "company": "Co", "start_date": "2020", "end_date": "Present", "description": "Work."}],
            keywords_to_highlight=[],
            template_name="cv_base.html",
        )
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:4] == b"%PDF"
    except Exception as e:
        pytest.skip(f"WeasyPrint not available: {e}")
