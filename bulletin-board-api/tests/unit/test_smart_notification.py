"""Comprehensive unit tests for SmartNotificationService and email templates."""

import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.smart_notification_service import (
    HIGH_ENGAGEMENT_THRESHOLD,
    LOW_ENGAGEMENT_THRESHOLD,
    MAX_DIGEST_LISTINGS,
    MAX_DIGEST_MESSAGES,
    RE_ENGAGEMENT_INACTIVE_DAYS,
    SmartNotificationService,
)

# ── Fixtures ──────────────────────────────────────────────────────


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.anthropic_api_key = "test-key"
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    settings.frontend_url = "http://localhost:3000"
    return settings


@pytest.fixture
def mock_ai_service(mock_settings):
    ai = MagicMock()
    ai.enabled = True
    ai.settings = mock_settings
    return ai


@pytest.fixture
def disabled_ai_service(mock_settings):
    ai = MagicMock()
    ai.enabled = False
    ai.settings = mock_settings
    return ai


@pytest.fixture
def service(mock_ai_service, mock_settings):
    return SmartNotificationService(mock_ai_service, mock_settings)


@pytest.fixture
def disabled_service(disabled_ai_service, mock_settings):
    return SmartNotificationService(disabled_ai_service, mock_settings)


def _make_user(
    display_name="Test User",
    email="test@college.edu",
    campus_name="Gettysburg College",
    campus_id="campus-1",
    last_active_at=None,
    email_verified=True,
    status="active",
):
    user = MagicMock()
    user.id = "user-1"
    user.display_name = display_name
    user.email = email
    user.email_verified = email_verified
    user.campus_id = campus_id
    user.campus = MagicMock()
    user.campus.name = campus_name
    user.last_active_at = last_active_at
    user.status = status
    return user


def _make_prefs(
    digest_frequency="weekly",
    email_price_drops=True,
    email_listing_expiry=True,
    email_recommendations=False,
    email_marketing=True,
    quiet_hours_start=None,
    quiet_hours_end=None,
    engagement_score=1.0,
    emails_sent_count=0,
    emails_opened_count=0,
    digest_last_sent_at=None,
    last_email_opened_at=None,
    last_digest_opened_at=None,
):
    prefs = MagicMock()
    prefs.digest_frequency = digest_frequency
    prefs.email_price_drops = email_price_drops
    prefs.email_listing_expiry = email_listing_expiry
    prefs.email_recommendations = email_recommendations
    prefs.email_marketing = email_marketing
    prefs.quiet_hours_start = quiet_hours_start
    prefs.quiet_hours_end = quiet_hours_end
    prefs.engagement_score = engagement_score
    prefs.emails_sent_count = emails_sent_count
    prefs.emails_opened_count = emails_opened_count
    prefs.digest_last_sent_at = digest_last_sent_at
    prefs.last_email_opened_at = last_email_opened_at
    prefs.last_digest_opened_at = last_digest_opened_at
    return prefs


def _make_listing(
    title="Test Listing",
    price_hint="$20",
    listing_type="item",
    view_count=10,
    message_count=2,
    expires_at=None,
    status="active",
    campus_id="campus-1",
    user_id="user-1",
    category_id="cat-1",
):
    listing = MagicMock()
    listing.id = "listing-1"
    listing.title = title
    listing.price_hint = price_hint
    listing.type = MagicMock()
    listing.type.value = listing_type
    listing.view_count = view_count
    listing.message_count = message_count
    listing.expires_at = expires_at or (datetime.now(timezone.utc) + timedelta(days=3))
    listing.status = status
    listing.campus_id = campus_id
    listing.user_id = user_id
    listing.category_id = category_id
    listing.updated_at = datetime.now(timezone.utc)
    listing.created_at = datetime.now(timezone.utc)
    return listing


# ── Service properties ────────────────────────────────────────────


class TestServiceProperties:
    def test_enabled_when_ai_available(self, service):
        assert service.enabled is True

    def test_disabled_when_ai_unavailable(self, disabled_service):
        assert disabled_service.enabled is False


# ── Quiet hours / smart timing ────────────────────────────────────


