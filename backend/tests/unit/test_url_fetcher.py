"""
Unit tests for URL fetcher (job description and additional URLs).
Uses mocking to avoid real HTTP calls.
"""
from unittest.mock import patch, MagicMock

import pytest

from app.url_fetcher import (
    fetch_url_text,
    fetch_job_description,
    fetch_additional_urls,
)


@patch("app.url_fetcher.httpx.Client")
def test_fetch_url_text_returns_plain_text(mock_client_class):
    """fetch_url_text strips HTML and returns text."""
    mock_resp = MagicMock()
    mock_resp.text = "<html><body><p>Hello</p><script>x</script></body></html>"
    mock_resp.raise_for_status = MagicMock()
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_resp
    mock_client_class.return_value = mock_client

    result = fetch_url_text("https://example.com")
    assert "Hello" in result
    assert "<html>" not in result
    assert "script" not in result.lower() or "x" not in result


@patch("app.url_fetcher.httpx.Client")
def test_fetch_url_text_on_failure_returns_empty(mock_client_class):
    """On HTTP or network error, return empty string."""
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.side_effect = Exception("Connection error")
    mock_client_class.return_value = mock_client

    result = fetch_url_text("https://example.com")
    assert result == ""


def test_fetch_job_description_plain_text():
    """If input is not a URL, return as-is."""
    text = "We are looking for a Python developer."
    assert fetch_job_description(text) == text


def test_fetch_job_description_empty():
    """Empty or whitespace returns empty after strip."""
    assert fetch_job_description("") == ""
    assert fetch_job_description("   ") == ""


@patch("app.url_fetcher.fetch_url_text")
def test_fetch_job_description_url_calls_fetch(mock_fetch):
    """If input is URL, call fetch_url_text and return result."""
    mock_fetch.return_value = "Job description from URL"
    result = fetch_job_description("https://example.com/job")
    assert result == "Job description from URL"
    mock_fetch.assert_called_once_with("https://example.com/job")


def test_fetch_additional_urls_empty():
    """Empty list returns empty dict."""
    assert fetch_additional_urls([]) == {}


def test_fetch_additional_urls_skips_non_urls():
    """Non-URL strings are skipped."""
    with patch("app.url_fetcher.fetch_url_text") as mock_fetch:
        result = fetch_additional_urls(["not-a-url", "  ", "https://example.com"])
    assert "https://example.com" in result
    assert len(result) == 1
    mock_fetch.assert_called_once_with("https://example.com")


def test_fetch_additional_urls_max_five():
    """Only first 5 URLs are fetched."""
    urls = [f"https://example.com/{i}" for i in range(7)]
    with patch("app.url_fetcher.fetch_url_text", return_value="content") as mock_fetch:
        result = fetch_additional_urls(urls)
    assert len(result) <= 5
    assert mock_fetch.call_count == 5
