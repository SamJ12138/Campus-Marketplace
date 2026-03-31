#!/usr/bin/env python
"""One-time script: nudge existing users to post items on GimmeDat.

Usage:
    python scripts/send_post_nudge.py --dry-run        # preview only
    python scripts/send_post_nudge.py --to user@edu    # send to one user
    python scripts/send_post_nudge.py --skip-test       # skip test accounts
    python scripts/send_post_nudge.py                  # send to all
"""
import argparse
import asyncio
import logging
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.user import User
from app.services.email_service import get_email_service
from app.services.email_templates import post_something_nudge_email

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

TEST_PATTERNS = ["faketest", "testclaudebot", "arq-test", "+signuptest"]


async def main(dry_run: bool = False, to_email: str | None = None, skip_test: bool = False):
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    email_service = get_email_service(settings)

    async with async_session() as db:
        query = select(User).where(User.status == "ACTIVE")
        if to_email:
            query = query.where(User.email == to_email)

        result = await db.execute(query)
        users = result.scalars().all()

    if skip_test:
        before = len(users)
        users = [u for u in users if not any(p in u.email for p in TEST_PATTERNS)]
        skipped = before - len(users)
        if skipped:
            logger.info("Skipped %d test account(s).", skipped)

    if not users:
        logger.info("No matching users found.")
        await engine.dispose()
        return

    logger.info("Found %d user(s) to nudge.", len(users))

    if dry_run:
        for u in users:
            logger.info("  [DRY RUN] Would send to: %s (%s)", u.email, u.display_name)
        logger.info("Dry run complete. No emails sent.")
        await engine.dispose()
        return

    sent = 0
    failed = 0

    for u in users:
        display = u.display_name or "there"
        html, text = post_something_nudge_email(display, settings.primary_frontend_url)
        success = await email_service.send_email(
            to_email=u.email,
            subject="Your stuff called — it wants a new home",
            html_content=html,
            text_content=text,
        )
        if success:
            sent += 1
            logger.info("  Sent to %s", u.email)
        else:
            failed += 1
            logger.error("  FAILED: %s", u.email)

        # Small delay to respect rate limits
        await asyncio.sleep(0.2)

    logger.info("Done. Sent: %d, Failed: %d", sent, failed)
    await email_service.close()
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send post-something nudge email")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--to", type=str, default=None, help="Send to a specific email only")
    parser.add_argument("--skip-test", action="store_true", help="Skip obvious test accounts")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, to_email=args.to, skip_test=args.skip_test))
