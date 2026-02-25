"""Pydantic models for API request/response and internal data structures."""
from typing import Optional

from pydantic import BaseModel, Field


# --- LinkedIn / Profile structures (editable profile page) ---
class Position(BaseModel):
    title: str = ""
    company: str = ""
    start_date: Optional[str] = None  # YYYY-MM or "Present"
    end_date: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class EducationEntry(BaseModel):
    school: str = ""
    degree: Optional[str] = None
    field: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class CertificationEntry(BaseModel):
    name: str = ""
    authority: Optional[str] = None
    date: Optional[str] = None
    url: Optional[str] = None


class Profile(BaseModel):
    """Stored profile data (from LinkedIn or manual edit)."""
    full_name: str = ""
    headline: Optional[str] = None
    summary: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    linkedin_url: Optional[str] = None
    photo_base64: Optional[str] = None  # base64 data URL or null
    experience: list[Position] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    certifications: list[CertificationEntry] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)


# --- API request/response ---
class GenerateCVRequest(BaseModel):
    """Request body for CV generation."""
    profile: Profile
    job_description: str
    personal_summary: Optional[str] = None  # Override or supplement profile summary
    additional_urls: list[str] = Field(default_factory=list, max_length=5)
    additional_urls_content: Optional[dict[str, str]] = None  # Optional: pre-fetched content
    language: str = "en"  # en, de, fr
    template: str = "cv_base.html"  # modern (cv_base), executive, creative


class GenerateCVResponse(BaseModel):
    """Response after CV generation."""
    session_id: str
    tailored_summary: str
    tailored_experience: list[dict]  # Same shape as Position with tailored descriptions
    motivation_letter: str
    suggested_skills_highlight: list[str]  # Keywords to highlight in PDF
    status: str = "success"


class ProfileUpdateRequest(BaseModel):
    """Update stored profile (editable profile page)."""
    profile: Profile


class SessionInfo(BaseModel):
    """Info about a generation session (for download)."""
    session_id: str
    created_at: str
    has_pdf: bool
