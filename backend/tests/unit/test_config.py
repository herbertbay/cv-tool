"""
Unit tests for app config. Verify OPENAI_API_KEY is read from environment
so that on Railway (or any deploy) the key can be checked via settings or /health.
"""
import pytest

from app.config import Settings


def test_openai_api_key_read_from_env_when_set(monkeypatch):
    """When OPENAI_API_KEY is set in environment, Settings exposes it (e.g. on Railway)."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key-for-railway")
    s = Settings()
    assert s.openai_api_key == "sk-test-key-for-railway"
    assert bool(s.openai_api_key) is True


def test_openai_api_key_empty_when_unset(monkeypatch):
    """When OPENAI_API_KEY is unset or empty, Settings has falsy key."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "")
    s = Settings()
    assert s.openai_api_key == ""
    assert bool(s.openai_api_key) is False
