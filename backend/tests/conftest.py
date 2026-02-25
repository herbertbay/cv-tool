"""
Pytest fixtures for backend tests.
Provides FastAPI TestClient and sample profile/job data.
"""
import os

import pytest
from fastapi.testclient import TestClient

# Ensure we don't require real OpenAI key for most tests
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")


@pytest.fixture
def client():
    """FastAPI test client (no live server)."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_profile_dict():
    """Minimal profile dict for API requests."""
    return {
        "full_name": "Jane Doe",
        "headline": "Senior Engineer",
        "summary": "Experienced developer.",
        "email": "jane@example.com",
        "phone": None,
        "address": None,
        "linkedin_url": None,
        "photo_base64": None,
        "experience": [
            {
                "title": "Engineer",
                "company": "Tech Co",
                "start_date": "2020-01",
                "end_date": "Present",
                "description": "Built systems.",
                "location": None,
            }
        ],
        "education": [],
        "skills": ["Python", "JavaScript"],
        "certifications": [],
        "languages": [],
    }


@pytest.fixture
def sample_linkedin_json():
    """Valid LinkedIn-style JSON string."""
    return """{
        "full_name": "Alice Smith",
        "headline": "Data Scientist",
        "summary": "ML and data pipelines.",
        "email": "alice@example.com",
        "experience": [
            {"title": "Data Scientist", "company": "DataCorp", "start_date": "2019", "end_date": "Present", "description": "Built ML models."}
        ],
        "education": [{"school": "MIT", "degree": "PhD", "field": "CS", "start_date": "2015", "end_date": "2019"}],
        "skills": ["Python", "TensorFlow", "SQL"],
        "certifications": [],
        "languages": []
    }"""
