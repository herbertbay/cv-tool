"""
FastAPI application: CV and motivation letter generation API.
CV upload only; user from cookie; profile in local DB; motivation letter as separate PDF.
"""
import json
import logging
import secrets
import time
from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as HttpResponse, HTMLResponse

from app.config import settings

logger = logging.getLogger(__name__)
from app.database import (
    get_profile as db_get_profile,
    get_user_data as db_get_user_data,
    save_profile as db_save_profile,
    save_user_data as db_save_user_data,
    create_user as db_create_user,
    get_user_by_id as db_get_user_by_id,
    get_user_by_email as db_get_user_by_email,
    delete_user as db_delete_user,
    get_admin_stats as db_get_admin_stats,
    get_all_users_for_admin as db_get_all_users_for_admin,
    insert_cv_generation as db_insert_cv_generation,
    get_cv_generations_by_user as db_get_cv_generations_by_user,
    get_cv_generation as db_get_cv_generation,
    get_last_cv_generation_for_user as db_get_last_cv_generation_for_user,
    update_cv_generation_tailored as db_update_cv_generation_tailored,
    update_cv_generation_template as db_update_cv_generation_template,
    insert_ats_match_result as db_insert_ats_match_result,
    get_ats_match_result as db_get_ats_match_result,
    delete_ats_match_result as db_delete_ats_match_result,
    insert_job_application as db_insert_job_application,
    get_job_application_by_id as db_get_job_application_by_id,
    get_job_applications_by_user as db_get_job_applications_by_user,
    update_job_application as db_update_job_application,
)
from app.generated_storage import save_cv_pdf as storage_save_cv_pdf, load_pdf_bytes as storage_load_pdf_bytes
from app.auth import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
)
from app.models import (
    Profile,
    Position,
    EducationEntry,
    GenerateCVRequest,
    GenerateCVResponse,
    ProfileUpdateRequest,
)
from app.linkedin_parser import parse_linkedin_json
from app.pdf_profile_parser import parse_pdf_to_profile
from app.url_fetcher import fetch_job_description, fetch_additional_urls
from app.ai_service import tailor_cv_and_letter, calculate_ats_match_score, extract_job_application, generate_motivation_letter
from app.ats_scorer import compute_ats_match
from app.pdf_generator import generate_cv_pdf, generate_letter_pdf, render_cv_html
from app.session_store import (
    create_session_id,
    save_session,
    get_session,
    set_session_pdf,
    set_session_letter_pdf,
    cleanup_old_sessions,
)

# Premium users: no "Powered by Optimal.cv" on generated CVs/letters (hardcoded for now)
PREMIUM_EMAILS = {"herbert.bay@gmail.com"}
ADMIN_EMAILS = {"herbert.bay@gmail.com"}


def _is_premium_user(user_id: str) -> bool:
    user = db_get_user_by_id(user_id)
    if not user:
        return False
    email = (user.get("email") or "").lower().strip()
    return email in PREMIUM_EMAILS


def _is_admin_user(user_id: str) -> bool:
    user = db_get_user_by_id(user_id)
    if not user:
        return False
    email = (user.get("email") or "").lower().strip()
    return email in ADMIN_EMAILS


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: optional cleanup. Shutdown: nothing."""
    yield
    cleanup_old_sessions(settings.session_ttl_seconds)


app = FastAPI(
    title="CV-Tool API",
    description="Generate tailored CVs and motivation letters from LinkedIn profile and job description.",
    lifespan=lifespan,
)

_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]
# Production frontend (Railway); also allow any origin set via env
if settings.frontend_url:
    for url in settings.frontend_url.strip().split(","):
        u = url.strip().rstrip("/")
        if u and u not in _cors_origins:
            _cors_origins.append(u)
# Allow Railway app subdomain by default so CORS works without env
_railway_frontend = "https://cv-tool-production-711b.up.railway.app"
if _railway_frontend not in _cors_origins:
    _cors_origins.append(_railway_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)


SESSION_COOKIE = "cv-tool-session"
SESSION_MAX_AGE = 30 * 24 * 3600  # 30 days


def _session_cookie_kwargs(request: Request | None = None) -> dict:
    """Cookie kwargs so session works cross-origin (frontend on different Railway subdomain)."""
    # SameSite=None (RFC capital N) + Secure required for cross-origin credentialed requests
    if settings.frontend_url:
        return {"samesite": "None", "secure": True}
    if request:
        origin = request.headers.get("origin") or ""
        if origin and not origin.startswith("http://127.0.0.1") and not origin.startswith("http://localhost"):
            return {"samesite": "None", "secure": True}
    return {"samesite": "lax", "secure": False}


def _session_cookie_delete_kwargs(request: Request | None = None) -> dict:
    """Kwargs for delete_cookie so it clears the cookie in same cross-origin scenario."""
    return {"path": "/", **_session_cookie_kwargs(request)}


def get_current_user_id(request: Request) -> str | None:
    """Return authenticated user_id from session cookie, or None."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return verify_session_token(token, settings.secret_key, max_age_seconds=SESSION_MAX_AGE)


