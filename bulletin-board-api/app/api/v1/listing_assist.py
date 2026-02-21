"""AI-assisted listing creation endpoints.

Provides suggestion endpoints for title, description, price, category,
and listing completeness scoring to help users create better listings.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.models.user import User
from app.services.ai_service import AIService
from app.services.listing_optimizer_service import ListingOptimizerService

router = APIRouter(prefix="/listing-assist", tags=["listing-assist"])


# ---- Request schemas ----


class SuggestDescriptionRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    listing_type: str = Field("item", pattern="^(item|service)$")
    keywords: list[str] | None = Field(None, max_length=10)
    category: str | None = None


class SuggestTitleRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=5000)
    listing_type: str = Field("item", pattern="^(item|service)$")
    category: str | None = None


class SuggestPriceRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=5000)
    listing_type: str = Field("item", pattern="^(item|service)$")
    category: str | None = None


class SuggestCategoryRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10, max_length=5000)
    listing_type: str = Field("item", pattern="^(item|service)$")


class CompletenessRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    price_hint: str | None = None
    category_id: str | None = None
    photos_count: int = Field(0, ge=0)
    location_type: str | None = None
    location_hint: str | None = None
    availability: dict | None = None


# ---- Response schemas ----


class SuggestDescriptionResponse(BaseModel):
    description: str
    tips: list[str]


class SuggestTitleResponse(BaseModel):
    titles: list[str]
    reasoning: str


class SuggestPriceResponse(BaseModel):
    price_hint: str
    reasoning: str
    price_range: dict


class SuggestCategoryResponse(BaseModel):
    category_slug: str | None
    category_name: str | None
    confidence: float
    reasoning: str


class CompletenessBreakdown(BaseModel):
    title: int = 0
    description: int = 0
    price_hint: int = 0
    category_id: int = 0
    photos: int = 0
    location_type: int = 0
    location_hint: int = 0
    availability: int = 0


class CompletenessResponse(BaseModel):
    score: int
    max_score: int
    percentage: int
    breakdown: CompletenessBreakdown
    suggestions: list[str]


# ---- Endpoints ----


def _get_optimizer() -> ListingOptimizerService:
    settings = get_settings()
    ai_service = AIService(settings)
    return ListingOptimizerService(ai_service)


@router.post("/suggest-description", response_model=SuggestDescriptionResponse)
async def suggest_description(
    data: SuggestDescriptionRequest,
    _current_user: User = Depends(get_current_active_user),
):
    """AI-generate a listing description from title and keywords."""
    optimizer = _get_optimizer()
    result = await optimizer.suggest_description(
        title=data.title,
        listing_type=data.listing_type,
        keywords=data.keywords,
        category=data.category,
    )
    return SuggestDescriptionResponse(**result)


@router.post("/suggest-title", response_model=SuggestTitleResponse)
async def suggest_title(
    data: SuggestTitleRequest,
    _current_user: User = Depends(get_current_active_user),
):
    """AI-suggest listing titles from a description."""
    optimizer = _get_optimizer()
    result = await optimizer.suggest_title(
        description=data.description,
        listing_type=data.listing_type,
        category=data.category,
    )
    return SuggestTitleResponse(**result)


@router.post("/suggest-price", response_model=SuggestPriceResponse)
async def suggest_price(
    data: SuggestPriceRequest,
    _current_user: User = Depends(get_current_active_user),
):
    """AI-suggest a price for a listing."""
    optimizer = _get_optimizer()
    result = await optimizer.suggest_price(
        title=data.title,
        description=data.description,
        listing_type=data.listing_type,
        category=data.category,
    )
    return SuggestPriceResponse(**result)


@router.post("/suggest-category", response_model=SuggestCategoryResponse)
async def suggest_category(
    data: SuggestCategoryRequest,
    _current_user: User = Depends(get_current_active_user),
):
    """AI-detect the best category for a listing."""
    optimizer = _get_optimizer()
    result = await optimizer.suggest_category(
        title=data.title,
        description=data.description,
        listing_type=data.listing_type,
    )
    return SuggestCategoryResponse(**result)


@router.post("/completeness", response_model=CompletenessResponse)
async def score_completeness(
    data: CompletenessRequest,
    _current_user: User = Depends(get_current_active_user),
):
    """Score listing completeness and get improvement suggestions."""
    optimizer = _get_optimizer()
    result = optimizer.score_completeness(
        title=data.title,
        description=data.description,
        price_hint=data.price_hint,
        category_id=data.category_id,
        photos_count=data.photos_count,
        location_type=data.location_type,
        location_hint=data.location_hint,
        availability=data.availability,
    )
    return CompletenessResponse(**result)
