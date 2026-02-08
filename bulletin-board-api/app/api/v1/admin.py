from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, delete as sa_delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin, require_moderator
from app.dependencies import get_db
from app.models.admin import AdminAction, BannedKeyword
from app.models.listing import Category, Listing, ListingStatus
from app.models.message import Message, MessageThread
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
    base_query = select(Report)

    if status:
        base_query = base_query.where(Report.status == status)
    if priority:
        base_query = base_query.where(Report.priority == priority)

    # Total count
    total = await db.scalar(
        select(func.count()).select_from(base_query.subquery())
    ) or 0

    query = base_query.options(
        selectinload(Report.reporter),
        selectinload(Report.resolver),
    ).order_by(
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
    ).offset((page - 1) * per_page).limit(per_page)

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
                "reporter": {
                    "id": str(report.reporter.id),
                    "display_name": report.reporter.display_name,
                } if report.reporter else None,
                "target_details": target_details,
                "resolution": report.resolution_type,
                "resolution_note": report.resolution_note,
                "resolved_by": {
                    "id": str(report.resolver.id),
                    "display_name": report.resolver.display_name,
                } if report.resolver else None,
                "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
                "created_at": report.created_at.isoformat(),
            }
        )

    return {
        "items": enriched,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_items": total,
            "total_pages": -(-total // per_page) if total > 0 else 0,
            "has_next": page * per_page < total,
            "has_prev": page > 1,
        },
    }


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
                    suspension_until=datetime.now(timezone.utc) + timedelta(days=7),
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
    report.resolved_at = datetime.now(timezone.utc)

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


# ============ EMAIL TEST ============


@router.post("/test-email")
async def test_email(
    admin_user: User = Depends(require_admin),
):
    """Send a test email to the admin's own address to verify email delivery."""
    import logging
    logger = logging.getLogger(__name__)

    from app.config import get_settings
    from app.services.email_service import EmailService

    settings = get_settings()
    logger.info(f"[TEST EMAIL] provider={settings.email_provider}, from={settings.email_from_address}, resend_key_set={bool(settings.resend_api_key)}")

    if not admin_user.email:
        raise HTTPException(400, "No email address on your account")

    html = f"""
    <div style="font-family: sans-serif; padding: 20px;">
        <h2>GimmeDat - Email Test</h2>
        <p>This is a test email sent from the admin panel.</p>
        <p>If you see this, email delivery is working correctly.</p>
        <p><strong>Provider:</strong> {settings.email_provider}</p>
        <p><strong>From:</strong> {settings.email_from_address}</p>
    </div>
    """

    service = EmailService(settings)
    try:
        success = service.send_email_sync(
            to_email=admin_user.email,
            subject="GimmeDat - Email Test",
            html_content=html,
        )
    except Exception as e:
        logger.exception("[TEST EMAIL] Exception during send")
        raise HTTPException(500, f"Email send threw exception: {type(e).__name__}: {e}")

    if not success:
        raise HTTPException(500, "Email send returned False — check Render logs for [EMAIL ERROR] details")

    return {"status": "sent", "to": admin_user.email, "provider": settings.email_provider}


