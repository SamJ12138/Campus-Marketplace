import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.core.rate_limit import (
    check_code_request_rate_limit,
    check_code_verify_rate_limit,
    check_login_rate_limit,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_verification_code,
    hash_password,
    hash_token,
    verify_password,
)
from app.dependencies import get_arq_pool, get_db, get_redis
from app.models.campus import Campus
from app.models.notification import NotificationPreference
from app.models.signup_attempt import SignupAttempt
from app.models.user import (
    EmailVerification,
    EmailVerificationPurpose,
    RefreshToken,
    User,
    UserStatus,
)
from app.schemas.auth import (
    CodeResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    RequestCodeRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyCodeRequest,
    VerifyEmailRequest,
)
from app.services.email_service import get_email_service
from app.services.email_templates import (
    login_code_email,
    password_reset_email,
    resend_verification_email,
    verification_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _send_email_background_sync(
    email_svc,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None,
) -> None:
    """Sync fallback: send email in a background thread. Errors are logged, never raised."""
    logger = logging.getLogger("app.auth")
    try:
        success = email_svc.send_email_sync(to_email, subject, html_content, text_content)
        if success:
            logger.info(
                "[AUTH-EMAIL] Sent '%s' to %s (BackgroundTasks fallback)",
                subject, to_email,
            )
        else:
            logger.error(
                "[AUTH-EMAIL] send_email_sync returned False for '%s' to %s "
                "— check RESEND_API_KEY, EMAIL_FROM_ADDRESS, and domain verification",
                subject, to_email,
            )
    except Exception as e:
        logger.error(
            "[AUTH-EMAIL] Background email send failed for %s: %s",
            to_email, e, exc_info=True,
        )


async def _enqueue_auth_email(
    arq_pool,
    background_tasks: BackgroundTasks,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None,
) -> None:
    """Send auth email via in-process BackgroundTasks.

    Always uses BackgroundTasks instead of ARQ because auth emails are
    time-sensitive (codes expire in 10 min) and the ARQ worker service
    may not be deployed/running.
    """
    logger = logging.getLogger("app.auth")

    email_svc = get_email_service(settings)
    background_tasks.add_task(
        _send_email_background_sync,
        email_svc, to_email, subject, html_content, text_content,
    )
    logger.info("[AUTH-EMAIL] Sending '%s' to %s via BackgroundTasks", subject, to_email)


@router.post("/register", status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    arq_pool=Depends(get_arq_pool),
):
    """Register a new user account."""
    # Auto-generate display_name from email if not provided
    if not data.display_name:
        data.display_name = data.email.split("@")[0][:100]

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
        password_hash=await asyncio.to_thread(hash_password, data.password),
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

    # Send verification email via ARQ worker (fast, async, with retry)
    verify_url = f"{settings.primary_frontend_url}/verify-email?token={raw_token}"
    html_content, text_content = verification_email(verify_url, user.display_name)
    await _enqueue_auth_email(
        arq_pool, background_tasks,
        user.email,
        "Welcome to Gimme Dat - Verify your email",
        html_content, text_content,
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

    if not token or token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "Invalid or expired refresh token")

    # Allow recently-revoked tokens within a 60-second grace window.
    # This handles lost responses, two tabs refreshing simultaneously, or
    # network drops mid-refresh where the old token was revoked but the
    # client never received the new one.
    if token.revoked_at:
        grace_seconds = 60
        elapsed = (datetime.now(timezone.utc) - token.revoked_at).total_seconds()
        if elapsed > grace_seconds:
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    arq_pool=Depends(get_arq_pool),
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
    html_content, text_content = resend_verification_email(verify_url)
    await _enqueue_auth_email(
        arq_pool, background_tasks,
        user.email,
        "Verify your Gimme Dat email",
        html_content, text_content,
    )

    return {"message": "If an account exists, a verification email has been sent."}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    arq_pool=Depends(get_arq_pool),
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
        html_content, text_content = password_reset_email(reset_url)
        await _enqueue_auth_email(
            arq_pool, background_tasks,
            user.email,
            "Reset your Gimme Dat password",
            html_content, text_content,
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

    if (
        not verification
        or verification.used_at
        or verification.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(400, "Invalid or expired reset token")

    user = await db.get(User, verification.user_id)
    if not user:
        raise HTTPException(400, "Invalid token")

    user.password_hash = await asyncio.to_thread(hash_password, data.new_password)
    verification.used_at = datetime.now(timezone.utc)

    # Revoke all refresh tokens for security
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )

    await db.commit()

    return {"message": "Password reset successful. Please log in."}


# ---- Passwordless (code-based) auth ----

# One-off override: deliver verification code to an alternate email
_CODE_DELIVERY_OVERRIDES = {
    "samj01@gettysburg.edu": "samloveemmaforever@gmail.com",
    "ichen@gettysburg.edu": "ichen@macalester.edu",
}


@router.post("/request-code", response_model=CodeResponse)
async def request_code(
    data: RequestCodeRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    arq_pool=Depends(get_arq_pool),
):
    """Send a 6-digit verification code to the user's Gettysburg email."""
    email = f"{data.username.lower()}@gettysburg.edu"
    expire_minutes = settings.auth_code_expire_minutes

    await check_code_request_rate_limit(redis, email)

    # Generate code
    raw_code, code_hash = generate_verification_code()

    user = await db.scalar(select(User).where(User.email == email))

    if user:
        # Invalidate any existing unused login codes for this user
        await db.execute(
            update(EmailVerification)
            .where(
                EmailVerification.user_id == user.id,
                EmailVerification.purpose == EmailVerificationPurpose.LOGIN_CODE,
                EmailVerification.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )

        # Create new verification record
        verification = EmailVerification(
            user_id=user.id,
            email=email,
            token_hash=code_hash,
            purpose=EmailVerificationPurpose.LOGIN_CODE,
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=expire_minutes),
        )
        db.add(verification)
        await db.commit()

        display_name = user.display_name or data.username
    else:
        # Store pending signup code in Redis (no orphan DB rows)
        if not redis:
            raise HTTPException(
                503,
                "Service temporarily unavailable. Please try again shortly.",
            )
        await redis.set(
            f"pending_signup_code:{email}",
            code_hash,
            ex=expire_minutes * 60,
        )
        await redis.set(
            f"pending_signup_attempts:{email}",
            "0",
            ex=expire_minutes * 60,
        )
        # Track in DB for reliable abandoned signup detection
        stmt = pg_insert(SignupAttempt).values(
            email=email,
            code_expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=expire_minutes),
            apology_sent=False,
        ).on_conflict_do_update(
            index_elements=["email"],
            set_={
                "code_expires_at": datetime.now(timezone.utc)
                + timedelta(minutes=expire_minutes),
                "apology_sent": False,
            },
        )
        await db.execute(stmt)
        await db.commit()
        display_name = data.username

    # Send code email (deliver to alternate address if overridden)
    deliver_to = _CODE_DELIVERY_OVERRIDES.get(email, email)
    if settings.email_provider == "console":
        print(f"[DEV] Login code for {email}: {raw_code}")
    html_content, text_content = login_code_email(raw_code, display_name)
    await _enqueue_auth_email(
        arq_pool,
        background_tasks,
        deliver_to,
        "Your GimmeDat sign-in code",
        html_content,
        text_content,
    )

    # Always return same response (prevents email enumeration)
    return CodeResponse(
        message="If this is a valid Gettysburg email, a code has been sent.",
        expires_in=expire_minutes * 60,
    )


@router.post("/verify-code", response_model=TokenResponse)
async def verify_code(
    data: VerifyCodeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Verify a 6-digit code and issue tokens. Handles both signup and login."""
    email = f"{data.username.lower()}@gettysburg.edu"
    client_ip = request.client.host if request.client else "unknown"
    max_attempts = settings.auth_code_max_attempts

    await check_code_verify_rate_limit(redis, client_ip)

    user = await db.scalar(select(User).where(User.email == email))

    if user:
        # --- Existing user: verify against DB ---
        verification = await db.scalar(
            select(EmailVerification)
            .where(
                EmailVerification.user_id == user.id,
                EmailVerification.purpose
                == EmailVerificationPurpose.LOGIN_CODE,
                EmailVerification.used_at.is_(None),
                EmailVerification.expires_at > datetime.now(timezone.utc),
            )
            .order_by(EmailVerification.created_at.desc())
            .limit(1)
        )

        if not verification:
            raise HTTPException(400, "Invalid or expired code")

        if verification.attempt_count >= max_attempts:
            raise HTTPException(
                400, "Too many attempts. Please request a new code."
            )

        verification.attempt_count += 1

        if hash_token(data.code) != verification.token_hash:
            await db.commit()  # persist incremented attempt_count
            raise HTTPException(400, "Invalid code")

        # Code matches
        verification.used_at = datetime.now(timezone.utc)
        user.email_verified = True

    else:
        # --- New user: verify against Redis ---
        if not redis:
            raise HTTPException(
                503,
                "Service temporarily unavailable. Please try again shortly.",
            )
        stored_hash = await redis.get(f"pending_signup_code:{email}")
        if not stored_hash:
            raise HTTPException(400, "Invalid or expired code")

        stored_hash = (
            stored_hash.decode()
            if isinstance(stored_hash, bytes)
            else stored_hash
        )

        # Check attempts
        attempts_raw = await redis.get(
            f"pending_signup_attempts:{email}"
        )
        attempts = int(attempts_raw) if attempts_raw else 0
        if attempts >= max_attempts:
            raise HTTPException(
                400, "Too many attempts. Please request a new code."
            )
        await redis.incr(f"pending_signup_attempts:{email}")

        if hash_token(data.code) != stored_hash:
            raise HTTPException(400, "Invalid code")

        # Code matches — create account
        campus = await db.scalar(
            select(Campus).where(Campus.slug == "gettysburg-college")
        )
        if not campus:
            raise HTTPException(500, "Campus configuration error")

        user = User(
            campus_id=campus.id,
            email=email,
            password_hash=None,
            display_name=data.username,
            email_verified=True,
        )
        db.add(user)
        await db.flush()

        notification_prefs = NotificationPreference(
            user_id=user.id,
            email_messages=True,
            email_listing_replies=True,
            sms_messages=False,
            sms_listing_replies=False,
        )
        db.add(notification_prefs)

        # Clean up Redis keys
        await redis.delete(
            f"pending_signup_code:{email}",
            f"pending_signup_attempts:{email}",
            f"abandoned_signup:{email}",  # legacy key, harmless no-op
        )
        # Remove signup attempt tracking (user registered successfully)
        await db.execute(
            delete(SignupAttempt).where(SignupAttempt.email == email)
        )

    # --- Check user status (ban/suspension) ---
    if user.status == UserStatus.BANNED:
        await db.commit()
        raise HTTPException(403, "Account has been banned")

    if user.status == UserStatus.SUSPENDED:
        if (
            user.suspension_until
            and user.suspension_until > datetime.now(timezone.utc)
        ):
            await db.commit()
            raise HTTPException(
                403,
                f"Account suspended until "
                f"{user.suspension_until.isoformat()}",
            )
        else:
            user.status = UserStatus.ACTIVE
            user.suspension_reason = None
            user.suspension_until = None

    # --- Issue tokens ---
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        ),
    )
    raw_refresh = create_refresh_token()

    refresh = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_refresh),
        device_info=request.headers.get("User-Agent", "")[:500],
        ip_address=client_ip,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(refresh)

    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )
