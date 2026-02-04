#!/usr/bin/env python
"""Create an admin user."""
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.core.security import hash_password
from app.models.campus import Campus
from app.models.user import User, UserRole, UserStatus

settings = get_settings()


async def create_admin(email: str, password: str, campus_slug: str):
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        campus = await db.scalar(select(Campus).where(Campus.slug == campus_slug))
        if not campus:
            print(f"Campus '{campus_slug}' not found")
            await engine.dispose()
            return

        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            print(f"User with email '{email}' already exists")
            await engine.dispose()
            return

        admin = User(
            email=email,
            password_hash=hash_password(password),
            display_name="Admin",
            campus_id=campus.id,
            email_verified=True,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        await db.commit()

        print(f"Admin user created: {email}")

    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_admin.py <email> <password> <campus_slug>")
        sys.exit(1)

    asyncio.run(create_admin(sys.argv[1], sys.argv[2], sys.argv[3]))
