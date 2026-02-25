"""
Fetch content from URLs (job description, candidate info pages).
Returns plain text suitable for AI context; strips HTML.
"""
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup


# User agent to avoid being blocked by some sites
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
TIMEOUT = 15.0


def fetch_url_text(url: str) -> str:
    """
    Fetch a URL and return main text content (strip HTML, normalize whitespace).
    Returns empty string on failure.
    """
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(url)
            resp.raise_for_status()
            text = resp.text
    except Exception:
        return ""

    soup = BeautifulSoup(text, "html.parser")
    # Remove script/style
    for tag in soup(["script", "style"]):
        tag.decompose()
    raw = soup.get_text(separator="\n")
    # Normalize whitespace
    lines = [re.sub(r"\s+", " ", line).strip() for line in raw.splitlines()]
    return "\n".join(line for line in lines if line)


def fetch_job_description(job_input: str) -> str:
    """
    If job_input looks like a URL, fetch and return page text; otherwise return as-is.
    """
    s = (job_input or "").strip()
    if s.startswith("http://") or s.startswith("https://"):
        return fetch_url_text(s)
    return s


def fetch_additional_urls(urls: list[str]) -> dict[str, str]:
    """
    Fetch up to 5 URLs and return a map of url -> extracted text.
    """
    result: dict[str, str] = {}
    for url in urls[:5]:
        url = url.strip()
        if not url or not (url.startswith("http://") or url.startswith("https://")):
            continue
        result[url] = fetch_url_text(url)
    return result
