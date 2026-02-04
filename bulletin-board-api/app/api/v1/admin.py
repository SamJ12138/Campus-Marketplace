from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin, require_moderator
from app.dependencies import get_db
from app.models.admin import AdminAction, BannedKeyword
from app.models.listing import Listing
from app.models.message import Message
from app.models.report import Report
from app.models.user import User, UserRole, UserStatus
from app.schemas.report import ReportResolution, ResolveReportRequest
from app.schemas.user import UserBrief

router = APIRouter(prefix="/admin", tags=["admin"])


# ============ REPORTS ============


@router.get("/reports")
async def list_reports(
    status: str | None = Query(None, pattern="^(pending|reviewing|resolved|dismissed)$"),
    priority: str | None = Query(None, pattern="^(low|normal|high|urgent)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List reports for moderation."""
    query = select(Report).order_by(
        case(
            (Report.status == "pending", 0),
            (Report.status == "reviewing", 1),
            else_=2,
        ),
        case(
            (Report.priority == "urgent", 0),
            (Report.priority == "high", 1),
            (Report.priority == "normal", 2),
            else_=3,
        ),
        Report.created_at.desc(),
    )

    if status:
        query = query.where(Report.status == status)
    if priority:
        query = query.where(Report.priority == priority)

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    reports = list(result.scalars().all())

    enriched = []
    for report in reports:
        target_details = await _get_target_details(db, report.target_type.value, report.target_id)
        enriched.append(
            {
                "id": str(report.id),
                "target_type": report.target_type.value,
                "target_id": str(report.target_id),
                "reason": report.reason.value,
                "description": report.description,
                "status": report.status.value,
                "priority": report.priority.value,
                "reporter_id": str(report.reporter_id),
                "target_details": target_details,
                "resolution_type": report.resolution_type,
                "resolution_note": report.resolution_note,
                "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
                "created_at": report.created_at.isoformat(),
            }
        )

    return enriched


@router.patch("/reports/{report_id}")
async def resolve_report(
    report_id: UUID,
    data: ResolveReportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Resolve a report and optionally take action."""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, "Report not found")

    if report.status.value == "resolved":
        raise HTTPException(400, "Report already resolved")

    if data.resolution_type == ReportResolution.CONTENT_REMOVED:
        if report.target_type.value == "listing":
            await db.execute(
                update(Listing)
                .where(Listing.id == report.target_id)
                .values(status="removed", removal_reason=data.resolution_note)
            )

    elif data.resolution_type == ReportResolution.USER_SUSPENDED:
        target_user_id = await _get_content_owner(db, report.target_type.value, report.target_id)
        if target_user_id:
            await db.execute(
                update(User)
                .where(User.id == target_user_id)
                .values(
                    status=UserStatus.SUSPENDED,
                    suspension_reason=data.resolution_note,
                    suspension_until=datetime.utcnow() + timedelta(days=7),
                )
            )

    elif data.resolution_type == ReportResolution.USER_BANNED:
        target_user_id = await _get_content_owner(db, report.target_type.value, report.target_id)
        if target_user_id:
            await db.execute(
                update(User)
                .where(User.id == target_user_id)
                .values(status=UserStatus.BANNED, suspension_reason=data.resolution_note)
            )

    report.status = "resolved"
    report.resolved_by = admin.id
    report.resolution_type = data.resolution_type.value
    report.resolution_note = data.resolution_note
    report.resolved_at = datetime.utcnow()

    audit = AdminAction(
        admin_id=admin.id,
        action_type=f"report_resolved_{data.resolution_type.value}",
        target_type=report.target_type.value,
        target_id=report.target_id,
        reason=data.resolution_note,
        metadata_={"report_id": str(report_id)},
    )
    db.add(audit)

    await db.commit()

    return {"message": "Report resolved", "resolution": data.resolution_type.value}


# ============ USERS ============


@router.get("/users")
async def list_users(
    status: str | None = None,
    search: str | None = Query(None, min_length=2),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List users with optional filters."""
    query = select(User).order_by(User.created_at.desc())

    if status:
        query = query.where(User.status == status)
    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.display_name.ilike(f"%{search}%"),
            )
        )

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = list(result.scalars().all())

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "display_name": u.display_name,
            "status": u.status.value,
            "role": u.role.value,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}")
