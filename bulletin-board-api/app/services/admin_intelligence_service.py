import json
import logging
import math
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import Date, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class AdminIntelligenceService:
    """AI-powered analytics for the admin dashboard.

    Provides trend analysis, anomaly detection, user risk scoring,
    and automated summaries. All methods degrade gracefully when
    the AI service is unavailable — heuristic fallbacks produce
    structured results without any LLM call.
    """

    def __init__(self, ai_service: AIService, settings: Settings):
        self.ai_service = ai_service
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return self.ai_service.enabled

    # ──────────────────────────────────────────────────────────
    # Trend analysis
    # ──────────────────────────────────────────────────────────

    async def analyze_trends(
        self, db: AsyncSession, period_days: int = 30
    ) -> dict:
        """Analyze platform metric trends over the given period.

        Returns daily counts for users, listings, messages, reports
        plus period-over-period growth rates and an AI narrative
        (or heuristic summary) for each metric.
        """
        from app.models.listing import Listing
        from app.models.message import Message
        from app.models.report import Report
        from app.models.user import User

        now = datetime.now(timezone.utc)
        start = now - timedelta(days=period_days)
        prev_start = start - timedelta(days=period_days)

        metrics = {
            "users": (User.created_at, User.id),
            "listings": (Listing.created_at, Listing.id),
            "messages": (Message.created_at, Message.id),
            "reports": (Report.created_at, Report.id),
        }

        trends: dict = {"period_days": period_days, "metrics": {}}

        for name, (date_col, id_col) in metrics.items():
            # Current period daily counts
            daily = await self._daily_counts(db, date_col, id_col, start)

            # Period totals for growth calculation
            current_total = await db.scalar(
                select(func.count(id_col)).where(date_col >= start)
            ) or 0
            previous_total = await db.scalar(
                select(func.count(id_col)).where(
                    date_col >= prev_start, date_col < start
                )
            ) or 0

            growth = self._growth_rate(previous_total, current_total)

            trends["metrics"][name] = {
                "daily": daily,
                "current_total": current_total,
                "previous_total": previous_total,
                "growth_pct": growth,
                "trend": (
                    "up" if growth > 5
                    else "down" if growth < -5
                    else "stable"
                ),
            }

        # AI-enhanced narrative
        if self.enabled:
            trends["narrative"] = await self._ai_trend_narrative(trends)
        else:
            trends["narrative"] = self._heuristic_trend_narrative(trends)

        return trends

    async def _ai_trend_narrative(self, trends: dict) -> str:
        """Use AI to generate a plain-English trend summary."""
        summary_data = {}
        for name, data in trends["metrics"].items():
            summary_data[name] = {
                "current": data["current_total"],
                "previous": data["previous_total"],
                "growth": f"{data['growth_pct']:+.1f}%",
                "trend": data["trend"],
            }

        prompt = (
            "You are an analytics assistant for a college campus marketplace "
            "called GimmeDat. Summarize the following platform trends in 2-3 "
            "concise sentences suitable for an admin dashboard. Focus on "
            "noteworthy changes and actionable insights.\n\n"
            f"Period: {trends['period_days']} days\n"
            f"Data: {json.dumps(summary_data)}"
        )

        try:
            response = await self.ai_service.complete(
                prompt=prompt,
                max_tokens=256,
                temperature=0.3,
            )
            return response.content.strip()
        except Exception:
            logger.exception("[INTEL] AI trend narrative failed")
            return self._heuristic_trend_narrative(trends)

    @staticmethod
    def _heuristic_trend_narrative(trends: dict) -> str:
        """Build a simple trend summary without AI."""
        parts = []
        for name, data in trends.get("metrics", {}).items():
            growth = data["growth_pct"]
            total = data["current_total"]
            if growth > 5:
                parts.append(
                    f"{name.capitalize()} grew {growth:+.1f}% "
                    f"({total} this period)."
                )
            elif growth < -5:
                parts.append(
                    f"{name.capitalize()} declined {growth:+.1f}% "
                    f"({total} this period)."
                )
            else:
                parts.append(
                    f"{name.capitalize()} remained stable "
                    f"({total} this period)."
                )
        return " ".join(parts) if parts else "No trend data available."

    # ──────────────────────────────────────────────────────────
    # Anomaly detection
    # ──────────────────────────────────────────────────────────

    async def detect_anomalies(
        self, db: AsyncSession, lookback_days: int = 30
    ) -> list[dict]:
        """Detect anomalies by comparing recent 24h metrics to
        the daily average over the lookback period.

        An anomaly is flagged when the recent count deviates by
        more than 2 standard deviations from the mean.
        """
        from app.models.listing import Listing
        from app.models.message import Message
        from app.models.report import Report
        from app.models.user import User

        now = datetime.now(timezone.utc)
        lookback_start = now - timedelta(days=lookback_days)
        recent_start = now - timedelta(hours=24)

        checks = [
            ("new_users", User.created_at, User.id),
            ("new_listings", Listing.created_at, Listing.id),
            ("messages", Message.created_at, Message.id),
            ("reports", Report.created_at, Report.id),
        ]

        anomalies: list[dict] = []

        for label, date_col, id_col in checks:
            daily = await self._daily_counts(
                db, date_col, id_col, lookback_start
            )
            counts = [d["count"] for d in daily]
            if len(counts) < 3:
                continue

            mean = sum(counts) / len(counts)
            variance = sum((c - mean) ** 2 for c in counts) / len(counts)
            std = math.sqrt(variance) if variance > 0 else 0

            recent_count = await db.scalar(
                select(func.count(id_col)).where(date_col >= recent_start)
            ) or 0

            if std > 0:
                z_score = (recent_count - mean) / std
            else:
                z_score = 0.0 if recent_count == mean else 3.0

            if abs(z_score) > 2.0:
                severity = (
                    "critical" if abs(z_score) > 3.0
                    else "warning"
                )
                direction = "spike" if z_score > 0 else "drop"
                anomalies.append({
                    "metric": label,
                    "recent_count": recent_count,
                    "daily_average": round(mean, 1),
                    "std_dev": round(std, 1),
                    "z_score": round(z_score, 2),
                    "direction": direction,
                    "severity": severity,
                    "message": (
                        f"{label.replace('_', ' ').capitalize()} "
                        f"{direction}: {recent_count} in the last 24h "
                        f"vs. avg {mean:.1f}/day "
                        f"(z={z_score:+.1f})"
                    ),
                })

        # Sort by severity then absolute z-score
        anomalies.sort(
            key=lambda a: (
                0 if a["severity"] == "critical" else 1,
                -abs(a["z_score"]),
            )
        )

        return anomalies

    # ──────────────────────────────────────────────────────────
    # User risk scoring
    # ──────────────────────────────────────────────────────────

    async def score_user_risk(
        self, db: AsyncSession, user_id: UUID
    ) -> dict:
        """Calculate a risk score (0-100) for a single user.

        Factors:
        - Reports filed against them (weight 35)
        - Flagged messages (weight 20)
        - Account age (newer = riskier) (weight 15)
        - Listing removal rate (weight 20)
        - Suspension history (weight 10)

        Returns a dict with score, breakdown, and risk level.
        """
        from app.models.listing import Listing
        from app.models.message import Message
        from app.models.report import Report
        from app.models.user import User

        user = await db.get(User, user_id)
        if not user:
            return {
                "user_id": str(user_id),
                "score": 0,
                "level": "unknown",
                "factors": {},
                "explanation": "User not found.",
            }

        # Factor 1: Reports against this user
        reports_count = await db.scalar(
            select(func.count(Report.id)).where(
                or_(
                    (Report.target_type == "user")
                    & (Report.target_id == user_id),
                    Report.target_id.in_(
                        select(Listing.id).where(
                            Listing.user_id == user_id
                        )
                    ),
                )
            )
        ) or 0
        # Cap at 5+ reports = max factor score
        report_score = min(reports_count / 5.0, 1.0) * 35

        # Factor 2: Flagged messages
        flagged_msgs = await db.scalar(
            select(func.count(Message.id)).where(
                Message.sender_id == user_id, Message.is_flagged.is_(True)
            )
        ) or 0
        flagged_score = min(flagged_msgs / 3.0, 1.0) * 20

        # Factor 3: Account age (newer = riskier)
        now = datetime.now(timezone.utc)
        account_age_days = max(
            (now - user.created_at.replace(tzinfo=timezone.utc)).days
            if user.created_at.tzinfo is None
            else (now - user.created_at).days,
            0,
        )
        # Under 7 days = max risk for this factor, over 90 days = 0
        age_risk = max(0.0, 1.0 - (account_age_days / 90.0))
        age_score = age_risk * 15

        # Factor 4: Listing removal rate
        total_listings = await db.scalar(
            select(func.count(Listing.id)).where(
                Listing.user_id == user_id
            )
        ) or 0
        removed_listings = await db.scalar(
            select(func.count(Listing.id)).where(
                Listing.user_id == user_id, Listing.status == "removed"
            )
        ) or 0
        removal_rate = (
            removed_listings / total_listings if total_listings > 0 else 0.0
        )
        removal_score = min(removal_rate * 2, 1.0) * 20

        # Factor 5: Suspension history
        suspension_score = 0.0
        if user.status.value == "banned":
            suspension_score = 10.0
        elif user.status.value == "suspended":
            suspension_score = 7.0
        elif user.suspension_reason:
            suspension_score = 4.0

        total_score = min(
            round(
                report_score + flagged_score + age_score
                + removal_score + suspension_score
            ),
            100,
        )

        level = (
            "critical" if total_score >= 70
            else "high" if total_score >= 50
            else "medium" if total_score >= 25
            else "low"
        )

        factors = {
            "reports": {
                "count": reports_count,
                "score": round(report_score, 1),
                "weight": 35,
            },
            "flagged_messages": {
                "count": flagged_msgs,
                "score": round(flagged_score, 1),
                "weight": 20,
            },
            "account_age": {
                "days": account_age_days,
                "score": round(age_score, 1),
                "weight": 15,
            },
            "listing_removals": {
                "total": total_listings,
                "removed": removed_listings,
                "rate": round(removal_rate, 2),
                "score": round(removal_score, 1),
                "weight": 20,
            },
            "suspension_history": {
                "status": user.status.value,
                "score": round(suspension_score, 1),
                "weight": 10,
            },
        }

        result = {
            "user_id": str(user_id),
            "display_name": user.display_name,
            "score": total_score,
            "level": level,
            "factors": factors,
        }

        # AI-enhanced explanation
        if self.enabled and total_score >= 25:
            result["explanation"] = await self._ai_risk_explanation(
                result, user
            )
        else:
            result["explanation"] = self._heuristic_risk_explanation(result)

        return result

    async def _ai_risk_explanation(self, result: dict, user: object) -> str:
        """Use AI to generate a concise risk explanation."""
        prompt = (
            "You are a trust & safety analyst for a college marketplace. "
            "Given the following user risk score breakdown, write a 1-2 "
            "sentence actionable summary for admins. Be specific about "
            "the primary risk factors.\n\n"
            f"User: {result['display_name']}\n"
            f"Risk score: {result['score']}/100 ({result['level']})\n"
            f"Factors: {json.dumps(result['factors'])}"
        )

        try:
            response = await self.ai_service.complete(
                prompt=prompt,
                max_tokens=128,
                temperature=0.2,
            )
            return response.content.strip()
        except Exception:
            logger.exception("[INTEL] AI risk explanation failed")
            return self._heuristic_risk_explanation(result)

    @staticmethod
    def _heuristic_risk_explanation(result: dict) -> str:
        """Build a simple risk explanation without AI."""
        factors = result.get("factors", {})
        top_factors = sorted(
            factors.items(),
            key=lambda kv: kv[1].get("score", 0),
            reverse=True,
        )

        parts = []
        for name, data in top_factors[:2]:
            score = data.get("score", 0)
            if score > 0:
                label = name.replace("_", " ").capitalize()
                parts.append(f"{label} ({score:.0f}/{data.get('weight', 0)})")

        if not parts:
            return "No significant risk factors detected."

        level = result.get("level", "low")
        return (
            f"Risk level: {level}. "
            f"Top factors: {', '.join(parts)}."
        )

    async def batch_score_users(
        self, db: AsyncSession, limit: int = 50
    ) -> list[dict]:
        """Score risk for users with recent activity or reports.

        Prioritizes users who have been reported or are newly registered.
        """
        from app.models.report import Report
        from app.models.user import User

        now = datetime.now(timezone.utc)
        recent = now - timedelta(days=7)

        # Users with recent reports against them
        reported_users = await db.execute(
            select(Report.target_id)
            .where(
                Report.target_type == "user",
                Report.created_at >= recent,
            )
            .distinct()
            .limit(limit // 2)
        )
        reported_ids = [row[0] for row in reported_users.all()]

        # Recently registered users
        new_users = await db.execute(
            select(User.id)
            .where(User.created_at >= recent)
            .order_by(User.created_at.desc())
            .limit(limit // 2)
        )
        new_ids = [row[0] for row in new_users.all()]

        # Combine and deduplicate
        all_ids = list(dict.fromkeys(reported_ids + new_ids))[:limit]

        scores = []
        for uid in all_ids:
            score = await self.score_user_risk(db, uid)
            scores.append(score)

        # Sort by risk score descending
        scores.sort(key=lambda s: s["score"], reverse=True)
        return scores

    # ──────────────────────────────────────────────────────────
    # Weekly summary
    # ──────────────────────────────────────────────────────────

    async def generate_summary(
        self, db: AsyncSession, period_days: int = 7
    ) -> dict:
        """Generate a platform activity summary for the given period.

        Includes key metrics, highlights, and an AI narrative
        (or heuristic bullet points) suitable for the admin dashboard.
        """
        from app.models.listing import Listing
        from app.models.message import Message
        from app.models.report import Report
        from app.models.user import User

        now = datetime.now(timezone.utc)
        start = now - timedelta(days=period_days)

        new_users = await db.scalar(
            select(func.count(User.id)).where(User.created_at >= start)
        ) or 0
        new_listings = await db.scalar(
            select(func.count(Listing.id)).where(
                Listing.created_at >= start
            )
        ) or 0
        new_messages = await db.scalar(
            select(func.count(Message.id)).where(
                Message.created_at >= start
            )
        ) or 0
        new_reports = await db.scalar(
            select(func.count(Report.id)).where(
                Report.created_at >= start
            )
        ) or 0
        resolved_reports = await db.scalar(
            select(func.count(Report.id)).where(
                Report.resolved_at >= start
            )
        ) or 0
        pending_reports = await db.scalar(
            select(func.count(Report.id)).where(Report.status == "pending")
        ) or 0

        stats = {
            "period_days": period_days,
            "period_start": start.isoformat(),
            "period_end": now.isoformat(),
            "new_users": new_users,
            "new_listings": new_listings,
            "new_messages": new_messages,
            "new_reports": new_reports,
            "resolved_reports": resolved_reports,
            "pending_reports": pending_reports,
        }

        # AI narrative or heuristic summary
        if self.enabled:
            stats["narrative"] = await self._ai_summary_narrative(stats)
        else:
            stats["narrative"] = self._heuristic_summary_narrative(stats)

        # Highlights
        stats["highlights"] = self._build_highlights(stats)

        return stats

    async def _ai_summary_narrative(self, stats: dict) -> str:
        """Use AI to generate a summary narrative."""
        prompt = (
            "You are an analytics assistant for a college campus marketplace "
            "called GimmeDat. Write a brief 3-4 sentence summary of the "
            "platform activity for the admin team. Be concise and highlight "
            "anything noteworthy.\n\n"
            f"Period: last {stats['period_days']} days\n"
            f"New users: {stats['new_users']}\n"
            f"New listings: {stats['new_listings']}\n"
            f"Messages sent: {stats['new_messages']}\n"
            f"Reports filed: {stats['new_reports']}\n"
            f"Reports resolved: {stats['resolved_reports']}\n"
            f"Reports pending: {stats['pending_reports']}"
        )

        try:
            response = await self.ai_service.complete(
                prompt=prompt,
                max_tokens=256,
                temperature=0.3,
            )
            return response.content.strip()
        except Exception:
            logger.exception("[INTEL] AI summary narrative failed")
            return self._heuristic_summary_narrative(stats)

    @staticmethod
    def _heuristic_summary_narrative(stats: dict) -> str:
        """Build a summary without AI."""
        period = stats.get("period_days", 7)
        parts = [
            f"Over the last {period} days: "
            f"{stats.get('new_users', 0)} new users, "
            f"{stats.get('new_listings', 0)} new listings, "
            f"{stats.get('new_messages', 0)} messages sent.",
        ]
        pending = stats.get("pending_reports", 0)
        if pending > 0:
            parts.append(f"{pending} reports awaiting review.")
        else:
            parts.append("All reports have been resolved.")
        return " ".join(parts)

    @staticmethod
    def _build_highlights(stats: dict) -> list[dict]:
        """Generate actionable highlight items from summary stats."""
        highlights = []
        pending = stats.get("pending_reports", 0)
        if pending > 5:
            highlights.append({
                "type": "warning",
                "message": (
                    f"{pending} reports pending — "
                    "consider prioritizing the review queue."
                ),
            })
        elif pending > 0:
            highlights.append({
                "type": "info",
                "message": f"{pending} reports awaiting review.",
            })
        else:
            highlights.append({
                "type": "success",
                "message": "Report queue is clear.",
            })

        new_users = stats.get("new_users", 0)
        if new_users > 0:
            highlights.append({
                "type": "info",
                "message": (
                    f"{new_users} new users joined this period."
                ),
            })

        new_listings = stats.get("new_listings", 0)
        if new_listings == 0:
            highlights.append({
                "type": "warning",
                "message": "No new listings this period — engagement may be low.",
            })

        return highlights

    # ──────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────

    @staticmethod
    async def _daily_counts(
        db: AsyncSession, date_col: object, id_col: object, start: datetime
    ) -> list[dict]:
        """Return daily counts for a metric since *start*."""
        day_col = cast(date_col, Date)
        result = await db.execute(
            select(
                day_col.label("day"),
                func.count(id_col).label("cnt"),
            )
            .where(date_col >= start)
            .group_by(day_col)
            .order_by(day_col)
        )
        return [
            {"date": str(row.day), "count": row.cnt}
            for row in result.all()
        ]

    @staticmethod
    def _growth_rate(previous: int, current: int) -> float:
        """Calculate percentage growth between two period totals."""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)
