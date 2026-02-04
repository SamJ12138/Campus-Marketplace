from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.listing import Category
from app.schemas.listing import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    listing_type: str | None = Query(None, pattern="^(service|item)$"),
    db: AsyncSession = Depends(get_db),
):
    """List all active categories, optionally filtered by listing type."""
    query = select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order)

    if listing_type:
        query = query.where(Category.listing_type == listing_type)

    result = await db.execute(query)
    return list(result.scalars().all())