class TestQuietHours:
    def test_no_quiet_hours_set(self, service):
        assert service.is_within_quiet_hours(None, None, current_hour=14) is False

    def test_start_none_only(self, service):
        assert service.is_within_quiet_hours(None, 8, current_hour=3) is False

    def test_end_none_only(self, service):
        assert service.is_within_quiet_hours(22, None, current_hour=23) is False

    def test_within_simple_range(self, service):
        # Quiet from 22 to 23, currently 22 -> within quiet hours
        assert service.is_within_quiet_hours(22, 23, current_hour=22) is True

    def test_outside_simple_range(self, service):
        assert service.is_within_quiet_hours(22, 23, current_hour=21) is False

    def test_wraps_midnight_within(self, service):
        # Quiet from 22 to 8, currently 23 -> within
        assert service.is_within_quiet_hours(22, 8, current_hour=23) is True

    def test_wraps_midnight_within_early(self, service):
        # Quiet from 22 to 8, currently 3 -> within
        assert service.is_within_quiet_hours(22, 8, current_hour=3) is True

    def test_wraps_midnight_outside(self, service):
        # Quiet from 22 to 8, currently 10 -> outside
        assert service.is_within_quiet_hours(22, 8, current_hour=10) is False

    def test_wraps_midnight_boundary_start(self, service):
        # Quiet from 22 to 8, currently 22 -> within
        assert service.is_within_quiet_hours(22, 8, current_hour=22) is True

    def test_wraps_midnight_boundary_end(self, service):
        # Quiet from 22 to 8, currently 8 -> outside
        assert service.is_within_quiet_hours(22, 8, current_hour=8) is False

    def test_same_start_and_end(self, service):
        # Start equals end means no range (0 hours quiet)
        assert service.is_within_quiet_hours(10, 10, current_hour=10) is False


# ── Engagement score calculation ──────────────────────────────────


class TestEngagementScore:
    def test_new_user_default_score(self, service):
        assert service.calculate_engagement_score(0, 0, None) == 1.0

    def test_perfect_open_rate_recent_activity(self, service):
        now = datetime.now(timezone.utc)
        score = service.calculate_engagement_score(10, 10, now)
        assert score > 0.9

    def test_zero_open_rate(self, service):
        now = datetime.now(timezone.utc) - timedelta(days=1)
        score = service.calculate_engagement_score(10, 0, now)
        assert score < 0.5

    def test_no_activity_at_all(self, service):
        score = service.calculate_engagement_score(10, 0, None)
        assert score == 0.0

    def test_old_activity_decays(self, service):
        old = datetime.now(timezone.utc) - timedelta(days=30)
        score = service.calculate_engagement_score(10, 10, old)
        # Open rate = 1.0 * 0.6 = 0.6, recency = ~0 * 0.4 = ~0
        assert score <= 0.7

    def test_recent_activity_boosts(self, service):
        recent = datetime.now(timezone.utc) - timedelta(days=1)
        score = service.calculate_engagement_score(10, 5, recent)
        # Open rate = 0.5 * 0.6 = 0.3, recency = ~0.97 * 0.4 = ~0.39
        assert 0.5 < score < 0.8

    def test_capped_at_one(self, service):
        now = datetime.now(timezone.utc)
        score = service.calculate_engagement_score(5, 20, now)
        assert score <= 1.0

    def test_never_negative(self, service):
        old = datetime.now(timezone.utc) - timedelta(days=365)
        score = service.calculate_engagement_score(100, 0, old)
        assert score >= 0.0

    def test_naive_datetime_handled(self, service):
        # last_active_at without timezone info
        naive = datetime.now() - timedelta(days=5)
        score = service.calculate_engagement_score(10, 5, naive)
        assert 0.0 <= score <= 1.0


# ── JSON parsing ──────────────────────────────────────────────────


