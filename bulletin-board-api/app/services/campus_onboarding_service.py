"""Automated campus onboarding and expansion service.

Provides self-service campus provisioning, AI-generated content,
category customization, and cross-campus analytics comparison.
"""

import json
import logging
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.campus import Campus
from app.models.listing import Category, Listing
from app.models.message import MessageThread
from app.models.user import User
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

# Default categories provisioned for every new campus
DEFAULT_SERVICE_CATEGORIES = [
    {"name": "Tutoring", "slug": "tutoring", "sort_order": 1},
    {"name": "Hair & Beauty", "slug": "hair-beauty", "sort_order": 2},
    {"name": "Photography", "slug": "photography", "sort_order": 3},
    {"name": "Music Lessons", "slug": "music-lessons", "sort_order": 4},
    {"name": "Fitness Training", "slug": "fitness", "sort_order": 5},
    {"name": "Tech Help", "slug": "tech-help", "sort_order": 6},
    {
        "name": "Other Services",
        "slug": "other-services",
        "sort_order": 99,
    },
]

DEFAULT_ITEM_CATEGORIES = [
    {"name": "Textbooks", "slug": "textbooks", "sort_order": 1},
    {"name": "Electronics", "slug": "electronics", "sort_order": 2},
    {"name": "Furniture", "slug": "furniture", "sort_order": 3},
    {"name": "Clothing", "slug": "clothing", "sort_order": 4},
    {"name": "Tickets", "slug": "tickets", "sort_order": 5},
    {"name": "Other Items", "slug": "other-items", "sort_order": 99},
]


