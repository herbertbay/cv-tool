"""
CV PDF/preview: merge job-application tailoring and apply include flags.

Stored on job_applications.cv_section_includes (JSON). Omitted keys default to included.
"""
from __future__ import annotations

import json
from typing import Any

from app.models import EducationEntry, Profile


def parse_cv_section_includes(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            o = json.loads(raw)
            return o if isinstance(o, dict) else {}
        except Exception:
            return {}
    return {}


def _truthy(v: Any, default: bool = True) -> bool:
    if v is None:
        return default
    return bool(v)


def _row_flags(row_list: Any, n: int) -> list[bool]:
    if not isinstance(row_list, list) or n <= 0:
        return [True] * n
    out: list[bool] = []
    for i in range(n):
        if i < len(row_list):
            out.append(_truthy(row_list[i], True))
        else:
            out.append(True)
    return out


def merge_application_skills_education(profile: Profile, app_row: dict | None) -> Profile:
    """Apply tailored_skills and tailored_education from job application (headline set separately)."""
    if not app_row:
        return profile
    skills = app_row.get("tailored_skills")
    edu_raw = app_row.get("tailored_education")
    edu_list: list[EducationEntry] = []
    if isinstance(edu_raw, list):
        for e in edu_raw:
            if not isinstance(e, dict):
                continue
            edu_list.append(
                EducationEntry(
                    school=(e.get("school") or "") or "",
                    degree=e.get("degree"),
                    field=e.get("field"),
                    start_date=e.get("start_date"),
                    end_date=e.get("end_date"),
                    description=e.get("description"),
                )
            )
    updates: dict[str, Any] = {}
    if isinstance(skills, list):
        updates["skills"] = [str(s).strip() for s in skills if str(s).strip()]
    if isinstance(edu_raw, list):
        updates["education"] = edu_list
    if updates:
        return profile.model_copy(update=updates)
    return profile


def apply_cv_section_includes(
    profile: Profile,
    tailored_summary: str,
    tailored_experience: list[dict],
    additional_urls: list[str],
    includes: dict[str, Any] | None,
) -> tuple[Profile, str, list[dict], list[str]]:
    """
    Filter profile fields and CV blocks according to include flags.
    experience_rows / education_rows align by index with tailored_experience / profile.education.
    """
    inc = parse_cv_section_includes(includes)
    p = profile.model_copy()
    summary = (tailored_summary or "").strip()
    exp = [x for x in (tailored_experience or []) if isinstance(x, dict)]
    urls = [u for u in (additional_urls or []) if u and str(u).strip()]

    if not _truthy(inc.get("headline"), True):
        p = p.model_copy(update={"headline": None})
    if not _truthy(inc.get("photo"), True):
        p = p.model_copy(update={"photo_base64": None})
    if not _truthy(inc.get("contact"), True):
        p = p.model_copy(update={"email": None, "phone": None, "address": None, "linkedin_url": None})
    if not _truthy(inc.get("additional_urls"), True):
        urls = []
    if not _truthy(inc.get("summary"), True):
        summary = ""
    if not _truthy(inc.get("skills"), True):
        p = p.model_copy(update={"skills": []})

    edu = list(p.education or [])
    if not _truthy(inc.get("education"), True):
        p = p.model_copy(update={"education": []})
    else:
        flags = _row_flags(inc.get("education_rows"), len(edu))
        kept = [e for e, ok in zip(edu, flags) if ok]
        p = p.model_copy(update={"education": kept})

    if not _truthy(inc.get("certifications"), True):
        p = p.model_copy(update={"certifications": []})
    if not _truthy(inc.get("languages"), True):
        p = p.model_copy(update={"languages": []})

    if not _truthy(inc.get("experience"), True):
        exp = []
    else:
        flags = _row_flags(inc.get("experience_rows"), len(exp))
        exp = [e for e, ok in zip(exp, flags) if ok]

    return p, summary, exp, urls
