from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.exceptions import AppException

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
        print(f"[STARTUP] Redis unavailable ({e}), running without rate limiting and background jobs")

    yield

    # Shutdown
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


# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


# API routes
app.include_router(api_router, prefix="/api/v1")
