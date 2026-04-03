#!/usr/bin/env python
"""Send a test welcome email to a specific address.

Usage:
    python scripts/send_welcome_test.py --to user@school.edu
    python scripts/send_welcome_test.py --to user@school.edu --dry-run
"""
import argparse
import asyncio
import logging

from app.config import get_settings
from app.services.email_service import get_email_service
from app.services.email_templates import welcome_email

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()


async def main(to_email: str, dry_run: bool = False):
    email_service = get_email_service(settings)
    username = to_email.split("@")[0]

    image_url = f"{settings.primary_frontend_url}/email-assets/welcome-spongebob.png"
    feedback_url = f"{settings.primary_frontend_url}/feed"
    html, text = welcome_email(username, feedback_url, image_url)

    logger.info("Sending welcome email to: %s", to_email)

    if dry_run:
        logger.info("[DRY RUN] Would send to: %s", to_email)
        logger.info("Subject: Welcome to GimmeDat!")
        logger.info("Plain text:\n%s", text)
        return

    success = await email_service.send_email(
        to_email=to_email,
        subject="Welcome to GimmeDat!",
        html_content=html,
        text_content=text,
    )

    if success:
        logger.info("Sent successfully to %s", to_email)
    else:
        logger.error("FAILED to send to %s", to_email)

    await email_service.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send test welcome email")
    parser.add_argument("--to", type=str, required=True, help="Recipient email")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    args = parser.parse_args()
    asyncio.run(main(to_email=args.to, dry_run=args.dry_run))
