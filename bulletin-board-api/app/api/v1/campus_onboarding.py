"""Campus onboarding and cross-campus analytics API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.config import get_settings
from app.dependencies import get_db
from app.models.user import User
from app.services.ai_service import AIService
from app.services.campus_onboarding_service import (
    CampusOnboardingService,
)

router = APIRouter(
    prefix="/admin/campuses", tags=["admin-campuses"]
)


def _get_service() -> CampusOnboardingService:
    settings = get_settings()
    ai_service = AIService(settings)
    return CampusOnboardingService(ai_service, settings)


# ── Schemas ──────────────────────────────────────────────


class CustomCategory(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(
        default="service", pattern=r"^(service|item)$"
    )
    sort_order: int = Field(default=50, ge=1, le=100)


class OnboardCampusRequest(BaseModel):
    name: str = Field(
        ..., min_length=2, max_length=255,
        description="Campus display name",
    )
    domain: str = Field(
        ..., min_length=3, max_length=255,
        description="Campus email domain (e.g. 'harvard.edu')",
    )
    allow_non_edu: bool = Field(
        default=False,
        description="Allow non-.edu email registration",
    )
    custom_categories: list[CustomCategory] | None = Field(
        default=None,
        description="Additional categories beyond defaults",
    )
    settings: dict | None = Field(
        default=None,
        description="Campus settings overrides",
    )


class OnboardCampusResponse(BaseModel):
    campus: dict
    categories_created: int
    landing_content: dict


class CampusAnalyticsItem(BaseModel):
    campus_id: str
    campus_name: str
    campus_slug: str
    users: int
    total_listings: int
    active_listings: int
    message_threads: int
    engagement_rate: float


# ── Endpoints ────────────────────────────────────────────


@router.post("/onboard", response_model=OnboardCampusResponse)
async def onboard_campus(
    body: OnboardCampusRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Provision a new campus with categories and generated content.

    Admin-only. Creates the campus record, default + custom
    categories, and AI-generated landing page content.
    """
    service = _get_service()

    custom = None
    if body.custom_categories:
        custom = [c.model_dump() for c in body.custom_categories]

    try:
        result = await service.onboard_campus(
            db,
            name=body.name,
            domain=body.domain,
            allow_non_edu=body.allow_non_edu,
            custom_categories=custom,
            settings_overrides=body.settings,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get(
    "/analytics",
    response_model=list[CampusAnalyticsItem],
)
async def cross_campus_analytics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Compare metrics across all active campuses.

    Admin-only. Returns user counts, listing counts,
    message activity, and engagement rates per campus.
    """
    service = _get_service()
    return await service.get_cross_campus_analytics(db)