class TestJsonParsing:
    def test_valid_json(self, service):
        result = service._parse_json_response(
            '{"subject": "Test", "body_html": "<p>Hi</p>"}',
            {"subject": "Fallback", "body_html": ""},
        )
        assert result["subject"] == "Test"

    def test_code_fence_json(self, service):
        text = '```json\n{"subject": "Test"}\n```'
        result = service._parse_json_response(
            text, {"subject": "Fallback", "body_html": ""}
        )
        assert result["subject"] == "Test"

    def test_plain_fence_json(self, service):
        text = '```\n{"subject": "Test"}\n```'
        result = service._parse_json_response(
            text, {"subject": "Fallback", "body_html": ""}
        )
        assert result["subject"] == "Test"

    def test_invalid_json_returns_fallback(self, service):
        result = service._parse_json_response(
            "not json at all",
            {"subject": "Fallback"},
        )
        assert result["subject"] == "Fallback"

    def test_empty_string_returns_fallback(self, service):
        result = service._parse_json_response(
            "", {"subject": "Fallback"}
        )
        assert result["subject"] == "Fallback"

    def test_none_returns_fallback(self, service):
        result = service._parse_json_response(
            None, {"subject": "Fallback"}
        )
        assert result["subject"] == "Fallback"

    def test_array_json_returns_fallback(self, service):
        result = service._parse_json_response(
            '[1, 2, 3]', {"subject": "Fallback"}
        )
        assert result["subject"] == "Fallback"

    def test_missing_keys_filled_from_fallback(self, service):
        result = service._parse_json_response(
            '{"subject": "Test"}',
            {"subject": "Fallback", "body_html": "<p>Default</p>"},
        )
        assert result["subject"] == "Test"
        assert result["body_html"] == "<p>Default</p>"


# ── Fallback digest content ───────────────────────────────────────


class TestFallbackDigest:
    def test_fallback_subject_with_listings(self, service):
        stats = {"new_listings_count": 5}
        subject = service._fallback_digest_subject("weekly", stats)
        assert "5 new listings" in subject

    def test_fallback_subject_single_listing(self, service):
        stats = {"new_listings_count": 1}
        subject = service._fallback_digest_subject("weekly", stats)
        assert "1 new listing " in subject
        assert "listings" not in subject  # no plural

    def test_fallback_subject_no_listings(self, service):
        stats = {"new_listings_count": 0}
        subject = service._fallback_digest_subject("daily", stats)
        assert "daily" in subject.lower()

    def test_fallback_content_includes_stats(self, service):
        stats = {
            "new_listings_count": 3,
            "unread_messages": 2,
            "favorited_updates_count": 1,
            "expiring_listings_count": 0,
        }
        result = service._fallback_digest_content(
            "Alice", "weekly", stats, [], []
        )
        assert "Alice" in result["body_text"]
        assert "3 new listing" in result["body_text"]
        assert "2 unread message" in result["body_text"]

    def test_fallback_content_includes_listings(self, service):
        stats = {
            "new_listings_count": 1,
            "unread_messages": 0,
            "favorited_updates_count": 0,
            "expiring_listings_count": 0,
        }
        listings = [{"title": "Textbook", "price_hint": "$25", "type": "item"}]
        result = service._fallback_digest_content(
            "Bob", "daily", stats, listings, []
        )
        assert "Textbook" in result["body_text"]
        assert "$25" in result["body_text"]

    def test_fallback_content_includes_expiring(self, service):
        stats = {
            "new_listings_count": 0,
            "unread_messages": 0,
            "favorited_updates_count": 0,
            "expiring_listings_count": 1,
        }
        expiring = [{
            "title": "Old Lamp",
            "view_count": 10,
            "message_count": 3,
        }]
        result = service._fallback_digest_content(
            "Carol", "weekly", stats, [], expiring
        )
        assert "Old Lamp" in result["body_text"]
        assert "10 views" in result["body_text"]

    def test_fallback_content_has_html(self, service):
        stats = {
            "new_listings_count": 0,
            "unread_messages": 0,
            "favorited_updates_count": 0,
            "expiring_listings_count": 0,
        }
        result = service._fallback_digest_content(
            "Dave", "weekly", stats, [], []
        )
        assert "<div>" in result["body_html"]
        assert result["subject"] != ""

    def test_empty_digest_structure(self, service):
        result = service._empty_digest("weekly")
        assert result["user_id"] is None
        assert result["frequency"] == "weekly"
        assert result["stats"]["period_days"] == 7

    def test_empty_digest_daily(self, service):
        result = service._empty_digest("daily")
        assert result["stats"]["period_days"] == 1


# ── Fallback re-engagement ────────────────────────────────────────


class TestFallbackReEngagement:
    def test_fallback_re_engagement_content(self, service):
        result = service._fallback_re_engagement("Eve", 14, "Gettysburg College")
        assert "Eve" in result["body"]
        assert "Gettysburg College" in result["body"]
        assert "subject" in result

    def test_fallback_re_engagement_subject(self, service):
        result = service._fallback_re_engagement("Frank", 30, "Penn State")
        assert "Penn State" in result["subject"]


