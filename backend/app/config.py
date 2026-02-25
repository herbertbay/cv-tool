"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings; values are read from environment or .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    # Temporary file storage for generated PDFs (seconds to keep)
    session_ttl_seconds: int = 3600
    # Auth: secret for signing session cookies (set in production)
    secret_key: str = "dev-secret-change-in-production"
    # Frontend URL for CORS (e.g. https://your-app.up.railway.app)
    frontend_url: str = ""


settings = Settings()
