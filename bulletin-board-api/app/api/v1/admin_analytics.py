from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_moderator
from app.config import get_settings
from app.dependencies import get_db
from app.models.user import User
from app.services.admin_intelligence_service import AdminIntelligenceService
from app.services.ai_service import AIService

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


def _get_service() -> AdminIntelligenceService:
    settings = get_settings()
    ai_service = AIService(settings)
    return AdminIntelligenceService(ai_service, settings)


# ──────────────────────────────────────────────────────────
# Trend analysis
# ──────────────────────────────────────────────────────────


@router.get("/trends")
async def get_trends(
    period: int = Query(30, ge=7, le=90, description="Analysis period in days"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get platform trend analysis with growth rates and narrative."""
    service = _get_service()
    return await service.analyze_trends(db, period_days=period)


# ──────────────────────────────────────────────────────────
# Anomaly detection
# ──────────────────────────────────────────────────────────


@router.get("/anomalies")
async def get_anomalies(
    lookback: int = Query(
        30, ge=7, le=90, description="Lookback period for baseline in days"
    ),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Detect anomalous activity compared to historical baselines."""
    service = _get_service()
    anomalies = await service.detect_anomalies(db, lookback_days=lookback)
    return {"anomalies": anomalies, "count": len(anomalies)}


# ──────────────────────────────────────────────────────────
# User risk scoring
# ──────────────────────────────────────────────────────────


@router.get("/risk-scores/{user_id}")
async def get_user_risk_score(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get detailed risk score for a specific user."""
    service = _get_service()
    result = await service.score_user_risk(db, user_id)
    if result.get("level") == "unknown":
        raise HTTPException(404, "User not found")
    return result


@router.get("/risk-scores")
async def get_risk_scores(
    limit: int = Query(50, ge=1, le=100, description="Max users to score"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get batch risk scores for users with recent activity or reports."""
    service = _get_service()
    scores = await service.batch_score_users(db, limit=limit)
    return {"scores": scores, "count": len(scores)}


# ──────────────────────────────────────────────────────────
# Platform summary
# ──────────────────────────────────────────────────────────


@router.get("/summary")
async def get_summary(
    period: int = Query(7, ge=1, le=90, description="Summary period in days"),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_moderator),
):
    """Get AI-generated platform activity summary with highlights."""
    service = _get_service()
    return await service.generate_summary(db, period_days=period)
