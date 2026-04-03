#!/usr/bin/env python
"""One-time script: send apology email to specific users who abandoned signup.

Usage:
    python scripts/send_abandoned_apology.py --dry-run              # preview only
    python scripts/send_abandoned_apology.py                        # send to hardcoded list
    python scripts/send_abandoned_apology.py --to user@school.edu   # send to one address
"""
import argparse
import asyncio
import logging

from app.config import get_settings
from app.services.email_service import get_email_service
from app.services.email_templates import abandoned_signup_email

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

# Users who tried to sign up but never completed (from manual observation)
DEFAULT_RECIPIENTS = [
    "usmaza01@gettysburg.edu",
    "hallem03@gettysburg.edu",
]


async def main(dry_run: bool = False, to_email: str | None = None):
    email_service = get_email_service(settings)
    recipients = [to_email] if to_email else DEFAULT_RECIPIENTS

    logger.info("Will send apology email to %d recipient(s).", len(recipients))

    if dry_run:
        for addr in recipients:
            logger.info("  [DRY RUN] Would send to: %s", addr)
        logger.info("Dry run complete. No emails sent.")
        return

    sent = 0
    failed = 0
    signup_url = f"{settings.primary_frontend_url}/login"

    for addr in recipients:
        username = addr.split("@")[0]
        html, text = abandoned_signup_email(username, signup_url)
        success = await email_service.send_email(
            to_email=addr,
            subject="Sorry about that -- try signing in again",
            html_content=html,
            text_content=text,
        )
        if success:
            sent += 1
            logger.info("  Sent to %s", addr)
        else:
            failed += 1
            logger.error("  FAILED: %s", addr)

        await asyncio.sleep(0.2)

    logger.info("Done. Sent: %d, Failed: %d", sent, failed)
    await email_service.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send abandoned signup apology emails")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--to", type=str, default=None, help="Send to a specific email only")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run, to_email=args.to))
