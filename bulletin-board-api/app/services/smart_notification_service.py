"""AI-driven smart notification and engagement service.

Provides personalized digest generation, re-engagement campaigns, smart timing,
listing expiry nudges, and price drop alerts for favorited items.
"""

import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.favorite import Favorite
from app.models.listing import Listing, ListingStatus
from app.models.message import Message, MessageThread
from app.models.notification import DigestFrequency, NotificationPreference
from app.models.user import User, UserStatus
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

# Engagement score thresholds
HIGH_ENGAGEMENT_THRESHOLD = 0.7
LOW_ENGAGEMENT_THRESHOLD = 0.3
RE_ENGAGEMENT_INACTIVE_DAYS = 14

# Digest content limits
MAX_DIGEST_LISTINGS = 10
MAX_DIGEST_MESSAGES = 5


class SmartNotificationService:
    """AI-powered smart notification and engagement service.

    Generates personalized digests, re-engagement campaigns,
    and smart timing recommendations. Falls back to heuristic
    approaches when AI is unavailable.
    """

    def __init__(self, ai_service: AIService, settings: Settings):
        self.ai = ai_service
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return self.ai.enabled

    async def generate_digest(
        self,
        db: AsyncSession,
        user_id: str,
        frequency: str = "weekly",
    ) -> dict:
        """Generate a personalized digest for a user.

        Gathers new listings, unread messages, favorited-item updates,
        and engagement stats, then uses AI to create a compelling summary.

        Args:
            db: Database session
            user_id: The user to generate digest for
            frequency: "daily" or "weekly"

        Returns:
            Dict with subject, body_html, body_text, stats, and items.
        """
        user = await db.get(User, user_id)
        if not user:
            return self._empty_digest(frequency)

        period_days = 1 if frequency == "daily" else 7
        cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)

        # Gather digest data in parallel-ish queries
        new_listings = await self._get_new_campus_listings(db, user, cutoff)
        unread_messages = await self._get_unread_message_count(db, user_id)
        favorited_updates = await self._get_favorited_listing_updates(
            db, user_id, cutoff
        )
        expiring_listings = await self._get_user_expiring_listings(db, user_id)

        stats = {
            "new_listings_count": len(new_listings),
            "unread_messages": unread_messages,
            "favorited_updates_count": len(favorited_updates),
            "expiring_listings_count": len(expiring_listings),
            "period": frequency,
            "period_days": period_days,
        }

        listings_summary = [
            {
                "title": item.title,
                "type": item.type.value if hasattr(item.type, "value") else str(item.type),
                "price_hint": item.price_hint,
            }
            for item in new_listings[:MAX_DIGEST_LISTINGS]
        ]

        expiring_summary = [
            {
                "title": item.title,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "view_count": item.view_count,
                "message_count": item.message_count,
            }
            for item in expiring_listings
        ]

        if self.ai.enabled:
            content = await self._ai_generate_digest_content(
                user.display_name,
                frequency,
                stats,
                listings_summary,
                expiring_summary,
            )
        else:
            content = self._fallback_digest_content(
                user.display_name,
                frequency,
                stats,
                listings_summary,
                expiring_summary,
            )

        return {
            "user_id": str(user_id),
            "user_email": user.email,
            "user_name": user.display_name,
            "frequency": frequency,
            "subject": content["subject"],
            "body_html": content["body_html"],
            "body_text": content["body_text"],
            "stats": stats,
            "new_listings": listings_summary,
            "expiring_listings": expiring_summary,
        }

    async def identify_re_engagement_targets(
        self,
        db: AsyncSession,
        inactive_days: int = RE_ENGAGEMENT_INACTIVE_DAYS,
    ) -> list[dict]:
        """Find users who haven't been active and need re-engagement.

        Returns a list of dicts with user_id, email, display_name,
        days_inactive, engagement_score, and a suggested campaign message.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)

        result = await db.execute(
            select(User, NotificationPreference)
            .outerjoin(
                NotificationPreference,
                NotificationPreference.user_id == User.id,
            )
            .where(
                User.status == UserStatus.ACTIVE,
                User.email_verified.is_(True),
                (User.last_active_at < cutoff) | (User.last_active_at.is_(None)),
            )
        )

        targets = []
        for user, prefs in result.all():
            # Skip users who opted out of marketing
            if prefs and not prefs.email_marketing:
                continue

            days_inactive = (
                (datetime.now(timezone.utc) - user.last_active_at).days
                if user.last_active_at
                else 30
            )
            engagement = prefs.engagement_score if prefs else 1.0

            targets.append({
                "user_id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "days_inactive": days_inactive,
                "engagement_score": engagement,
                "campus_name": user.campus.name if user.campus else "your campus",
            })

        return targets

    async def generate_re_engagement_message(
        self,
        user_name: str,
        days_inactive: int,
        campus_name: str,
    ) -> dict:
        """Generate a personalized re-engagement email message.

        Args:
            user_name: User's display name
            days_inactive: Number of days since last activity
            campus_name: User's campus name

        Returns:
            Dict with subject and body keys.
        """
        if self.ai.enabled:
            return await self._ai_generate_re_engagement(
                user_name, days_inactive, campus_name
            )
        return self._fallback_re_engagement(user_name, days_inactive, campus_name)

    def is_within_quiet_hours(
        self,
        quiet_start: int | None,
        quiet_end: int | None,
        current_hour: int | None = None,
    ) -> bool:
        """Check if the current time falls within quiet hours.

        Args:
            quiet_start: Start hour (0-23), or None for no quiet hours
            quiet_end: End hour (0-23), or None for no quiet hours
            current_hour: Override for testing, defaults to UTC hour now

        Returns:
            True if currently in quiet hours and notification should be deferred.
        """
        if quiet_start is None or quiet_end is None:
            return False

        if current_hour is None:
            current_hour = datetime.now(timezone.utc).hour

        if quiet_start <= quiet_end:
            # Simple range, e.g., 22-23 (doesn't cross midnight)
            return quiet_start <= current_hour < quiet_end
        else:
            # Wraps midnight, e.g., 22-8
            return current_hour >= quiet_start or current_hour < quiet_end

    def calculate_engagement_score(
        self,
        emails_sent: int,
        emails_opened: int,
        last_active_at: datetime | None,
    ) -> float:
        """Calculate a user's engagement score from 0.0 to 1.0.

        Factors:
        - Open rate (emails_opened / emails_sent) — 60% weight
        - Recency of activity — 40% weight

        Returns 1.0 for new users (no email history).
        """
        if emails_sent == 0:
            return 1.0  # New user, assume engaged

        # Open rate component (0-1, weight 0.6)
        open_rate = min(emails_opened / emails_sent, 1.0)
        open_component = open_rate * 0.6

        # Recency component (0-1, weight 0.4)
        if last_active_at is None:
            recency_component = 0.0
        else:
            now = datetime.now(timezone.utc)
            if last_active_at.tzinfo is None:
                last_active_at = last_active_at.replace(tzinfo=timezone.utc)
            days_since = (now - last_active_at).days
            # Decay: 1.0 at 0 days, ~0.5 at 7 days, ~0 at 30+ days
            recency = max(0.0, 1.0 - (days_since / 30.0))
            recency_component = recency * 0.4

        return round(min(open_component + recency_component, 1.0), 3)

    async def get_expiring_listing_nudges(
        self,
        db: AsyncSession,
        days_ahead: int = 3,
    ) -> list[dict]:
        """Get listings expiring soon, with engagement stats for nudge emails.

        Returns a list of dicts with listing info, owner info, and stats
        to help users decide whether to renew.
        """
        now = datetime.now(timezone.utc)
        expiry_start = now + timedelta(days=days_ahead - 1)
        expiry_end = now + timedelta(days=days_ahead)

        result = await db.execute(
            select(Listing, User)
            .join(User, Listing.user_id == User.id)
            .where(
                Listing.status == ListingStatus.ACTIVE,
                Listing.expires_at >= expiry_start,
                Listing.expires_at < expiry_end,
            )
        )

        nudges = []
        for listing, user in result.all():
            prefs = await db.scalar(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user.id
                )
            )
            if prefs and not prefs.email_listing_expiry:
                continue

            nudges.append({
                "user_id": str(user.id),
                "user_email": user.email,
                "user_name": user.display_name,
                "listing_id": str(listing.id),
                "listing_title": listing.title,
                "expires_at": listing.expires_at.isoformat(),
                "view_count": listing.view_count,
                "message_count": listing.message_count,
                "days_until_expiry": days_ahead,
            })

        return nudges

    async def generate_expiry_nudge_message(
        self,
        listing_title: str,
        view_count: int,
        message_count: int,
        days_until_expiry: int,
        user_name: str,
    ) -> dict:
        """Generate an expiry nudge email with engagement stats.

        Args:
            listing_title: Title of the expiring listing
            view_count: Number of views the listing received
            message_count: Number of messages the listing received
            days_until_expiry: Days until the listing expires
            user_name: The listing owner's display name

        Returns:
            Dict with subject and body keys.
        """
        if self.ai.enabled:
            return await self._ai_generate_expiry_nudge(
                listing_title, view_count, message_count, days_until_expiry, user_name
            )
        return self._fallback_expiry_nudge(
            listing_title, view_count, message_count, days_until_expiry, user_name
        )

    async def get_price_drop_alerts(
        self,
        db: AsyncSession,
        hours_back: int = 24,
    ) -> list[dict]:
        """Find favorited listings whose price_hint changed recently.

        Because price_hint is a free-text field, we detect changes by
        checking if the listing was updated within the given window.
        Returns a list of dicts with user and listing info.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        result = await db.execute(
            select(Favorite, Listing, User)
            .join(Listing, Favorite.listing_id == Listing.id)
            .join(User, Favorite.user_id == User.id)
            .where(
                Listing.status == ListingStatus.ACTIVE,
                Listing.updated_at >= cutoff,
                Listing.price_hint.isnot(None),
            )
        )

        alerts = []
        seen = set()
        for fav, listing, user in result.all():
            key = (str(user.id), str(listing.id))
            if key in seen:
                continue
            seen.add(key)

            prefs = await db.scalar(
                select(NotificationPreference).where(
                    NotificationPreference.user_id == user.id
                )
            )
            if prefs and not prefs.email_price_drops:
                continue

            alerts.append({
                "user_id": str(user.id),
                "user_email": user.email,
                "user_name": user.display_name,
                "listing_id": str(listing.id),
                "listing_title": listing.title,
                "price_hint": listing.price_hint,
            })

        return alerts

    async def get_users_due_for_digest(
        self,
        db: AsyncSession,
        frequency: str,
    ) -> list[dict]:
        """Find users who are due for a digest email.

        Args:
            db: Database session
            frequency: "daily" or "weekly"

        Returns:
            List of dicts with user_id, email, display_name.
        """
        now = datetime.now(timezone.utc)
        if frequency == "daily":
            interval = timedelta(hours=23)
        else:
            interval = timedelta(days=6, hours=23)

        freq_enum = (
            DigestFrequency.DAILY if frequency == "daily"
            else DigestFrequency.WEEKLY
        )

        result = await db.execute(
            select(User, NotificationPreference)
            .join(
                NotificationPreference,
                NotificationPreference.user_id == User.id,
            )
            .where(
                User.status == UserStatus.ACTIVE,
                User.email_verified.is_(True),
                NotificationPreference.digest_frequency == freq_enum,
                (
                    (NotificationPreference.digest_last_sent_at.is_(None))
                    | (NotificationPreference.digest_last_sent_at < now - interval)
                ),
            )
        )

        users = []
        for user, prefs in result.all():
            users.append({
                "user_id": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "engagement_score": prefs.engagement_score,
            })

        return users

    async def update_digest_sent(
        self,
        db: AsyncSession,
        user_id: str,
    ) -> None:
        """Mark that a digest was sent to a user."""
        prefs = await db.scalar(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        if prefs:
            prefs.digest_last_sent_at = datetime.now(timezone.utc)
            prefs.emails_sent_count += 1
            await db.commit()

    async def update_engagement(
        self,
        db: AsyncSession,
        user_id: str,
        opened: bool = False,
    ) -> None:
        """Update engagement tracking when an email is opened or sent."""
        prefs = await db.scalar(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        if not prefs:
            return

        if opened:
            prefs.emails_opened_count += 1
            prefs.last_email_opened_at = datetime.now(timezone.utc)

        user = await db.get(User, user_id)
        prefs.engagement_score = self.calculate_engagement_score(
            prefs.emails_sent_count,
            prefs.emails_opened_count,
            user.last_active_at if user else None,
        )
        await db.commit()

    # ── Private: data queries ──────────────────────────────────

    async def _get_new_campus_listings(
        self, db: AsyncSession, user: User, cutoff: datetime
    ) -> list:
        result = await db.execute(
            select(Listing)
            .where(
                Listing.campus_id == user.campus_id,
                Listing.status == ListingStatus.ACTIVE,
                Listing.created_at >= cutoff,
                Listing.user_id != user.id,
            )
            .order_by(Listing.created_at.desc())
            .limit(MAX_DIGEST_LISTINGS)
        )
        return list(result.scalars().all())

    async def _get_unread_message_count(
        self, db: AsyncSession, user_id: str
    ) -> int:
        result = await db.execute(
            select(func.count(Message.id))
            .join(MessageThread, Message.thread_id == MessageThread.id)
            .where(
                (
                    (MessageThread.initiator_id == user_id)
                    | (MessageThread.recipient_id == user_id)
                ),
                Message.sender_id != user_id,
                Message.is_read.is_(False),
            )
        )
        return result.scalar() or 0

    async def _get_favorited_listing_updates(
        self, db: AsyncSession, user_id: str, cutoff: datetime
    ) -> list:
        result = await db.execute(
            select(Listing)
            .join(Favorite, Favorite.listing_id == Listing.id)
            .where(
                Favorite.user_id == user_id,
                Listing.updated_at >= cutoff,
                Listing.status == ListingStatus.ACTIVE,
            )
        )
        return list(result.scalars().all())

    async def _get_user_expiring_listings(
        self, db: AsyncSession, user_id: str
    ) -> list:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(Listing)
            .where(
                Listing.user_id == user_id,
                Listing.status == ListingStatus.ACTIVE,
                Listing.expires_at >= now,
                Listing.expires_at < now + timedelta(days=5),
            )
        )
        return list(result.scalars().all())

    # ── Private: AI content generation ─────────────────────────

    async def _ai_generate_digest_content(
        self,
        user_name: str,
        frequency: str,
        stats: dict,
        listings: list[dict],
        expiring: list[dict],
    ) -> dict:
        """Use AI to generate digest email content."""
        prompt = f"""Generate a personalized {frequency} digest email for a campus marketplace user.

User name: {user_name}
Period: Last {"day" if frequency == "daily" else "week"}

Stats:
- New listings on campus: {stats['new_listings_count']}
- Unread messages: {stats['unread_messages']}
- Updates to favorited items: {stats['favorited_updates_count']}
- Your listings expiring soon: {stats['expiring_listings_count']}

New listings on campus (sample):
{json.dumps(listings[:5], indent=2) if listings else "None this period"}

Your expiring listings:
{json.dumps(expiring, indent=2) if expiring else "None"}

Return JSON with keys: subject, body_html, body_text
- subject: Catchy, concise email subject line (under 60 chars)
- body_html: Clean HTML email body with the digest summary (use <h2>, <p>, <ul> tags)
- body_text: Plain text version of the email
- Keep the tone friendly, student-appropriate, and concise
- Include a call-to-action to visit the marketplace
- If there are expiring listings, emphasize them with engagement stats"""

        system = (
            "You are a campus marketplace email copywriter. "
            "Generate engaging, concise digest emails. "
            "Respond with valid JSON only."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt, system=system, max_tokens=800
            )
            return self._parse_json_response(response.content, {
                "subject": self._fallback_digest_subject(frequency, stats),
                "body_html": "",
                "body_text": "",
            })
        except Exception:
            logger.exception("[SMART_NOTIF] AI digest generation failed")
            return self._fallback_digest_content(
                user_name, frequency, stats, listings, expiring
            )

    async def _ai_generate_re_engagement(
        self,
        user_name: str,
        days_inactive: int,
        campus_name: str,
    ) -> dict:
        """Use AI to generate a re-engagement email."""
        prompt = f"""Generate a re-engagement email for an inactive campus marketplace user.

User name: {user_name}
Days inactive: {days_inactive}
Campus: {campus_name}

Return JSON with keys: subject, body
- subject: Catchy subject line to get them back (under 60 chars)
- body: Friendly email body encouraging them to return
- Mention new listings, messaging features, or seasonal activity
- Keep it short and non-pushy
- Do NOT use guilt or negative language"""

        system = (
            "You are a campus marketplace email copywriter. "
            "Generate friendly re-engagement emails. "
            "Respond with valid JSON only."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt, system=system, max_tokens=400
            )
            return self._parse_json_response(response.content, {
                "subject": f"We miss you, {user_name}!",
                "body": "",
            })
        except Exception:
            logger.exception("[SMART_NOTIF] AI re-engagement generation failed")
            return self._fallback_re_engagement(
                user_name, days_inactive, campus_name
            )

    async def _ai_generate_expiry_nudge(
        self,
        listing_title: str,
        view_count: int,
        message_count: int,
        days_until_expiry: int,
        user_name: str,
    ) -> dict:
        """Use AI to generate an expiry nudge email."""
        prompt = f"""Generate an expiry nudge email for a campus marketplace listing.

User name: {user_name}
Listing title: {listing_title}
Views: {view_count}
Messages received: {message_count}
Days until expiry: {days_until_expiry}

Return JSON with keys: subject, body
- subject: Urgent but friendly subject about the expiring listing (under 60 chars)
- body: Email body with engagement stats to motivate renewal
- If the listing has high engagement, emphasize that
- If low engagement, suggest improvements
- Include a call-to-action to renew the listing"""

        system = (
            "You are a campus marketplace email copywriter. "
            "Generate helpful listing expiry nudge emails. "
            "Respond with valid JSON only."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt, system=system, max_tokens=400
            )
            return self._parse_json_response(response.content, {
                "subject": f"Your listing expires in {days_until_expiry} days",
                "body": "",
            })
        except Exception:
            logger.exception("[SMART_NOTIF] AI expiry nudge generation failed")
            return self._fallback_expiry_nudge(
                listing_title, view_count, message_count,
                days_until_expiry, user_name
            )

    # ── Private: fallback content (no AI) ──────────────────────

    def _fallback_digest_subject(self, frequency: str, stats: dict) -> str:
        period = "today" if frequency == "daily" else "this week"
        count = stats["new_listings_count"]
        if count > 0:
            return f"{count} new listing{'s' if count != 1 else ''} on campus {period}"
        return f"Your {frequency} GimmeDat digest"

    def _fallback_digest_content(
        self,
        user_name: str,
        frequency: str,
        stats: dict,
        listings: list[dict],
        expiring: list[dict],
    ) -> dict:
        subject = self._fallback_digest_subject(frequency, stats)
        period = "today" if frequency == "daily" else "this week"

        lines = [f"Hi {user_name},\n"]
        lines.append(f"Here's what's new on GimmeDat {period}:\n")

        if stats["new_listings_count"] > 0:
            lines.append(
                f"- {stats['new_listings_count']} new listing"
                f"{'s' if stats['new_listings_count'] != 1 else ''} on your campus"
            )
        if stats["unread_messages"] > 0:
            lines.append(
                f"- {stats['unread_messages']} unread message"
                f"{'s' if stats['unread_messages'] != 1 else ''}"
            )
        if stats["favorited_updates_count"] > 0:
            lines.append(
                f"- {stats['favorited_updates_count']} update"
                f"{'s' if stats['favorited_updates_count'] != 1 else ''} "
                "to items you're watching"
            )

        if expiring:
            lines.append("\nListings expiring soon:")
            for item in expiring:
                lines.append(
                    f"  - \"{item['title']}\" "
                    f"({item.get('view_count', 0)} views, "
                    f"{item.get('message_count', 0)} messages)"
                )

        if listings:
            lines.append("\nNew on campus:")
            for item in listings[:5]:
                price = f" - {item['price_hint']}" if item.get("price_hint") else ""
                lines.append(f"  - {item['title']}{price}")

        lines.append("\nVisit GimmeDat to see more!")

        body_text = "\n".join(lines)
        body_html = body_text.replace("\n", "<br>")

        return {
            "subject": subject,
            "body_html": f"<div>{body_html}</div>",
            "body_text": body_text,
        }

    def _fallback_re_engagement(
        self,
        user_name: str,
        days_inactive: int,
        campus_name: str,
    ) -> dict:
        subject = f"What's new on GimmeDat at {campus_name}"
        body = (
            f"Hi {user_name},\n\n"
            f"It's been a while since you visited GimmeDat! "
            f"There are new listings and conversations happening "
            f"at {campus_name}.\n\n"
            f"Come check out what's available — you might find "
            f"exactly what you're looking for.\n\n"
            f"See you on GimmeDat!"
        )
        return {"subject": subject, "body": body}

    def _fallback_expiry_nudge(
        self,
        listing_title: str,
        view_count: int,
        message_count: int,
        days_until_expiry: int,
        user_name: str,
    ) -> dict:
        subject = f"Your listing \"{listing_title}\" expires in {days_until_expiry} days"

        engagement = ""
        if view_count > 0 or message_count > 0:
            engagement = (
                f"Your listing has received {view_count} view"
                f"{'s' if view_count != 1 else ''} and "
                f"{message_count} message"
                f"{'s' if message_count != 1 else ''}. "
            )

        body = (
            f"Hi {user_name},\n\n"
            f"Your listing \"{listing_title}\" will expire in "
            f"{days_until_expiry} day{'s' if days_until_expiry != 1 else ''}.\n\n"
            f"{engagement}"
            f"Renew it now to keep it visible to other students!\n\n"
            f"Visit GimmeDat to renew your listing."
        )
        return {"subject": subject, "body": body}

    def _empty_digest(self, frequency: str) -> dict:
        return {
            "user_id": None,
            "user_email": None,
            "user_name": None,
            "frequency": frequency,
            "subject": f"Your {frequency} GimmeDat digest",
            "body_html": "",
            "body_text": "",
            "stats": {
                "new_listings_count": 0,
                "unread_messages": 0,
                "favorited_updates_count": 0,
                "expiring_listings_count": 0,
                "period": frequency,
                "period_days": 1 if frequency == "daily" else 7,
            },
            "new_listings": [],
            "expiring_listings": [],
        }

    # ── Private: JSON parsing helper ───────────────────────────

    def _parse_json_response(self, content: str, fallback: dict) -> dict:
        """Parse a JSON response from AI, handling markdown code fences."""
        if not content:
            return fallback

        text = content.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last lines (code fence markers)
            if len(lines) >= 3:
                text = "\n".join(lines[1:-1]).strip()
            else:
                text = "\n".join(lines[1:]).strip()

        try:
            result = json.loads(text)
            if isinstance(result, dict):
                # Ensure all fallback keys exist
                for key in fallback:
                    if key not in result:
                        result[key] = fallback[key]
                return result
            return fallback
        except (json.JSONDecodeError, ValueError):
            return fallback
