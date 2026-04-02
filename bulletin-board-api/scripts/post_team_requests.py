#!/usr/bin/env python
"""One-time script: post 3 service request listings for GimmeDat team hiring.

Creates seeking-mode listings for the 3 intern positions on the Join the Team page,
posted by the Gimmedat Team account. Each listing gets an Unsplash photo.

Usage:
    python -m scripts.post_team_requests --dry-run   # preview only
    python -m scripts.post_team_requests              # create listings
"""
import argparse
import asyncio
import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.listing import (
    Listing,
    ListingMode,
    ListingPhoto,
    ListingStatus,
    ListingType,
    LocationType,
    ContactPreference,
)
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

USER_ID = uuid.UUID("4c3dc4e0-96c0-4788-975a-36424dd473ab")
CAMPUS_ID = uuid.UUID("d60eaf0a-a52f-4820-b5d4-b4de83f72204")
CATEGORY_ID = uuid.UUID("0d5e87b6-3dd4-49f7-825c-998db48e3aa3")  # Other Services

LISTINGS = [
    {
        "title": "Looking For: Sales/Outreach Intern to Grow GimmeDat",
        "description": (
            "The GimmeDat team is looking for a Business Development intern to help us grow on campus. "
            "This is a great opportunity to get hands-on experience in sales, outreach, and startup growth.\n\n"
            "What you would do:\n"
            "- Identify and build partnerships with student organizations, clubs, and campus groups\n"
            "- Reach out to local businesses near campus for cross-promotions\n"
            "- Help plan and execute campus launch strategies to bring more students onto the platform\n"
            "- Track outreach metrics and report on growth KPIs\n"
            "- Represent GimmeDat at campus events and fairs\n\n"
            "Who we are looking for:\n"
            "- Strong communication and interpersonal skills\n"
            "- Experience in sales, fundraising, or student org leadership is a plus\n"
            "- Self-motivated and comfortable with cold outreach\n"
            "- You know your campus community and its organizations\n\n"
            "This is an unpaid internship with flexible hours. You will gain real startup experience, "
            "a title for your resume, and a direct impact on a product used by your classmates.\n\n"
            "Interested? Tap \"I Can Help\" to message us!"
        ),
        "photo_url": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
        "photo_alt": "Business handshake in professional setting",
    },
    {
        "title": "Looking For: Social Media Intern (Instagram + LinkedIn)",
        "description": (
            "The GimmeDat team needs a Social Media Specialist to own our presence on Instagram and LinkedIn. "
            "If you love creating content and know what gets engagement, this role is for you.\n\n"
            "What you would do:\n"
            "- Create and schedule Instagram posts, Stories, and Reels that resonate with college students\n"
            "- Manage our LinkedIn content strategy to build brand credibility\n"
            "- Engage with followers and campus-related accounts\n"
            "- Track social media analytics and optimize what works\n"
            "- Collaborate on campaigns tied to campus events and product launches\n\n"
            "Who we are looking for:\n"
            "- Strong personal brand or portfolio on Instagram or LinkedIn\n"
            "- Eye for visual design and awareness of trending content formats\n"
            "- Experience with Canva, CapCut, or similar design and video tools\n"
            "- Understanding of what college students actually engage with on social media\n\n"
            "This is an unpaid internship with flexible hours. You will build a real portfolio, grow a brand "
            "from the ground up, and have creative freedom to experiment.\n\n"
            "Interested? Tap \"I Can Help\" to message us!"
        ),
        "photo_url": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
        "photo_alt": "Phone showing social media content creation",
    },
    {
        "title": "Looking For: Marketing/Communications Intern",
        "description": (
            "The GimmeDat team is looking for a versatile Marketing and Communications intern. "
            "This is a broad role perfect for someone who wants wide-ranging marketing experience at a real startup.\n\n"
            "What you would do:\n"
            "- Help plan and execute campus marketing campaigns\n"
            "- Create flyers, email copy, and promotional materials\n"
            "- Coordinate with student ambassadors and organizations\n"
            "- Brainstorm creative ideas for user acquisition and engagement\n"
            "- Provide feedback on the product and user experience from a student perspective\n\n"
            "Who we are looking for:\n"
            "- Creative thinker with strong writing skills\n"
            "- Interest in marketing, branding, or communications\n"
            "- Organized and able to manage multiple small projects at once\n"
            "- Enthusiastic about the GimmeDat mission of connecting students\n\n"
            "This is an unpaid internship with flexible hours. You will touch every part of marketing, "
            "work directly with the founding team, and see your ideas go live on a real product.\n\n"
            "Interested? Tap \"I Can Help\" to message us!"
        ),
        "photo_url": "https://images.unsplash.com/photo-1531498860502-7c67cf02f657?w=800&h=600&fit=crop",
        "photo_alt": "Creative workspace with sticky notes and brainstorming",
    },
]


async def main(dry_run: bool = False):
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    if dry_run:
        for i, data in enumerate(LISTINGS, 1):
            logger.info("[DRY RUN] Listing %d: %s", i, data["title"])
            logger.info("  Description: %s...", data["description"][:80])
            logger.info("  Photo: %s", data["photo_url"])
        logger.info("Dry run complete. No listings created.")
        await engine.dispose()
        return

    async with async_session() as db:
        created = 0
        for data in LISTINGS:
            listing = Listing(
                id=uuid.uuid4(),
                user_id=USER_ID,
                campus_id=CAMPUS_ID,
                type=ListingType.SERVICE,
                listing_mode=ListingMode.SEEKING,
                category_id=CATEGORY_ID,
                title=data["title"],
                description=data["description"],
                price_hint=None,
                budget_min=None,
                budget_max=None,
                urgency=None,
                location_type=LocationType.REMOTE,
                location_hint=None,
                availability=None,
                contact_preference=ContactPreference.IN_APP,
                contact_details=None,
                is_regulated=False,
                disclaimer_accepted=True,
                status=ListingStatus.ACTIVE,
                view_count=0,
                message_count=0,
                response_count=0,
                expires_at=datetime.utcnow() + timedelta(days=settings.listing_expiry_days),
            )
            db.add(listing)
            await db.flush()

            # Update search_vector
            from sqlalchemy import func as sqlfunc
            await db.execute(
                update(Listing)
                .where(Listing.id == listing.id)
                .values(
                    search_vector=sqlfunc.to_tsvector(
                        "english",
                        sqlfunc.coalesce(data["title"], "")
                        + " "
                        + sqlfunc.coalesce(data["description"], ""),
                    )
                )
            )

            # Add photo
            photo = ListingPhoto(
                id=uuid.uuid4(),
                listing_id=listing.id,
                url=data["photo_url"],
                thumbnail_url=data["photo_url"],
                storage_key=f"seed/team-requests/{listing.id}.jpg",
                content_type="image/jpeg",
                file_size=0,
                position=0,
            )
            db.add(photo)

            created += 1
            logger.info("Created: %s (id=%s)", data["title"], listing.id)

        # Increment user listing count
        await db.execute(
            update(User)
            .where(User.id == USER_ID)
            .values(listing_count=User.listing_count + len(LISTINGS))
        )

        await db.commit()
        logger.info("Done. Created %d listings.", created)

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Post team hiring request listings")
    parser.add_argument("--dry-run", action="store_true", help="Preview without creating")
    args = parser.parse_args()
    asyncio.run(main(dry_run=args.dry_run))
