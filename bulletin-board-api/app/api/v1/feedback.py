import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, require_moderator
from app.dependencies import get_db, get_email_svc
from app.models.feedback import Feedback, FeedbackStatus
from app.models.user import User
from app.services.email_service import EmailService
from app.services.email_templates import feedback_received_email, feedback_reviewed_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Schemas ──


class FeedbackCreate(BaseModel):
    message: str


class FeedbackResponse(BaseModel):
    id: UUID
    message: str
    email: str | None
    status: str
    user: dict | None
    admin_note: str | None
    reviewer: dict | None
    created_at: datetime
    reviewed_at: datetime | None


class FeedbackListResponse(BaseModel):
    items: list[FeedbackResponse]
    total: int
    page: int
    per_page: int


class FeedbackUpdateRequest(BaseModel):
    status: str | None = None
    admin_note: str | None = None


# ── Helpers ──


def _feedback_to_response(fb: Feedback) -> FeedbackResponse:
    user_data = None
    if fb.user:
        user_data = {
            "id": str(fb.user.id),
            "display_name": fb.user.display_name,
            "email": fb.user.email,
            "phone_number": fb.user.phone_number,
            "avatar_url": fb.user.avatar_url,
        }
    reviewer_data = None
    if fb.reviewer:
        reviewer_data = {
            "id": str(fb.reviewer.id),
            "display_name": fb.reviewer.display_name,
        }
    return FeedbackResponse(
        id=fb.id,
        message=fb.message,
        email=fb.email,
        status=fb.status.value,
        user=user_data,
        admin_note=fb.admin_note,
        reviewer=reviewer_data,
        created_at=fb.created_at,
        reviewed_at=fb.reviewed_at,
    )


# ── Email helper ──


def _send_email_background(
    email_svc: EmailService,
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str | None,
) -> None:
    """Send email in a background thread. Errors are logged, never raised."""
    try:
        email_svc.send_email_sync(to_email, subject, html_content, text_content)
    except Exception as e:
        logger.error("Background feedback email send failed: %s", e, exc_info=True)


# ── Public: Submit feedback ──


@router.post("", status_code=201)
async def submit_feedback(
    data: FeedbackCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    email_svc: EmailService = Depends(get_email_svc),
):
    """Submit feedback. Requires authentication."""
    if not data.message or not data.message.strip():
        raise HTTPException(400, "Feedback message is required")

    if len(data.message) > 5000:
        raise HTTPException(400, "Feedback message is too long (max 5000 characters)")

    feedback = Feedback(
        user_id=current_user.id,
        email=current_user.email,
        message=data.message.strip(),
        status=FeedbackStatus.NEW,
    )
    db.add(feedback)
    await db.commit()

    # Send confirmation email
    html, text = feedback_received_email(current_user.display_name or "there")
    background_tasks.add_task(
        _send_email_background,
        email_svc,
        current_user.email,
        "We received your feedback - GimmeDat",
        html,
        text,
    )

    return {
        "ok": True,
        "message": (
            "Thank you for your feedback!"
            " We read every submission and it helps us improve GimmeDat."
        ),
    }


# ── Admin: List feedback ──


@router.get("/admin", response_model=FeedbackListResponse)
async def list_feedback(
    status: str | None = Query(None, pattern="^(new|reviewed|archived)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """List all feedback submissions. Moderator+ access."""
    base_query = select(Feedback)

    if status:
        base_query = base_query.where(Feedback.status == status)

    total = await db.scalar(
        select(func.count()).select_from(base_query.subquery())
    ) or 0

    query = (
        base_query
        .options(selectinload(Feedback.user), selectinload(Feedback.reviewer))
        .order_by(Feedback.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(query)
    items = list(result.scalars().all())

    return FeedbackListResponse(
        items=[_feedback_to_response(fb) for fb in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Admin: Get feedback stats ──


@router.get("/admin/stats")
async def feedback_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get feedback counts by status."""
    result = await db.execute(
        select(Feedback.status, func.count()).group_by(Feedback.status)
    )
    counts = {row[0].value: row[1] for row in result.all()}

    return {
        "new": counts.get("new", 0),
        "reviewed": counts.get("reviewed", 0),
        "archived": counts.get("archived", 0),
        "total": sum(counts.values()),
    }


# ── Admin: Update feedback ──


@router.patch("/admin/{feedback_id}")
async def update_feedback(
    feedback_id: UUID,
    data: FeedbackUpdateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
    email_svc: EmailService = Depends(get_email_svc),
):
    """Update feedback status or add admin note. Moderator+ access."""
    feedback = await db.get(Feedback, feedback_id)
    if not feedback:
        raise HTTPException(404, "Feedback not found")

    if data.status:
        feedback.status = FeedbackStatus(data.status)
        if data.status == "reviewed":
            feedback.reviewed_by = admin.id
            feedback.reviewed_at = datetime.now(timezone.utc)

    if data.admin_note is not None:
        feedback.admin_note = data.admin_note

    await db.commit()

    # Send review notification email when status changes to "reviewed"
    if data.status == "reviewed":
        await db.refresh(feedback, ["user"])
        if feedback.user and feedback.user.email:
            html, text = feedback_reviewed_email(
                feedback.user.display_name or "there",
                feedback.admin_note,
            )
            background_tasks.add_task(
                _send_email_background,
                email_svc,
                feedback.user.email,
                "Update on your feedback - GimmeDat",
                html,
                text,
            )

    await db.refresh(feedback, ["user", "reviewer"])
    return _feedback_to_response(feedback)
