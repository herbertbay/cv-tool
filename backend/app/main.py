"""
FastAPI application: CV and motivation letter generation API.
CV upload only; user from cookie; profile in local DB; motivation letter as separate PDF.
"""
import logging
import time
from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response as HttpResponse

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
)
from app.auth import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
)
from app.models import (
    Profile,
    GenerateCVRequest,
    GenerateCVResponse,
    ProfileUpdateRequest,
)
from app.linkedin_parser import parse_linkedin_json
from app.pdf_profile_parser import parse_pdf_to_profile
from app.url_fetcher import fetch_job_description, fetch_additional_urls
from app.ai_service import tailor_cv_and_letter
from app.pdf_generator import generate_cv_pdf, generate_letter_pdf
from app.session_store import (
    create_session_id,
    save_session,
    get_session,
    set_session_pdf,
    set_session_letter_pdf,
    cleanup_old_sessions,
)


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
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
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
    email = (body.get("email") or "").strip()
    password = body.get("password") or ""
    if not email or not password:
        raise HTTPException(400, "Email and password required")
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


@app.get("/api/auth/me")
async def auth_me(request: Request):
    """Return current user or 401."""
    user_id = get_current_user_id(request)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    user = db_get_user_by_id(user_id)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return {"user": {"id": user["id"], "email": user["email"]}}


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


@app.post("/api/generate-cv", response_model=GenerateCVResponse)
async def generate_cv(req: GenerateCVRequest):
    """
    Tailor profile to job description and generate motivation letter.
    Fetches job/URLs if needed, calls AI, stores session, generates PDF.
    Returns session_id and tailored content; PDF can be downloaded via /api/download-pdf/{session_id}.
    """
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
        if not settings.openai_api_key:
            raise HTTPException(503, "OPENAI_API_KEY is not configured")

        tailored_summary, tailored_experience, motivation_letter, keywords = tailor_cv_and_letter(
            profile=profile,
            job_description=job_text,
            personal_summary_override=req.personal_summary,
            additional_context=additional_context,
            language=req.language,
        )

        session_id = create_session_id()
        profile_dict = req.profile.model_dump() if isinstance(req.profile, Profile) else req.profile
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
        cv_pdf_bytes = generate_cv_pdf(
            profile=profile,
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            keywords_to_highlight=keywords,
            template_name=template_name,
            additional_urls=extra_urls,
        )
        set_session_pdf(session_id, cv_pdf_bytes)
        if motivation_letter and motivation_letter.strip():
            letter_pdf_bytes = generate_letter_pdf(profile=profile, motivation_letter=motivation_letter)
            set_session_letter_pdf(session_id, letter_pdf_bytes)

        return GenerateCVResponse(
            session_id=session_id,
            tailored_summary=tailored_summary,
            tailored_experience=tailored_experience,
            motivation_letter=motivation_letter,
            suggested_skills_highlight=keywords,
            status="success",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("generate-cv failed")
        err_type = type(e).__name__
        raise HTTPException(
            500,
            f"Generation failed. Please try again or simplify the profile. (Error: {err_type})",
        ) from e


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
async def download_pdf(session_id: str):
    """Return generated CV PDF only for the given session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    pdf_bytes = session.get("pdf_bytes")
    if not pdf_bytes:
        raise HTTPException(404, "PDF not ready for this session")
    return HttpResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="cv_{session_id[:8]}.pdf"'},
    )


@app.get("/api/download-letter/{session_id}")
async def download_letter(session_id: str):
    """Return motivation letter PDF only for the given session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    pdf_bytes = session.get("letter_pdf_bytes")
    if not pdf_bytes:
        raise HTTPException(404, "Letter PDF not ready for this session")
    return HttpResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="motivation_letter_{session_id[:8]}.pdf"'},
    )


@app.post("/api/profile")
async def update_profile(req: ProfileUpdateRequest, request: Request):
    """Echo profile (no DB write). Stored profile is updated only via CV upload."""
    require_user(request)
    return req.profile.model_dump()
