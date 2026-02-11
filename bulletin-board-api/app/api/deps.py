from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.dependencies import get_db
from app.models.user import User, UserRole, UserStatus

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Returns user or None if not authenticated."""
    if not credentials:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    user = await db.get(User, UUID(user_id))
    if not user or user.status != UserStatus.ACTIVE:
        return None

    return user


async def get_current_active_user(
    user: User | None = Depends(get_current_user),
) -> User:
    """Requires authenticated active user."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_moderator(
    user: User = Depends(get_current_active_user),
) -> User:
    if user.role not in (UserRole.MODERATOR, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Moderator access required")
    return user


async def require_admin(
    user: User = Depends(get_current_active_user),
) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
