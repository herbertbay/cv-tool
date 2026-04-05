"""CV PDF template registry and accent color helpers for Jinja / WeasyPrint."""
from __future__ import annotations

import colorsys
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

_DEFAULT_ACCENT = "#2563eb"
_HEX6 = re.compile(r"^#[0-9A-Fa-f]{6}$")
_HEX3 = re.compile(r"^#[0-9A-Fa-f]{3}$")

# Baseline layouts + 18 creative themes (filename -> display label for API/docs).
CV_TEMPLATE_FILES: tuple[str, ...] = (
    "cv_base.html",
    "cv_executive.html",
    "cv_theme_aurora.html",
    "cv_theme_rail.html",
    "cv_theme_sidebar.html",
    "cv_theme_minimal.html",
    "cv_theme_bold.html",
    "cv_theme_card.html",
    "cv_theme_magazine.html",
    "cv_theme_ink.html",
    "cv_theme_citrus.html",
    "cv_theme_horizon.html",
    "cv_theme_nordic.html",
    "cv_theme_construct.html",
    "cv_theme_soft.html",
    "cv_theme_typewriter.html",
    "cv_theme_serif.html",
    "cv_theme_stream.html",
    "cv_theme_caps.html",
    "cv_theme_split.html",
)

ALLOWED_CV_TEMPLATES: frozenset[str] = frozenset(CV_TEMPLATE_FILES)

_TEMPLATES_DIR = Path(__file__).parent / "pdf_templates"


def is_allowed_template(name: str) -> bool:
    n = (name or "").strip()
    return n in ALLOWED_CV_TEMPLATES and (_TEMPLATES_DIR / n).is_file()


def coerce_template(name: str | None, default: str = "cv_base.html") -> str:
    n = (name or default).strip()
    return n if is_allowed_template(n) else default


def clamp_accent_for_white_background(hex_color: str) -> str:
    """
    Keep accent colors readable on white: cap HSL lightness (~18–52%)
    so fills and text stay distinguishable from the page background.
    """
    h = normalize_accent_color(hex_color).lstrip("#")
    if len(h) != 6:
        return normalize_accent_color(hex_color)
    r, g, b = int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0
    hue, light, sat = colorsys.rgb_to_hls(r, g, b)
    light = max(0.18, min(light, 0.52))
    r2, g2, b2 = colorsys.hls_to_rgb(hue, light, sat)
    return f"#{int(max(0, min(1, r2)) * 255):02x}{int(max(0, min(1, g2)) * 255):02x}{int(max(0, min(1, b2)) * 255):02x}"


def normalize_accent_color(raw: str | None, default: str = _DEFAULT_ACCENT) -> str:
    """Return #rrggbb or default. Accepts #RGB or #RRGGBB."""
    if not raw or not isinstance(raw, str):
        return default
    s = raw.strip()
    if _HEX6.fullmatch(s):
        return s.lower()
    if _HEX3.fullmatch(s):
        r, g, b = s[1], s[2], s[3]
        return f"#{r}{r}{g}{g}{b}{b}".lower()
    return default


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{max(0, min(255, r)):02x}{max(0, min(255, g)):02x}{max(0, min(255, b)):02x}"


def mix_hex(a: str, b: str, t: float) -> str:
    """Linear mix t in [0,1] from a toward b."""
    ar, ag, ab = _hex_to_rgb(a)
    br, bg, bb = _hex_to_rgb(b)
    t = max(0.0, min(1.0, t))
    return _rgb_to_hex(
        int(ar + (br - ar) * t),
        int(ag + (bg - ag) * t),
        int(ab + (bb - ab) * t),
    )


def accent_palette(accent_hex: str) -> dict[str, str]:
    """CSS-friendly variants for templates."""
    a = clamp_accent_for_white_background(accent_hex)
    return {
        "accent_hex": a,
        "accent_soft": mix_hex(a, "#ffffff", 0.9),
        "accent_muted": mix_hex(a, "#ffffff", 0.82),
        "accent_faint": mix_hex(a, "#ffffff", 0.94),
        "accent_dark": mix_hex(a, "#0f172a", 0.45),
        "accent_border": mix_hex(a, "#64748b", 0.35),
    }


_LINKEDIN_PATH = (
    "M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93-1.24 0-1.87.82-1.87 2.19V19h-3v-9h2.9v1.3h.04c.4-.75 1.4-1.54 2.94-1.54 3.14 0 3.72 2.06 3.72 4.75V19z"
)
_LINK_PATH = (
    "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
)


@lru_cache(maxsize=64)
def _icon_data_url_cached(path_d: str, fill_hex: str) -> str:
    h = fill_hex.lstrip("#")
    fill_attr = f"%23{h}"
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='{fill_attr}'>"
        f"<path d='{path_d}'/></svg>"
    )
    return "data:image/svg+xml," + quote(svg, safe="")


def icon_linkedin_src(accent_hex: str) -> str:
    return _icon_data_url_cached(_LINKEDIN_PATH, normalize_accent_color(accent_hex))


def icon_link_src(accent_hex: str) -> str:
    return _icon_data_url_cached(_LINK_PATH, normalize_accent_color(accent_hex))
