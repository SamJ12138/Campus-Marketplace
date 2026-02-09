from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_user
from app.core.rate_limit import check_listing_rate_limit
from app.dependencies import get_db, get_redis
from app.models.listing import Category, Listing, ListingStatus
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.listing import (
    ListingCreate,
    ListingListResponse,
    ListingResponse,
    ListingType,
    ListingUpdate,
)
from app.services.listing_service import ListingService
from app.services.moderation_service import ModerationService

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=ListingListResponse)
async def list_listings(
    type: ListingType | None = None,
    category: str | None = Query(None, description="Category slug"),
    q: str | None = Query(None, min_length=2, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    sort: str = Query("newest", pattern="^(newest|oldest|popular)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Browse listings. Campus-scoped to authenticated user's campus."""
    if not current_user:
        return ListingListResponse(
            items=[],
            pagination=PaginationMeta(
                page=1,
                per_page=per_page,
                total_items=0,
                total_pages=0,
                has_next=False,
                has_prev=False,
            ),
        )

    service = ListingService(db)
    items, total = await service.search_listings(
        campus_id=current_user.campus_id,
        type=type,
        category_slug=category,
        query=q,
        page=page,
        per_page=per_page,
        sort=sort,
        viewer_id=current_user.id,
    )

    return ListingListResponse(
        items=items,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total,
            total_pages=-(-total // per_page),
            has_next=page * per_page < total,
            has_prev=page > 1,
        ),
    )


@router.post("", response_model=ListingResponse, status_code=201)
async def create_listing(
    data: ListingCreate,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new listing."""
    # Rate limit
    await check_listing_rate_limit(redis, current_user)

    # Content moderation
    moderation = ModerationService(db)
    filter_result = await moderation.check_content(
        f"{data.title} {data.description}",
        current_user.campus_id,
    )
    if filter_result.blocked:
        raise HTTPException(400, "Content contains prohibited terms")

    # Validate category exists and matches type
    category = await db.get(Category, data.category_id)
    if not category or category.listing_type != data.type.value:
        raise HTTPException(400, "Invalid category for listing type")

    service = ListingService(db)
    listing = await service.create_listing(
        user_id=current_user.id,
        campus_id=current_user.campus_id,
        data=data,
        flagged=filter_result.flagged,
    )

    return listing


@router.get("/{listing_id}", response_model=ListingResponse)
async def get_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Get listing details. Campus-scoped when authenticated."""
    service = ListingService(db)
    listing = await service.get_listing(
        listing_id=listing_id,
        viewer_id=current_user.id if current_user else None,
        increment_views=True,
        campus_id=current_user.campus_id if current_user else None,
    )
    if not listing:
        raise HTTPException(404, "Listing not found")
    return listing


@router.patch("/{listing_id}", response_model=ListingResponse)
async def update_listing(
    listing_id: UUID,
    data: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update own listing."""
    service = ListingService(db)
    listing = await service.update_listing(listing_id, current_user.id, data)
    if not listing:
        raise HTTPException(404, "Listing not found or not owned by you")
    return listing


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete own listing."""
    service = ListingService(db)
    success = await service.delete_listing(listing_id, current_user.id)
    if not success:
        raise HTTPException(404, "Listing not found or not owned by you")


@router.post("/{listing_id}/renew", response_model=ListingResponse)
async def renew_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Renew listing for another 30 days."""
    service = ListingService(db)
    listing = await service.renew_listing(listing_id, current_user.id)
    if not listing:
        raise HTTPException(404, "Listing not found or not owned by you")
    return listing


@router.post("/{listing_id}/mark-sold", response_model=ListingResponse)
async def mark_listing_sold(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark item listing as sold."""
    service = ListingService(db)
    listing = await service.mark_sold(listing_id, current_user.id)
    if not listing:
        raise HTTPException(404, "Listing not found or not owned by you")
    return listing