def require_user(request: Request) -> str:
    """Return current user_id or raise 401."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    return user_id


@app.get("/health")
def health():
    """Health check for Railway/deploy. openai_configured is True when OPENAI_API_KEY is set."""
    return {
        "status": "ok",
        "openai_configured": bool(settings.openai_api_key),
    }


@app.get("/api/admin/stats")
def admin_stats(request: Request, secret: str = ""):
    """
    Return user/profile/generation counts from the running app's DB.
    Requires ADMIN_SECRET env set on the backend and matching ?secret= or X-Admin-Secret header.
    Use this when `railway run` cannot see /data (one-off run often has no volume mounted).
    """
    expected = (getattr(settings, "admin_secret", None) or "").strip()
    if not expected:
        raise HTTPException(404, "Admin stats not configured")
    provided = secret.strip() or (request.headers.get("X-Admin-Secret") or "").strip()
    if provided != expected:
        raise HTTPException(401, "Unauthorized")
    return db_get_admin_stats()


@app.get("/api/admin/users")
async def admin_users(request: Request):
    """Return all users plus CV generation stats. Requires authenticated admin user."""
    user_id = require_user(request)
    if not _is_admin_user(user_id):
        raise HTTPException(403, "Admin access required")
    return {"users": db_get_all_users_for_admin()}


@app.get("/api/admin/users/{target_user_id}/download-last-cv")
async def admin_download_last_cv(target_user_id: str, request: Request):
    """Admin-only: download the most recently generated CV PDF for a user."""
    user_id = require_user(request)
    if not _is_admin_user(user_id):
        raise HTTPException(403, "Admin access required")
    gen = db_get_last_cv_generation_for_user(target_user_id)
    if not gen:
        raise HTTPException(404, "No generated CV found for this user")
    pdf_bytes = storage_load_pdf_bytes(gen["cv_path"])
    if not pdf_bytes:
        raise HTTPException(404, "PDF file not found")
    session_id = gen["session_id"]
    return HttpResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cv_{session_id[:8]}.pdf"'},
    )


@app.post("/api/job-applications/{application_id}/generate-motivation-letter")
async def generate_application_motivation_letter(application_id: str, request: Request):
    """Generate and persist motivation letter text for an application (uses latest tailored content). Requires auth."""
    user_id = require_user(request)
    app = db_get_job_application_by_id(application_id, user_id)
    if not app:
        raise HTTPException(404, "Application not found")
    session_id = (app.get("session_id") or "").strip()
    job_text = (app.get("full_job_description") or "").strip()
    if not session_id:
        raise HTTPException(400, "Application has no linked CV session")
    if not job_text:
        raise HTTPException(400, "Job description is required to generate a motivation letter")
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Generated CV for this application not found.")
    data = db_get_user_data(user_id)
    if not data or not data.get("profile"):
        raise HTTPException(400, "Profile not found. Save your profile first.")
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured")
    profile = data["profile"] if isinstance(data["profile"], Profile) else Profile(**data["profile"])
    tailored_summary = gen.get("tailored_summary") or ""
    tailored_experience = gen.get("tailored_experience") or []
    language = (gen.get("language") or "en").strip() or "en"
    letter = generate_motivation_letter(
        profile=profile,
        job_description=job_text,
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience if isinstance(tailored_experience, list) else None,
        language=language,
    )
    ok = db_update_cv_generation_tailored(session_id, user_id, motivation_letter=letter)
    if not ok:
        raise HTTPException(404, "Update failed")
    session = get_session(session_id)
    if session:
        session["motivation_letter"] = letter
    return {"session_id": session_id, "motivation_letter": letter}


# --- Auth ---


@app.post("/api/auth/register")
async def register(request: Request, response: Response, body: dict = Body(...)):
    """Register with email and password. Logs in on success."""
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(400, "Email and password required")
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if db_get_user_by_email(email):
        raise HTTPException(400, "Email already registered")
    user_id = db_create_user(email, hash_password(password))
    token = create_session_token(user_id, settings.secret_key)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        path="/",
        **_session_cookie_kwargs(request),
    )
    user = db_get_user_by_id(user_id)
    return {"user": {"id": user["id"], "email": user["email"]}}


@app.post("/api/auth/login")
async def login(request: Request, response: Response, body: dict = Body(...)):
    """Login with email and password."""
    try:
        email = (body.get("email") or "").strip()
        password = body.get("password") or ""
        if not email or not password:
            raise HTTPException(400, "Email and password required")
        if not settings.secret_key:
            logger.error("SECRET_KEY not configured")
            raise HTTPException(500, "Server configuration error")
        user = db_get_user_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        token = create_session_token(user["id"], settings.secret_key)
        response.set_cookie(
            key=SESSION_COOKIE,
            value=token,
            max_age=SESSION_MAX_AGE,
            httponly=True,
            path="/",
            **_session_cookie_kwargs(request),
        )
        return {"user": {"id": user["id"], "email": user["email"]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("login failed: %s", e)
        raise HTTPException(500, "Login failed") from e


@app.get("/api/auth/me")
async def auth_me(request: Request):
    """Return current user or 401."""
    try:
        user_id = get_current_user_id(request)
        if not user_id:
            raise HTTPException(401, "Not authenticated")
        user = db_get_user_by_id(user_id)
        if not user:
            raise HTTPException(401, "Not authenticated")
        return {"user": {"id": user["id"], "email": user["email"]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("auth/me failed: %s", e)
        raise HTTPException(500, "Auth check failed") from e


@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    """Clear session cookie."""
    response.delete_cookie(key=SESSION_COOKIE, **_session_cookie_delete_kwargs(request))
    return {"ok": True}


@app.post("/api/auth/delete-account")
async def delete_account(request: Request, response: Response):
    """Permanently delete the current user's account and all data. Requires auth."""
    user_id = require_user(request)
    db_delete_user(user_id)
    response.delete_cookie(key=SESSION_COOKIE, **_session_cookie_delete_kwargs(request))
    return {"ok": True}


@app.post("/api/parse-cv")
async def parse_cv(request: Request, file: UploadFile = File(...)):
    """
    Parse uploaded CV (PDF or JSON). Saves the parsed profile to DB for the authenticated user.
    """
    user_id = require_user(request)
    if not file.filename:
        raise HTTPException(400, "Expected a file")
    raw = await file.read()
    ext = file.filename.lower().split(".")[-1]
    try:
        if ext == "json":
            profile = parse_linkedin_json(raw)
        elif ext == "pdf":
            profile = parse_pdf_to_profile(raw)
        else:
            raise HTTPException(400, "Expected a PDF or JSON file")
        db_save_profile(user_id, profile)
        return profile.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {str(e)}")


