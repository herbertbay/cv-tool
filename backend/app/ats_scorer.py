"""
CV/ATS match score using embedding cosine similarity.
Used everywhere a CV–job match score is calculated (cv-checker, application detail, optimize).
State-of-the-art: semantic similarity over skills, experience, education, and summary.
"""
import json
import logging
from typing import Any

from openai import OpenAI

from app.config import settings
from app.models import Profile

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-3-small"
# Weights for overall score (must sum to 1.0)
WEIGHTS = {
    "summary": 0.20,
    "skills": 0.30,
    "experience": 0.35,
    "education": 0.15,
}
# Max chars per segment to stay within embedding token limits
MAX_CHARS = 7500


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
    """Map cosine similarity [-1,1] to 0-100. Typical range for text is [0,1]; map linearly."""
    # Clamp and map [0, 1] -> [0, 100]; allow slight negative to become 0
    x = max(0.0, min(1.0, (sim + 0.1) / 1.1))
    return round(x * 100)


def _generate_summary(breakdown: dict[str, int], overall: int) -> str:
    """One or two professional sentences from breakdown and overall score."""
    if not settings.openai_api_key:
        return _fallback_summary(breakdown, overall)
    try:
        client = _get_client()
        prompt = f"""Based on this ATS match breakdown, write exactly 1-2 short, professional sentences for the candidate. Be factual and constructive. No bullet points.

Overall score: {overall}/100
- Summary match: {breakdown.get('summary', 0)}/100
- Skills match: {breakdown.get('skills', 0)}/100
- Experience match: {breakdown.get('experience', 0)}/100
- Education match: {breakdown.get('education', 0)}/100"""
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=120,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text if text else _fallback_summary(breakdown, overall)
    except Exception as e:
        logger.warning("ATS summary generation failed: %s", e)
        return _fallback_summary(breakdown, overall)


def _fallback_summary(breakdown: dict[str, int], overall: int) -> str:
    strong = [k for k, v in breakdown.items() if v >= 70]
    weak = [k for k, v in breakdown.items() if v < 50 and v > 0]
    if overall >= 75:
        return "Strong overall match. Your profile aligns well with the role’s requirements."
    if overall >= 50:
        parts = [f"Moderate match ({overall}/100)."]
        if strong:
            parts.append(f"Strongest alignment in: {', '.join(strong)}.")
        if weak:
            parts.append(f"Consider strengthening: {', '.join(weak)}.")
        return " ".join(parts)
    return f"Match score {overall}/100. Consider tailoring your summary and experience to the job description to improve ATS ranking."


def compute_ats_match(profile: Profile, job_description: str) -> dict[str, Any]:
    """
    Compute CV–job match score using embedding cosine similarity.
    Used everywhere: cv-checker, optimize, application detail.

    Returns:
        score: int 0-100
        summary: str (1-2 sentences)
        breakdown: dict with keys summary, skills, experience, education (each 0-100)
    """
    if not job_description or not job_description.strip():
        return {
            "score": 0,
            "summary": "No job description provided.",
            "breakdown": {"summary": 0, "skills": 0, "experience": 0, "education": 0},
        }
    job_text = job_description.strip()[:MAX_CHARS]
    components = _profile_components(profile)
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
    overall = round(
        breakdown["summary"] * WEIGHTS["summary"]
        + breakdown["skills"] * WEIGHTS["skills"]
        + breakdown["experience"] * WEIGHTS["experience"]
        + breakdown["education"] * WEIGHTS["education"]
    )
    overall = max(0, min(100, overall))
    summary_text = _generate_summary(breakdown, overall)
    return {
        "score": overall,
        "summary": summary_text,
        "breakdown": breakdown,
    }
