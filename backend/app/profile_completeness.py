"""Count empty *required* profile fields (must match frontend app/lib/profile-completeness.ts)."""

from app.models import Profile


def _empty(v: str | None) -> bool:
    return not str(v or "").strip()


def count_required_empty_fields(profile: Profile) -> int:
    """Return number of missing required fields; 0 means profile is complete for generation."""
    n = 0

    if _empty(profile.full_name):
        n += 1
    if _empty(profile.summary):
        n += 1
    if _empty(profile.email):
        n += 1

    exps = profile.experience or []
    if len(exps) == 0:
        n += 1
    else:
        for exp in exps:
            if _empty(exp.title):
                n += 1
            if _empty(exp.company):
                n += 1
            if _empty(exp.start_date):
                n += 1
            if _empty(exp.end_date):
                n += 1

    edus = profile.education or []
    if len(edus) == 0:
        n += 1
    else:
        for edu in edus:
            if _empty(edu.school):
                n += 1
            if _empty(edu.degree):
                n += 1
            if _empty(edu.field):
                n += 1
            if _empty(edu.start_date):
                n += 1
            if _empty(edu.end_date):
                n += 1

    skills = profile.skills or []
    if not any(str(s).strip() for s in skills):
        n += 1

    for c in profile.certifications or []:
        if _empty(c.name):
            n += 1

    langs = profile.languages or []
    if len(langs) == 0:
        n += 1
    else:
        for lang in langs:
            if _empty(lang):
                n += 1

    return n


def profile_is_complete(profile: Profile) -> bool:
    return count_required_empty_fields(profile) == 0
