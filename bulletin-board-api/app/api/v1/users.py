from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.security import hash_password, verify_password
from app.dependencies import get_db
from app.models.notification import NotificationPreference
from app.models.user import User, UserStatus
from app.schemas.user import (
    ChangePasswordRequest,
    NotificationPreferencesResponse,
    UpdateNotificationPreferencesRequest,
    UpdateProfileRequest,
    UserMeResponse,
    UserProfileResponse,
)
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user profile."""
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        class_year=current_user.class_year,
        bio=current_user.bio,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
        campus_slug=current_user.campus.slug if current_user.campus else None,
        campus_name=current_user.campus.name if current_user.campus else None,
        email_verified=current_user.email_verified,
        listing_count=current_user.listing_count,
        created_at=current_user.created_at,
    )


@router.patch("/me", response_model=UserMeResponse)
async def update_profile(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update current user profile."""
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.bio is not None:
        current_user.bio = data.bio
    if data.class_year is not None:
        current_user.class_year = data.class_year
    if data.phone_number is not None:
        current_user.phone_number = data.phone_number

    await db.commit()
    await db.refresh(current_user)

    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        class_year=current_user.class_year,
        bio=current_user.bio,
        phone_number=current_user.phone_number,
        role=current_user.role.value,
        campus_slug=current_user.campus.slug if current_user.campus else None,
        campus_name=current_user.campus.name if current_user.campus else None,
        email_verified=current_user.email_verified,
        listing_count=current_user.listing_count,
        created_at=current_user.created_at,
    )


@router.post("/me/change-password", status_code=204)
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Change current user password."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()


@router.get("/me/notifications", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's notification preferences."""
    prefs = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    if not prefs:
        # Create default preferences if they don't exist
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return prefs


@router.patch("/me/notifications", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    data: UpdateNotificationPreferencesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update current user's notification preferences."""
    prefs = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == current_user.id
        )
    )
    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)

    if data.email_messages is not None:
        prefs.email_messages = data.email_messages
    if data.email_listing_replies is not None:
        prefs.email_listing_replies = data.email_listing_replies
    if data.email_report_updates is not None:
        prefs.email_report_updates = data.email_report_updates
    if data.email_marketing is not None:
        prefs.email_marketing = data.email_marketing

    await db.commit()
    await db.refresh(prefs)
    return prefs


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get user profile. Campus-scoped — requires authentication."""
    user = await db.get(User, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(404, "User not found")

    if user.campus_id != current_user.campus_id:
        raise HTTPException(404, "User not found")

    return UserProfileResponse(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        class_year=user.class_year,
        bio=user.bio,
        listing_count=user.listing_count,
        created_at=user.created_at,
    )
