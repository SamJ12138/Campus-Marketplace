"""Tests for CampusOnboardingService."""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.campus_onboarding_service import (
    DEFAULT_ITEM_CATEGORIES,
    DEFAULT_SERVICE_CATEGORIES,
    CampusOnboardingService,
)

# ── Helpers ──────────────────────────────────────────────


def _make_settings(**overrides):
    s = MagicMock()
    s.anthropic_api_key = overrides.get("api_key", None)
    s.ai_model = "claude-sonnet-4-20250514"
    s.ai_max_tokens = 1024
    return s


def _make_ai(enabled=False):
    ai = MagicMock()
    ai.enabled = enabled
    ai.structured_output = AsyncMock()
    return ai


def _make_service(ai_enabled=False, **settings_kw):
    settings = _make_settings(**settings_kw)
    ai = _make_ai(enabled=ai_enabled)
    return CampusOnboardingService(ai, settings), ai


def _mock_db():
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    return db


# ── Slug generation ──────────────────────────────────────


class TestGenerateSlug:
    def test_basic_name(self):
        assert (
            CampusOnboardingService.generate_slug("Harvard University")
            == "harvard-university"
        )

    def test_strips_special_chars(self):
        assert (
            CampusOnboardingService.generate_slug("St. Mary's College")
            == "st-marys-college"
        )

    def test_collapses_spaces(self):
        assert (
            CampusOnboardingService.generate_slug("MIT   Cambridge")
            == "mit-cambridge"
        )

    def test_strips_leading_trailing(self):
        assert (
            CampusOnboardingService.generate_slug("  Yale  ")
            == "yale"
        )

    def test_empty_string(self):
        assert CampusOnboardingService.generate_slug("") == ""

    def test_hyphens_preserved(self):
        assert (
            CampusOnboardingService.generate_slug("UNC-Chapel Hill")
            == "unc-chapel-hill"
        )


# ── Fallback landing content ────────────────────────────


class TestFallbackLandingContent:
    def test_returns_all_required_keys(self):
        content = CampusOnboardingService._fallback_landing_content(
            "Test College"
        )
        assert "headline" in content
        assert "subheadline" in content
        assert "description" in content
        assert "features" in content
        assert "seo_title" in content
        assert "seo_description" in content

    def test_includes_campus_name(self):
        content = CampusOnboardingService._fallback_landing_content(
            "Dartmouth"
        )
        assert "Dartmouth" in content["headline"]
        assert "Dartmouth" in content["description"]

    def test_features_has_three_items(self):
        content = CampusOnboardingService._fallback_landing_content(
            "Test"
        )
        assert len(content["features"]) == 3

    def test_features_have_title_and_description(self):
        content = CampusOnboardingService._fallback_landing_content(
            "Test"
        )
        for feat in content["features"]:
            assert "title" in feat
            assert "description" in feat


# ── Landing content with AI ──────────────────────────────


class TestGenerateLandingContent:
    @pytest.mark.asyncio
    async def test_fallback_when_ai_disabled(self):
        svc, ai = _make_service(ai_enabled=False)
        content = await svc._generate_landing_content("Test U")
        assert "Test U" in content["headline"]
        ai.structured_output.assert_not_called()

    @pytest.mark.asyncio
    async def test_uses_ai_when_enabled(self):
        svc, ai = _make_service(ai_enabled=True)
        ai_content = {
            "headline": "AI Headline",
            "subheadline": "AI Sub",
            "description": "AI Desc",
            "features": [
                {"title": "F1", "description": "D1"}
            ],
        }
        resp = MagicMock()
        resp.content = json.dumps(ai_content)
        ai.structured_output.return_value = resp

        content = await svc._generate_landing_content("Test U")
        assert content["headline"] == "AI Headline"
        ai.structured_output.assert_called_once()

    @pytest.mark.asyncio
    async def test_falls_back_on_ai_error(self):
        svc, ai = _make_service(ai_enabled=True)
        ai.structured_output.side_effect = Exception("API down")

        content = await svc._generate_landing_content("Test U")
        assert "Test U" in content["headline"]

    @pytest.mark.asyncio
    async def test_falls_back_on_invalid_json(self):
        svc, ai = _make_service(ai_enabled=True)
        resp = MagicMock()
        resp.content = "not valid json"
        ai.structured_output.return_value = resp

        content = await svc._generate_landing_content("Test U")
        assert "Test U" in content["headline"]

    @pytest.mark.asyncio
    async def test_falls_back_on_missing_keys(self):
        svc, ai = _make_service(ai_enabled=True)
        resp = MagicMock()
        resp.content = json.dumps({"headline": "Only this"})
        ai.structured_output.return_value = resp

        content = await svc._generate_landing_content("Test U")
        # Falls back because 'subheadline', 'description',
        # 'features' are missing
        assert "Test U" in content["headline"]


# ── Onboard campus ───────────────────────────────────────