# ============ STATS ============


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get dashboard statistics."""
    now = datetime.now(timezone.utc)
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


# ============ LISTINGS MANAGEMENT ============


@router.get("/listings")
async def admin_list_listings(
    status: str | None = Query(None),
    listing_type: str | None = Query(None, alias="type"),
    search: str | None = Query(None, min_length=2),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List all listings with filters for admin moderation."""
    query = select(Listing).options(
        selectinload(Listing.user),
        selectinload(Listing.category),
    ).order_by(Listing.created_at.desc())

    if status:
        query = query.where(Listing.status == status)
    if listing_type:
        query = query.where(Listing.type == listing_type)
    if search:
        query = query.where(
            or_(
                Listing.title.ilike(f"%{search}%"),
                Listing.description.ilike(f"%{search}%"),
            )
        )

    total = await db.scalar(
        select(func.count()).select_from(query.subquery())
    ) or 0

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    listings = list(result.scalars().all())

    return {
        "items": [
            {
                "id": str(l.id),
                "title": l.title,
                "type": l.type.value if hasattr(l.type, "value") else l.type,
                "status": l.status.value if hasattr(l.status, "value") else l.status,
                "category_name": l.category.name if l.category else None,
                "user_id": str(l.user_id),
                "user_name": l.user.display_name if l.user else "Unknown",
                "user_email": l.user.email if l.user else None,
                "view_count": l.view_count,
                "message_count": l.message_count,
                "removal_reason": l.removal_reason,
                "created_at": l.created_at.isoformat(),
                "expires_at": l.expires_at.isoformat() if l.expires_at else None,
            }
            for l in listings
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_items": total,
            "total_pages": -(-total // per_page) if total > 0 else 0,
            "has_next": page * per_page < total,
            "has_prev": page > 1,
        },
    }


class UpdateListingStatusRequest(BaseModel):
    status: str
    removal_reason: str | None = None


@router.patch("/listings/{listing_id}")
async def admin_update_listing(
    listing_id: UUID,
    data: UpdateListingStatusRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Update a listing status (remove, restore, etc.)."""
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")

    old_status = listing.status.value if hasattr(listing.status, "value") else listing.status
    listing.status = ListingStatus(data.status)
    if data.removal_reason:
        listing.removal_reason = data.removal_reason

    audit = AdminAction(
        admin_id=admin.id,
        action_type=f"listing_status_changed_{old_status}_to_{data.status}",
        target_type="listing",
        target_id=listing_id,
        reason=data.removal_reason,
        metadata_={"title": listing.title},
    )
    db.add(audit)
    await db.commit()

    return {"message": f"Listing status updated to {data.status}"}


@router.delete("/listings/{listing_id}", status_code=204)
async def admin_delete_listing(
    listing_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Permanently delete a listing."""
    listing = await db.get(Listing, listing_id)
    if not listing:
        raise HTTPException(404, "Listing not found")

    title = listing.title
    user_id = listing.user_id

    await db.delete(listing)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="listing_permanently_deleted",
        target_type="listing",
        target_id=listing_id,
        metadata_={"title": title, "user_id": str(user_id)},
    )
    db.add(audit)
    await db.commit()


# ============ CATEGORIES MANAGEMENT ============


@router.get("/categories")
async def admin_list_categories(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List all categories including inactive ones."""
    result = await db.execute(
        select(Category).order_by(Category.sort_order, Category.name)
    )
    categories = list(result.scalars().all())
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "listing_type": c.listing_type,
            "description": c.description,
            "icon": c.icon,
            "is_active": c.is_active,
            "sort_order": c.sort_order,
        }
        for c in categories
    ]


class CreateCategoryRequest(BaseModel):
    name: str
    slug: str
    listing_type: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 0


@router.post("/categories", status_code=201)
async def admin_create_category(
    data: CreateCategoryRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create a new category."""
    existing = await db.scalar(
        select(Category).where(Category.slug == data.slug)
    )
    if existing:
        raise HTTPException(400, "Category with this slug already exists")

    category = Category(
        name=data.name,
        slug=data.slug,
        listing_type=data.listing_type,
        description=data.description,
        icon=data.icon,
        sort_order=data.sort_order,
    )
    db.add(category)

    audit = AdminAction(
        admin_id=admin.id,
        action_type="category_created",
        target_type="category",
        target_id=category.id,
        metadata_={"name": data.name, "slug": data.slug},
    )
    db.add(audit)
    await db.commit()

    return {"id": str(category.id), "message": "Category created"}


class UpdateCategoryRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


@router.patch("/categories/{category_id}")
async def admin_update_category(
    category_id: UUID,
    data: UpdateCategoryRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update a category."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")

    changes = {}
    if data.name is not None:
        category.name = data.name
        changes["name"] = data.name
    if data.description is not None:
        category.description = data.description
        changes["description"] = data.description
    if data.icon is not None:
        category.icon = data.icon
        changes["icon"] = data.icon
    if data.is_active is not None:
        category.is_active = data.is_active
        changes["is_active"] = data.is_active
    if data.sort_order is not None:
        category.sort_order = data.sort_order
        changes["sort_order"] = data.sort_order

    audit = AdminAction(
        admin_id=admin.id,
        action_type="category_updated",
        target_type="category",
        target_id=category_id,
        metadata_=changes,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Category updated"}


@router.delete("/categories/{category_id}", status_code=204)
async def admin_delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Deactivate a category (soft delete)."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, "Category not found")

    category.is_active = False

    audit = AdminAction(
        admin_id=admin.id,
        action_type="category_deactivated",
        target_type="category",
        target_id=category_id,
        metadata_={"name": category.name},
    )
    db.add(audit)
    await db.commit()


# ============ ENHANCED STATS ============


@router.get("/stats/charts")
async def get_stats_charts(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get time-series data for dashboard charts."""
    import logging
    from sqlalchemy import Date, cast

    logger = logging.getLogger(__name__)

    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    async def _daily_counts(table_name: str, col):
        """Run a daily count query, returning [] on error."""
        try:
            day_col = cast(col, Date)
            result = await db.execute(
                select(
                    day_col.label("day"),
                    func.count().label("cnt"),
                )
                .where(col >= start_date)
                .group_by(day_col)
                .order_by(day_col)
            )
            rows = result.all()
            return [
                {"date": str(row.day), "count": row.cnt}
                for row in rows
            ]
        except Exception as exc:
            logger.exception("Chart query failed for %s: %s", table_name, exc)
            return []

    daily_users = await _daily_counts("users", User.created_at)
    daily_listings = await _daily_counts("listings", Listing.created_at)
    daily_messages = await _daily_counts("messages", Message.created_at)
    daily_reports = await _daily_counts("reports", Report.created_at)

    return {
        "period": period,
        "daily_users": daily_users,
        "daily_listings": daily_listings,
        "daily_messages": daily_messages,
        "daily_reports": daily_reports,
    }


# ============ USER DETAIL ============


@router.get("/users/{user_id}")
async def admin_get_user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get detailed user info for admin."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    listing_count = await db.scalar(
        select(func.count(Listing.id)).where(Listing.user_id == user_id)
    ) or 0

    active_listing_count = await db.scalar(
        select(func.count(Listing.id)).where(
            Listing.user_id == user_id,
            Listing.status == "active",
        )
    ) or 0

    report_count = await db.scalar(
        select(func.count(Report.id)).where(
            Report.target_type == "user",
            Report.target_id == user_id,
        )
    ) or 0

    thread_count = await db.scalar(
        select(func.count(MessageThread.id)).where(
            or_(
                MessageThread.initiator_id == user_id,
                MessageThread.recipient_id == user_id,
            )
        )
    ) or 0

    return {
        "id": str(user.id),
        "email": user.email,
        "email_verified": user.email_verified,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "class_year": user.class_year,
        "bio": user.bio,
        "phone_number": user.phone_number,
        "role": user.role.value,
        "status": user.status.value,
        "suspension_reason": user.suspension_reason,
        "suspension_until": user.suspension_until.isoformat() if user.suspension_until else None,
        "last_active_at": user.last_active_at.isoformat() if user.last_active_at else None,
        "created_at": user.created_at.isoformat(),
        "stats": {
            "total_listings": listing_count,
            "active_listings": active_listing_count,
            "reports_against": report_count,
            "message_threads": thread_count,
        },
    }
