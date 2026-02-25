"""
Scrape public LinkedIn profile page to extract profile data.
Uses httpx first; if blocked (429), falls back to Playwright (real browser).
"""
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from app.models import Profile, Position, EducationEntry, CertificationEntry


USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
TIMEOUT = 20.0


def _is_linkedin_url(url: str) -> bool:
    return "linkedin.com" in url.lower()


async def _fetch_html_playwright_async(url: str) -> str:
    """Fetch page using Playwright async (real browser)."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        # Use system Chrome (no Chromium download); fallback to bundled Chromium
        try:
            browser = await p.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})
            await page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT * 1000)
            await page.wait_for_timeout(3000)
            return await page.content()
        finally:
            await browser.close()


async def scrape_linkedin_profile_async(url: str) -> Profile:
    """
    Fetch LinkedIn profile URL and parse visible HTML into Profile.
    Uses Playwright (real browser) since LinkedIn blocks simple HTTP clients (429/999).
    """
    if not _is_linkedin_url(url):
        raise ValueError("URL must be a LinkedIn profile (linkedin.com)")

    try:
        html = await _fetch_html_playwright_async(url)
    except Exception as e:
        raise ValueError(
            f"Failed to fetch LinkedIn: {e}. Use PDF import instead: "
            "Open your profile in a browser → Print/Save as PDF → Upload."
        ) from e

    return _parse_profile_from_html(html, url)


def scrape_linkedin_profile(url: str) -> Profile:
    """Sync wrapper for backward compatibility."""
    import asyncio
    return asyncio.run(scrape_linkedin_profile_async(url))


def _parse_profile_from_html(html: str, url: str) -> Profile:
    soup = BeautifulSoup(html, "html.parser")

    # Remove script/style
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator="\n")
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines() if line.strip()]

    full_name = _extract_name(soup, lines)
    headline = _extract_headline(soup, lines)
    summary = _extract_summary(soup, lines)
    experience = _extract_experience(lines)
    education = _extract_education(lines)
    skills = _extract_skills(lines)
    certifications = _extract_certifications(lines)

    return Profile(
        full_name=full_name or "Unknown",
        headline=headline,
        summary=summary or "",
        email=None,
        phone=None,
        address=None,
        linkedin_url=url,
        photo_base64=None,
        experience=experience,
        education=education,
        skills=skills,
        certifications=certifications,
        languages=[],
    )


def _extract_name(soup: BeautifulSoup, lines: list[str]) -> str:
    """Try meta og:title, h1, or common patterns."""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        content = og_title["content"]
        if " | LinkedIn" in content:
            return content.replace(" | LinkedIn", "").strip()
        return content.strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    for line in lines[:20]:
        if len(line) < 60 and line[0].isupper() and "linkedin" not in line.lower():
            return line
    return ""


def _extract_headline(soup: BeautifulSoup, lines: list[str]) -> Optional[str]:
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        return og_desc["content"].strip()[:200]
    return None


def _extract_summary(soup: BeautifulSoup, lines: list[str]) -> str:
    about = None
    for i, line in enumerate(lines):
        if "about" in line.lower() and len(line) < 20:
            if i + 1 < len(lines) and len(lines[i + 1]) > 30:
                about = lines[i + 1]
            break
    return about or ""


def _extract_experience(lines: list[str]) -> list[Position]:
    exp = []
    in_exp = False
    current = None
    for i, line in enumerate(lines):
        lower = line.lower()
        if "experience" in lower and len(line) < 30:
            in_exp = True
            continue
        if in_exp and ("education" in lower or "skills" in lower or "certification" in lower):
            break
        if in_exp and line and len(line) > 5:
            if "·" in line or "–" in line or " - " in line:
                parts = re.split(r"\s*[·–\-]\s*", line, maxsplit=1)
                if len(parts) >= 2:
                    title = parts[0].strip()
                    rest = parts[1].strip()
                    date_match = re.search(r"(\d{4}|\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|Present)", rest, re.I)
                    company = rest
                    start_date = end_date = None
                    if date_match:
                        company = rest[: date_match.start()].strip()
                        date_str = date_match.group(0)
                        if "present" in date_str.lower():
                            end_date = "Present"
                        else:
                            end_date = date_str
                    exp.append(
                        Position(title=title, company=company, start_date=start_date, end_date=end_date, description=None, location=None)
                    )
    return exp[:20]


def _extract_education(lines: list[str]) -> list[EducationEntry]:
    edu = []
    in_edu = False
    for i, line in enumerate(lines):
        lower = line.lower()
        if "education" in lower and len(line) < 30:
            in_edu = True
            continue
        if in_edu and ("experience" in lower or "skills" in lower or "certification" in lower):
            break
        if in_edu and line and len(line) > 10 and not line.startswith("http"):
            school = line
            degree = field = start_date = end_date = None
            if "·" in line or "–" in line:
                parts = re.split(r"\s*[·–\-]\s*", line, maxsplit=1)
                school = parts[0].strip()
                if len(parts) >= 2:
                    rest = parts[1]
                    date_match = re.search(r"\d{4}\s*[-–]\s*(\d{4}|Present)", rest)
                    if date_match:
                        start_date, end_date = re.split(r"\s*[-–]\s*", date_match.group(0), maxsplit=1)
                    degree = rest.strip()
            edu.append(EducationEntry(school=school, degree=degree, field=field, start_date=start_date, end_date=end_date, description=None))
    return edu[:10]


def _extract_skills(lines: list[str]) -> list[str]:
    skills = []
    in_skills = False
    for line in lines:
        lower = line.lower()
        if "skills" in lower and len(line) < 25:
            in_skills = True
            continue
        if in_skills and ("experience" in lower or "education" in lower or "languages" in lower):
            break
        if in_skills and line and 2 < len(line) < 50 and line.isprintable():
            skills.append(line.strip())
    return skills[:50]


def _extract_certifications(lines: list[str]) -> list[CertificationEntry]:
    certs = []
    in_cert = False
    for line in lines:
        lower = line.lower()
        if "certification" in lower and len(line) < 30:
            in_cert = True
            continue
        if in_cert and ("experience" in lower or "education" in lower or "skills" in lower):
            break
        if in_cert and line and len(line) > 5:
            certs.append(CertificationEntry(name=line.strip(), authority=None, date=None, url=None))
    return certs[:15]
