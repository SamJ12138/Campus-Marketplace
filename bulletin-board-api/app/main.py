import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import AppException

# Configure logging so info/error messages are visible
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s: %(message)s")

settings = get_settings()

# Sentry setup (optional)
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.app_env)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle."""
    from app.db import create_engine, create_session_factory

    # Startup
    engine = create_engine(settings.database_url, echo=settings.database_echo)
    app.state.db_session = create_session_factory(engine)

    # Redis + ARQ are optional in development (not needed for auth flows)
    app.state.redis = None
    app.state.arq_pool = None
    try:
        import asyncio

        from redis.asyncio import from_url

        redis_client = from_url(settings.redis_url, socket_connect_timeout=3)
        await asyncio.wait_for(redis_client.ping(), timeout=3)
        app.state.redis = redis_client

        from arq import create_pool
        from arq.connections import RedisSettings

        app.state.arq_pool = await create_pool(
            RedisSettings.from_dsn(settings.redis_url)
        )
        print("[STARTUP] Redis + ARQ connected")
    except Exception as e:
        print(
            f"[STARTUP] Redis unavailable ({e}),"
            " running without rate limiting and background jobs"
        )

    # Initialize EmailService singleton (connection pooling for Resend/SendGrid)
    from app.services.email_service import get_email_service

    app.state.email_service = get_email_service(settings)
    print(f"[STARTUP] EmailService initialized (provider: {settings.email_provider})")
    print(f"[STARTUP] Email from: {settings.email_from_name} <{settings.email_from_address}>")

    # Ensure passwordless auth schema is ready (enum value + column)
    # This covers the case where the Alembic migration failed silently on deploy
    try:
        async with engine.connect() as conn:
            # DB enum uses uppercase names (VERIFY_EMAIL, PASSWORD_RESET)
            # so LOGIN_CODE must also be uppercase to match
            await conn.execute(text(
                "ALTER TYPE email_verification_purpose "
                "ADD VALUE IF NOT EXISTS 'LOGIN_CODE'"
            ))
            await conn.commit()

            # Also ensure attempt_count column exists
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'email_verifications' "
                "AND column_name = 'attempt_count'"
            ))
            if not result.fetchone():
                await conn.execute(text(
                    "ALTER TABLE email_verifications "
                    "ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0"
                ))
                await conn.commit()

            # Ensure password_hash is nullable
            await conn.execute(text(
                "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"
            ))
            await conn.commit()

            # Drop unique constraint on email_verifications.token_hash
            # 6-digit login codes have only 1M possible hashes, causing
            # collisions with the unique constraint across different users
            result = await conn.execute(text(
                "SELECT constraint_name FROM information_schema.table_constraints "
                "WHERE table_name = 'email_verifications' "
                "AND constraint_type = 'UNIQUE'"
            ))
            for row in result.fetchall():
                await conn.execute(text(
                    f"ALTER TABLE email_verifications "
                    f"DROP CONSTRAINT IF EXISTS {row[0]}"
                ))
            # Also drop any unique index on token_hash
            await conn.execute(text(
                "DROP INDEX IF EXISTS ix_email_verifications_token_hash"
            ))
            await conn.commit()

        print("[STARTUP] Passwordless auth schema verified")
    except Exception as e:
        print(f"[STARTUP] Schema check note: {e}")

    # Auto-seed example listings if needed
    try:
        from app.services.auto_seed import auto_seed_examples

        await auto_seed_examples(app.state.db_session)
    except Exception as e:
        print(f"[STARTUP] Auto-seed failed (non-fatal): {e}")

    yield

    # Shutdown
    if hasattr(app.state, "email_service") and app.state.email_service:
        await app.state.email_service.close()
    if app.state.redis:
        await app.state.redis.close()
    if app.state.arq_pool:
        await app.state.arq_pool.close()
    await engine.dispose()


app = FastAPI(
    title="Campus Bulletin Board API",
    version="1.0.0",
    docs_url="/docs" if settings.app_debug else None,
    redoc_url="/redoc" if settings.app_debug else None,
    lifespan=lifespan,
)

# CORS - support multiple origins (comma-separated in FRONTEND_URL)
cors_origins = [origin.strip() for origin in settings.frontend_url.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all so unhandled errors return a JSONResponse that passes
    through CORSMiddleware (otherwise the browser blocks the bare 500
    as a CORS violation, producing 'Failed to fetch')."""
    logging.getLogger("app").error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Health check
@app.get("/health")
async def health():
    checks: dict = {"api": "ok"}
    healthy = True

    # Database
    try:
        async with app.state.db_session() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        healthy = False

    # Redis
    try:
        if app.state.redis:
            await app.state.redis.ping()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "not configured"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        healthy = False

    status_code = 200 if healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if healthy else "degraded",
            "version": "1.0.0",
            "checks": checks,
        },
    )


# Email config diagnostic
@app.get("/health/email")
async def health_email():
    """Check email service configuration (does NOT send an email)."""
    config = {
        "provider": settings.email_provider,
        "from_address": settings.email_from_address,
        "from_name": settings.email_from_name,
        "frontend_url": settings.primary_frontend_url,
    }

    issues = []
    if settings.email_provider == "resend":
        if not settings.resend_api_key:
            issues.append("RESEND_API_KEY is not set — all email sends will fail")
        if "resend.dev" in settings.email_from_address:
            issues.append("Using Resend sandbox address — emails only delivered to account owner")
    elif settings.email_provider == "console":
        issues.append("Using console provider — emails are printed to stdout, not sent")

    if "localhost" in settings.primary_frontend_url:
        issues.append("FRONTEND_URL points to localhost — email links will be broken")

    return {
        "status": "ok" if not issues else "warning",
        "config": config,
        "issues": issues,
    }


# API routes
app.include_router(api_router, prefix="/api/v1")
