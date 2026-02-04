#!/usr/bin/env python
"""Seed database with initial data."""
import asyncio
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.campus import Campus
from app.models.listing import Category

settings = get_settings()

CATEGORIES = [
    # Services
    {"name": "Tutoring", "slug": "tutoring", "listing_type": "service", "sort_order": 1},
    {
        "name": "Hair & Beauty",
        "slug": "hair-beauty",
        "listing_type": "service",
        "sort_order": 2,
        "requires_regulated_flag": True,
    },
    {"name": "Photography", "slug": "photography", "listing_type": "service", "sort_order": 3},
    {"name": "Music Lessons", "slug": "music-lessons", "listing_type": "service", "sort_order": 4},
    {"name": "Fitness Training", "slug": "fitness", "listing_type": "service", "sort_order": 5},
    {"name": "Tech Help", "slug": "tech-help", "listing_type": "service", "sort_order": 6},
    {
        "name": "Other Services",
        "slug": "other-services",
        "listing_type": "service",
        "sort_order": 99,
    },
    # Items
    {"name": "Textbooks", "slug": "textbooks", "listing_type": "item", "sort_order": 1},
    {"name": "Electronics", "slug": "electronics", "listing_type": "item", "sort_order": 2},
    {"name": "Furniture", "slug": "furniture", "listing_type": "item", "sort_order": 3},
    {"name": "Clothing", "slug": "clothing", "listing_type": "item", "sort_order": 4},
    {"name": "Tickets", "slug": "tickets", "listing_type": "item", "sort_order": 5},
    {"name": "Other Items", "slug": "other-items", "listing_type": "item", "sort_order": 99},
]


async def seed():
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Create campuses
        campus = Campus(
            name="Demo University",
            domain="demo.edu",
            slug="demo-university",
            allow_non_edu=True,
        )
        db.add(campus)

        gettysburg = Campus(
            name="Gettysburg College",
            domain="gettysburg.edu",
            slug="gettysburg-college",
        )
        db.add(gettysburg)

        # Create categories
        for cat_data in CATEGORIES:
            cat = Category(id=uuid4(), **cat_data)
            db.add(cat)

        await db.commit()
        print("Seed data created successfully")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