class CampusOnboardingService:
    """Handles automated campus provisioning and expansion."""

    def __init__(self, ai_service: AIService, settings: Settings):
        self.ai = ai_service
        self.settings = settings

    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate a URL-safe slug from a campus name."""
        slug = name.lower().strip()
        slug = re.sub(r"[^a-z0-9\s-]", "", slug)
        slug = re.sub(r"[\s-]+", "-", slug)
        return slug.strip("-")

    async def onboard_campus(
        self,
        db: AsyncSession,
        *,
        name: str,
        domain: str,
        allow_non_edu: bool = False,
        custom_categories: list[dict] | None = None,
        settings_overrides: dict | None = None,
    ) -> dict:
        """Provision a new campus with categories, settings, and content.

        Returns a dict with the created campus info and provisioning details.
        """
        slug = self.generate_slug(name)

        # Check for duplicate domain or slug
        existing = await db.scalar(
            select(Campus).where(
                (Campus.domain == domain) | (Campus.slug == slug)
            )
        )
        if existing:
            raise ValueError(
                f"Campus with domain '{domain}' or "
                f"slug '{slug}' already exists"
            )

        # Build campus settings
        campus_settings = {
            "onboarded_via": "ai-agent",
            "max_listings_per_user": 20,
            "listing_expiry_days": 30,
        }
        if settings_overrides:
            campus_settings.update(settings_overrides)

        # Create the campus
        campus = Campus(
            id=uuid.uuid4(),
            name=name,
            domain=domain,
            slug=slug,
            settings=campus_settings,
            allow_non_edu=allow_non_edu,
            is_active=True,
        )
        db.add(campus)
        await db.flush()

        # Provision categories
        categories_created = await self._provision_categories(
            db, campus.id, custom_categories
        )

        # Generate landing page content
        landing_content = await self._generate_landing_content(name)

        logger.info(
            "[ONBOARD] Campus '%s' provisioned: %d categories",
            name,
            categories_created,
        )

        return {
            "campus": {
                "id": str(campus.id),
                "name": campus.name,
                "slug": campus.slug,
                "domain": campus.domain,
                "allow_non_edu": campus.allow_non_edu,
                "settings": campus.settings,
            },
            "categories_created": categories_created,
            "landing_content": landing_content,
        }

    async def _provision_categories(
        self,
        db: AsyncSession,
        campus_id: uuid.UUID,
        custom_categories: list[dict] | None = None,
    ) -> int:
        """Create default and custom categories for a campus."""
        count = 0

        # Default service categories
        for cat_data in DEFAULT_SERVICE_CATEGORIES:
            cat = Category(
                id=uuid.uuid4(),
                name=cat_data["name"],
                slug=cat_data["slug"],
                listing_type="service",
                sort_order=cat_data["sort_order"],
                is_active=True,
            )
            db.add(cat)
            count += 1

        # Default item categories
        for cat_data in DEFAULT_ITEM_CATEGORIES:
            cat = Category(
                id=uuid.uuid4(),
                name=cat_data["name"],
                slug=cat_data["slug"],
                listing_type="item",
                sort_order=cat_data["sort_order"],
                is_active=True,
            )
            db.add(cat)
            count += 1

        # Custom categories
        if custom_categories:
            for cc in custom_categories:
                cat = Category(
                    id=uuid.uuid4(),
                    name=cc["name"],
                    slug=self.generate_slug(cc["name"]),
                    listing_type=cc.get("type", "service"),
                    sort_order=cc.get("sort_order", 50),
                    is_active=True,
                )
                db.add(cat)
                count += 1

        await db.flush()
        return count

    async def _generate_landing_content(
        self, campus_name: str
    ) -> dict:
        """Generate landing page content for a new campus.

        Returns a dict with headline, subheadline, description,
        and feature highlights. Falls back to templates if AI
        is unavailable.
        """
        if not self.ai.enabled:
            return self._fallback_landing_content(campus_name)

        prompt = (
            f"Generate landing page content for a campus "
            f"marketplace called GimmeDat at {campus_name}. "
            f"Return JSON with these keys:\n"
            f'  "headline": catchy 6-8 word headline,\n'
            f'  "subheadline": 15-20 word subheadline,\n'
            f'  "description": 2-3 sentence platform description,\n'
            f'  "features": list of 3 feature objects with '
            f'"title" and "description" keys,\n'
            f'  "seo_title": SEO page title (under 60 chars),\n'
            f'  "seo_description": SEO meta description '
            f"(under 160 chars)"
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt,
                system=(
                    "You generate marketing content for a "
                    "college campus marketplace platform."
                ),
                max_tokens=512,
            )
            content = json.loads(response.content)
            # Validate expected keys
            required = [
                "headline",
                "subheadline",
                "description",
                "features",
            ]
            if all(k in content for k in required):
                return content
        except Exception as e:
            logger.warning(
                "[ONBOARD] AI content generation failed: %s", e
            )

        return self._fallback_landing_content(campus_name)

    @staticmethod
    def _fallback_landing_content(campus_name: str) -> dict:
        """Template-based landing content when AI is unavailable."""
        return {
            "headline": f"Your {campus_name} Marketplace",
            "subheadline": (
                f"Buy, sell, and discover services from "
                f"fellow {campus_name} students"
            ),
            "description": (
                f"GimmeDat connects {campus_name} students "
                f"for tutoring, services, and item sales. "
                f"Find what you need from people you trust."
            ),
            "features": [
                {
                    "title": "Campus Services",
                    "description": (
                        "Find tutoring, photography, "
                        "hair styling, and more from "
                        "fellow students."
                    ),
                },
                {
                    "title": "Buy & Sell Items",
                    "description": (
                        "Textbooks, electronics, "
                        "furniture — trade with "
                        "students on your campus."
                    ),
                },
                {
                    "title": "Safe & Verified",
                    "description": (
                        "Only verified campus emails "
                        "can join. Your marketplace, "
                        "your community."
                    ),
                },
            ],
            "seo_title": (
                f"GimmeDat {campus_name} — Campus Marketplace"
            ),
            "seo_description": (
                f"Buy, sell, and find services at "
                f"{campus_name}. Tutoring, textbooks, "
                f"electronics, and more from verified "
                f"students."
            ),
        }

    async def get_cross_campus_analytics(
        self, db: AsyncSession
    ) -> list[dict]:
        """Compare key metrics across all active campuses."""
        campuses = (
            await db.execute(
                select(Campus).where(
                    Campus.is_active.is_(True)
                ).order_by(Campus.name)
            )
        ).scalars().all()

        results = []
        for campus in campuses:
            user_count = (
                await db.scalar(
                    select(func.count(User.id)).where(
                        User.campus_id == campus.id
                    )
                )
            ) or 0

            listing_count = (
                await db.scalar(
                    select(func.count(Listing.id)).where(
                        Listing.campus_id == campus.id
                    )
                )
            ) or 0

            active_listings = (
                await db.scalar(
                    select(func.count(Listing.id)).where(
                        Listing.campus_id == campus.id,
                        Listing.status == "active",
                    )
                )
            ) or 0

            thread_count = (
                await db.scalar(
                    select(func.count(MessageThread.id)).where(
                        MessageThread.initiator_id.in_(
                            select(User.id).where(
                                User.campus_id == campus.id
                            )
                        )
                    )
                )
            ) or 0

            engagement = (
                round(thread_count / user_count, 2)
                if user_count > 0
                else 0.0
            )

            results.append(
                {
                    "campus_id": str(campus.id),
                    "campus_name": campus.name,
                    "campus_slug": campus.slug,
                    "users": user_count,
                    "total_listings": listing_count,
                    "active_listings": active_listings,
                    "message_threads": thread_count,
                    "engagement_rate": engagement,
                }
            )

        return results
