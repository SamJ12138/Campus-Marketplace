from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_moderator
from app.dependencies import get_db
from app.models.application import Application, ApplicationStatus
from app.models.user import User

router = APIRouter(prefix="/applications", tags=["applications"])


# ── Schemas ──


class ApplicationCreate(BaseModel):
    email: EmailStr
    name: str | None = None
    marketing_pitch: str
    platform_ideas: str | None = None


class ApplicationResponse(BaseModel):
    id: UUID
    email: str
    name: str | None
    marketing_pitch: str
    platform_ideas: str | None
    status: str
    admin_note: str | None
    reviewer: dict | None
    created_at: datetime
    reviewed_at: datetime | None


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    per_page: int


class ApplicationUpdateRequest(BaseModel):
    status: str | None = None
    admin_note: str | None = None


# ── Helpers ──


def _application_to_response(app: Application) -> ApplicationResponse:
    reviewer_data = None
    if app.reviewer:
        reviewer_data = {
            "id": str(app.reviewer.id),
            "display_name": app.reviewer.display_name,
        }
    return ApplicationResponse(
        id=app.id,
        email=app.email,
        name=app.name,
        marketing_pitch=app.marketing_pitch,
        platform_ideas=app.platform_ideas,
        status=app.status.value,
        admin_note=app.admin_note,
        reviewer=reviewer_data,
        created_at=app.created_at,
        reviewed_at=app.reviewed_at,
    )


# ── Public: Submit application ──


@router.post("", status_code=201)
async def submit_application(
    data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submit a team application. No auth required."""
    if not data.marketing_pitch or not data.marketing_pitch.strip():
        raise HTTPException(400, "Marketing pitch is required")

    if len(data.marketing_pitch) > 10000:
        raise HTTPException(400, "Marketing pitch is too long (max 10000 characters)")

    if len(data.marketing_pitch.strip()) < 50:
        raise HTTPException(400, "Marketing pitch must be at least 50 characters")

    application = Application(
        email=data.email.strip(),
        name=data.name.strip() if data.name else None,
        marketing_pitch=data.marketing_pitch.strip(),
        platform_ideas=data.platform_ideas.strip() if data.platform_ideas else None,
        status=ApplicationStatus.NEW,
    )
    db.add(application)
    await db.commit()

    return {
        "ok": True,
        "message": "Your application has been submitted! We'll review it and get back to you.",
    }


# ── Admin: List applications ──


@router.get("/admin", response_model=ApplicationListResponse)
async def list_applications(
    status: str | None = Query(None, pattern="^(new|reviewed|accepted|rejected)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List all applications. Moderator+ access."""
    base_query = select(Application)

    if status:
        base_query = base_query.where(Application.status == status)

    total = await db.scalar(
        select(func.count()).select_from(base_query.subquery())
    ) or 0

    query = (
        base_query
        .options(selectinload(Application.reviewer))
        .order_by(Application.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(query)
    items = list(result.scalars().all())

    return ApplicationListResponse(
        items=[_application_to_response(app) for app in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Admin: Get application stats ──


@router.get("/admin/stats")
async def application_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get application counts by status."""
    result = await db.execute(
        select(Application.status, func.count()).group_by(Application.status)
    )
    counts = {row[0].value: row[1] for row in result.all()}

    return {
        "new": counts.get("new", 0),
        "reviewed": counts.get("reviewed", 0),
        "accepted": counts.get("accepted", 0),
        "rejected": counts.get("rejected", 0),
        "total": sum(counts.values()),
    }


# ── Admin: Update application ──


@router.patch("/admin/{application_id}")
async def update_application(
    application_id: UUID,
    data: ApplicationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Update application status or add admin note. Moderator+ access."""
    application = await db.get(Application, application_id)
    if not application:
        raise HTTPException(404, "Application not found")

    if data.status:
        application.status = ApplicationStatus(data.status)
        application.reviewed_by = admin.id
        application.reviewed_at = datetime.now(timezone.utc)

    if data.admin_note is not None:
        application.admin_note = data.admin_note

    await db.commit()

    await db.refresh(application, ["reviewer"])
    return _application_to_response(application)