@app.get("/api/profile")
async def api_get_profile(request: Request):
    """Return profile, additional_urls, and personal_summary for the authenticated user."""
    user_id = require_user(request)
    data = db_get_user_data(user_id)
    if not data:
        return {
            "profile": _empty_profile_dict(),
            "additional_urls": [],
            "personal_summary": "",
            "onboarding_complete": False,
        }
    return {
        "profile": data["profile"].model_dump(),
        "additional_urls": data["additional_urls"],
        "personal_summary": data["personal_summary"],
        "onboarding_complete": data.get("onboarding_complete", False),
    }


@app.put("/api/profile")
async def api_put_profile(request: Request, body: dict = Body(...)):
    """
    Update and persist profile, additional_urls, and/or personal_summary.
    Send only the fields you want to update.
    """
    user_id = require_user(request)
    profile = body.get("profile")
    additional_urls = body.get("additional_urls")
    personal_summary = body.get("personal_summary")
    onboarding_complete = body.get("onboarding_complete")
    if profile is not None:
        profile = Profile(**profile)
    db_save_user_data(
        user_id,
        profile=profile,
        additional_urls=additional_urls,
        personal_summary=personal_summary,
        onboarding_complete=onboarding_complete,
    )
    data = db_get_user_data(user_id)
    return {
        "profile": data["profile"].model_dump(),
        "additional_urls": data["additional_urls"],
        "personal_summary": data["personal_summary"],
        "onboarding_complete": data.get("onboarding_complete", False),
    }


def _empty_profile_dict() -> dict:
    p = Profile()
    return p.model_dump()


@app.post("/api/fetch-job-description")
async def fetch_job(body: dict = Body(...)):
    """
    If body has "url" or "text", fetch job description: if URL, fetch page text; else return text.
    """
    url = body.get("url")
    text = body.get("text")
    if url:
        content = fetch_job_description(url)
        return {"content": content, "source": "url"}
    if text:
        return {"content": text.strip(), "source": "text"}
    raise HTTPException(400, "Provide 'url' or 'text'")


@app.post("/api/fetch-additional-urls")
async def fetch_extra_urls(body: dict = Body(...)):
    """Fetch content from up to 5 URLs. Body: { "urls": ["url1", "url2", ...] }."""
    urls = body.get("urls") or []
    result = fetch_additional_urls(urls)
    return {"contents": result}


# --- ATS match score tool (modular: uses same parse_pdf_to_profile, fetch_job_description) ---


@app.post("/api/ats-match")
async def ats_match_prepare(
    cv_file: UploadFile = File(...),
    job_description: str = Form(""),
):
    """
    Parse CV (PDF) and job description (text or URL), calculate ATS match score.
    Does not return the score; stores it and returns result_token. User must authenticate
    to fetch the score via GET /api/ats-match.
    Uses same parse_pdf_to_profile and fetch_job_description as CV generation.
    """
    if not cv_file.filename or not cv_file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Expected a PDF file for the CV")
    job_input = (job_description or "").strip()
    if not job_input:
        raise HTTPException(400, "Job description (text or URL) is required")
    raw = await cv_file.read()
    try:
        profile = parse_pdf_to_profile(raw)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    job_text = job_input
    if job_input.startswith("http://") or job_input.startswith("https://"):
        try:
            job_text = fetch_job_description(job_input)
        except Exception as e:
            logger.warning("ats_match: fetch_job_description failed: %s", e)
            raise HTTPException(400, "Could not fetch job description from URL") from e
        if not job_text.strip():
            raise HTTPException(400, "Could not fetch job description from URL")
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured")
    try:
        result = compute_ats_match(profile, job_text)
        token = secrets.token_urlsafe(32)
        breakdown_json = json.dumps(result["breakdown"]) if result.get("breakdown") else None
        db_insert_ats_match_result(
            token=token,
            profile_json=profile.model_dump_json(),
            job_text=job_text[:10000],
            score=result["score"],
            ats_summary=result.get("summary"),
            ats_breakdown=breakdown_json,
        )
        return {"result_token": token, "message": "Score calculated. Sign in to view it."}
    except Exception as e:
        logger.exception("ats_match_prepare failed: %s", e)
        raise HTTPException(500, "ATS analysis failed. Check backend logs.") from e


@app.get("/api/ats-match")
async def ats_match_result(request: Request, result_token: str = ""):
    """
    Return stored ATS match result. Requires authentication.
    """
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(401, "Sign in to view your ATS match score")
    if not result_token or not result_token.strip():
        raise HTTPException(400, "result_token is required")
    row = db_get_ats_match_result(result_token.strip())
    if not row:
        raise HTTPException(404, "Result expired or not found. Submit your CV and job again.")
    return {
        "score": row["score"],
        "job_preview": row["job_text"][:500] + ("…" if len(row["job_text"]) > 500 else ""),
        "summary": row.get("ats_summary"),
        "breakdown": json.loads(row["ats_breakdown"]) if row.get("ats_breakdown") else None,
    }


