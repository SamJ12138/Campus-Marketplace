from datetime import datetime, timedelta

from fastapi import HTTPException
from redis.asyncio import Redis

from app.config import get_settings
from app.models.user import User

settings = get_settings()


async def check_rate_limit(
    redis: Redis | None,
    key: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Check rate limit. Returns (allowed, remaining, reset_in_seconds).
    """
    if redis is None:
        return True, limit, 0

    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)

    ttl = await redis.ttl(key)
    remaining = max(0, limit - current)

    if current > limit:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(ttl)},
        )

    return current <= limit, remaining, ttl


async def check_listing_rate_limit(redis: Redis, user: User):
    """Check if user can create a listing."""
    if not settings.rate_limit_enabled:
        return

    account_age = datetime.utcnow() - user.created_at.replace(tzinfo=None)
    is_new = account_age < timedelta(days=settings.new_account_restriction_days)

    limit = (
        settings.new_account_listings_per_day
        if is_new
        else settings.rate_limit_listings_per_day
    )

    await check_rate_limit(
        redis,
        f"rate:listings:{user.id}",
        limit,
        86400,
    )


async def check_message_rate_limit(redis: Redis, user: User):
    """Check if user can send a message."""
    if not settings.rate_limit_enabled:
        return

    account_age = datetime.utcnow() - user.created_at.replace(tzinfo=None)
    is_new = account_age < timedelta(days=3)

    limit = (
        settings.new_account_messages_per_hour
        if is_new
        else settings.rate_limit_messages_per_hour
    )

    await check_rate_limit(
        redis,
        f"rate:messages:{user.id}",
        limit,
        3600,
    )


async def check_login_rate_limit(redis: Redis, email: str):
    """Check login attempts for an email."""
    if not settings.rate_limit_enabled:
        return

    key = f"rate:login:{email.lower()}"

    await check_rate_limit(
        redis,
        key,
        settings.rate_limit_login_attempts,
        settings.rate_limit_login_window_seconds,
    )
