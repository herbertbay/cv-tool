"""
Use OpenAI GPT to tailor CV content and generate motivation letter
based on profile, job description, and optional additional context.
"""
import json
from typing import Any

from openai import OpenAI

from app.config import settings
from app.models import Profile, Position


# Language names for prompts
LANG_NAMES = {"en": "English", "de": "German", "fr": "French"}


def _get_client() -> OpenAI:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)


def _profile_to_context(profile: Profile) -> str:
    """Build a text summary of the profile for the AI."""
    parts = [
        f"Name: {profile.full_name}",
        f"Headline: {profile.headline or 'N/A'}",
        f"Summary: {profile.summary}",
        f"Email: {profile.email or 'N/A'}, Phone: {profile.phone or 'N/A'}, Address: {profile.address or 'N/A'}",
        "",
        "Experience:",
    ]
    for p in profile.experience:
        parts.append(f"  - {p.title} at {p.company} ({p.start_date or '?'} - {p.end_date or 'Present'})")
        if p.description:
            parts.append(f"    {p.description[:500]}")
    parts.append("")
    parts.append("Education:")
    for e in profile.education:
        parts.append(f"  - {e.degree or 'N/A'} in {e.field or 'N/A'}, {e.school} ({e.start_date or '?'} - {e.end_date or '?'})")
        if e.description:
            parts.append(f"    {e.description[:300]}")
    parts.append("")
    parts.append("Skills: " + ", ".join(profile.skills[:50]))
    if profile.certifications:
        parts.append("Certifications: " + ", ".join(c.name for c in profile.certifications))
    return "\n".join(parts)