@app.post("/api/ats-match/optimize")
async def ats_match_optimize(request: Request, body: dict = Body(...)):
    """
    Load stored result, generate tailored CV content, recalculate score, return improvement.
    Requires authentication.
    """
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(401, "Sign in to see your optimized score")
    token = (body.get("result_token") or "").strip()
    if not token:
        raise HTTPException(400, "result_token is required")
    row = db_get_ats_match_result(token)
    if not row:
        raise HTTPException(404, "Result expired or not found.")
    import json
    profile = Profile.model_validate(json.loads(row["profile_json"]))
    job_text = row["job_text"]
    original_score = row["score"]
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured")
    (
        tailored_headline,
        tailored_summary,
        tailored_experience,
        tailored_skills,
        tailored_education,
        motivation_letter,
        keywords,
    ) = tailor_cv_and_letter(
        profile=profile,
        job_description=job_text,
        personal_summary_override=None,
        additional_context="",
        language="en",
    )
    exp_list = []
    if tailored_experience:
        for p in tailored_experience:
            exp_list.append(Position(
                title=p.get("title", ""),
                company=p.get("company", ""),
                start_date=p.get("start_date"),
                end_date=p.get("end_date"),
                description=p.get("description"),
                location=p.get("location"),
            ))
    tailored_profile = Profile(
        full_name=profile.full_name,
        headline=tailored_headline or profile.headline,
        summary=tailored_summary,
        email=profile.email,
        phone=profile.phone,
        address=profile.address,
        linkedin_url=profile.linkedin_url,
        photo_base64=profile.photo_base64,
        experience=exp_list or profile.experience,
        education=[
            EducationEntry(
                school=(e.get("school") or ""),
                degree=e.get("degree"),
                field=e.get("field"),
                start_date=e.get("start_date"),
                end_date=e.get("end_date"),
                description=e.get("description"),
            )
            for e in (tailored_education or [])
            if isinstance(e, dict)
        ] or profile.education,
        skills=tailored_skills or profile.skills,
        certifications=profile.certifications,
        languages=profile.languages,
    )
    new_result = calculate_ats_match_score(
        tailored_profile,
        job_text,
        skills_append=[str(k).strip() for k in keywords if str(k).strip()],
    )
    new_score = new_result["score"]
    improvement = new_score - original_score if original_score > 0 else 0
    improvement_pct = round((improvement / original_score) * 100) if original_score > 0 else 0
    # Do not delete result here so back button from /ats-match/optimized to /ats-match/score works
    return {
        "original_score": original_score,
        "new_score": new_score,
        "improvement": improvement,
        "improvement_pct": improvement_pct,
        "tailored_summary": tailored_summary,
        "tailored_experience": tailored_experience,
        "tailored_headline": tailored_headline,
        "tailored_skills": tailored_skills,
        "tailored_education": tailored_education,
        "motivation_letter": motivation_letter,
        "keywords_to_highlight": keywords,
        "tailored_profile": tailored_profile.model_dump(),
        "job_description": job_text,
    }


