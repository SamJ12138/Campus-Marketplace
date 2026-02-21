from arq import cron
from arq.connections import RedisSettings

from app.config import get_settings

settings = get_settings()


async def startup(ctx):
    """Initialize worker context."""
    from app.db import create_engine, create_session_factory

    engine = create_engine(settings.database_url)
    ctx["db_session"] = create_session_factory(engine)
    ctx["settings"] = settings


async def shutdown(ctx):
    """Cleanup."""
    pass


class WorkerSettings:
    functions = [
        "app.workers.tasks.send_email",
        "app.workers.tasks.generate_thumbnail",
        "app.workers.tasks.expire_listings",
        "app.workers.tasks.cleanup_orphan_uploads",
        "app.workers.tasks.send_expiry_reminders",
        "app.workers.tasks.notify_moderators_new_report",
        "app.workers.tasks.send_new_message_email",
        "app.workers.tasks.send_report_resolved_email",
        "app.workers.tasks.generate_listing_embedding",
        "app.workers.tasks.batch_generate_embeddings",
        "app.workers.tasks.generate_admin_summary",
        "app.workers.tasks.detect_anomalies_task",
    ]

    cron_jobs = [
        cron("app.workers.tasks.expire_listings", hour={0, 6, 12, 18}),
        cron("app.workers.tasks.cleanup_orphan_uploads", hour=3, minute=30),
        cron("app.workers.tasks.send_expiry_reminders", hour=9),
        cron("app.workers.tasks.batch_generate_embeddings", hour={1, 7, 13, 19}),
        cron("app.workers.tasks.generate_admin_summary", weekday=1, hour=8),
        cron("app.workers.tasks.detect_anomalies_task", hour={2, 8, 14, 20}),
    ]

    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300