def tailor_cv_and_letter(
    profile: Profile,
    job_description: str,
    personal_summary_override: str | None,
    additional_context: str,
    language: str,
) -> tuple[str, str, list[dict], list[str], list[dict], str, list[str]]:
    """
    Call GPT to:
    1) Produce a tailored headline/title.
    2) Produce a tailored summary (and optionally merge with personal_summary_override).
    3) Produce tailored experience bullet points (same structure as Position, with tailored description).
    4) Produce tailored skills list.
    5) Produce tailored education entries (same structure, rewritten description only).
    6) Generate a motivation/cover letter.
    7) Return a list of keywords/skills to highlight in the PDF.

    Returns:
    (tailored_headline, tailored_summary, tailored_experience_list, tailored_skills,
     tailored_education_list, motivation_letter, keywords_to_highlight)
    """
    lang_name = LANG_NAMES.get(language, "English")
    profile_ctx = _profile_to_context(profile)
    if personal_summary_override and personal_summary_override.strip():
        profile_ctx += f"\n\nAdditional personal summary from the candidate (use this to enrich the CV summary):\n{personal_summary_override.strip()}"

    system = (
        "You are an expert CV and motivation letter writer focused on maximizing ATS score while staying truthful. "
        "Primary objective: produce output that achieves the highest possible semantic and keyword match to the job "
        "description, without inventing facts. Critical rules: "
        "(1) Do NOT alter factual background: job titles, company names, dates, schools, certifications, and core "
        "career chronology must remain accurate. "
        "(2) Mirror the job wording aggressively where truthful: reuse exact job terms, tool names, responsibilities, "
        "seniority cues, and qualification phrases across headline, summary, experience, skills, and education. "
        "Prefer exact terms over synonyms when both are valid. "
        "(3) Maximize coverage of important requirements: ensure every top requirement from the job ad appears in at "
        "least one relevant section using natural phrasing. "
        "(4) Rephrase for impact: use strong action verbs, outcomes, and domain terminology, but do not fabricate "
        "metrics, tools, or achievements. "
        "(5) In EXPERIENCE descriptions, never explicitly reference the target employer/role (avoid phrases like "
        "'for this role' or 'for company X'); show fit implicitly through relevant achievements and terminology. "
        "(6) Keep output concise, specific, and ATS-friendly: concrete nouns, skills, platforms, methods, and "
        "responsibility phrases from the job ad. "
        "Output all content in " + lang_name + ". Return valid JSON only, no markdown code blocks."
    )

    user_content = f"""## Candidate profile (facts — do not change titles, companies, or dates)
{profile_ctx}

## Additional context about the candidate (from URLs or other sources)
{additional_context or "None provided."}

## Job description (extract and reuse its key terms for ATS)
{job_description or "(none)"}

---

Respond with a single JSON object (no markdown, no code block) with exactly these keys:
1) "tailored_headline": A short headline/title in {lang_name} aligned with the job terminology. Include 2-4 high-value job terms where truthful, while staying factual and close to the candidate's real profile.
2) "tailored_summary": A short professional summary (3-5 sentences) in {lang_name}, tailored to this job. Weave in exact keywords and phrases from the job description (skills, tools, responsibilities, qualifications) where they truthfully apply. Aim for high keyword density without keyword stuffing. Do not invent facts.
3) "tailored_experience": A list with one object per position. Each object: "title", "company", "start_date", "end_date", "description". Copy title, company, start_date, end_date exactly from the profile. Rewrite only "description" to include job-description keywords and phrases where accurate; use the job's terminology for skills, methods, and outcomes. Make each description highly relevant to the target role. Do NOT add phrases that explicitly reference the job or employer. Let relevance be implicit.
4) "tailored_skills": A comma-separated-suitable list of 15-30 skills/keywords (JSON array of strings), prioritizing exact terms from the job description that are truthful for the candidate. Include tools, methods, platforms, and domain terms from the job ad.
5) "tailored_education": A list with one object per education entry: "school", "degree", "field", "start_date", "end_date", "description". Keep school, degree, field, and dates factually consistent; rewrite only description to better align wording with the job where truthful (coursework, focus areas, methods, domain context).
6) "motivation_letter": A professional motivation/cover letter (3-5 short paragraphs) in {lang_name}, referencing the role and the candidate's fit. If the job description is empty or missing (e.g. "(none)"), set "motivation_letter" to "" (empty string); do not generate a letter.
7) "keywords_to_highlight": A list of 15-25 important keywords or short phrases from the job description (skills, tools, methods, qualifications) to highlight in the PDF. These should be terms you have used in tailored_headline, tailored_summary, tailored_experience, tailored_skills, or tailored_education. Return as a JSON array of strings. If no job description, return [].
"""

    client = _get_client()
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.25,
    )
    content = (resp.choices[0].message.content or "").strip()
    # Remove possible markdown code fence
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
    if content.endswith("```"):
        content = content.rsplit("```", 1)[0]
    content = content.strip()

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Fallback: use raw content and empty structures
        data = {
            "tailored_headline": profile.headline or "",
            "tailored_summary": content[:1500] or profile.summary,
            "tailored_experience": [{"title": p.title, "company": p.company, "start_date": p.start_date, "end_date": p.end_date, "description": p.description or ""} for p in profile.experience],
            "tailored_skills": [s for s in (profile.skills or []) if str(s).strip()],
            "tailored_education": [
                {
                    "school": e.school,
                    "degree": e.degree,
                    "field": e.field,
                    "start_date": e.start_date,
                    "end_date": e.end_date,
                    "description": e.description or "",
                }
                for e in profile.education
            ],
            "motivation_letter": "Please generate a motivation letter based on the CV and job description.",
            "keywords_to_highlight": [],
        }

    tailored_headline = str(data.get("tailored_headline") or profile.headline or "").strip()
    tailored_summary = data.get("tailored_summary") or profile.summary
    tailored_experience = data.get("tailored_experience")
    if not isinstance(tailored_experience, list):
        tailored_experience = [{"title": p.title, "company": p.company, "start_date": p.start_date, "end_date": p.end_date, "description": p.description or ""} for p in profile.experience]
    tailored_skills = data.get("tailored_skills")
    if not isinstance(tailored_skills, list):
        tailored_skills = [s for s in (profile.skills or []) if str(s).strip()]
    tailored_skills = [str(s).strip() for s in tailored_skills if str(s).strip()]
    tailored_education = data.get("tailored_education")
    if not isinstance(tailored_education, list):
        tailored_education = [
            {
                "school": e.school,
                "degree": e.degree,
                "field": e.field,
                "start_date": e.start_date,
                "end_date": e.end_date,
                "description": e.description or "",
            }
            for e in profile.education
        ]
    motivation_letter = data.get("motivation_letter") or ""
    keywords = data.get("keywords_to_highlight")
    if not isinstance(keywords, list):
        keywords = []
    keywords = [str(k) for k in keywords]

    return (
        tailored_headline,
        tailored_summary,
        tailored_experience,
        tailored_skills,
        tailored_education,
        motivation_letter,
        keywords,
    )


