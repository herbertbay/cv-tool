"""
CV/ATS match score using embedding cosine similarity.
Used everywhere a CV–job match score is calculated (cv-checker, application detail, optimize).
State-of-the-art: semantic similarity over skills, experience, education, and summary.

If the job description does not signal education/degree requirements, the education dimension
receives weight 0 in the overall score and summary/skills/experience weights are renormalized.
The education subscore is still returned for reference.
"""
import logging
import re
from typing import Any

from openai import OpenAI

from app.config import settings
from app.models import Profile

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
# Weights for overall score (must sum to 1.0).
# Education is weighted lower: many JDs omit degree detail, so semantic similarity for that block is often weak
# compared to skills/experience; commercial "ATS" tools often de-emphasize education in a single headline score.
WEIGHTS = {
    "summary": 0.20,
    "skills": 0.30,
    "experience": 0.40,
    "education": 0.10,
}
# Max chars per segment to stay within embedding token limits
MAX_CHARS = 7500

# Job text signals that education is a stated requirement (degree, school level, etc.)
_JOB_EDUCATION_SIGNALS = re.compile(
    r"\b("
    r"bachelor'?s?|bachelors?|b\.\s*s\.?\b|b\.\s*a\.?\b|bs\b|ba\b|undergraduate|"
    r"master'?s?|masters?|m\.\s*s\.?\b|m\.\s*a\.?\b|ms\b|ma\b|mba\b|mphil|"
    r"ph\.?\s*d\.?|phd\b|doctorate|doctoral|post-?doc|post-?doctoral|"
    r"\bdegree\b|college\s+degree|university\s+degree|\bdiploma\b|ged\b|"
    r"qualifications?|accredited\s+(program|institution)|"
    r"\buniversity\b(?!\s+hospital)|\bcollege\b|higher\s+education|academic\s+background|"
    r"field\s+of\s+study|major\s+in|minor\s+in|graduated|graduate\s+degree|post-?graduate|"
    r"associate'?s?|assoc\.?\s*degree|high\s+school\s+diploma|vocational\s+training"
    r")\b",
    re.IGNORECASE,
)


def job_description_mentions_education(job_text: str) -> bool:
    """True if the job description plausibly states education/degree requirements."""
    t = (job_text or "").strip()
    if len(t) < 12:
        return False
    return bool(_JOB_EDUCATION_SIGNALS.search(t))


def _effective_weights_for_job(job_description: str) -> tuple[dict[str, float], bool]:
    """
    Base weights from WEIGHTS; set education to 0 when JD has no education signals, then renormalize.
    Returns (weights dict summing to 1.0, education_counted_in_overall).
    """
    base = dict(WEIGHTS)
    edu_relevant = job_description_mentions_education(job_description)
    if not edu_relevant:
        base["education"] = 0.0
    total = sum(base.values())
    if total <= 0:
        return dict(WEIGHTS), True
    normalized = {k: v / total for k, v in base.items()}
    return normalized, edu_relevant


def _get_client() -> OpenAI:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)


def _normalize(v: list[float]) -> list[float]:
    """Return unit-length vector."""
    import math
    n = math.sqrt(sum(x * x for x in v))
    if n <= 0:
        return v
    return [x / n for x in v]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors (assumed same length). Returns value in [-1, 1]; typically [0, 1] for text."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return max(-1.0, min(1.0, dot))


def _embed(text: str) -> list[float]:
    """Single text to embedding; returns normalized vector. Empty or whitespace -> zero vector placeholder."""
    t = (text or "").strip()
    if not t:
        return []  # Caller should avoid embedding empty
    client = _get_client()
    resp = client.embeddings.create(
        input=t[:MAX_CHARS],
        model=EMBEDDING_MODEL,
    )
    vec = resp.data[0].embedding
    return _normalize(vec)


def _embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in one request. Returns list of normalized vectors in same order as inputs. Empty input -> zero vector (length from first non-empty)."""
    trimmed = [(i, (t or "").strip()[:MAX_CHARS]) for i, t in enumerate(texts)]
    to_embed = [t for _, t in trimmed if t]
    if not to_embed:
        return []
    client = _get_client()
    resp = client.embeddings.create(
        input=to_embed,
        model=EMBEDDING_MODEL,
    )
    dim = len(resp.data[0].embedding) if resp.data else 0
    zero = [0.0] * dim
    by_idx: dict[int, list[float]] = {}
    j = 0
    for i, t in trimmed:
        if t:
            by_idx[i] = _normalize(resp.data[j].embedding)
            j += 1
        else:
            by_idx[i] = zero
    return [by_idx.get(i, zero) for i in range(len(texts))]


def _profile_components(profile: Profile) -> dict[str, str]:
    """Extract embeddable text segments from profile."""
    summary = (profile.summary or "").strip()
    skills_str = ", ".join((profile.skills or [])[:80]).strip()
    exp_parts = []
    for p in profile.experience or []:
        exp_parts.append(f"{getattr(p, 'title', '') or ''} at {getattr(p, 'company', '') or ''}")
        if getattr(p, "description", None):
            exp_parts.append((p.description or "")[:800])
    experience_str = "\n".join(exp_parts).strip()
    edu_parts = []
    for e in profile.education or []:
        edu_parts.append(
            f"{getattr(e, 'degree', '') or ''} {getattr(e, 'field', '') or ''} at {getattr(e, 'school', '') or ''}"
        )
        if getattr(e, "description", None):
            edu_parts.append((e.description or "")[:400])
    education_str = "\n".join(edu_parts).strip()
    return {
        "summary": summary or "No summary",
        "skills": skills_str or "No skills listed",
        "experience": experience_str or "No experience listed",
        "education": education_str or "No education listed",
    }


def _similarity_to_score(sim: float) -> int:
    """Map cosine similarity [-1, 1] to 0-100. Stretch [0, 1] into [~9, 100] so low similarities still show a modest score."""
    x = max(0.0, min(1.0, (float(sim) + 0.1) / 1.1))
    return round(x * 100)


def _generate_summary(
    breakdown: dict[str, int],
    overall: int,
    *,
    education_counted_in_overall: bool = True,
) -> str:
    """One or two professional sentences from breakdown and overall score."""
    if not settings.openai_api_key:
        return _fallback_summary(breakdown, overall, education_counted_in_overall=education_counted_in_overall)
    try:
        client = _get_client()
        edu_note = (
            ""
            if education_counted_in_overall
            else "\nImportant: The job description does not state education requirements, so the education subscore was NOT used in the overall score (weight 0); it is shown for reference only. Do not tell the candidate to improve education for this posting unless relevant."
        )
        prompt = f"""Based on this ATS match breakdown, write exactly 1-2 short, professional sentences for the candidate. Be factual and constructive. No bullet points.

