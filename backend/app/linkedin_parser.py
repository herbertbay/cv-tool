"""
Parse LinkedIn data export (JSON) or a custom profile JSON into our Profile model.
LinkedIn export: user downloads from Settings & Privacy -> Get a copy of your data.
We support a single combined JSON or our Profile schema.
"""
import json
from typing import Any

from app.models import (
    Profile,
    Position,
    EducationEntry,
    CertificationEntry,
)


def _safe_str(obj: Any) -> str:
    """Safe string conversion for JSON values."""
    if obj is None:
        return ""
    return str(obj).strip()


def _safe_list(obj: Any) -> list:
    if obj is None:
        return []
    if isinstance(obj, list):
        return obj
    return [obj]


def parse_linkedin_json(raw: str | bytes) -> Profile:
    """
    Parse LinkedIn export JSON or our custom profile JSON into Profile.
    Accepts:
    - Our Profile schema (full_name, experience, education, skills, etc.)
    - LinkedIn export-like structure (e.g. from various converters)
    """
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    data = json.loads(raw)

    if isinstance(data, list):
        data = {"_list": data}

    # If it already looks like our Profile or has basics (JSON Resume), use custom parser
    if "full_name" in data or "name" in data or "basics" in data:
        return _parse_custom_or_resume_format(data)

    # Try LinkedIn export format (nested structures)
    return _parse_linkedin_export_format(data)


def _parse_custom_or_resume_format(data: dict) -> Profile:
    """Parse JSON Resume or our custom profile format."""
    name = data.get("full_name") or data.get("name") or data.get("basics", {}).get("name") or ""
    if isinstance(name, dict):
        name = name.get("full_name") or name.get("name") or ""

    basics = data.get("basics", data)
    if isinstance(basics, dict):
        email = basics.get("email") or data.get("email")
        phone = basics.get("phone") or data.get("phone")
        summary = basics.get("summary") or data.get("summary") or ""
        # address might be object
        addr = basics.get("address") or data.get("address")
        if isinstance(addr, dict):
            address = ", ".join(filter(None, [addr.get("city"), addr.get("region"), addr.get("country")]))
        else:
            address = _safe_str(addr) if addr else None
    else:
        email = data.get("email")
        phone = data.get("phone")
        summary = data.get("summary") or ""
        address = data.get("address")

    experience = []
    work = data.get("experience") or data.get("positions") or data.get("work") or []
    for w in _safe_list(work):
        if isinstance(w, dict):
            experience.append(Position(
                title=_safe_str(w.get("title") or w.get("position")),
                company=_safe_str(w.get("company") or w.get("companyName") or w.get("organization")),
                start_date=w.get("startDate") or w.get("start_date"),
                end_date=w.get("endDate") or w.get("end_date") or (w.get("current") and "Present" or None),
                description=w.get("description") or w.get("summary"),
                location=w.get("location"),
            ))

    education = []
    edu_list = data.get("education") or data.get("schools") or []
    for e in _safe_list(edu_list):
        if isinstance(e, dict):
            education.append(EducationEntry(
                school=_safe_str(e.get("school") or e.get("institution") or e.get("organization")),
                degree=e.get("degree") or e.get("degreeName"),
                field=e.get("field") or e.get("fieldOfStudy") or e.get("area"),
                start_date=e.get("startDate") or e.get("start_date"),
                end_date=e.get("endDate") or e.get("end_date"),
                description=e.get("description") or e.get("summary") or e.get("notes"),
            ))

    skills = []
    for s in _safe_list(data.get("skills") or data.get("skill")) or []:
        if isinstance(s, dict):
            skills.append(_safe_str(s.get("name") or s.get("skill") or s.get("title") or ""))
        else:
            skills.append(_safe_str(s))
    skills = [x for x in skills if x]

    certs = []
    for c in _safe_list(data.get("certifications") or data.get("certification") or data.get("licenses") or []):
        if isinstance(c, dict):
            certs.append(CertificationEntry(
                name=_safe_str(c.get("name") or c.get("title")),
                authority=c.get("authority") or c.get("issuer"),
                date=c.get("date") or c.get("endDate"),
                url=c.get("url"),
            ))

    return Profile(
        full_name=_safe_str(name),
        headline=data.get("headline") or data.get("title"),
        summary=summary,
        email=_safe_str(email) if email else None,
        phone=_safe_str(phone) if phone else None,
        address=_safe_str(address) if address else None,
        linkedin_url=data.get("linkedin_url") or data.get("url") or basics.get("url") if isinstance(basics, dict) else None,
        photo_base64=data.get("photo_base64"),
        experience=experience,
        education=education,
        skills=skills,
        certifications=certs,
        languages=_safe_list(data.get("languages") or []),
    )


