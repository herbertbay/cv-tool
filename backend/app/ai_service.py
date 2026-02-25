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
) -> tuple[str, list[dict], str, list[str]]:
    """
    Call GPT to:
    1) Produce a tailored summary (and optionally merge with personal_summary_override).
    2) Produce tailored experience bullet points (same structure as Position, with tailored description).
    3) Generate a motivation/cover letter.
    4) Return a list of keywords/skills to highlight in the PDF.

    Returns: (tailored_summary, tailored_experience_list, motivation_letter, keywords_to_highlight)
    """
    lang_name = LANG_NAMES.get(language, "English")
    profile_ctx = _profile_to_context(profile)
    if personal_summary_override and personal_summary_override.strip():
        profile_ctx += f"\n\nAdditional personal summary from the candidate (use this to enrich the CV summary):\n{personal_summary_override.strip()}"

    system = (
        "You are an expert CV and cover letter writer. You optimize CVs for ATS (applicant tracking systems) "
        "and human readers. Critical rules: (1) Do NOT alter factual background: job titles, company names, "
        "dates, schools, and certifications must stay exactly as in the candidate profile. (2) Use and "
        "highlight keywords from the job description so the CV ranks high in ATS without changing facts. "
        "(3) Rephrase only the summary and experience descriptions to emphasize relevance and include "
        "job-description wording where it truthfully applies. Output all content in " + lang_name + ". "
        "Return valid JSON only, no markdown code blocks."
    )

    user_content = f"""## Candidate profile (facts — do not change titles, companies, or dates)
{profile_ctx}

## Additional context about the candidate (from URLs or other sources)
{additional_context or "None provided."}

## Job description (use its keywords for tailoring and for keywords_to_highlight)
{job_description}

---

Respond with a single JSON object (no markdown, no code block) with exactly these keys:
1) "tailored_summary": A short professional summary (3-5 sentences) in {lang_name}, tailored to this job. Use wording and keywords from the job description where they truthfully apply. Do not invent facts.
2) "tailored_experience": A list with one object per position. Each object: "title", "company", "start_date", "end_date", "description". Copy title, company, start_date, end_date exactly from the profile. Rewrite only "description" to emphasize relevance and include job-description keywords where accurate; do not change facts.
3) "motivation_letter": A professional motivation/cover letter (3-5 short paragraphs) in {lang_name}, referencing the role and the candidate's fit.
4) "keywords_to_highlight": A list of 5-15 keywords or short phrases from the job description to highlight in the PDF (for ATS and emphasis). Return as a JSON array of strings.
"""

    client = _get_client()
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        temperature=0.5,
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
            "tailored_summary": content[:1500] or profile.summary,
            "tailored_experience": [{"title": p.title, "company": p.company, "start_date": p.start_date, "end_date": p.end_date, "description": p.description or ""} for p in profile.experience],
            "motivation_letter": "Please generate a motivation letter based on the CV and job description.",
            "keywords_to_highlight": [],
        }

    tailored_summary = data.get("tailored_summary") or profile.summary
    tailored_experience = data.get("tailored_experience")
    if not isinstance(tailored_experience, list):
        tailored_experience = [{"title": p.title, "company": p.company, "start_date": p.start_date, "end_date": p.end_date, "description": p.description or ""} for p in profile.experience]
    motivation_letter = data.get("motivation_letter") or ""
    keywords = data.get("keywords_to_highlight")
    if not isinstance(keywords, list):
        keywords = []
    keywords = [str(k) for k in keywords]

    return tailored_summary, tailored_experience, motivation_letter, keywords