# ── Fallback expiry nudge ─────────────────────────────────────────


class TestFallbackExpiryNudge:
    def test_fallback_with_engagement(self, service):
        result = service._fallback_expiry_nudge(
            "Old Bike", 50, 5, 3, "Grace"
        )
        assert "Old Bike" in result["subject"]
        assert "50 view" in result["body"]
        assert "5 message" in result["body"]
        assert "Grace" in result["body"]

    def test_fallback_no_engagement(self, service):
        result = service._fallback_expiry_nudge(
            "Desk Chair", 0, 0, 1, "Hank"
        )
        assert "Desk Chair" in result["subject"]
        assert "1 day" in result["body"]
        assert "Hank" in result["body"]

    def test_fallback_single_day(self, service):
        result = service._fallback_expiry_nudge(
            "Lamp", 5, 1, 1, "Ivy"
        )
        # "1 day" not "1 days"
        assert "1 day." in result["body"] or "1 day\n" in result["body"]


# ── AI digest generation ──────────────────────────────────────────


class TestAIDigestGeneration:
    @pytest.mark.asyncio
    async def test_ai_digest_success(self, service):
        service.ai.structured_output = AsyncMock(
            return_value=MagicMock(
                content=json.dumps({
                    "subject": "AI Generated Subject",
                    "body_html": "<p>AI content</p>",
                    "body_text": "AI content",
                })
            )
        )

        result = await service._ai_generate_digest_content(
            "Alice", "weekly",
            {"new_listings_count": 5, "unread_messages": 2,
             "favorited_updates_count": 1, "expiring_listings_count": 0},
            [{"title": "Book", "price_hint": "$10", "type": "item"}],
            [],
        )
        assert result["subject"] == "AI Generated Subject"
        service.ai.structured_output.assert_called_once()

    @pytest.mark.asyncio
    async def test_ai_digest_fallback_on_error(self, service):
        service.ai.structured_output = AsyncMock(side_effect=Exception("API error"))

        result = await service._ai_generate_digest_content(
            "Bob", "daily",
            {"new_listings_count": 0, "unread_messages": 0,
             "favorited_updates_count": 0, "expiring_listings_count": 0},
            [], [],
        )
        assert "subject" in result
        assert "body_text" in result


class TestAIReEngagement:
    @pytest.mark.asyncio
    async def test_ai_re_engagement_success(self, service):
        service.ai.structured_output = AsyncMock(
            return_value=MagicMock(
                content=json.dumps({
                    "subject": "Come back!",
                    "body": "We miss you.",
                })
            )
        )
        result = await service._ai_generate_re_engagement("Eve", 14, "Gettysburg")
        assert result["subject"] == "Come back!"

    @pytest.mark.asyncio
    async def test_ai_re_engagement_fallback_on_error(self, service):
        service.ai.structured_output = AsyncMock(side_effect=Exception("API error"))
        result = await service._ai_generate_re_engagement("Frank", 14, "Penn State")
        assert "subject" in result
        assert "Penn State" in result["subject"]


class TestAIExpiryNudge:
    @pytest.mark.asyncio
    async def test_ai_expiry_nudge_success(self, service):
        service.ai.structured_output = AsyncMock(
            return_value=MagicMock(
                content=json.dumps({
                    "subject": "Your listing needs attention!",
                    "body": "Renew now.",
                })
            )
        )
        result = await service._ai_generate_expiry_nudge(
            "Desk", 100, 5, 2, "Grace"
        )
        assert result["subject"] == "Your listing needs attention!"

    @pytest.mark.asyncio
    async def test_ai_expiry_nudge_fallback(self, service):
        service.ai.structured_output = AsyncMock(side_effect=Exception("fail"))
        result = await service._ai_generate_expiry_nudge(
            "Chair", 0, 0, 3, "Hank"
        )
        assert "Chair" in result["subject"]


# ── Full generate_digest integration ──────────────────────────────