async def update_user_status(
    user_id: UUID,
    status: str = Body(...),
    suspension_reason: str | None = Body(None, max_length=500),
    suspension_until: datetime | None = Body(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update user status (suspend/ban/activate)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    if user.role == UserRole.ADMIN and admin.id != user.id:
        raise HTTPException(403, "Cannot modify other admins")

    user.status = UserStatus(status)
    user.suspension_reason = suspension_reason
    user.suspension_until = suspension_until if status == "suspended" else None

    audit = AdminAction(
        admin_id=admin.id,
        action_type=f"user_status_changed_to_{status}",
        target_type="user",
        target_id=user_id,
        reason=suspension_reason,
    )
    db.add(audit)

    await db.commit()
    return {"message": f"User status updated to {status}"}


# ============ KEYWORDS ============


@router.get("/keywords")
async def list_keywords(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List banned keywords."""
    result = await db.execute(
        select(BannedKeyword).order_by(BannedKeyword.created_at.desc())
    )
    keywords = list(result.scalars().all())
    return [
        {
            "id": str(kw.id),
            "keyword": kw.keyword,
            "match_type": kw.match_type,
            "action": kw.action,
            "applies_to": kw.applies_to,
            "is_active": kw.is_active,
            "created_at": kw.created_at.isoformat(),
        }
        for kw in keywords
    ]


@router.post("/keywords", status_code=201)
async def add_keyword(
    keyword: str = Body(..., min_length=2, max_length=100),
    match_type: str = Body("contains"),
    action: str = Body("block"),
    campus_id: UUID | None = Body(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Add a banned keyword."""
    kw = BannedKeyword(
        keyword=keyword,
        match_type=match_type,
        action=action,
        campus_id=campus_id,
        created_by=admin.id,
    )
    db.add(kw)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="keyword_added",
        target_type="keyword",
        target_id=kw.id,
        metadata_={"keyword": keyword, "action": action},
    )
    db.add(audit)

    await db.commit()
    return {"id": str(kw.id), "message": "Keyword added"}


@router.delete("/keywords/{keyword_id}", status_code=204)
async def remove_keyword(
    keyword_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Remove a banned keyword."""
    kw = await db.get(BannedKeyword, keyword_id)
    if not kw:
        raise HTTPException(404, "Keyword not found")

    await db.delete(kw)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="keyword_removed",
        target_type="keyword",
        target_id=keyword_id,
        metadata_={"keyword": kw.keyword},
    )
    db.add(audit)

    await db.commit()


# ============ AUDIT LOG ============


@router.get("/audit-log")
async def get_audit_log(
    action_type: str | None = None,
    admin_id: UUID | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """View audit log."""
    query = select(AdminAction).order_by(AdminAction.created_at.desc())

    if action_type:
        query = query.where(AdminAction.action_type.ilike(f"%{action_type}%"))
    if admin_id:
        query = query.where(AdminAction.admin_id == admin_id)

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    actions = list(result.scalars().all())

    return [
        {
            "id": str(a.id),
            "admin_id": str(a.admin_id),
            "action_type": a.action_type,
            "target_type": a.target_type,
            "target_id": str(a.target_id) if a.target_id else None,
            "reason": a.reason,
            "metadata": a.metadata_,
            "created_at": a.created_at.isoformat(),
        }
        for a in actions
    ]


# ============ STATS ============


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get dashboard statistics."""
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    return {
        "total_users": await db.scalar(select(func.count(User.id))) or 0,
        "active_users_30d": await db.scalar(
            select(func.count(User.id)).where(User.last_active_at >= thirty_days_ago)
        )
        or 0,
        "total_listings": await db.scalar(select(func.count(Listing.id))) or 0,
        "active_listings": await db.scalar(
            select(func.count(Listing.id)).where(Listing.status == "active")
        )
        or 0,
        "pending_reports": await db.scalar(
            select(func.count(Report.id)).where(Report.status == "pending")
        )
        or 0,
        "messages_today": await db.scalar(
            select(func.count(Message.id)).where(Message.created_at >= today_start)
        )
        or 0,
    }


# ============ HELPERS ============


async def _get_target_details(db: AsyncSession, target_type: str, target_id: UUID) -> dict:
    """Get details of a reported target."""
    if target_type == "listing":
        listing = await db.get(Listing, target_id)
        if listing:
            return {
                "id": str(listing.id),
                "title": listing.title,
                "status": listing.status.value if hasattr(listing.status, "value") else listing.status,
                "user_id": str(listing.user_id),
            }
    elif target_type == "user":
        user = await db.get(User, target_id)
        if user:
            return {
                "id": str(user.id),
                "display_name": user.display_name,
                "email": user.email,
                "status": user.status.value if hasattr(user.status, "value") else user.status,
            }
    elif target_type == "message":
        message = await db.get(Message, target_id)
        if message:
            return {
                "id": str(message.id),
                "content": message.content[:200],
                "sender_id": str(message.sender_id),
            }
    return {}


async def _get_content_owner(db: AsyncSession, target_type: str, target_id: UUID) -> UUID | None:
    """Get the user who owns the reported content."""
    if target_type == "listing":
        listing = await db.get(Listing, target_id)
        return listing.user_id if listing else None
    elif target_type == "user":
        return target_id
    elif target_type == "message":
        message = await db.get(Message, target_id)
        return message.sender_id if message else None
    return None
