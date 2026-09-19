from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Shared PostgreSQL - same database the Next.js web layer uses.
    database_url: str

    # AI provider keys. Empty values make the pipeline fall back to the
    # deterministic rule-based classifier so the service always works locally.
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    claude_model: str = "claude-sonnet-4-20250514"

    # Optional callback to the Next.js webhook with classification results.
    ai_webhook_url: str = ""
    ai_webhook_secret: str = ""
    # Web submission trigger / pending-query safety net.
    query_processing_poll_seconds: int = 30
    query_processing_batch_size: int = 10

    # FR-07: hours a query may stay unresolved before auto-escalation.
    escalation_hours: int = 24
    # How often the escalation scheduler runs, in minutes.
    escalation_poll_minutes: int = 10

    # FR-02: IMAP inbox receiver. For Gmail use an app password.
    email_imap_host: str = "imap.gmail.com"
    email_imap_port: int = 993
    email_imap_username: str = ""
    email_imap_password: str = ""
    email_imap_folder: str = "INBOX"
    email_ingestion_enabled: bool = False
    # Kept for compatibility with existing test/config files; IMAP is used now.
    gmail_credentials_json: str = ""
    gmail_poll_minutes: int = 10
    gmail_max_messages: int = 50
    gmail_label: str = "INBOX"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
