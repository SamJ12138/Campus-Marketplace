import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_admin, require_moderator
from app.config import get_settings
from app.dependencies import get_db
from app.models.admin import AdminAction, BannedKeyword
from app.models.listing import Category, Listing, ListingPhoto, ListingStatus
from app.models.message import Message, MessageThread
from app.models.report import Report
from app.models.user import User, UserRole, UserStatus
from app.schemas.report import ReportResolution, ResolveReportRequest

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
    to: str | None = Query(None, description="Recipient email (defaults to your own)"),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send test emails to verify delivery. Tests simple and template paths."""
    import logging

    from app.models.notification import NotificationPreference
    from app.services.email_service import EmailService
    from app.services.email_templates import new_message_email

    logger = logging.getLogger(__name__)
    settings = get_settings()

    recipient_email = to or admin_user.email
    if not recipient_email:
        raise HTTPException(400, "No email address provided")

    # Check notification preferences
    prefs = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == admin_user.id
        )
    )

    config = {
        "provider": settings.email_provider,
        "from_address": settings.email_from_address,
        "from_name": settings.email_from_name,
        "resend_key_set": bool(settings.resend_api_key),
        "frontend_url": settings.primary_frontend_url,
        "notification_prefs": {
            "exists": prefs is not None,
            "email_messages": prefs.email_messages if prefs else "no prefs",
        },
    }
    logger.info("[TEST EMAIL] to=%s, config=%s", recipient_email, config)

    svc = EmailService(settings)
    results = {}

    # Test 1: Simple HTML
    try:
        ok = svc.send_email_sync(
            to_email=recipient_email,
            subject="[Test 1/2] Simple email - GimmeDat",
            html_content="<p>Simple diagnostic email from GimmeDat.</p>",
            text_content="Simple diagnostic email from GimmeDat.",
        )
        results["simple"] = {"sent": ok, "error": None}
    except Exception as e:
        logger.exception("[TEST EMAIL] simple send failed")
        results["simple"] = {"sent": False, "error": str(e)}

    # Test 2: Full message notification template
    try:
        thread_url = (
            f"{settings.primary_frontend_url}/messages?thread=diag-test"
        )
        html, text = new_message_email(
            "DiagBot", "Test Listing",
            "Hey! This is a test message to verify email notifications."
            " If you see this, the notification system is functional.",
            thread_url,
        )
        ok = svc.send_email_sync(
            to_email=recipient_email,
            subject="New message from DiagBot - GimmeDat",
            html_content=html,
            text_content=text,
        )
        results["template"] = {"sent": ok, "error": None}
    except Exception as e:
        logger.exception("[TEST EMAIL] template send failed")
        results["template"] = {"sent": False, "error": str(e)}

    return {
        "to": recipient_email,
        "config": config,
        "results": results,
    }


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
                "status": (
                    listing.status.value
                    if hasattr(listing.status, "value")
                    else listing.status
                ),
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
                "id": str(listing.id),
                "title": listing.title,
                "type": (
                    listing.type.value
                    if hasattr(listing.type, "value")
                    else listing.type
                ),
                "status": (
                    listing.status.value
                    if hasattr(listing.status, "value")
                    else listing.status
                ),
                "category_name": listing.category.name if listing.category else None,
                "user_id": str(listing.user_id),
                "user_name": listing.user.display_name if listing.user else "Unknown",
                "user_email": listing.user.email if listing.user else None,
                "view_count": listing.view_count,
                "message_count": listing.message_count,
                "removal_reason": listing.removal_reason,
                "created_at": listing.created_at.isoformat(),
                "expires_at": listing.expires_at.isoformat() if listing.expires_at else None,
            }
            for listing in listings
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


# ============ SEED EXAMPLE LISTINGS ============

logger = logging.getLogger(__name__)

_IMG = "https://images.unsplash.com/photo-"
_Q = "?w=800&h=600&fit=crop&q=80"

# Example listings with images — covers every category.
# Each description is split across lines to satisfy E501.
SEED_EXAMPLE_LISTINGS = [
    # ── Textbooks ──
    {
        "type": "item",
        "cat": "textbooks",
        "title": "[EXAMPLE] Intro to Psychology — Myers, 12th Ed",
        "desc": (
            "Barely used, clean pages, no highlighting. "
            "Comes with online access code (unused). "
            "Perfect for Psych 101. Can meet at the library."
        ),
        "price": "$35",
        "loc": "on_campus",
        "loc_hint": "Library main entrance",
        "img": f"{_IMG}1544716278-ca5e3f4abd8c{_Q}",
    },
    {
        "type": "item",
        "cat": "textbooks",
        "title": "[EXAMPLE] Principles of Microeconomics — Mankiw",
        "desc": (
            "8th edition, some highlighting in chapters 1-6 "
            "but otherwise clean. Great condition for the "
            "price. Includes study guide insert."
        ),
        "price": "$30",
        "loc": "on_campus",
        "loc_hint": "Economics department building",
        "img": f"{_IMG}1456513080510-7bf3a84b82f8{_Q}",
    },
    {
        "type": "item",
        "cat": "textbooks",
        "title": "[EXAMPLE] College Writing Skills with Readings",
        "desc": (
            "Langan 10th edition. Required for English Comp. "
            "All pages intact, some margin notes that are "
            "actually helpful. Free highlighter included."
        ),
        "price": "$20",
        "loc": "on_campus",
        "loc_hint": "Student center",
        "img": f"{_IMG}1497633762265-9d179a990aa6{_Q}",
    },
    # ── Tutoring ──
    {
        "type": "service",
        "cat": "tutoring",
        "title": "[EXAMPLE] Spanish Tutor — Native Speaker",
        "desc": (
            "Heritage speaker with 3 years of tutoring "
            "experience. Conversation practice, grammar, "
            "essay writing, and exam prep. Flexible "
            "scheduling — evenings and weekends."
        ),
        "price": "$20/hr",
        "loc": "on_campus",
        "loc_hint": "Library study rooms or Zoom",
        "img": f"{_IMG}1522202176988-66273c2fd55f{_Q}",
    },
    {
        "type": "service",
        "cat": "tutoring",
        "title": "[EXAMPLE] Stats & Data Science Tutor",
        "desc": (
            "Math major, TA for Intro to Stats. I help with "
            "homework, projects, and exam review. Comfortable "
            "with R, Python, Excel, and SPSS. Brought 10+ "
            "students from C to A-."
        ),
        "price": "$25/hr",
        "loc": "on_campus",
        "loc_hint": "Math department or Zoom",
        "img": f"{_IMG}1434030216411-0b793f4b4173{_Q}",
    },
    # ── Hair & Beauty ──
    {
        "type": "service",
        "cat": "hair-beauty",
        "title": "[EXAMPLE] Loc Retwists & Maintenance",
        "desc": (
            "Experienced with all loc types — traditional, "
            "freeform, and sisterlocs. Retwists starting at "
            "$40 depending on length. I use quality products. "
            "Booking weekends — DM me."
        ),
        "price": "From $40",
        "loc": "on_campus",
        "loc_hint": "My dorm or yours — I bring everything",
        "img": f"{_IMG}1560066984-138dadb4c035{_Q}",
    },
    {
        "type": "service",
        "cat": "hair-beauty",
        "title": "[EXAMPLE] Eyebrow Threading — Quick & Clean",
        "desc": (
            "Been threading for 4 years, learned from my mom. "
            "Takes about 10 minutes, super precise results. "
            "Way better than waxing. Just message me to book!"
        ),
        "price": "$8",
        "loc": "on_campus",
        "loc_hint": "My room — very quick appointment",
        "img": f"{_IMG}1522337360788-8b13dee7a37e{_Q}",
    },
    # ── Electronics ──
    {
        "type": "item",
        "cat": "electronics",
        "title": "[EXAMPLE] iPad Air (5th Gen) + Apple Pencil",
        "desc": (
            "64GB WiFi, Space Gray. Used for one semester of "
            "note-taking. Screen protector since day one, zero "
            "scratches. Includes Apple Pencil 2nd gen and a "
            "magnetic case."
        ),
        "price": "$420",
        "loc": "on_campus",
        "loc_hint": "Can meet anywhere on campus",
        "img": f"{_IMG}1544244015-0df4b3ffc6b0{_Q}",
    },
    {
        "type": "item",
        "cat": "electronics",
        "title": "[EXAMPLE] Bose SoundLink Bluetooth Speaker",
        "desc": (
            "Great sound for dorm rooms and outdoor hangouts. "
            "Battery lasts about 8 hours. Minor scuff on the "
            "bottom, works perfectly. Comes with charging cable."
        ),
        "price": "$55",
        "loc": "on_campus",
        "loc_hint": "Student center or dining hall",
        "img": f"{_IMG}1608043152269-423dbba4e7e1{_Q}",
    },
    # ── Photography ──
    {
        "type": "service",
        "cat": "photography",
        "title": "[EXAMPLE] Campus Portrait Sessions",
        "desc": (
            "Art major with a focus in photography. Portraits, "
            "headshots, and couple photos in natural light. "
            "30-minute session, 15+ edited photos delivered in "
            "5 days. I know all the best spots on campus."
        ),
        "price": "$60/session",
        "loc": "on_campus",
        "loc_hint": "Best campus photo spots",
        "img": f"{_IMG}1542038784456-1ea8e935640e{_Q}",
    },
    # ── Furniture ──
    {
        "type": "item",
        "cat": "furniture",
        "title": "[EXAMPLE] Standing Desk Converter — Adjustable",
        "desc": (
            "FlexiSpot 28-inch. Sits on top of your desk and "
            "raises your laptop to standing height. 8 height "
            "settings. Helped my back during long study sessions."
        ),
        "price": "$45",
        "loc": "on_campus",
        "loc_hint": "Can help carry to your dorm",
        "img": f"{_IMG}1518455027359-f3f8164ba6bd{_Q}",
    },
    {
        "type": "item",
        "cat": "furniture",
        "title": "[EXAMPLE] Cozy Bean Bag Chair — Oversized",
        "desc": (
            "Perfect for dorm rooms or apartments. Dark gray, "
            "machine-washable cover. Bought it for $80 at Target "
            "last semester. Super comfortable for gaming or "
            "reading. Too big for my new room."
        ),
        "price": "$30",
        "loc": "on_campus",
        "loc_hint": "Residence hall",
        "img": f"{_IMG}1555041469-a586c61ea9bc{_Q}",
    },
    # ── Clothing ──
    {
        "type": "item",
        "cat": "clothing",
        "title": "[EXAMPLE] Vintage Levi's 501 Jeans — 32x30",
        "desc": (
            "Great vintage wash, perfectly broken in. No rips "
            "or stains. Bought at a thrift store but they don't "
            "fit me right. Heavyweight denim, made in USA tag."
        ),
        "price": "$40",
        "loc": "on_campus",
        "loc_hint": "Student center",
        "img": f"{_IMG}1542272604-787c3835535d{_Q}",
    },
    {
        "type": "item",
        "cat": "clothing",
        "title": "[EXAMPLE] Patagonia Better Sweater — Men's L",
        "desc": (
            "Navy blue, quarter-zip. Worn a handful of times, "
            "in excellent condition. Retails for $139 new. "
            "Super warm for fall/winter walks to class."
        ),
        "price": "$55",
        "loc": "on_campus",
        "loc_hint": "Anywhere on campus",
        "img": f"{_IMG}1591047139829-d91aecb6caea{_Q}",
    },
    # ── Tickets ──
    {
        "type": "item",
        "cat": "tickets",
        "title": "[EXAMPLE] 2 Concert Tickets — Battle of the Bands",
        "desc": (
            "Can't make it anymore — selling both together. "
            "Digital transfer through the campus events app. "
            "Great lineup this year. Face value was $15 each."
        ),
        "price": "$20 for both",
        "loc": "on_campus",
        "loc_hint": "Digital transfer — no meetup needed",
        "img": f"{_IMG}1501281668745-f7f57925c3b4{_Q}",
    },
    # ── Music Lessons ──
    {
        "type": "service",
        "cat": "music-lessons",
        "title": "[EXAMPLE] Piano Lessons — Classical & Pop",
        "desc": (
            "Music minor, 12 years of piano experience. "
            "Beginners through intermediate. Sheet music, "
            "chords, or your favorite songs. Practice rooms "
            "in the music building are free to use."
        ),
        "price": "$18/hr",
        "loc": "on_campus",
        "loc_hint": "Music building practice rooms",
        "img": f"{_IMG}1520523839897-bd043c4cd28f{_Q}",
    },
    {
        "type": "service",
        "cat": "music-lessons",
        "title": "[EXAMPLE] Drum Lessons — Rock, Jazz, Hip-Hop",
        "desc": (
            "Been playing drums for 8 years, marching band "
            "and jazz ensemble member. Basic rhythms, "
            "rudiments, and full songs. Bring your sticks — "
            "I have a practice pad."
        ),
        "price": "$15/hr",
        "loc": "on_campus",
        "loc_hint": "Music building or my apartment",
        "img": f"{_IMG}1519892300165-cb5542fb47c7{_Q}",
    },
    # ── Fitness ──
    {
        "type": "service",
        "cat": "fitness",
        "title": "[EXAMPLE] Yoga Sessions — Stress Relief",
        "desc": (
            "Certified yoga instructor (200-hour RYT). "
            "45-minute sessions focused on stress relief, "
            "flexibility, and strength. Perfect for exam "
            "anxiety. Bring a mat — I have extras."
        ),
        "price": "$10/session",
        "loc": "on_campus",
        "loc_hint": "Campus green or gym studio",
        "img": f"{_IMG}1544367567-0f2fcb009e0b{_Q}",
    },
    {
        "type": "service",
        "cat": "fitness",
        "title": "[EXAMPLE] Boxing & Cardio Workout Partner",
        "desc": (
            "Boxing for 3 years and love sharing what I know. "
            "Pad work, bag drills, and cardio circuits. Great "
            "stress reliever. I have extra gloves and wraps. "
            "Beginner-friendly!"
        ),
        "price": "$12/session",
        "loc": "on_campus",
        "loc_hint": "Campus gym or outdoor courts",
        "img": f"{_IMG}1549719386-74dfcbf7dbed{_Q}",
    },
    # ── Tech Help ──
    {
        "type": "service",
        "cat": "tech-help",
        "title": "[EXAMPLE] Website & Portfolio Builder",
        "desc": (
            "CS major. I'll build you a personal website or "
            "portfolio using modern tools. Great for job apps "
            "and grad school. Includes hosting setup and a "
            "tutorial so you can update it yourself."
        ),
        "price": "$50-100",
        "loc": "remote",
        "loc_hint": "All remote — we'll chat over Zoom",
        "img": f"{_IMG}1461749280684-dccba630e2f6{_Q}",
    },
    {
        "type": "service",
        "cat": "tech-help",
        "title": "[EXAMPLE] Phone Screen Repair — Same Day",
        "desc": (
            "I fix cracked screens for iPhones and Samsung "
            "Galaxy phones. Parts from reliable suppliers. "
            "Most repairs done in under an hour. Way cheaper "
            "than the Apple Store."
        ),
        "price": "From $40",
        "loc": "on_campus",
        "loc_hint": "My dorm room — quick turnaround",
        "img": f"{_IMG}1581092160607-ee67df30e38e{_Q}",
    },
]


@router.post("/seed-examples")
async def seed_example_listings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Seed example listings with images.

    Admin-only. Creates listings under the admin account with
    Unsplash photos. Skips duplicates (idempotent).
    """
    settings = get_settings()

    # Build slug → category map
    cats = (
        await db.execute(
            select(Category).where(Category.is_active.is_(True))
        )
    ).scalars().all()
    slug_map = {c.slug: c for c in cats}

    # Existing titles for dedup
    existing = set(
        (
            await db.execute(
                select(Listing.title).where(
                    Listing.user_id == admin.id
                )
            )
        ).scalars().all()
    )

    created = 0
    new_items: list[tuple] = []

    for item in SEED_EXAMPLE_LISTINGS:
        if item["title"] in existing:
            continue

        cat = slug_map.get(item["cat"])
        if not cat:
            logger.warning(
                "Category %r not found, skipping",
                item["cat"],
            )
            continue

        listing = Listing(
            user_id=admin.id,
            campus_id=admin.campus_id,
            type=item["type"],
            category_id=cat.id,
            title=item["title"],
            description=item["desc"],
            price_hint=item.get("price"),
            location_type=item.get("loc", "on_campus"),
            location_hint=item.get("loc_hint"),
            contact_preference="in_app",
            status=ListingStatus.ACTIVE,
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(days=settings.listing_expiry_days)
            ),
        )
        db.add(listing)
        new_items.append((listing, item.get("img")))
        created += 1

    if not created:
        return {
            "created": 0,
            "skipped": len(SEED_EXAMPLE_LISTINGS),
        }

    # Flush to get IDs
    await db.flush()

    # Create photos + search vectors
    for listing, image_url in new_items:
        if image_url:
            photo = ListingPhoto(
                listing_id=listing.id,
                url=image_url,
                storage_key=f"seed/{listing.id}/0",
                thumbnail_url=image_url,
                position=0,
                content_type="image/jpeg",
            )
            db.add(photo)

        # Full-text search vector
        await db.execute(
            update(Listing)
            .where(Listing.id == listing.id)
            .values(
                search_vector=func.to_tsvector(
                    "english",
                    func.coalesce(listing.title, "")
                    + " "
                    + func.coalesce(
                        listing.description, ""
                    ),
                )
            )
        )

    # Update admin listing count
    await db.execute(
        update(User)
        .where(User.id == admin.id)
        .values(listing_count=User.listing_count + created)
    )

    await db.commit()

    return {
        "created": created,
        "skipped": len(SEED_EXAMPLE_LISTINGS) - created,
    }
