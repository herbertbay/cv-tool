"""
Extract profile data from uploaded PDF (e.g. LinkedIn "Save as PDF" or CV PDF).
Uses PyPDF to extract text, then heuristics + optional AI to structure into Profile.
On Railway: same code path as local; OPENAI_API_KEY must be set for AI parsing.
If text extraction is poor (e.g. image-based PDFs), only heuristics or AI on minimal text apply.
"""
import json
import logging
import re
from io import BytesIO

from pypdf import PdfReader

from app.models import Profile, Position, EducationEntry, CertificationEntry
from app.ai_service import _get_client
from app.config import settings

logger = logging.getLogger(__name__)

# Minimum chars to consider extraction successful; below this we try layout mode
_MIN_TEXT_LENGTH = 30


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract raw text from PDF. Tries default extraction first; if result is very short,
    retries with layout mode (helps some PDFs where default order is wrong or empty).
    """
    reader = PdfReader(BytesIO(pdf_bytes))
    texts = []
    texts_layout = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            texts.append(t)
        try:
            t_layout = page.extract_text(extraction_mode="layout")
            if t_layout:
                texts_layout.append(t_layout)
        except Exception as e:
            logger.debug("PDF layout extraction failed for a page: %s", e)
    out = "\n".join(texts).strip()
    out_layout = "\n".join(texts_layout).strip() if texts_layout else ""
    if len(out_layout) > len(out) and len(out_layout) >= _MIN_TEXT_LENGTH:
        return out_layout
    return out


def parse_pdf_to_profile(pdf_bytes: bytes, use_ai: bool = True) -> Profile:
    """
    Parse PDF content into Profile.
    First extracts text, then uses AI (if OPENAI_API_KEY set) to structure, else heuristics.
    On Railway: ensure OPENAI_API_KEY is set for best results; if AI fails we fall back to heuristics and log.
    """
    text = extract_text_from_pdf(pdf_bytes)
    if not text or len(text.strip()) < 20:
        raise ValueError("PDF appears empty or could not extract text. Try a text-based PDF (e.g. exported from LinkedIn or Word).")

    if use_ai and settings.openai_api_key:
        try:
            return _parse_with_ai(text)
        except Exception as e:
            logger.warning("PDF parse: AI structuring failed, using heuristics: %s", e)
    else:
        if use_ai and not settings.openai_api_key:
            logger.info("PDF parse: OPENAI_API_KEY not set, using heuristics only")
    return _parse_with_heuristics(text)


def _parse_with_heuristics(text: str) -> Profile:
    """Parse extracted text using regex/heuristics into Profile."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    full_name = ""
    headline = None
    summary = ""
    experience: list[Position] = []
    education: list[EducationEntry] = []
    skills: list[str] = []
    certifications: list[CertificationEntry] = []
    linkedin_url = None

    url_match = re.search(r"https?://(?:www\.)?linkedin\.com/in/[\w\-]+", text)
    if url_match:
        linkedin_url = url_match.group(0)

    section_headers = {"experience", "education", "skills", "certifications", "summary", "about", "work"}
    current_section = None

    for i, line in enumerate(lines):
        lower = line.lower()
        if not full_name and i < 5 and len(line) < 60 and line[0].isupper():
            full_name = line
            continue
        if any(h in lower for h in section_headers) and len(line) < 30:
            current_section = lower
            continue

        if current_section and ("experience" in current_section or "work" in current_section):
            if re.search(r"\d{4}|present", line, re.I) and (" - " in line or "–" in line or "·" in line):
                parts = re.split(r"\s*[·–\-]\s*", line, maxsplit=2)
                title = parts[0].strip() if parts else ""
                company = parts[1].strip() if len(parts) > 1 else ""
                date_part = parts[2].strip() if len(parts) > 2 else ""
                experience.append(
                    Position(title=title, company=company, start_date=date_part[:20] if date_part else None, end_date=None, description=None, location=None)
                )
        elif current_section and "education" in current_section:
            if len(line) > 5 and not line.startswith("http"):
                education.append(EducationEntry(school=line, degree=None, field=None, start_date=None, end_date=None, description=None))
        elif current_section and "skills" in current_section:
            if 2 < len(line) < 60:
                skills.extend(re.split(r"[,;·\|]", line))
        elif current_section and "certification" in current_section:
            if len(line) > 5:
                certifications.append(CertificationEntry(name=line, authority=None, date=None, url=None))

    skills = list(dict.fromkeys(s.strip() for s in skills if s.strip()))[:50]
    if not full_name:
        full_name = "Imported from PDF"

    return Profile(
        full_name=full_name,
        headline=headline,
        summary=summary or text[:1500],
        email=None,
        phone=None,
        address=None,
        linkedin_url=linkedin_url,
        photo_base64=None,
        experience=experience[:20],
        education=education[:10],
        skills=skills,
        certifications=certifications[:15],
        languages=[],
    )


def _parse_with_ai(text: str) -> Profile:
    """Use GPT to parse raw PDF text into structured Profile JSON."""
    client = _get_client()
    prompt = """Extract a CV/resume profile from the following text (from a PDF).
Return a single JSON object with these keys: full_name, headline (optional), summary, experience (list of {title, company, start_date, end_date, description}), 
education (list of {school, degree, field, start_date, end_date}), skills (list of strings), certifications (list of {name, authority, date}).
Use null for missing fields. No markdown, no code block."""

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": f"{prompt}\n\n---\n{text[:12000]}"}],
        temperature=0.1,
    )
    content = (resp.choices[0].message.content or "").strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    data = json.loads(content)

    exp = [
        Position(
            title=e.get("title", ""),
            company=e.get("company", ""),
            start_date=e.get("start_date"),
            end_date=e.get("end_date"),
            description=e.get("description"),
            location=e.get("location"),
        )
        for e in data.get("experience") or []
    ]
    edu = [
        EducationEntry(
            school=e.get("school", ""),
            degree=e.get("degree"),
            field=e.get("field"),
            start_date=e.get("start_date"),
            end_date=e.get("end_date"),
            description=e.get("description"),
        )
        for e in data.get("education") or []
    ]
    certs = [
        CertificationEntry(name=c.get("name", ""), authority=c.get("authority"), date=c.get("date"), url=c.get("url"))
        for c in data.get("certifications") or []
    ]

    return Profile(
        full_name=data.get("full_name") or "Imported from PDF",
        headline=data.get("headline"),
        summary=data.get("summary") or "",
        email=data.get("email"),
        phone=data.get("phone"),
        address=data.get("address"),
        linkedin_url=data.get("linkedin_url"),
        photo_base64=None,
        experience=exp,
        education=edu,
        skills=data.get("skills") or [],
        certifications=certs,
        languages=data.get("languages") or [],
    )
