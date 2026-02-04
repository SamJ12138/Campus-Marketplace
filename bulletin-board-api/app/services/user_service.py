from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserStatus


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.scalar(
            select(User).where(User.email == email.lower())
        )
        return result

    async def get_active_user(self, user_id: UUID) -> User | None:
        user = await self.db.get(User, user_id)
        if user and user.status == UserStatus.ACTIVE:
            return user
        return None