class TestOnboardCampus:
    @pytest.mark.asyncio
    async def test_raises_on_duplicate(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = MagicMock()  # existing campus

        with pytest.raises(ValueError, match="already exists"):
            await svc.onboard_campus(
                db, name="Dup", domain="dup.edu"
            )

    @pytest.mark.asyncio
    async def test_creates_campus_with_defaults(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        result = await svc.onboard_campus(
            db, name="New College", domain="new.edu"
        )

        assert result["campus"]["name"] == "New College"
        assert result["campus"]["domain"] == "new.edu"
        assert result["campus"]["slug"] == "new-college"
        assert result["campus"]["allow_non_edu"] is False
        assert "ai-agent" in str(
            result["campus"]["settings"]
        )

    @pytest.mark.asyncio
    async def test_default_categories_count(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        result = await svc.onboard_campus(
            db, name="Test", domain="test.edu"
        )

        expected = len(DEFAULT_SERVICE_CATEGORIES) + len(
            DEFAULT_ITEM_CATEGORIES
        )
        assert result["categories_created"] == expected

    @pytest.mark.asyncio
    async def test_custom_categories_added(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        custom = [
            {"name": "Ride Share", "type": "service"},
            {"name": "Lab Equipment", "type": "item"},
        ]
        result = await svc.onboard_campus(
            db,
            name="Test",
            domain="test.edu",
            custom_categories=custom,
        )

        expected = (
            len(DEFAULT_SERVICE_CATEGORIES)
            + len(DEFAULT_ITEM_CATEGORIES)
            + 2
        )
        assert result["categories_created"] == expected

    @pytest.mark.asyncio
    async def test_settings_overrides(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        result = await svc.onboard_campus(
            db,
            name="Test",
            domain="test.edu",
            settings_overrides={"max_listings_per_user": 50},
        )

        settings = result["campus"]["settings"]
        assert settings["max_listings_per_user"] == 50
        assert settings["onboarded_via"] == "ai-agent"

    @pytest.mark.asyncio
    async def test_allow_non_edu(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        result = await svc.onboard_campus(
            db,
            name="Open U",
            domain="open.org",
            allow_non_edu=True,
        )

        assert result["campus"]["allow_non_edu"] is True

    @pytest.mark.asyncio
    async def test_landing_content_included(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        db.scalar.return_value = None

        result = await svc.onboard_campus(
            db, name="LC Test", domain="lc.edu"
        )

        lc = result["landing_content"]
        assert "headline" in lc
        assert "features" in lc
        assert len(lc["features"]) == 3


# ── Cross-campus analytics ──────────────────────────────


class TestCrossCampusAnalytics:
    @pytest.mark.asyncio
    async def test_empty_when_no_campuses(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        db.execute.return_value = mock_result

        results = await svc.get_cross_campus_analytics(db)
        assert results == []

    @pytest.mark.asyncio
    async def test_returns_metrics_per_campus(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()

        campus1 = MagicMock()
        campus1.id = uuid.uuid4()
        campus1.name = "Campus A"
        campus1.slug = "campus-a"
        campus1.is_active = True

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            campus1
        ]
        db.execute.return_value = mock_result

        # Mock scalar calls: users, listings, active, threads
        db.scalar = AsyncMock(side_effect=[10, 50, 30, 5])

        results = await svc.get_cross_campus_analytics(db)
        assert len(results) == 1
        assert results[0]["campus_name"] == "Campus A"
        assert results[0]["users"] == 10
        assert results[0]["total_listings"] == 50
        assert results[0]["active_listings"] == 30
        assert results[0]["message_threads"] == 5
        assert results[0]["engagement_rate"] == 0.5

    @pytest.mark.asyncio
    async def test_zero_users_no_division_error(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()

        campus = MagicMock()
        campus.id = uuid.uuid4()
        campus.name = "Empty Campus"
        campus.slug = "empty"
        campus.is_active = True

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            campus
        ]
        db.execute.return_value = mock_result
        db.scalar = AsyncMock(side_effect=[0, 0, 0, 0])

        results = await svc.get_cross_campus_analytics(db)
        assert results[0]["engagement_rate"] == 0.0

    @pytest.mark.asyncio
    async def test_multiple_campuses(self):
        svc, _ = _make_service(ai_enabled=False)
        db = _mock_db()

        c1 = MagicMock()
        c1.id = uuid.uuid4()
        c1.name = "Alpha"
        c1.slug = "alpha"
        c2 = MagicMock()
        c2.id = uuid.uuid4()
        c2.name = "Beta"
        c2.slug = "beta"

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            c1, c2,
        ]
        db.execute.return_value = mock_result
        # 4 scalar calls per campus
        db.scalar = AsyncMock(
            side_effect=[5, 20, 15, 3, 10, 40, 25, 8]
        )

        results = await svc.get_cross_campus_analytics(db)
        assert len(results) == 2
        assert results[0]["campus_name"] == "Alpha"
        assert results[1]["campus_name"] == "Beta"


# ── Default categories ───────────────────────────────────


class TestDefaultCategories:
    def test_service_categories_have_required_keys(self):
        for cat in DEFAULT_SERVICE_CATEGORIES:
            assert "name" in cat
            assert "slug" in cat
            assert "sort_order" in cat

    def test_item_categories_have_required_keys(self):
        for cat in DEFAULT_ITEM_CATEGORIES:
            assert "name" in cat
            assert "slug" in cat
            assert "sort_order" in cat

    def test_no_duplicate_slugs(self):
        all_slugs = [
            c["slug"]
            for c in DEFAULT_SERVICE_CATEGORIES
            + DEFAULT_ITEM_CATEGORIES
        ]
        assert len(all_slugs) == len(set(all_slugs))

    def test_total_default_count(self):
        total = len(DEFAULT_SERVICE_CATEGORIES) + len(
            DEFAULT_ITEM_CATEGORIES
        )
        assert total == 13
