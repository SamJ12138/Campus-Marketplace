from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user
from app.dependencies import get_db
from app.models.favorite import Favorite
from app.models.listing import Listing
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.listing import ListingListResponse
from app.services.listing_service import ListingService

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=ListingListResponse)
async def list_favorites(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List user's favorited listings."""
    from sqlalchemy import func

    total = await db.scalar(
        select(func.count())
        .select_from(Favorite)
        .join(Listing, Favorite.listing_id == Listing.id)
        .where(Favorite.user_id == current_user.id, Listing.campus_id == current_user.campus_id)
    )
    total = total or 0

    result = await db.execute(
        select(Listing)
        .join(Favorite, Favorite.listing_id == Listing.id)
        .options(
            selectinload(Listing.user),
            selectinload(Listing.category),
            selectinload(Listing.photos),
        )
        .where(Favorite.user_id == current_user.id, Listing.campus_id == current_user.campus_id)
        .order_by(Favorite.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    listings = list(result.scalars().all())

    service = ListingService(db)
    items = [
        service._to_response(listing, current_user.id, {listing.id})
        for listing in listings
    ]

    return ListingListResponse(
        items=items,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total,
            total_pages=-(-total // per_page) if total > 0 else 0,
            has_next=page * per_page < total,
            has_prev=page > 1,
        ),
    )


@router.post("/{listing_id}", status_code=201)
async def add_favorite(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a listing to favorites."""
    listing = await db.get(Listing, listing_id)
    if not listing or listing.campus_id != current_user.campus_id:
        raise HTTPException(404, "Listing not found")

    existing = await db.scalar(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.listing_id == listing_id,
        )
    )
    if existing:
        raise HTTPException(400, "Already favorited")

    favorite = Favorite(user_id=current_user.id, listing_id=listing_id)
    db.add(favorite)
    await db.commit()

    return {"message": "Added to favorites"}


@router.delete("/{listing_id}", status_code=204)
async def remove_favorite(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove a listing from favorites."""
    result = await db.execute(
        delete(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.listing_id == listing_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(404, "Favorite not found")
    await db.commit()
