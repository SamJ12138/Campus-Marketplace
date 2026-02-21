from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_user
from app.config import get_settings
from app.dependencies import get_db
from app.models.user import User
from app.schemas.listing import ListingResponse
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.listing_service import ListingService

router = APIRouter(prefix="/search", tags=["search"])


class SemanticSearchResponse(BaseModel):
    items: list[dict]
    total: int


class SimilarListingItem(BaseModel):
    listing: ListingResponse
    similarity: float = Field(ge=0.0, le=1.0)


class SimilarListingsResponse(BaseModel):
    items: list[SimilarListingItem]


class RecommendationsResponse(BaseModel):
    items: list[SimilarListingItem]


def _get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    return EmbeddingService(AIService(settings), settings)


@router.get("/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    q: str = Query(..., min_length=2, max_length=200, description="Search query"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Semantic search for listings using vector similarity.

    Returns listings ranked by semantic similarity to the query.
    Falls back to keyword search when embeddings are unavailable.
    """
    embedding_service = _get_embedding_service()
    listing_service = ListingService(db)

    offset = (page - 1) * per_page
    campus_id = current_user.campus_id if current_user else None

    results = await embedding_service.semantic_search(
        db,
        query=q,
        campus_id=campus_id,
        limit=per_page,
        offset=offset,
    )

    if not results:
        # Fall back to standard text search
        items, total = await listing_service.search_listings(
            campus_id=campus_id,
            query=q,
            page=page,
            per_page=per_page,
            viewer_id=current_user.id if current_user else None,
        )
        return SemanticSearchResponse(
            items=[
                {"listing": item.model_dump(mode="json"), "similarity": 0.0}
                for item in items
            ],
            total=total,
        )

    viewer_id = current_user.id if current_user else None
    items = []
    for listing, score in results:
        response = listing_service._to_response(listing, viewer_id, set())
        items.append({
            "listing": response.model_dump(mode="json"),
            "similarity": score,
        })

    return SemanticSearchResponse(items=items, total=len(items))


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get personalized listing recommendations based on user's favorites.

    Computes a centroid vector from the user's favorited listings and
    finds the most similar active listings the user hasn't already seen.
    """
    embedding_service = _get_embedding_service()
    listing_service = ListingService(db)

    results = await embedding_service.get_recommendations(
        db,
        user_id=current_user.id,
        limit=limit,
    )

    items = []
    for listing, score in results:
        response = listing_service._to_response(listing, current_user.id, set())
        items.append(SimilarListingItem(listing=response, similarity=score))

    return RecommendationsResponse(items=items)


@router.get(
    "/listings/{listing_id}/similar",
    response_model=SimilarListingsResponse,
)
async def get_similar_listings(
    listing_id: UUID,
    limit: int = Query(10, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Find listings similar to the given listing.

    Uses vector similarity on the listing's embedding to find the closest
    matches in the same campus.
    """
    embedding_service = _get_embedding_service()
    listing_service = ListingService(db)

    # Verify the listing exists
    listing = await listing_service.get_listing(
        listing_id,
        viewer_id=current_user.id if current_user else None,
        campus_id=current_user.campus_id if current_user else None,
    )
    if not listing:
        raise HTTPException(404, "Listing not found")

    results = await embedding_service.find_similar(
        db,
        listing_id=listing_id,
        limit=limit,
    )

    viewer_id = current_user.id if current_user else None
    items = []
    for similar_listing, score in results:
        response = listing_service._to_response(similar_listing, viewer_id, set())
        items.append(SimilarListingItem(listing=response, similarity=score))

    return SimilarListingsResponse(items=items)
