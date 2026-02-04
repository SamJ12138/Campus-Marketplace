from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.rate_limit import check_rate_limit
from app.dependencies import get_db, get_redis
from app.models.listing import Listing
from app.models.message import Message
from app.models.report import Report, ReportPriority, ReportReason
from app.models.user import User
from app.schemas.report import CreateReportRequest, ReportResponse, ReportTargetType

router = APIRouter(prefix="/reports", tags=["moderation"])


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(
    data: CreateReportRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Submit a report."""
    await check_rate_limit(
        redis,
        f"reports:{current_user.id}",
        limit=10,
        window_seconds=86400,
    )

    if data.target_type == ReportTargetType.LISTING:
        target = await db.get(Listing, data.target_id)
    elif data.target_type == ReportTargetType.USER:
        target = await db.get(User, data.target_id)
    elif data.target_type == ReportTargetType.MESSAGE:
        target = await db.get(Message, data.target_id)
    else:
        target = None

    if not target:
        raise HTTPException(404, "Target not found")

    # Campus isolation: only allow reporting targets within same campus
    if data.target_type == ReportTargetType.LISTING and target.campus_id != current_user.campus_id:
        raise HTTPException(404, "Target not found")
    if data.target_type == ReportTargetType.USER and target.campus_id != current_user.campus_id:
        raise HTTPException(404, "Target not found")

    if data.target_type == ReportTargetType.USER and data.target_id == current_user.id:
        raise HTTPException(400, "Cannot report yourself")

    priority = ReportPriority.NORMAL
    if data.reason in (ReportReason.SCAM, ReportReason.HARASSMENT):
        priority = ReportPriority.HIGH

    report = Report(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        description=data.description,
        priority=priority,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report


@router.get("/mine", response_model=list[ReportResponse])
async def my_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get reports I've submitted."""
    result = await db.execute(
        select(Report)
        .where(Report.reporter_id == current_user.id)
        .order_by(Report.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())