def calculate_ats_match_score(
    profile: Profile,
    job_description: str,
    *,
    skills_append: list[str] | None = None,
) -> dict:
    """
    Calculate an ATS match score 0-100 between the CV profile and the job description.
    Uses the shared embedding-based scorer (cosine similarity over skills, experience, education, summary).
    skills_append: optional job keywords/skills to merge into the skills segment for higher skills score.
    Returns: {"score": int 0-100, "summary": str, "breakdown": dict optional}
    """
    from app.ats_scorer import compute_ats_match
    result = compute_ats_match(profile, job_description, skills_append=skills_append)
    return {
        "score": result["score"],
        "summary": result["summary"],
        "breakdown": result.get("breakdown"),
    }


def extract_job_application(raw_job_description: str) -> dict[str, Any]:
    """
    Extract structured job application fields from raw job description text using OpenAI.
    Returns a dict suitable for the job_applications table and for CV optimization:
    company_name, job_title, description (short), salary_from, salary_to, location,
    key_requirements, keywords_to_highlight (for CV), full_job_description (echo of input).
    """
    if not raw_job_description or not raw_job_description.strip():
        return {
            "company_name": None,
            "job_title": None,
            "description": None,
            "salary_from": None,
            "salary_to": None,
            "location": None,
            "key_requirements": [],
            "keywords_to_highlight": [],
            "full_job_description": raw_job_description or "",
        }
    client = _get_client()
    system = (
        "You are an expert at parsing job postings and extracting structured data. "
        "Given a raw job description (pasted text or scraped from a listing), extract the following. "
        "Return valid JSON only, no markdown code blocks. Use null for missing values. "
        "For salary_from and salary_to use numbers only (e.g. 80000 for 80k); if a range is given use min and max; if only one number use it for both. "
        "For key_requirements and keywords_to_highlight return JSON arrays of strings."
    )
    user_content = f"""Extract structured fields from this job description:

{raw_job_description[:12000]}

Return a single JSON object with exactly these keys (use null when not found):
1) "company_name": string or null - employer/company name
2) "job_title": string or null - role title (e.g. "Senior Product Manager")
3) "description": string or null - short 1-3 sentence summary of the role
4) "salary_from": number or null - minimum salary if mentioned
5) "salary_to": number or null - maximum salary if mentioned
6) "location": string or null - job location (city, country, or "Remote")
7) "key_requirements": array of strings - main requirements/qualifications (5-15 items)
8) "keywords_to_highlight": array of strings - skills/keywords to emphasize in a CV for this role (5-15 items)
"""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.2,
    )
    content = (resp.choices[0].message.content or "").strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
    if content.endswith("```"):
        content = content.rsplit("```", 1)[0]
    content = content.strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        data = {}
    out = {
        "company_name": data.get("company_name") if data.get("company_name") else None,
        "job_title": data.get("job_title") if data.get("job_title") else None,
        "description": data.get("description") if data.get("description") else None,
        "salary_from": data.get("salary_from") if data.get("salary_from") is not None else None,
        "salary_to": data.get("salary_to") if data.get("salary_to") is not None else None,
        "location": data.get("location") if data.get("location") else None,
        "key_requirements": data.get("key_requirements") if isinstance(data.get("key_requirements"), list) else [],
        "keywords_to_highlight": data.get("keywords_to_highlight") if isinstance(data.get("keywords_to_highlight"), list) else [],
        "full_job_description": raw_job_description.strip(),
    }
    out["key_requirements"] = [str(x) for x in out["key_requirements"]][:20]
    out["keywords_to_highlight"] = [str(x) for x in out["keywords_to_highlight"]][:20]
    return out