@app.post("/api/generate-cv", response_model=GenerateCVResponse)
async def generate_cv(request: Request, req: GenerateCVRequest):
    """
    Tailor profile to job description and generate motivation letter.
    Requires auth. Fetches job/URLs if needed, calls AI, stores session, generates PDF, persists to DB and filesystem.
    Returns session_id and tailored content; PDF can be downloaded via /api/download-pdf/{session_id}.
    """
    user_id = require_user(request)
    try:
        job_text = req.job_description
        # If job looks like URL, fetch
        if job_text.strip().startswith("http"):
            job_text = fetch_job_description(job_text)

        additional_context_parts = []
        if req.additional_urls_content:
            for url, content in req.additional_urls_content.items():
                if content:
                    additional_context_parts.append(f"[Content from {url}]\n{content[:8000]}")
        elif req.additional_urls:
            fetched = fetch_additional_urls(req.additional_urls)
            for url, content in fetched.items():
                if content:
                    additional_context_parts.append(f"[Content from {url}]\n{content[:8000]}")
        additional_context = "\n\n".join(additional_context_parts)

        profile = req.profile if isinstance(req.profile, Profile) else Profile(**req.profile)
        # Use pre-computed tailored content from ATS optimize when provided
        use_pre_tailored = (
            req.pre_tailored_summary is not None and req.pre_tailored_experience is not None
        )
        if use_pre_tailored:
            tailored_headline = (req.pre_tailored_headline or profile.headline or "").strip()
            tailored_summary = req.pre_tailored_summary
            tailored_experience = req.pre_tailored_experience
            tailored_skills = req.pre_tailored_skills if req.pre_tailored_skills is not None else list(profile.skills or [])
            tailored_education = req.pre_tailored_education if req.pre_tailored_education is not None else [
                e.model_dump() if hasattr(e, "model_dump") else dict(e)
                for e in (profile.education or [])
            ]
            motivation_letter = req.pre_motivation_letter or ""
            keywords = req.pre_keywords_to_highlight if req.pre_keywords_to_highlight is not None else []
            # If ATS optimize didn't produce a letter (or it was omitted), generate one here.
            if (not motivation_letter.strip()) and settings.openai_api_key:
                motivation_letter = generate_motivation_letter(
                    profile=profile,
                    job_description=job_text,
                    tailored_summary=tailored_summary,
                    tailored_experience=tailored_experience if isinstance(tailored_experience, list) else None,
                    language=req.language or "en",
                )
        else:
            if not settings.openai_api_key:
                raise HTTPException(503, "OPENAI_API_KEY is not configured")
            (
                tailored_headline,
                tailored_summary,
                tailored_experience,
                tailored_skills,
                tailored_education,
                motivation_letter,
                keywords,
            ) = tailor_cv_and_letter(
                profile=profile,
                job_description=job_text,
                personal_summary_override=req.personal_summary,
                additional_context=additional_context,
                language=req.language,
            )

        session_id = create_session_id()
        exp_list = []
        for p in (tailored_experience or []):
            if not isinstance(p, dict):
                continue
            exp_list.append(
                Position(
                    title=p.get("title", "") or "",
                    company=p.get("company", "") or "",
                    start_date=p.get("start_date"),
                    end_date=p.get("end_date"),
                    description=p.get("description"),
                    location=p.get("location"),
                )
            )
        edu_list = []
        for e in (tailored_education or []):
            if not isinstance(e, dict):
                continue
            edu_list.append(
                EducationEntry(
                    school=e.get("school", "") or "",
                    degree=e.get("degree"),
                    field=e.get("field"),
                    start_date=e.get("start_date"),
                    end_date=e.get("end_date"),
                    description=e.get("description"),
                )
            )
        profile_for_output = Profile(
            full_name=profile.full_name,
            headline=tailored_headline or profile.headline,
            summary=tailored_summary,
            email=profile.email,
            phone=profile.phone,
            address=profile.address,
            linkedin_url=profile.linkedin_url,
            photo_base64=profile.photo_base64,
            experience=exp_list or profile.experience,
            education=edu_list or profile.education,
            skills=tailored_skills or profile.skills,
            certifications=profile.certifications,
            languages=profile.languages,
        )
        profile_dict = profile_for_output.model_dump()
        save_session(
            session_id=session_id,
            profile=profile_dict,
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            motivation_letter=motivation_letter,
            keywords_to_highlight=keywords,
            pdf_bytes=None,
        )

        # Generate CV PDF and letter PDF (separate files)
        allowed_templates = {"cv_base.html", "cv_executive.html"}
        template_name = getattr(req, "template", "cv_base.html") or "cv_base.html"
        if template_name not in allowed_templates:
            template_name = "cv_base.html"
        extra_urls = [u for u in (req.additional_urls or []) if u and str(u).strip().startswith(("http://", "https://"))]
        show_powered_by = not _is_premium_user(user_id)
        cv_pdf_bytes = generate_cv_pdf(
            profile=profile_for_output,
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            keywords_to_highlight=keywords,
            template_name=template_name,
            additional_urls=extra_urls,
            show_powered_by=show_powered_by,
        )
        set_session_pdf(session_id, cv_pdf_bytes)
        letter_pdf_bytes = None
        if motivation_letter and motivation_letter.strip():
            letter_pdf_bytes = generate_letter_pdf(profile=profile, motivation_letter=motivation_letter, show_powered_by=show_powered_by)
            set_session_letter_pdf(session_id, letter_pdf_bytes)

        # Persist to filesystem and DB for listing and download after session expiry
        cv_path, letter_path = storage_save_cv_pdf(session_id, cv_pdf_bytes, letter_pdf_bytes)
        job_snippet = (job_text or "").strip()[:2000]  # store up to 2000 chars for history
        db_insert_cv_generation(
            user_id, session_id, cv_path, letter_path,
            job_description=job_snippet or None,
            language=getattr(req, "language", None) or "en",
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            motivation_letter=motivation_letter,
            keywords_to_highlight=keywords,
            template=template_name,
        )

        return GenerateCVResponse(
            session_id=session_id,
            tailored_headline=tailored_headline or "",
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            tailored_skills=tailored_skills or [],
            tailored_education=tailored_education or [],
            motivation_letter=motivation_letter,
            suggested_skills_highlight=keywords,
            status="success",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("generate-cv failed: %s", e)
        err_msg = str(e) or type(e).__name__
        raise HTTPException(
            500,
            f"Generation failed: {err_msg}",
        ) from e


@app.get("/api/generated-cvs")
async def list_generated_cvs(request: Request):
    """Return list of generated CVs for the current user (session_id, created_at, has_letter_pdf)."""
    user_id = require_user(request)
    rows = db_get_cv_generations_by_user(user_id)
    return [
        {
            "session_id": r["session_id"],
            "created_at": r["created_at"],
            "has_cv": True,
            "has_letter_pdf": bool(r.get("letter_path")),
            "job_description": r.get("job_description") or "",
            "language": r.get("language") or "",
        }
        for r in rows
    ]


APPLICATION_STATUSES = {"Interested", "Applied", "Interview", "Rejected", "Offer"}


def _compute_and_store_application_score(user_id: str, application_id: str) -> dict:
    """Compute ATS match score for one application, persist it, and return score payload."""
    app = db_get_job_application_by_id(application_id, user_id)
    if not app:
        raise HTTPException(404, "Application not found")
    session_id = (app.get("session_id") or "").strip()
    full_job = (app.get("full_job_description") or "").strip()
    if not session_id or not full_job:
        raise HTTPException(400, "Job description and a generated CV are required to compute the match score.")
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Generated CV for this application not found.")
    data = db_get_user_data(user_id)
    if not data or not data.get("profile"):
        raise HTTPException(400, "Profile not found. Save your profile first.")
    if not settings.openai_api_key:
        raise HTTPException(503, "Score computation is not configured.")
    profile = data["profile"] if isinstance(data["profile"], Profile) else Profile(**data["profile"])
    tailored_summary = gen.get("tailored_summary") or ""
    tailored_experience = gen.get("tailored_experience") or []
    exp_list = []
    for p in tailored_experience:
        exp_list.append(Position(
            title=p.get("title", "") or "",
            company=p.get("company", "") or "",
            start_date=p.get("start_date"),
            end_date=p.get("end_date"),
            description=p.get("description"),
            location=p.get("location"),
        ))
    app_tailored_headline = (app.get("tailored_headline") or "").strip() or profile.headline
    app_tailored_skills = app.get("tailored_skills") if isinstance(app.get("tailored_skills"), list) else []
    app_tailored_education = app.get("tailored_education") if isinstance(app.get("tailored_education"), list) else []
    edu_list = []
    for e in app_tailored_education:
        if not isinstance(e, dict):
            continue
        edu_list.append(
            EducationEntry(
                school=e.get("school", "") or "",
                degree=e.get("degree"),
                field=e.get("field"),
                start_date=e.get("start_date"),
                end_date=e.get("end_date"),
                description=e.get("description"),
            )
        )
    profile_for_score = Profile(
        full_name=profile.full_name,
        headline=app_tailored_headline,
        summary=tailored_summary,
        email=profile.email,
        phone=profile.phone,
        address=profile.address,
        linkedin_url=profile.linkedin_url,
        photo_base64=profile.photo_base64,
        experience=exp_list or profile.experience,
        education=edu_list or profile.education,
        skills=app_tailored_skills or profile.skills,
        certifications=profile.certifications,
        languages=profile.languages,
    )
    keywords_highlight = gen.get("keywords_to_highlight") or []
    try:
        result = calculate_ats_match_score(
            profile_for_score,
            full_job,
            skills_append=[str(k).strip() for k in keywords_highlight if str(k).strip()],
        )
    except Exception as e:
        logger.exception("compute_application_score: scoring failed: %s", e)
        raise HTTPException(503, "Score computation failed. Try again later.") from e
    score = result["score"]
    summary = result.get("summary") or ""
    breakdown = result.get("breakdown")
    breakdown_json = json.dumps(breakdown) if breakdown else None
    db_update_job_application(
        application_id, user_id,
        ats_score=score,
        ats_score_summary=summary,
        ats_score_breakdown=breakdown_json,
    )
    return {"score": score, "summary": summary, "breakdown": breakdown}


@app.get("/api/job-applications")
async def list_job_applications(request: Request, archived: str = "false"):
    """Return job applications for the current user. archived=true to include archived."""
    user_id = require_user(request)
    include_archived = archived.lower() in ("1", "true", "yes")
    return db_get_job_applications_by_user(user_id, include_archived=include_archived)


@app.post("/api/extract-job")
async def api_extract_job(request: Request, body: dict = Body(...)):
    """Extract structured job fields from raw job description using OpenAI. Body: job_description (string). Returns JSON with company_name, job_title, description, salary_from, salary_to, location, key_requirements, keywords_to_highlight, full_job_description."""
    require_user(request)
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured")
    raw = (body.get("job_description") or "").strip()
    if not raw:
        return {
            "company_name": None,
            "job_title": None,
            "description": None,
            "salary_from": None,
            "salary_to": None,
            "location": None,
            "key_requirements": [],
            "keywords_to_highlight": [],
            "full_job_description": "",
        }
    try:
        return extract_job_application(raw)
    except Exception as e:
        logger.exception("extract-job failed: %s", e)
        raise HTTPException(500, str(e) or "Extraction failed") from e


@app.get("/api/job-applications/{application_id}")
async def get_job_application(application_id: str, request: Request):
    """Return a single job application if it belongs to the current user."""
    user_id = require_user(request)
    app = db_get_job_application_by_id(application_id, user_id)
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    return app


@app.post("/api/job-applications")
async def create_job_application(request: Request, body: dict = Body(...)):
    """Create a job application. Body: company_name?, description?, salary_from?, salary_to?, job_title?, application_status?, full_job_description?, session_id?, extract? (if true and full_job_description set, run OpenAI extraction to fill fields)."""
    user_id = require_user(request)
    app_id = str(secrets.token_urlsafe(16))
    status = (body.get("application_status") or "Interested").strip()
    if status not in APPLICATION_STATUSES:
        status = "Interested"
    full_job = (body.get("full_job_description") or "").strip() or None
    company_name = (body.get("company_name") or "").strip() or None
    job_title = (body.get("job_title") or "").strip() or None
    description = (body.get("description") or "").strip() or None
    salary_from = body.get("salary_from") if body.get("salary_from") is not None else None
    salary_to = body.get("salary_to") if body.get("salary_to") is not None else None
    session_id_value = (body.get("session_id") or "").strip() or None
    tailored_headline = (body.get("tailored_headline") or "").strip() or None
    tailored_skills_raw = body.get("tailored_skills")
    tailored_skills = [str(s).strip() for s in tailored_skills_raw if str(s).strip()] if isinstance(tailored_skills_raw, list) else None
    tailored_education_raw = body.get("tailored_education")
    tailored_education = tailored_education_raw if isinstance(tailored_education_raw, list) else None
    use_extraction = full_job and (body.get("extract") is True or (not company_name and not job_title))
    if use_extraction and settings.openai_api_key:
        try:
            extracted = extract_job_application(full_job)
            if not company_name and extracted.get("company_name"):
                company_name = extracted["company_name"]
            if not job_title and extracted.get("job_title"):
                job_title = extracted["job_title"]
            if not description and extracted.get("description"):
                description = extracted["description"]
            if salary_from is None and extracted.get("salary_from") is not None:
                salary_from = extracted["salary_from"]
            if salary_to is None and extracted.get("salary_to") is not None:
                salary_to = extracted["salary_to"]
        except Exception as e:
            logger.warning("job application extract failed, using provided fields: %s", e)
    db_insert_job_application(
        app_id,
        user_id,
        company_name=company_name,
        description=description,
        salary_from=salary_from,
        salary_to=salary_to,
        job_title=job_title,
        application_status=status,
        archived=False,
        full_job_description=full_job,
        session_id=session_id_value,
        application_date=(body.get("application_date") or "").strip() or None,
        job_url=(body.get("job_url") or "").strip() or None,
        tailored_headline=tailored_headline,
        tailored_skills=tailored_skills,
        tailored_education=tailored_education,
    )
    # Compute ATS score right after first creation so detail view already has it.
    # Never block creation on scoring errors.
    if session_id_value and full_job and settings.openai_api_key:
        try:
            _compute_and_store_application_score(user_id, app_id)
        except Exception as e:
            logger.warning("create_job_application: initial ATS score compute failed: %s", e)
    rows = db_get_job_applications_by_user(user_id, include_archived=True)
    created = next((r for r in rows if r["id"] == app_id), None)
    return created or {"id": app_id, "user_id": user_id, "application_status": status, "archived": False}


@app.patch("/api/job-applications/{application_id}")
async def patch_job_application(application_id: str, request: Request, body: dict = Body(...)):
    """Update job application.

    Body: company_name?, description?, salary_from?, salary_to?, job_title?, application_status?, archived?,
    full_job_description?, application_date?, job_url?, tailored_headline?, tailored_skills?, tailored_education?.
    """
    user_id = require_user(request)
    updates = {}
    if "company_name" in body:
        updates["company_name"] = (body.get("company_name") or "").strip() or None
    if "description" in body:
        updates["description"] = (body.get("description") or "").strip() or None
    if "salary_from" in body:
        v = body.get("salary_from")
        try:
            updates["salary_from"] = float(v) if v not in (None, "") else None
        except Exception:
            updates["salary_from"] = None
    if "salary_to" in body:
        v = body.get("salary_to")
        try:
            updates["salary_to"] = float(v) if v not in (None, "") else None
        except Exception:
            updates["salary_to"] = None
    if "job_title" in body:
        updates["job_title"] = (body.get("job_title") or "").strip() or None
    if "application_status" in body:
        s = (body.get("application_status") or "").strip()
        updates["application_status"] = s if s in APPLICATION_STATUSES else None
    if "archived" in body:
        updates["archived"] = bool(body.get("archived"))
    if "full_job_description" in body:
        updates["full_job_description"] = (body.get("full_job_description") or "").strip() or None
    if "application_date" in body:
        updates["application_date"] = (body.get("application_date") or "").strip() or None
    if "job_url" in body:
        updates["job_url"] = (body.get("job_url") or "").strip() or None
    if "tailored_headline" in body:
        updates["tailored_headline"] = (body.get("tailored_headline") or "").strip() or None
    if "tailored_skills" in body:
        raw = body.get("tailored_skills")
        updates["tailored_skills"] = [str(s).strip() for s in raw if str(s).strip()] if isinstance(raw, list) else None
    if "tailored_education" in body:
        raw = body.get("tailored_education")
        updates["tailored_education"] = raw if isinstance(raw, list) else None
    if not updates:
        raise HTTPException(400, "No valid fields to update")
    ok = db_update_job_application(application_id, user_id, **updates)
    if not ok:
        raise HTTPException(404, "Application not found")
    return {"ok": True}


@app.post("/api/job-applications/{application_id}")
async def post_job_application_update(application_id: str, request: Request, body: dict = Body(...)):
    """POST alias for updating job applications.

    Some frontends or proxies only support POST for non-GET methods; this
    endpoint forwards to the PATCH logic so both POST and PATCH work.
    """
    return await patch_job_application(application_id, request, body)


@app.post("/api/job-applications/{application_id}/compute-score")
async def compute_application_score(application_id: str, request: Request):
    """Compute ATS match score for this application using current tailored content and job description. Saves score on the application and returns it. Requires auth."""
    user_id = require_user(request)
    return _compute_and_store_application_score(user_id, application_id)


@app.get("/api/preview-cv-html")
async def preview_cv_html(request: Request, template: str = "cv_base.html"):
    """
    Return the CV as HTML for preview in the browser (same layout as PDF).
    Requires auth. Query param: template=cv_base.html or cv_executive.html.
    """
    user_id = require_user(request)
    data = db_get_user_data(user_id)
    if not data or not data.get("profile"):
        raise HTTPException(404, "No profile found. Upload a CV first.")
    profile = data["profile"]
    allowed = {"cv_base.html", "cv_executive.html"}
    if template not in allowed:
        template = "cv_base.html"
    # Use profile experience as tailored content for preview
    tailored_experience = [
        e.model_dump() if hasattr(e, "model_dump") else dict(e)
        for e in (profile.experience or [])
    ]
    additional_urls = data.get("additional_urls") or []
    show_powered_by = not _is_premium_user(user_id)
    html_str = render_cv_html(
        profile=profile,
        tailored_summary=profile.summary or "",
        tailored_experience=tailored_experience,
        keywords_to_highlight=[],
        template_name=template,
        additional_urls=additional_urls,
        show_powered_by=show_powered_by,
    )
    return HTMLResponse(html_str)


@app.get("/api/session/{session_id}")
async def get_session_info(session_id: str):
    """Return session data (for preview) and whether PDF is ready."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": session_id,
        "created_at": time.strftime("%Y-%m-%d %H:%M", time.localtime(session["created_at"])),
        "has_pdf": session.get("pdf_bytes") is not None,
        "has_letter_pdf": session.get("letter_pdf_bytes") is not None,
        "profile": session.get("profile"),
        "tailored_summary": session.get("tailored_summary"),
        "tailored_experience": session.get("tailored_experience"),
        "motivation_letter": session.get("motivation_letter"),
        "keywords_to_highlight": session.get("keywords_to_highlight"),
    }


@app.get("/api/test-pdf")
async def test_pdf():
    """Render a minimal PDF to verify WeasyPrint works (e.g. on Railway). Returns PDF or 500 with error."""
    try:
        from weasyprint import HTML
        from weasyprint.text.fonts import FontConfiguration
        font_config = FontConfiguration()
        pdf_buffer = BytesIO()
        HTML(string="<html><body><p>Test</p></body></html>").write_pdf(pdf_buffer, font_config=font_config)
        return HttpResponse(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="test.pdf"'},
        )
    except Exception as e:
        logger.exception("test-pdf failed")
        msg = str(e).strip() or type(e).__name__
        raise HTTPException(500, f"PDF render failed: {type(e).__name__} — {msg[:200]}") from e


@app.get("/api/download-pdf/{session_id}")
async def download_pdf(session_id: str, request: Request):
    """Return generated CV PDF for the given session. Requires auth; serves from session or persisted file."""
    user_id = require_user(request)
    session = get_session(session_id)
    if session:
        pdf_bytes = session.get("pdf_bytes")
        if pdf_bytes:
            return HttpResponse(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="cv_{session_id[:8]}.pdf"'},
            )
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Session not found or access denied")
    pdf_bytes = storage_load_pdf_bytes(gen["cv_path"])
    if not pdf_bytes:
        raise HTTPException(404, "PDF file not found")
    return HttpResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cv_{session_id[:8]}.pdf"'},
    )


@app.get("/api/download-letter/{session_id}")
async def download_letter(session_id: str, request: Request):
    """Return motivation letter PDF for the given session. Requires auth; serves from session or persisted file."""
    user_id = require_user(request)
    session = get_session(session_id)
    if session:
        pdf_bytes = session.get("letter_pdf_bytes")
        if pdf_bytes:
            return HttpResponse(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="motivation_letter_{session_id[:8]}.pdf"'},
            )
    gen = db_get_cv_generation(session_id, user_id)
    if not gen or not gen.get("letter_path"):
        raise HTTPException(404, "Letter PDF not found or access denied")
    pdf_bytes = storage_load_pdf_bytes(gen["letter_path"])
    if not pdf_bytes:
        raise HTTPException(404, "Letter PDF file not found")
    return HttpResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="motivation_letter_{session_id[:8]}.pdf"'},
    )


@app.get("/api/cv-generations/{session_id}/tailored")
async def get_cv_generation_tailored(session_id: str, request: Request):
    """Return persisted tailored content for a session (summary, experience, motivation letter). Requires auth; session must belong to user."""
    user_id = require_user(request)
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Session not found or access denied")
    return {
        "session_id": session_id,
        "tailored_summary": gen.get("tailored_summary") or "",
        "tailored_experience": gen.get("tailored_experience") or [],
        "motivation_letter": gen.get("motivation_letter") or "",
        "keywords_to_highlight": gen.get("keywords_to_highlight") or [],
        "template": gen.get("template") or "cv_base.html",
    }


@app.patch("/api/cv-generations/{session_id}/tailored")
async def patch_cv_generation_tailored(session_id: str, request: Request, body: dict = Body(...)):
    """Update tailored content for a session. Body: tailored_summary?, tailored_experience?, motivation_letter?. Requires auth."""
    user_id = require_user(request)
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Session not found or access denied")
    tailored_summary = body.get("tailored_summary") if "tailored_summary" in body else None
    tailored_experience = body.get("tailored_experience") if "tailored_experience" in body else None
    motivation_letter = body.get("motivation_letter") if "motivation_letter" in body else None
    if tailored_summary is not None and not isinstance(tailored_summary, str):
        tailored_summary = str(tailored_summary)
    if tailored_experience is not None and not isinstance(tailored_experience, list):
        tailored_experience = None
    if motivation_letter is not None and not isinstance(motivation_letter, str):
        motivation_letter = str(motivation_letter)
    if tailored_summary is None and tailored_experience is None and motivation_letter is None:
        raise HTTPException(400, "No valid fields to update")
    ok = db_update_cv_generation_tailored(
        session_id, user_id,
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience,
        motivation_letter=motivation_letter,
    )
    if not ok:
        raise HTTPException(404, "Update failed")
    # Update in-memory session if present so next download uses new content
    session = get_session(session_id)
    if session:
        if tailored_summary is not None:
            session["tailored_summary"] = tailored_summary
        if tailored_experience is not None:
            session["tailored_experience"] = tailored_experience
        if motivation_letter is not None:
            session["motivation_letter"] = motivation_letter
    return {"ok": True}


@app.post("/api/regenerate-cv")
async def regenerate_cv(request: Request, body: dict = Body(...)):
    """Re-generate CV and optional letter PDF for a session. Body: session_id, template? (cv_base.html | cv_executive.html). Uses persisted tailored content and user profile. Requires auth."""
    user_id = require_user(request)
    session_id = (body.get("session_id") or "").strip()
    if not session_id:
        raise HTTPException(400, "session_id required")
    template_name = (body.get("template") or "cv_base.html").strip()
    if template_name not in ("cv_base.html", "cv_executive.html"):
        template_name = "cv_base.html"
    gen = db_get_cv_generation(session_id, user_id)
    if not gen:
        raise HTTPException(404, "Session not found or access denied")
    tailored_summary = gen.get("tailored_summary") or ""
    tailored_experience = gen.get("tailored_experience") or []
    motivation_letter = gen.get("motivation_letter") or ""
    keywords = gen.get("keywords_to_highlight") or []
    data = db_get_user_data(user_id)
    if not data or not data.get("profile"):
        raise HTTPException(400, "User profile not found; cannot regenerate")
    profile = data["profile"] if isinstance(data["profile"], Profile) else Profile(**data["profile"])
    extra_urls = [u for u in (data.get("additional_urls") or []) if u and str(u).strip().startswith(("http://", "https://"))]
    show_powered_by = not _is_premium_user(user_id)
    cv_pdf_bytes = generate_cv_pdf(
        profile=profile,
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience,
        keywords_to_highlight=keywords,
        template_name=template_name,
        additional_urls=extra_urls,
        show_powered_by=show_powered_by,
    )
    letter_pdf_bytes = None
    if motivation_letter and motivation_letter.strip():
        letter_pdf_bytes = generate_letter_pdf(profile=profile, motivation_letter=motivation_letter, show_powered_by=show_powered_by)
    save_session(
        session_id=session_id,
        profile=data["profile"],
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience,
        motivation_letter=motivation_letter,
        keywords_to_highlight=keywords,
        pdf_bytes=cv_pdf_bytes,
    )
    set_session_pdf(session_id, cv_pdf_bytes)
    if letter_pdf_bytes:
        set_session_letter_pdf(session_id, letter_pdf_bytes)
    cv_path, letter_path = storage_save_cv_pdf(session_id, cv_pdf_bytes, letter_pdf_bytes)
    db_update_cv_generation_template(session_id, user_id, template_name)
    return {"ok": True, "session_id": session_id}


@app.post("/api/profile")
async def update_profile(req: ProfileUpdateRequest, request: Request):
    """Echo profile (no DB write). Stored profile is updated only via CV upload."""
    require_user(request)
    return req.profile.model_dump()