Overall score: {overall}/100
- Summary match: {breakdown.get('summary', 0)}/100
- Skills match: {breakdown.get('skills', 0)}/100
- Experience match: {breakdown.get('experience', 0)}/100
- Education match: {breakdown.get('education', 0)}/100{edu_note}"""
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=120,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text if text else _fallback_summary(breakdown, overall, education_counted_in_overall=education_counted_in_overall)
    except Exception as e:
        logger.warning("ATS summary generation failed: %s", e)
        return _fallback_summary(breakdown, overall, education_counted_in_overall=education_counted_in_overall)


def _fallback_summary(
    breakdown: dict[str, int],
    overall: int,
    *,
    education_counted_in_overall: bool = True,
) -> str:
    strong = [k for k, v in breakdown.items() if v >= 70]
    weak = [k for k, v in breakdown.items() if v < 50 and v > 0]
    if not education_counted_in_overall:
        weak = [k for k in weak if k != "education"]
        strong = [k for k in strong if k != "education"]
    if overall >= 75:
        return "Strong overall match. Your profile aligns well with the role’s requirements."
    if overall >= 50:
        parts = [f"Moderate match ({overall}/100)."]
        if strong:
            parts.append(f"Strongest alignment in: {', '.join(strong)}.")
        if weak:
            parts.append(f"Consider strengthening: {', '.join(weak)}.")
        out = " ".join(parts)
        if not education_counted_in_overall:
            out += " Education was not factored into the overall score because the job description does not specify education requirements."
        return out
    base = f"Match score {overall}/100. Consider tailoring your summary and experience to the job description to improve ATS ranking."
    if not education_counted_in_overall:
        return base + " Education is shown for reference only and was not weighted."
    return base


def compute_ats_match(
    profile: Profile,
    job_description: str,
    *,
    skills_append: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compute CV–job match score using embedding cosine similarity.
    Used everywhere: cv-checker, optimize, application detail.

    skills_append: optional job-relevant keywords/skills to merge into the profile's skills
    text before embedding (e.g. from tailoring). Increases the skills component of the score.
    """
    if not job_description or not job_description.strip():
        return {
            "score": 0,
            "summary": "No job description provided.",
            "breakdown": {"summary": 0, "skills": 0, "experience": 0, "education": 0},
        }
    job_text = job_description.strip()[:MAX_CHARS]
    components = _profile_components(profile)
    if skills_append:
        extra = ", ".join(str(s).strip() for s in skills_append if str(s).strip())
        if extra and (components["skills"] or "").strip():
            components["skills"] = components["skills"].strip() + ", " + extra
        elif extra:
            components["skills"] = extra
    # One job embedding; four profile segments
    all_texts = [job_text, components["summary"], components["skills"], components["experience"], components["education"]]
    embeddings = _embed_batch(all_texts)
    if len(embeddings) < 5:
        return {
            "score": 0,
            "summary": "Could not compute embeddings.",
            "breakdown": {"summary": 0, "skills": 0, "experience": 0, "education": 0},
        }
    job_vec = embeddings[0]
    summary_vec = embeddings[1]
    skills_vec = embeddings[2]
    experience_vec = embeddings[3]
    education_vec = embeddings[4]
    breakdown = {
        "summary": _similarity_to_score(_cosine_similarity(job_vec, summary_vec)),
        "skills": _similarity_to_score(_cosine_similarity(job_vec, skills_vec)),
        "experience": _similarity_to_score(_cosine_similarity(job_vec, experience_vec)),
        "education": _similarity_to_score(_cosine_similarity(job_vec, education_vec)),
    }
    weights, education_counted = _effective_weights_for_job(job_text)
    overall = round(
        breakdown["summary"] * weights["summary"]
        + breakdown["skills"] * weights["skills"]
        + breakdown["experience"] * weights["experience"]
        + breakdown["education"] * weights["education"]
    )
    overall = max(0, min(100, overall))
    summary_text = _generate_summary(
        breakdown, overall, education_counted_in_overall=education_counted
    )
    return {
        "score": overall,
        "summary": summary_text,
        "breakdown": breakdown,
        "score_weights": weights,
        "education_counted_in_overall_score": education_counted,
    }
