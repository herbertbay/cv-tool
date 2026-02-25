"""Persist generated CV and letter PDFs to the file system."""
from pathlib import Path

from app.config import settings


def get_pdfs_dir() -> Path:
    """Directory for generated PDFs. Created if missing."""
    if settings.generated_pdfs_dir:
        p = Path(settings.generated_pdfs_dir)
    else:
        p = Path(__file__).parent.parent / "generated_pdfs"
    p.mkdir(parents=True, exist_ok=True)
    return p


def save_cv_pdf(session_id: str, cv_bytes: bytes, letter_bytes: bytes | None) -> tuple[str, str | None]:
    """Write CV and optional letter PDFs to disk. Returns (cv_path, letter_path). Paths are absolute."""
    d = get_pdfs_dir()
    cv_path = str(d / f"{session_id}_cv.pdf")
    with open(cv_path, "wb") as f:
        f.write(cv_bytes)
    letter_path = None
    if letter_bytes:
        letter_path = str(d / f"{session_id}_letter.pdf")
        with open(letter_path, "wb") as f:
            f.write(letter_bytes)
    return (cv_path, letter_path)


def load_pdf_bytes(path: str) -> bytes | None:
    """Read PDF file; return None if missing or error."""
    try:
        return Path(path).read_bytes()
    except Exception:
        return None
