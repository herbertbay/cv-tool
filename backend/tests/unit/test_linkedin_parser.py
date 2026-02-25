"""
Unit tests for LinkedIn / profile JSON parser.
"""
import json
import pytest

from app.linkedin_parser import parse_linkedin_json
from app.models import Profile, Position, EducationEntry, CertificationEntry


def test_parse_custom_profile_json():
    """Parse our custom profile format (full_name, experience, etc.)."""
    data = {
        "full_name": "John Doe",
        "headline": "Developer",
        "summary": "Hello world",
        "email": "john@test.com",
        "experience": [
            {"title": "Dev", "company": "Acme", "start_date": "2020", "end_date": "2022", "description": "Coding"}
        ],
        "education": [{"school": "Uni", "degree": "BS", "field": "CS"}],
        "skills": ["Python", "Go"],
        "certifications": [{"name": "AWS", "authority": "Amazon", "date": "2021"}],
        "languages": ["English"],
    }
    raw = json.dumps(data)
    profile = parse_linkedin_json(raw)
    assert profile.full_name == "John Doe"
    assert profile.headline == "Developer"
    assert profile.summary == "Hello world"
    assert profile.email == "john@test.com"
    assert len(profile.experience) == 1
    assert profile.experience[0].title == "Dev"
    assert profile.experience[0].company == "Acme"
    assert len(profile.education) == 1
    assert profile.education[0].school == "Uni"
    assert profile.skills == ["Python", "Go"]
    assert len(profile.certifications) == 1
    assert profile.certifications[0].name == "AWS"
    assert profile.languages == ["English"]


def test_parse_linkedin_json_from_bytes():
    """Parser accepts bytes and decodes to UTF-8."""
    data = {"full_name": "Byte User", "summary": "", "experience": [], "education": [], "skills": [], "certifications": [], "languages": []}
    raw = json.dumps(data).encode("utf-8")
    profile = parse_linkedin_json(raw)
    assert profile.full_name == "Byte User"


def test_parse_json_resume_basics():
    """Parse JSON Resume style with basics.name."""
    data = {
        "basics": {
            "name": "Resume User",
            "email": "resume@test.com",
            "summary": "My summary",
        },
        "experience": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "languages": [],
    }
    profile = parse_linkedin_json(json.dumps(data))
    assert profile.full_name == "Resume User"
    assert profile.email == "resume@test.com"
    assert profile.summary == "My summary"


def test_parse_linkedin_export_format():
    """Parse LinkedIn export style with fullName, positions, etc."""
    data = {
        "profile": {
            "fullName": "Export User",
            "headline": "Engineer",
            "summary": "Summary here",
            "positions": [
                {
                    "title": "Senior Dev",
                    "companyName": "BigCo",
                    "startedOn": {"year": "2018"},
                    "endedOn": {"year": "2023"},
                    "description": "Did stuff",
                }
            ],
            "education": [
                {
                    "schoolName": "State U",
                    "degreeName": "BS",
                    "fieldOfStudy": "CS",
                    "startedOn": {"year": "2014"},
                    "endedOn": {"year": "2018"},
                }
            ],
            "skills": [{"name": "Java"}, {"name": "Kotlin"}],
        }
    }
    profile = parse_linkedin_json(json.dumps(data))
    assert profile.full_name == "Export User"
    assert profile.headline == "Engineer"
    assert len(profile.experience) == 1
    assert profile.experience[0].title == "Senior Dev"
    assert profile.experience[0].company == "BigCo"
    assert len(profile.education) == 1
    assert profile.education[0].school == "State U"
    assert profile.skills == ["Java", "Kotlin"]


def test_parse_empty_or_minimal():
    """Minimal valid structure still produces a Profile."""
    profile = parse_linkedin_json('{"full_name": "Min", "experience": [], "education": [], "skills": [], "certifications": [], "languages": []}')
    assert profile.full_name == "Min"
    assert profile.experience == []
    assert profile.skills == []


def test_parse_list_wrapped():
    """Input that is a list is converted; parser still returns a valid Profile."""
    profile = parse_linkedin_json('[{"full_name": "ListUser", "experience": [], "education": [], "skills": [], "certifications": [], "languages": []}]')
    assert isinstance(profile, Profile)
    assert hasattr(profile, "experience") and profile.experience == []


def test_parse_skills_as_strings():
    """Skills can be list of strings."""
    data = {"full_name": "S", "skills": ["A", "B", "C"], "experience": [], "education": [], "certifications": [], "languages": []}
    profile = parse_linkedin_json(json.dumps(data))
    assert profile.skills == ["A", "B", "C"]


def test_parse_skills_as_objects():
    """Skills can be list of objects with name/skill/title."""
    data = {"full_name": "S", "skills": [{"name": "X"}, {"skill": "Y"}, {"title": "Z"}], "experience": [], "education": [], "certifications": [], "languages": []}
    profile = parse_linkedin_json(json.dumps(data))
    assert "X" in profile.skills
    assert "Y" in profile.skills
    assert "Z" in profile.skills


def test_parse_invalid_json_raises():
    """Invalid JSON raises."""
    with pytest.raises(Exception):
        parse_linkedin_json("not json at all")


def test_parse_address_object():
    """Address as object (city, region, country) is flattened."""
    data = {
        "full_name": "A",
        "basics": {"address": {"city": "NYC", "region": "NY", "country": "USA"}},
        "experience": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "languages": [],
    }
    profile = parse_linkedin_json(json.dumps(data))
    assert "NYC" in (profile.address or "")
    assert "NY" in (profile.address or "")
    assert "USA" in (profile.address or "")
