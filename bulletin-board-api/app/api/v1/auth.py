import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.services.email_service import EmailService
from app.services.email_templates import (
    verification_email,
    password_reset_email,
    resend_verification_email,
)
from app.core.rate_limit import check_login_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.dependencies import get_db, get_redis
from app.models.campus import Campus
from app.models.notification import NotificationPreference
from app.models.user import (
    EmailVerification,
    EmailVerificationPurpose,
    RefreshToken,
    User,
    UserStatus,
)
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account."""
    # Find campus
    campus = await db.scalar(select(Campus).where(Campus.slug == data.campus_slug))
    if not campus:
        raise HTTPException(400, "Campus not found")

    # Validate email domain matches campus if required
    if not campus.allow_non_edu:
        email_domain = data.email.split("@")[1].lower()
        if email_domain != campus.domain.lower():
            raise HTTPException(
                400,
                f"Email must be from {campus.domain} domain",
            )

    # Check email uniqueness
    existing = await db.scalar(select(User).where(User.email == data.email.lower()))
    if existing:
        raise HTTPException(409, "Email already registered")

    # Create user
    user = User(
        campus_id=campus.id,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        class_year=data.class_year,
        phone_number=data.phone_number,
    )
    db.add(user)
    await db.flush()

    # Create notification preferences
    prefs_input = data.notification_preferences
    notification_prefs = NotificationPreference(
        user_id=user.id,
        email_messages=prefs_input.notify_email if prefs_input else True,
        email_listing_replies=prefs_input.notify_email if prefs_input else True,
        sms_messages=prefs_input.notify_sms if prefs_input else True,
        sms_listing_replies=prefs_input.notify_sms if prefs_input else True,
    )
    db.add(notification_prefs)

    # Create email verification token
    raw_token = secrets.token_urlsafe(32)
    verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        token_hash=hash_token(raw_token),
        purpose=EmailVerificationPurpose.VERIFY_EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(verification)
    await db.commit()

    # In development with console email provider, auto-verify the user
    if settings.email_provider == "console":
        user.email_verified = True
        verification.used_at = datetime.now(timezone.utc)
        await db.commit()
        print(f"[DEV] Auto-verified email for {user.email}")
        return {
            "message": "Registration successful. Your email has been automatically verified.",
            "user_id": str(user.id),
        }

    # Send verification email
    verify_url = f"{settings.primary_frontend_url}/verify-email?token={raw_token}"
    email_svc = EmailService(settings)
    await email_svc.send_email(
        to_email=user.email,
        subject="Welcome to Gimme Dat! Verify your email 🎉",
        html_content=verification_email(verify_url, user.display_name),
    )

    return {
        "message": "Registration successful. Check your email to verify your account.",
        "user_id": str(user.id),
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Log in with email and password."""
    await check_login_rate_limit(redis, data.email)

    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    if not user.email_verified:
        raise HTTPException(403, "Please verify your email before logging in")

    if user.status == UserStatus.BANNED:
        raise HTTPException(403, "Account has been banned")

    if user.status == UserStatus.SUSPENDED:
        if user.suspension_until and user.suspension_until > datetime.now(timezone.utc):
            raise HTTPException(
                403,
                f"Account suspended until {user.suspension_until.isoformat()}",
            )
        else:
            # Suspension expired, reactivate
            user.status = UserStatus.ACTIVE
            user.suspension_reason = None
            user.suspension_until = None

    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )
    raw_refresh = create_refresh_token()

    # Store refresh token
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        device_info=request.headers.get("User-Agent", "")[:500],
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(refresh)

    # Update last active
    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/logout", status_code=204)
async def logout(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Log out by revoking refresh token."""
    token_hash = hash_token(data.refresh_token)
    token = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user.id,
        )
    )
    if token:
        token.revoked_at = datetime.now(timezone.utc)
        await db.commit()


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    token_hash = hash_token(data.refresh_token)
    token = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )

    if not token or token.revoked_at or token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Invalid or expired refresh token")

    user = await db.get(User, token.user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(401, "User not found or inactive")

    # Rotate: revoke old, create new
    token.revoked_at = datetime.now(timezone.utc)

    new_raw_refresh = create_refresh_token()
    new_refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_raw_refresh),
        device_info=token.device_info,
        ip_address=token.ip_address,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(new_refresh)

    new_access = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
    )

    await db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_raw_refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/verify-email")
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify email address with token."""
    token_hash = hash_token(data.token)
    verification = await db.scalar(
        select(EmailVerification).where(
            EmailVerification.token_hash == token_hash,
            EmailVerification.purpose == EmailVerificationPurpose.VERIFY_EMAIL,
        )
    )

    if not verification:
        raise HTTPException(400, "Invalid verification token")

    if verification.used_at:
        raise HTTPException(400, "Token already used")

    if verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expired")

    # Mark user as verified
    user = await db.get(User, verification.user_id)
    if user:
        user.email_verified = True

    verification.used_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(
    data: ForgotPasswordRequest,  # Reuses email-only schema
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Resend verification email."""
    # Rate limit
    key = f"rate:resend:{data.email.lower()}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 300)  # 5 min window
    if count > 3:
        raise HTTPException(429, "Too many requests. Please wait.")

    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or user.email_verified:
        # Don't leak email existence
        return {"message": "If an account exists, a verification email has been sent."}

    raw_token = secrets.token_urlsafe(32)
    verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        token_hash=hash_token(raw_token),
        purpose=EmailVerificationPurpose.VERIFY_EMAIL,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(verification)
    await db.commit()

    verify_url = f"{settings.primary_frontend_url}/verify-email?token={raw_token}"
    email_svc = EmailService(settings)
    await email_svc.send_email(
        to_email=user.email,
        subject="Verify your Gimme Dat email ✉️",
        html_content=resend_verification_email(verify_url),
    )

    return {"message": "If an account exists, a verification email has been sent."}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Request password reset. Always returns success to not leak email existence."""
    key = f"rate:forgot:{data.email.lower()}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 300)
    if count > 3:
        raise HTTPException(429, "Too many requests. Please wait.")

    user = await db.scalar(select(User).where(User.email == data.email.lower()))
    if user:
        raw_token = secrets.token_urlsafe(32)
        verification = EmailVerification(
            user_id=user.id,
            email=user.email,
            token_hash=hash_token(raw_token),
            purpose=EmailVerificationPurpose.PASSWORD_RESET,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(verification)
        await db.commit()

        reset_url = f"{settings.primary_frontend_url}/reset-password?token={raw_token}"
        email_svc = EmailService(settings)
        await email_svc.send_email(
            to_email=user.email,
            subject="Reset your Gimme Dat password 🔐",
            html_content=password_reset_email(reset_url),
        )

    return {"message": "If an account exists, a password reset email has been sent."}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token."""
    token_hash = hash_token(data.token)
    verification = await db.scalar(
        select(EmailVerification).where(
            EmailVerification.token_hash == token_hash,
            EmailVerification.purpose == EmailVerificationPurpose.PASSWORD_RESET,
        )
    )

    if not verification or verification.used_at or verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Invalid or expired reset token")

    user = await db.get(User, verification.user_id)
    if not user:
        raise HTTPException(400, "Invalid token")

    user.password_hash = hash_password(data.new_password)
    verification.used_at = datetime.now(timezone.utc)

    # Revoke all refresh tokens for security
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )

    await db.commit()

    return {"message": "Password reset successful. Please log in."}
