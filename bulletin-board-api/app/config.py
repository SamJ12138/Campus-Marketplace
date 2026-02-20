from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    app_env: Literal["development", "staging", "production"] = "development"
    app_debug: bool = False
    app_secret_key: str = Field(..., min_length=32)
    app_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"  # Comma-separated for multiple origins

    @property
    def primary_frontend_url(self) -> str:
        """Get the primary frontend URL (first one if comma-separated)."""
        return self.frontend_url.split(",")[0].strip()

    # Database
    database_url: str  # postgresql+asyncpg://user:pass@host:5432/db
    database_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # S3 Storage
    s3_endpoint_url: str | None = None  # For MinIO; None for real AWS
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket_name: str = "bulletin-board"
    s3_region: str = "us-east-1"
    cdn_url: str = "http://localhost:9000/bulletin-board"

    # Email
    email_provider: Literal["console", "sendgrid", "ses", "resend"] = "console"
    sendgrid_api_key: str | None = None
    resend_api_key: str | None = None
    email_from_address: str = "hello@gimme-dat.com"
    email_from_name: str = "GimmeDat"

    # Platform Limits
    listing_expiry_days: int = 30
    max_photos_per_listing: int = 6
    max_photo_size_bytes: int = 5 * 1024 * 1024  # 5MB
    max_avatar_size_bytes: int = 2 * 1024 * 1024  # 2MB

    # Rate Limits (per window)
    rate_limit_enabled: bool = True
    rate_limit_login_attempts: int = 5
    rate_limit_login_window_seconds: int = 900  # 15 min
    rate_limit_listings_per_day: int = 5
    rate_limit_messages_per_hour: int = 50

    # New account restrictions (first N days)
    new_account_restriction_days: int = 7
    new_account_listings_per_day: int = 2
    new_account_messages_per_hour: int = 10

    # Sentry (optional)
    sentry_dsn: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
