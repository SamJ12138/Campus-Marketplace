from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin, require_moderator
from app.dependencies import get_db
from app.models.ad import Ad, AdType
from app.models.admin import AdminAction
from app.models.user import User

router = APIRouter(prefix="/ads", tags=["ads"])


# ============ PUBLIC ENDPOINTS ============


@router.get("")
async def list_public_ads(
    campus_id: UUID | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    """List active ads, optionally filtered by campus."""
    now = datetime.now(timezone.utc)

    query = (
        select(Ad)
        .where(Ad.is_active == True)
        .where(or_(Ad.starts_at == None, Ad.starts_at <= now))
        .where(or_(Ad.ends_at == None, Ad.ends_at > now))
    )

    if campus_id:
        query = query.where(or_(Ad.campus_id == campus_id, Ad.campus_id == None))

    query = query.order_by(Ad.priority.desc(), Ad.created_at.desc()).limit(limit)

    result = await db.execute(query)
    ads = list(result.scalars().all())

    return [_ad_to_public_response(ad) for ad in ads]


@router.get("/{ad_id}")
async def get_public_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single ad by ID."""
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise HTTPException(404, "Ad not found")
    return _ad_to_public_response(ad)


# ============ ADMIN ENDPOINTS ============


class CreateAdRequest(BaseModel):
    type: str = Field("internal_detail", pattern="^(internal_detail|external_link|coupon|event)$")
    title: str = Field(..., min_length=1, max_length=200)
    subtitle: str | None = Field(None, max_length=500)
    body: str | None = None
    cta_text: str = Field("Learn More", max_length=100)
    image_url: str | None = Field(None, max_length=512)
    image_alt: str | None = Field(None, max_length=200)
    accent_color: str | None = Field(None, max_length=50)
    external_url: str | None = Field(None, max_length=512)
    coupon_code: str | None = Field(None, max_length=100)
    event_start_at: datetime | None = None
    event_location: str | None = Field(None, max_length=200)
    priority: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    campus_id: UUID | None = None


class UpdateAdRequest(BaseModel):
    type: str | None = Field(None, pattern="^(internal_detail|external_link|coupon|event)$")
    title: str | None = Field(None, min_length=1, max_length=200)
    subtitle: str | None = Field(None, max_length=500)
    body: str | None = None
    cta_text: str | None = Field(None, max_length=100)
    image_url: str | None = Field(None, max_length=512)
    image_alt: str | None = Field(None, max_length=200)
    accent_color: str | None = Field(None, max_length=50)
    external_url: str | None = Field(None, max_length=512)
    coupon_code: str | None = Field(None, max_length=100)
    event_start_at: datetime | None = None
    event_location: str | None = Field(None, max_length=200)
    priority: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    campus_id: UUID | None = None
    clear_image: bool = False
    clear_subtitle: bool = False
    clear_body: bool = False
    clear_external_url: bool = False
    clear_coupon_code: bool = False
    clear_event_start_at: bool = False
    clear_event_location: bool = False
    clear_starts_at: bool = False
    clear_ends_at: bool = False
    clear_campus_id: bool = False


@router.get("/admin/list")
async def admin_list_ads(
    status: str | None = Query(None, pattern="^(active|inactive|scheduled|expired)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List all ads for admin management."""
    now = datetime.now(timezone.utc)
    query = select(Ad)

    if status == "active":
        query = query.where(
            Ad.is_active == True,
            or_(Ad.starts_at == None, Ad.starts_at <= now),
            or_(Ad.ends_at == None, Ad.ends_at > now),
        )
    elif status == "inactive":
        query = query.where(Ad.is_active == False)
    elif status == "scheduled":
        query = query.where(Ad.is_active == True, Ad.starts_at != None, Ad.starts_at > now)
    elif status == "expired":
        query = query.where(Ad.ends_at != None, Ad.ends_at <= now)

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0

    query = query.order_by(Ad.priority.desc(), Ad.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    ads = list(result.scalars().all())

    return {
        "items": [_ad_to_admin_response(ad) for ad in ads],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_items": total,
            "total_pages": -(-total // per_page) if total > 0 else 0,
            "has_next": page * per_page < total,
            "has_prev": page > 1,
        },
    }


@router.post("/admin/create", status_code=201)
async def admin_create_ad(
    data: CreateAdRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Create a new ad."""
    ad = Ad(
        type=AdType(data.type),
        title=data.title,
        subtitle=data.subtitle,
        body=data.body,
        cta_text=data.cta_text,
        image_url=data.image_url,
        image_alt=data.image_alt,
        accent_color=data.accent_color,
        external_url=data.external_url,
        coupon_code=data.coupon_code,
        event_start_at=data.event_start_at,
        event_location=data.event_location,
        priority=data.priority,
        is_active=data.is_active,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
        campus_id=data.campus_id,
        created_by=admin.id,
    )
    db.add(ad)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="ad_created",
        target_type="ad",
        target_id=ad.id,
        metadata_={"title": data.title, "type": data.type},
    )
    db.add(audit)

    await db.commit()
    return _ad_to_admin_response(ad)


@router.patch("/admin/{ad_id}")
async def admin_update_ad(
    ad_id: UUID,
    data: UpdateAdRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Update an existing ad."""
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise HTTPException(404, "Ad not found")

    changes = {}
    if data.type is not None:
        ad.type = AdType(data.type)
        changes["type"] = data.type
    if data.title is not None:
        ad.title = data.title
        changes["title"] = data.title
    if data.subtitle is not None:
        ad.subtitle = data.subtitle
    if data.clear_subtitle:
        ad.subtitle = None
    if data.body is not None:
        ad.body = data.body
    if data.clear_body:
        ad.body = None
    if data.cta_text is not None:
        ad.cta_text = data.cta_text
    if data.image_url is not None:
        ad.image_url = data.image_url
    if data.image_alt is not None:
        ad.image_alt = data.image_alt
    if data.clear_image:
        ad.image_url = None
        ad.image_alt = None
    if data.accent_color is not None:
        ad.accent_color = data.accent_color
    if data.external_url is not None:
        ad.external_url = data.external_url
    if data.clear_external_url:
        ad.external_url = None
    if data.coupon_code is not None:
        ad.coupon_code = data.coupon_code
    if data.clear_coupon_code:
        ad.coupon_code = None
    if data.event_start_at is not None:
        ad.event_start_at = data.event_start_at
    if data.clear_event_start_at:
        ad.event_start_at = None
    if data.event_location is not None:
        ad.event_location = data.event_location
    if data.clear_event_location:
        ad.event_location = None
    if data.priority is not None:
        ad.priority = data.priority
    if data.is_active is not None:
        ad.is_active = data.is_active
        changes["is_active"] = data.is_active
    if data.starts_at is not None:
        ad.starts_at = data.starts_at
    if data.clear_starts_at:
        ad.starts_at = None
    if data.ends_at is not None:
        ad.ends_at = data.ends_at
    if data.clear_ends_at:
        ad.ends_at = None
    if data.campus_id is not None:
        ad.campus_id = data.campus_id
    if data.clear_campus_id:
        ad.campus_id = None

    audit = AdminAction(
        admin_id=admin.id,
        action_type="ad_updated",
        target_type="ad",
        target_id=ad_id,
        metadata_=changes if changes else {"updated": True},
    )
    db.add(audit)

    await db.commit()

    # Re-fetch to get updated relationships
    await db.refresh(ad)
    return _ad_to_admin_response(ad)


@router.delete("/admin/{ad_id}", status_code=204)
async def admin_delete_ad(
    ad_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Permanently delete an ad."""
    ad = await db.get(Ad, ad_id)
    if not ad:
        raise HTTPException(404, "Ad not found")

    title = ad.title
    await db.delete(ad)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="ad_deleted",
        target_type="ad",
        target_id=ad_id,
        metadata_={"title": title},
    )
    db.add(audit)

    await db.commit()


# ============ HELPERS ============


def _ad_to_public_response(ad: Ad) -> dict:
    """Convert Ad model to public API response matching frontend Ad type."""
    ad_type_map = {
        AdType.INTERNAL_DETAIL: "INTERNAL_DETAIL",
        AdType.EXTERNAL_LINK: "EXTERNAL_LINK",
        AdType.COUPON: "COUPON",
        AdType.EVENT: "EVENT",
    }

    result = {
        "id": str(ad.id),
        "campusId": str(ad.campus_id) if ad.campus_id else "",
        "type": ad_type_map.get(ad.type, "INTERNAL_DETAIL"),
        "title": ad.title,
        "ctaText": ad.cta_text,
        "image": {
            "src": ad.image_url or "/placeholder-ad.jpg",
            "alt": ad.image_alt or ad.title,
        },
        "priority": ad.priority,
        "createdAt": ad.created_at.isoformat() if ad.created_at else "",
    }

    if ad.subtitle:
        result["subtitle"] = ad.subtitle
    if ad.body:
        result["body"] = ad.body
    if ad.accent_color:
        result["theme"] = {"accent": ad.accent_color}
    if ad.external_url:
        result["externalUrl"] = ad.external_url
    if ad.coupon_code:
        result["couponCode"] = ad.coupon_code
    if ad.event_start_at or ad.event_location:
        result["event"] = {}
        if ad.event_start_at:
            result["event"]["startAt"] = ad.event_start_at.isoformat()
        if ad.event_location:
            result["event"]["location"] = ad.event_location
    if ad.starts_at:
        result["startsAt"] = ad.starts_at.isoformat()
    if ad.ends_at:
        result["endsAt"] = ad.ends_at.isoformat()

    return result


def _ad_to_admin_response(ad: Ad) -> dict:
    """Convert Ad model to admin API response with all fields."""
    return {
        "id": str(ad.id),
        "campus_id": str(ad.campus_id) if ad.campus_id else None,
        "type": ad.type.value if hasattr(ad.type, "value") else ad.type,
        "title": ad.title,
        "subtitle": ad.subtitle,
        "body": ad.body,
        "cta_text": ad.cta_text,
        "image_url": ad.image_url,
        "image_alt": ad.image_alt,
        "accent_color": ad.accent_color,
        "external_url": ad.external_url,
        "coupon_code": ad.coupon_code,
        "event_start_at": ad.event_start_at.isoformat() if ad.event_start_at else None,
        "event_location": ad.event_location,
        "priority": ad.priority,
        "is_active": ad.is_active,
        "starts_at": ad.starts_at.isoformat() if ad.starts_at else None,
        "ends_at": ad.ends_at.isoformat() if ad.ends_at else None,
        "created_by": str(ad.created_by) if ad.created_by else None,
        "created_at": ad.created_at.isoformat() if ad.created_at else None,
        "updated_at": ad.updated_at.isoformat() if ad.updated_at else None,
    }