class TestGenerateDigest:
    @pytest.mark.asyncio
    async def test_digest_returns_empty_for_missing_user(self, service):
        db = AsyncMock()
        db.get = AsyncMock(return_value=None)

        result = await service.generate_digest(db, "nonexistent")
        assert result["user_id"] is None
        assert result["new_listings"] == []

    @pytest.mark.asyncio
    async def test_digest_with_ai_disabled(self, disabled_service):
        user = _make_user()
        db = AsyncMock()
        db.get = AsyncMock(return_value=user)
        db.scalar = AsyncMock(return_value=_make_prefs())
        # Mock the data queries to return empty
        db.execute = AsyncMock(return_value=MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
            scalar=MagicMock(return_value=0),
            all=MagicMock(return_value=[]),
        ))

        result = await disabled_service.generate_digest(db, "user-1")
        assert result["user_id"] == "user-1"
        assert result["frequency"] == "weekly"
        assert "subject" in result


class TestGenerateReEngagementMessage:
    @pytest.mark.asyncio
    async def test_with_ai_enabled(self, service):
        service.ai.structured_output = AsyncMock(
            return_value=MagicMock(
                content=json.dumps({
                    "subject": "Miss you!",
                    "body": "Come back.",
                })
            )
        )
        result = await service.generate_re_engagement_message(
            "Alice", 14, "Gettysburg"
        )
        assert result["subject"] == "Miss you!"

    @pytest.mark.asyncio
    async def test_with_ai_disabled(self, disabled_service):
        result = await disabled_service.generate_re_engagement_message(
            "Bob", 14, "Penn State"
        )
        assert "Penn State" in result["subject"]

    @pytest.mark.asyncio
    async def test_with_ai_error(self, service):
        service.ai.structured_output = AsyncMock(side_effect=Exception("fail"))
        result = await service.generate_re_engagement_message(
            "Carol", 30, "Gettysburg"
        )
        assert "subject" in result


class TestGenerateExpiryNudgeMessage:
    @pytest.mark.asyncio
    async def test_with_ai_enabled(self, service):
        service.ai.structured_output = AsyncMock(
            return_value=MagicMock(
                content=json.dumps({
                    "subject": "Renew now!",
                    "body": "Your listing is popular.",
                })
            )
        )
        result = await service.generate_expiry_nudge_message(
            "Old Bike", 50, 5, 3, "Alice"
        )
        assert result["subject"] == "Renew now!"

    @pytest.mark.asyncio
    async def test_with_ai_disabled(self, disabled_service):
        result = await disabled_service.generate_expiry_nudge_message(
            "Desk", 10, 2, 3, "Bob"
        )
        assert "Desk" in result["subject"]


# ── Update engagement ─────────────────────────────────────────────


class TestUpdateEngagement:
    @pytest.mark.asyncio
    async def test_update_opened(self, service):
        prefs = _make_prefs(emails_sent_count=5, emails_opened_count=2)
        user = _make_user(last_active_at=datetime.now(timezone.utc))
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=prefs)
        db.get = AsyncMock(return_value=user)

        await service.update_engagement(db, "user-1", opened=True)
        assert prefs.emails_opened_count == 3
        assert prefs.last_email_opened_at is not None

    @pytest.mark.asyncio
    async def test_update_no_prefs(self, service):
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=None)
        # Should not raise
        await service.update_engagement(db, "user-1", opened=True)


class TestUpdateDigestSent:
    @pytest.mark.asyncio
    async def test_marks_digest_sent(self, service):
        prefs = _make_prefs(emails_sent_count=5)
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=prefs)

        await service.update_digest_sent(db, "user-1")
        assert prefs.digest_last_sent_at is not None
        assert prefs.emails_sent_count == 6
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_prefs(self, service):
        db = AsyncMock()
        db.scalar = AsyncMock(return_value=None)
        await service.update_digest_sent(db, "user-1")
        db.commit.assert_not_called()


# ── Constants ─────────────────────────────────────────────────────


class TestConstants:
    def test_engagement_thresholds(self):
        assert HIGH_ENGAGEMENT_THRESHOLD > LOW_ENGAGEMENT_THRESHOLD
        assert 0.0 <= LOW_ENGAGEMENT_THRESHOLD <= 1.0
        assert 0.0 <= HIGH_ENGAGEMENT_THRESHOLD <= 1.0

    def test_re_engagement_threshold(self):
        assert RE_ENGAGEMENT_INACTIVE_DAYS > 0

    def test_digest_limits(self):
        assert MAX_DIGEST_LISTINGS > 0
        assert MAX_DIGEST_MESSAGES > 0


