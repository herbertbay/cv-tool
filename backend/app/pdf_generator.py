"""
Generate CV PDF and motivation letter PDF (separate files).
Uses Jinja2 HTML template and WeasyPrint. Strips raw HTML from content so
<strong> etc. are not shown as literal text in the PDF.
"""
import html
import re
from io import BytesIO
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
from weasyprint.text.fonts import FontConfiguration

from app.cv_templates import (
    accent_palette,
    coerce_template,
    icon_link_src,
    icon_linkedin_src,
    normalize_accent_color,
)
from app.models import Profile


# Directory for Jinja templates
TEMPLATES_DIR = Path(__file__).parent / "pdf_templates"
font_config = FontConfiguration()

# Strip HTML tags so literal "<strong>" in source text is not rendered in PDF
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(text: str) -> str:
    """Remove HTML tags; leave plain text. Prevents raw <strong> etc. in PDF."""
    if not text:
        return text
    # Decode escaped tags (e.g. &lt;strong&gt;) before stripping, then collapse NBSP.
    decoded = html.unescape(text)
    return _HTML_TAG_RE.sub("", decoded).replace("\xa0", " ").strip()


def _highlight_keywords_in_text(text: str, keywords: list[str]) -> str:
    """Strip HTML from text, then wrap keywords (case-insensitive) in <strong> for PDF highlighting."""
    if not text:
        return text
    result = _strip_html(text)
    if not keywords:
        return result
    for kw in keywords:
        if not kw or len(kw) < 2:
            continue
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        result = pattern.sub(r"<strong>\g<0></strong>", result)
    return result


# Inline markdown: **bold** (after HTML is stripped/escaped)
_MD_BOLD_RE = re.compile(r"\*\*(.+?)\*\*", re.DOTALL)


def _format_cv_text_block(text: str, keywords: list[str]) -> str:
    """
    Prepare summary / experience text for the CV PDF:
    strip accidental raw HTML, escape, apply **bold** markdown, preserve line breaks,
    then wrap job keywords in <strong> (same as legacy highlight).
    """
    if not text:
        return ""
    plain = _strip_html(text)
    escaped = html.escape(plain)
    escaped = _MD_BOLD_RE.sub(r"<strong>\1</strong>", escaped)
    escaped = escaped.replace("\n\n", "<br/><br/>").replace("\n", "<br/>")
    if not keywords:
        return escaped
    result = escaped
    for kw in keywords:
        if not kw or len(kw) < 2:
            continue
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        result = pattern.sub(r"<strong>\g<0></strong>", result)
    return result


def format_motivation_letter_html(text: str) -> str:
    """Motivation letter body: strip raw HTML, escape, **bold**, line breaks to <br/>."""
    if not text:
        return ""
    plain = _strip_html(text)
    escaped = html.escape(plain)
    escaped = _MD_BOLD_RE.sub(r"<strong>\1</strong>", escaped)
    return escaped.replace("\n\n", "<br/><br/>").replace("\n", "<br/>")


def _keyword_match(skill: str, keywords: list[str]) -> bool:
    """Jinja filter: True if skill or any keyword matches (case-insensitive substring)."""
    if not skill or not keywords:
        return False
    sk = skill.lower()
    return sk in [k.lower() for k in keywords] or any((kw or "").lower() in sk for kw in keywords)


def _prepare_template_context(
    profile: Profile,
    tailored_summary: str,
    tailored_experience: list[dict],
    motivation_letter: str,
    keywords_to_highlight: list[str],
    additional_urls: list[str] | None = None,
    show_powered_by: bool = True,
    accent_color: str | None = None,
) -> dict:
    """Build context for the CV HTML template."""
    # Photo: support data URL or base64
    photo_data_url = None
    if profile.photo_base64:
        raw = profile.photo_base64
        if raw.startswith("data:"):
            photo_data_url = raw
        else:
            photo_data_url = f"data:image/jpeg;base64,{raw}"

    # Strip HTML from descriptions; then highlight keywords
    experience_rendered = []
    for job in tailored_experience:
        desc = job.get("description") or ""
        experience_rendered.append({
            **job,
            "description": _format_cv_text_block(desc, keywords_to_highlight),
        })

    # Normalize additional URLs for template (only valid http(s) URLs)
    urls_list = list(additional_urls) if additional_urls else []
    urls_list = [u.strip() for u in urls_list if (u and str(u).strip().startswith(("http://", "https://")))]

    ahex = normalize_accent_color(accent_color)
    pal = accent_palette(ahex)
    ctx = {
        "profile": profile.model_dump(),
        "photo_data_url": photo_data_url,
        "tailored_summary": _format_cv_text_block(tailored_summary or "", keywords_to_highlight),
        "tailored_experience": experience_rendered,
        "keywords_to_highlight": keywords_to_highlight,
        "additional_urls": urls_list,
        "language": "en",
        "show_powered_by": show_powered_by,
        "icon_linkedin": icon_linkedin_src(ahex),
        "icon_link": icon_link_src(ahex),
        **pal,
    }
    return ctx


def render_cv_html(
    profile: Profile,
    tailored_summary: str,
    tailored_experience: list[dict],
    keywords_to_highlight: list[str],
    template_name: str = "cv_base.html",
    additional_urls: list[str] | None = None,
    show_powered_by: bool = True,
    accent_color: str | None = None,
) -> str:
    """Render CV template to HTML string (for preview or PDF input)."""
    name = coerce_template(template_name)
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["keyword_match"] = _keyword_match
    template = env.get_template(name)
    ctx = _prepare_template_context(
        profile=profile,
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience,
        motivation_letter="",
        keywords_to_highlight=keywords_to_highlight,
        additional_urls=additional_urls,
        show_powered_by=show_powered_by,
        accent_color=accent_color,
    )
    return template.render(**ctx)


def generate_cv_pdf(
    profile: Profile,
    tailored_summary: str,
    tailored_experience: list[dict],
    keywords_to_highlight: list[str],
    template_name: str = "cv_base.html",
    additional_urls: list[str] | None = None,
    show_powered_by: bool = True,
    accent_color: str | None = None,
) -> bytes:
    """
    Render CV only (no motivation letter) to PDF bytes.
    Empty categories are omitted in the template.
    """
    html_str = render_cv_html(
        profile=profile,
        tailored_summary=tailored_summary,
        tailored_experience=tailored_experience,
        keywords_to_highlight=keywords_to_highlight,
        template_name=template_name,
        additional_urls=additional_urls,
        show_powered_by=show_powered_by,
        accent_color=accent_color,
    )
    pdf_buffer = BytesIO()
    HTML(string=html_str).write_pdf(pdf_buffer, font_config=font_config)
    return pdf_buffer.getvalue()


def generate_letter_pdf(profile: Profile, motivation_letter: str, show_powered_by: bool = True) -> bytes:
    """Render motivation letter only (separate PDF file)."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("motivation_letter.html")
    letter_html = format_motivation_letter_html(motivation_letter or "")
    html_str = template.render(
        profile=profile.model_dump(),
        full_name=profile.full_name,
        motivation_letter=letter_html,
        show_powered_by=show_powered_by,
    )
    pdf_buffer = BytesIO()
    HTML(string=html_str).write_pdf(pdf_buffer, font_config=font_config)
    return pdf_buffer.getvalue()
