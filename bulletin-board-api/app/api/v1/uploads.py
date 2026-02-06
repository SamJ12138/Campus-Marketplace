from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.dependencies import get_db
from app.models.listing import Listing, ListingPhoto
from app.models.pending_upload import PendingUpload
from app.models.user import User
from app.services.storage_service import StorageService

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Upload expires after 10 minutes
UPLOAD_EXPIRY_MINUTES = 10


class PresignedUploadRequest(BaseModel):
    purpose: str = Field(..., pattern="^(listing_photo|avatar)$")
    content_type: str
    file_size: int = Field(..., gt=0)
    listing_id: UUID | None = None


class PresignedUploadResponse(BaseModel):
    upload_url: str
    upload_id: UUID
    storage_key: str
    expires_in: int


class ConfirmUploadRequest(BaseModel):
    position: int = Field(0, ge=0, le=5)


@router.post("/presigned", response_model=PresignedUploadResponse)
async def get_presigned_upload_url(
    data: PresignedUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get presigned URL for direct upload to S3."""
    settings = get_settings()
    storage = StorageService(settings)

    if data.purpose == "listing_photo":
        if not data.listing_id:
            raise HTTPException(400, "listing_id required for photo upload")
        listing = await db.get(Listing, data.listing_id)
        if not listing or listing.user_id != current_user.id:
            raise HTTPException(404, "Listing not found")

        from sqlalchemy import func
        photo_count = await db.scalar(
            select(func.count()).where(ListingPhoto.listing_id == data.listing_id)
        )
        if photo_count >= settings.max_photos_per_listing:
            raise HTTPException(400, "Maximum photos reached")

    try:
        result = await storage.create_presigned_upload(
            user_id=current_user.id,
            purpose=data.purpose,
            content_type=data.content_type,
            file_size=data.file_size,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Clean up expired pending uploads for this user
    await db.execute(
        delete(PendingUpload).where(
            PendingUpload.user_id == current_user.id,
            PendingUpload.expires_at < datetime.now(timezone.utc),
        )
    )

    # Store pending upload in database instead of Redis
    upload_id = uuid4()
    pending = PendingUpload(
        id=upload_id,
        user_id=current_user.id,
        purpose=data.purpose,
        storage_key=result["storage_key"],
        listing_id=data.listing_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=UPLOAD_EXPIRY_MINUTES),
    )
    db.add(pending)
    await db.commit()

    return PresignedUploadResponse(
        upload_url=result["upload_url"],
        upload_id=upload_id,
        storage_key=result["storage_key"],
        expires_in=result["expires_in"],
    )


@router.post("/confirm/{upload_id}")
async def confirm_upload(
    upload_id: UUID,
    data: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Confirm upload completed, validate and move file."""
    # Look up pending upload from database
    pending = await db.get(PendingUpload, upload_id)

    if not pending:
        raise HTTPException(404, "Upload not found or expired")

    if pending.expires_at < datetime.now(timezone.utc):
        await db.delete(pending)
        await db.commit()
        raise HTTPException(404, "Upload not found or expired")

    if pending.user_id != current_user.id:
        raise HTTPException(403, "Not your upload")

    settings = get_settings()
    storage = StorageService(settings)

    try:
        if pending.purpose == "listing_photo":
            result = await storage.validate_and_move_upload(
                pending.storage_key,
                "photos",
            )

            photo = ListingPhoto(
                listing_id=pending.listing_id,
                url=result["url"],
                storage_key=result["storage_key"],
                content_type=result["content_type"],
                file_size=result["file_size"],
                position=data.position,
            )
            db.add(photo)

            # Delete the pending upload record
            await db.delete(pending)
            await db.commit()

            return {"photo_id": str(photo.id), "url": result["url"]}

        elif pending.purpose == "avatar":
            result = await storage.validate_and_move_upload(
                pending.storage_key,
                "avatars",
            )

            current_user.avatar_url = result["url"]

            # Delete the pending upload record
            await db.delete(pending)
            await db.commit()

            return {"avatar_url": result["url"]}

    except ValueError as e:
        raise HTTPException(400, str(e))