def _parse_linkedin_export_format(data: dict) -> Profile:
    """Parse LinkedIn official export-style JSON (often nested)."""
    # Try common keys
    profile = data.get("profile") or data.get("Profile") or data
    if isinstance(profile, list) and profile:
        profile = profile[0] if isinstance(profile[0], dict) else data
    if not isinstance(profile, dict):
        profile = data

    name = profile.get("fullName") or profile.get("firstName", "") + " " + profile.get("lastName", "")
    experience = []
    positions = profile.get("positions") or profile.get("experience") or data.get("positions") or []
    for p in _safe_list(positions):
        if isinstance(p, dict):
            experience.append(Position(
                title=_safe_str(p.get("title") or p.get("positionTitle")),
                company=_safe_str(p.get("companyName") or (p.get("company", {}).get("name") if isinstance(p.get("company"), dict) else p.get("company"))),
                start_date=p.get("startedOn", {}).get("year") if isinstance(p.get("startedOn"), dict) else p.get("startDate"),
                end_date=p.get("endedOn", {}).get("year") if isinstance(p.get("endedOn"), dict) else p.get("endDate"),
                description=p.get("description") or p.get("summary"),
                location=p.get("location"),
            ))

    education = []
    schools = profile.get("education") or data.get("education") or []
    for e in _safe_list(schools):
        if isinstance(e, dict):
            school_name = e.get("schoolName") or (e.get("school", {}).get("name") if isinstance(e.get("school"), dict) else e.get("school"))
            education.append(EducationEntry(
                school=_safe_str(school_name),
                degree=e.get("degreeName") or e.get("degree"),
                field=e.get("fieldOfStudy") or e.get("field"),
                start_date=e.get("startDate") or (e.get("startedOn", {}).get("year") if isinstance(e.get("startedOn"), dict) else None),
                end_date=e.get("endDate") or (e.get("endedOn", {}).get("year") if isinstance(e.get("endedOn"), dict) else None),
                description=e.get("description") or e.get("notes"),
            ))

    skills = []
    for s in _safe_list(profile.get("skills") or data.get("skills") or []):
        if isinstance(s, dict):
            skills.append(_safe_str(s.get("name") or s.get("skillName") or s.get("title") or ""))
        else:
            skills.append(_safe_str(s))
    skills = [x for x in skills if x]

    certs = []
    for c in _safe_list(profile.get("certifications") or data.get("certifications") or []):
        if isinstance(c, dict):
            certs.append(CertificationEntry(
                name=_safe_str(c.get("name") or c.get("authority") or c.get("title")),
                authority=c.get("authority") or c.get("issuer"),
                date=c.get("issuedOn") or c.get("date") or c.get("endDate"),
                url=c.get("url"),
            ))

    return Profile(
        full_name=_safe_str(name),
        headline=profile.get("headline"),
        summary=profile.get("summary") or "",
        email=profile.get("email") or profile.get("emailAddress"),
        phone=profile.get("phone") or profile.get("phoneNumber"),
        address=profile.get("address") or profile.get("location"),
        linkedin_url=profile.get("publicProfileUrl") or profile.get("linkedinUrl"),
        photo_base64=profile.get("profilePicture", {}).get("displayImageReference", {}).get("url") if isinstance(profile.get("profilePicture"), dict) else profile.get("photo_base64"),
        experience=experience,
        education=education,
        skills=skills,
        certifications=certs,
        languages=_safe_list(profile.get("languages") or []),
    )