# ── Email templates ───────────────────────────────────────────────


class TestEmailTemplates:
    def test_digest_email_template(self):
        from app.services.email_templates import digest_email

        html, plain = digest_email(
            display_name="Alice",
            subject="Weekly Digest",
            body_html="<p>New listings!</p>",
            body_text="New listings!",
            cta_url="http://localhost:3000/listings",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "Alice" in html
        assert "New listings!" in html
        assert "Browse Listings" in html
        assert "Alice" in plain
        assert "New listings!" in plain

    def test_expiry_nudge_email_template(self):
        from app.services.email_templates import expiry_nudge_email

        html, plain = expiry_nudge_email(
            display_name="Bob",
            listing_title="Old Bike",
            days_until_expiry=3,
            view_count=50,
            message_count=5,
            renew_url="http://localhost:3000/listings/123/renew",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "Bob" in html
        assert "Old Bike" in html
        assert "50" in html  # view count
        assert "5" in html  # message count
        assert "Renew Listing" in html
        assert "Old Bike" in plain

    def test_expiry_nudge_no_engagement(self):
        from app.services.email_templates import expiry_nudge_email

        html, plain = expiry_nudge_email(
            display_name="Carol",
            listing_title="Lamp",
            days_until_expiry=1,
            view_count=0,
            message_count=0,
            renew_url="http://localhost:3000/listings/456/renew",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "1 day" in html
        assert "Renew Listing" in html

    def test_price_drop_alert_email_template(self):
        from app.services.email_templates import price_drop_alert_email

        html, plain = price_drop_alert_email(
            display_name="Dave",
            listing_title="Textbook",
            price_hint="$15 (was $25)",
            listing_url="http://localhost:3000/listings/789",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "Dave" in html
        assert "Textbook" in html
        assert "$15 (was $25)" in html
        assert "View Listing" in html
        assert "Textbook" in plain

    def test_price_drop_alert_no_price(self):
        from app.services.email_templates import price_drop_alert_email

        html, plain = price_drop_alert_email(
            display_name="Eve",
            listing_title="Mystery Item",
            price_hint="",
            listing_url="http://localhost:3000/listings/000",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "Updated price" in html

    def test_re_engagement_email_template(self):
        from app.services.email_templates import re_engagement_email

        html, plain = re_engagement_email(
            display_name="Frank",
            subject="We miss you!",
            body="Hey Frank, come check out new listings.",
            cta_url="http://localhost:3000/listings",
            settings_url="http://localhost:3000/profile/settings",
        )
        assert "Frank" in plain
        assert "come check out" in html
        assert "See What is New" in html

    def test_all_templates_return_tuples(self):
        from app.services.email_templates import (
            digest_email,
            expiry_nudge_email,
            price_drop_alert_email,
            re_engagement_email,
        )

        for fn, kwargs in [
            (digest_email, {
                "display_name": "X", "subject": "S", "body_html": "H",
                "body_text": "T", "cta_url": "U", "settings_url": "S",
            }),
            (expiry_nudge_email, {
                "display_name": "X", "listing_title": "L",
                "days_until_expiry": 3, "view_count": 0,
                "message_count": 0, "renew_url": "U", "settings_url": "S",
            }),
            (price_drop_alert_email, {
                "display_name": "X", "listing_title": "L",
                "price_hint": "P", "listing_url": "U", "settings_url": "S",
            }),
            (re_engagement_email, {
                "display_name": "X", "subject": "S", "body": "B",
                "cta_url": "U", "settings_url": "S",
            }),
        ]:
            result = fn(**kwargs)
            assert isinstance(result, tuple)
            assert len(result) == 2
            html, plain = result
            assert isinstance(html, str)
            assert isinstance(plain, str)
            assert "GimmeDat" in html  # base template present


# ── Notification model ────────────────────────────────────────────


class TestNotificationModel:
    def test_digest_frequency_enum(self):
        from app.models.notification import DigestFrequency

        assert DigestFrequency.NONE.value == "none"
        assert DigestFrequency.DAILY.value == "daily"
        assert DigestFrequency.WEEKLY.value == "weekly"

    def test_digest_frequency_enum_values(self):
        from app.models.notification import DigestFrequency

        values = [f.value for f in DigestFrequency]
        assert "none" in values
        assert "daily" in values
        assert "weekly" in values
        assert len(values) == 3
