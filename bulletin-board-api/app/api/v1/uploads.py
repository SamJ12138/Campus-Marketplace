import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.dependencies import get_db, get_redis
from app.models.listing import Listing, ListingPhoto
from app.models.user import User
from app.services.storage_service import StorageService

router = APIRouter(prefix="/uploads", tags=["uploads"])


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
    redis: Redis = Depends(get_redis),
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

    upload_id = uuid4()
    await redis.setex(
        f"pending_upload:{upload_id}",
        600,
        json.dumps(
            {
                "user_id": str(current_user.id),
                "purpose": data.purpose,
                "storage_key": result["storage_key"],
                "listing_id": str(data.listing_id) if data.listing_id else None,
            }
        ),
    )

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
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Confirm upload completed, validate and move file."""
    pending_raw = await redis.get(f"pending_upload:{upload_id}")
    if not pending_raw:
        raise HTTPException(404, "Upload not found or expired")

    pending = json.loads(pending_raw)
    if pending["user_id"] != str(current_user.id):
        raise HTTPException(403, "Not your upload")

    settings = get_settings()
    storage = StorageService(settings)

    try:
        if pending["purpose"] == "listing_photo":
            result = await storage.validate_and_move_upload(
                pending["storage_key"],
                "photos",
            )

            photo = ListingPhoto(
                listing_id=UUID(pending["listing_id"]),
                url=result["url"],
                storage_key=result["storage_key"],
                content_type=result["content_type"],
                file_size=result["file_size"],
                position=data.position,
            )
            db.add(photo)
            await db.commit()

            return {"photo_id": str(photo.id), "url": result["url"]}

        elif pending["purpose"] == "avatar":
            result = await storage.validate_and_move_upload(
                pending["storage_key"],
                "avatars",
            )

            current_user.avatar_url = result["url"]
            await db.commit()

            return {"avatar_url": result["url"]}

    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        await redis.delete(f"pending_upload:{upload_id}")
