import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.ai_service import AIResponse, AIService
from app.services.listing_optimizer_service import (
    COMPLETENESS_WEIGHTS,
    MIN_GOOD_DESCRIPTION_LENGTH,
    PLATFORM_CATEGORIES,
    ListingOptimizerService,
    _parse_json_response,
)

# ---- Fixtures ----


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.anthropic_api_key = "test-api-key"
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    return settings


@pytest.fixture
def mock_settings_disabled():
    settings = MagicMock()
    settings.anthropic_api_key = None
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    return settings


@pytest.fixture
def ai_service(mock_settings):
    return AIService(mock_settings)


@pytest.fixture
def ai_service_disabled(mock_settings_disabled):
    return AIService(mock_settings_disabled)


@pytest.fixture
def optimizer(ai_service):
    return ListingOptimizerService(ai_service)


@pytest.fixture
def optimizer_disabled(ai_service_disabled):
    return ListingOptimizerService(ai_service_disabled)


def _make_ai_response(data: dict) -> AIResponse:
    """Helper to create an AIResponse wrapping a JSON dict."""
    return AIResponse(
        content=json.dumps(data),
        model="claude-sonnet-4-20250514",
        usage={"input_tokens": 50, "output_tokens": 30},
        stop_reason="end_turn",
    )


# ---- JSON parsing ----


class TestParseJsonResponse:
    def test_valid_json(self):
        result = _parse_json_response('{"key": "value"}')
        assert result == {"key": "value"}

    def test_json_with_code_fence(self):
        text = '```json\n{"key": "value"}\n```'
        result = _parse_json_response(text)
        assert result == {"key": "value"}

    def test_json_with_plain_code_fence(self):
        text = '```\n{"key": "value"}\n```'
        result = _parse_json_response(text)
        assert result == {"key": "value"}

    def test_empty_string(self):
        assert _parse_json_response("") is None

    def test_whitespace_only(self):
        assert _parse_json_response("   ") is None

    def test_none_input(self):
        assert _parse_json_response(None) is None

    def test_invalid_json(self):
        assert _parse_json_response("not json") is None

    def test_json_array_returns_none(self):
        assert _parse_json_response("[1, 2, 3]") is None

    def test_json_with_surrounding_whitespace(self):
        result = _parse_json_response('  \n{"key": "value"}\n  ')
        assert result == {"key": "value"}


# ---- Service enabled/disabled ----


class TestServiceEnabled:
    def test_enabled_when_api_key_set(self, optimizer):
        assert optimizer.enabled is True

    def test_disabled_when_no_api_key(self, optimizer_disabled):
        assert optimizer_disabled.enabled is False


# ---- Suggest Description ----


class TestSuggestDescription:
    @pytest.mark.asyncio
    async def test_ai_enabled_success(self, optimizer):
        ai_response = _make_ai_response({
            "description": "Great laptop, lightly used, perfect for students.",
            "tips": ["Add photos", "Mention battery life"],
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_description(
            title="MacBook Air M2",
            listing_type="item",
            keywords=["laptop", "apple"],
            category="electronics",
        )

        assert result["description"] == "Great laptop, lightly used, perfect for students."
        assert len(result["tips"]) == 2
        optimizer.ai.structured_output.assert_called_once()

    @pytest.mark.asyncio
    async def test_ai_enabled_with_code_fence(self, optimizer):
        ai_response = AIResponse(
            content='```json\n{"description": "A nice desk.", "tips": []}\n```',
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 30},
            stop_reason="end_turn",
        )
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_description(title="Standing Desk")
        assert result["description"] == "A nice desk."

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back(self, optimizer):
        optimizer.ai.structured_output = AsyncMock(side_effect=Exception("API error"))

        result = await optimizer.suggest_description(
            title="Textbook",
            listing_type="item",
        )

        assert "Textbook" in result["description"]
        assert isinstance(result["tips"], list)

    @pytest.mark.asyncio
    async def test_disabled_uses_fallback(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_description(
            title="Calculus Tutoring",
            listing_type="service",
            keywords=["math", "calc"],
        )

        assert "calculus tutoring" in result["description"].lower()
        assert "math, calc" in result["description"]
        assert len(result["tips"]) > 0

    @pytest.mark.asyncio
    async def test_fallback_item_format(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_description(
            title="Used Textbook",
            listing_type="item",
        )
        assert "Used Textbook" in result["description"]
        assert "Message me" in result["description"]

    @pytest.mark.asyncio
    async def test_fallback_service_format(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_description(
            title="Guitar Lessons",
            listing_type="service",
        )
        assert "guitar lessons" in result["description"].lower()

    @pytest.mark.asyncio
    async def test_ai_returns_invalid_json(self, optimizer):
        ai_response = AIResponse(
            content="I can't help with that",
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 30},
            stop_reason="end_turn",
        )
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_description(title="Something")
        # Should fall back
        assert "description" in result

    @pytest.mark.asyncio
    async def test_ai_returns_json_missing_description(self, optimizer):
        ai_response = _make_ai_response({"tips": ["tip1"]})
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_description(title="Item")
        # Should fall back since no "description" key
        assert "description" in result


# ---- Suggest Title ----


class TestSuggestTitle:
    @pytest.mark.asyncio
    async def test_ai_enabled_success(self, optimizer):
        ai_response = _make_ai_response({
            "titles": [
                "MacBook Air M2 2023 - Excellent Condition",
                "Apple MacBook Air M2 Chip Laptop",
                "M2 MacBook Air 256GB - Like New",
            ],
            "reasoning": "Included brand, model, and condition for searchability",
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_title(
            description="Selling my MacBook Air with M2 chip, bought last year.",
        )

        assert len(result["titles"]) == 3
        assert "reasoning" in result

    @pytest.mark.asyncio
    async def test_disabled_uses_fallback(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_title(
            description="Selling my MacBook Air with M2 chip, barely used.",
        )

        assert len(result["titles"]) >= 1
        assert "first words" in result["reasoning"].lower()

    @pytest.mark.asyncio
    async def test_fallback_short_description(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_title(
            description="Old desk for sale",
        )
        assert len(result["titles"]) >= 1

    @pytest.mark.asyncio
    async def test_fallback_empty_description(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_title(description="          ")
        assert result["titles"] == ["Listing"]

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back(self, optimizer):
        optimizer.ai.structured_output = AsyncMock(side_effect=Exception("fail"))

        result = await optimizer.suggest_title(
            description="A nice vintage lamp for sale",
        )
        assert len(result["titles"]) >= 1

    @pytest.mark.asyncio
    async def test_titles_limited_to_3(self, optimizer):
        ai_response = _make_ai_response({
            "titles": ["A", "B", "C", "D", "E"],
            "reasoning": "test",
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_title(description="A nice item for sale")
        assert len(result["titles"]) <= 3


# ---- Suggest Price ----


class TestSuggestPrice:
    @pytest.mark.asyncio
    async def test_ai_enabled_success(self, optimizer):
        ai_response = _make_ai_response({
            "price_hint": "$650",
            "reasoning": "Used M2 MacBooks typically sell for $600-800 among students",
            "price_range": {"low": 600, "high": 800},
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_price(
            title="MacBook Air M2",
            description="Barely used, 256GB, great condition",
        )

        assert result["price_hint"] == "$650"
        assert result["price_range"]["low"] == 600
        assert "reasoning" in result

    @pytest.mark.asyncio
    async def test_disabled_item_fallback(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_price(
            title="Used Desk",
            description="Wooden desk, good condition",
            listing_type="item",
        )

        assert result["price_hint"] == "$20"
        assert result["price_range"]["low"] == 5

    @pytest.mark.asyncio
    async def test_disabled_service_fallback(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_price(
            title="Math Tutoring",
            description="I can help with calculus and linear algebra",
            listing_type="service",
        )

        assert result["price_hint"] == "$15/hr"
        assert result["price_range"]["low"] == 10

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back(self, optimizer):
        optimizer.ai.structured_output = AsyncMock(side_effect=Exception("fail"))

        result = await optimizer.suggest_price(
            title="Item",
            description="Some description here",
        )
        assert "price_hint" in result


# ---- Suggest Category ----


class TestSuggestCategory:
    @pytest.mark.asyncio
    async def test_ai_enabled_success(self, optimizer):
        ai_response = _make_ai_response({
            "category_slug": "electronics",
            "category_name": "Electronics",
            "confidence": 0.95,
            "reasoning": "MacBook is clearly an electronics item",
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_category(
            title="MacBook Air M2",
            description="Selling my laptop",
            listing_type="item",
        )

        assert result["category_slug"] == "electronics"
        assert result["confidence"] == 0.95

    @pytest.mark.asyncio
    async def test_ai_returns_invalid_category_slug(self, optimizer):
        ai_response = _make_ai_response({
            "category_slug": "nonexistent-category",
            "category_name": "Fake",
            "confidence": 0.9,
            "reasoning": "test",
        })
        optimizer.ai.structured_output = AsyncMock(return_value=ai_response)

        result = await optimizer.suggest_category(
            title="Something",
            description="Some description text",
            listing_type="item",
        )

        # Should fall back to keyword matching since slug not in categories
        assert result["category_slug"] != "nonexistent-category"

    @pytest.mark.asyncio
    async def test_disabled_keyword_match(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_category(
            title="Calculus Textbook",
            description="Selling my calculus textbook, 3rd edition, ISBN 12345",
            listing_type="item",
        )

        assert result["category_slug"] == "textbooks"
        assert result["confidence"] > 0

    @pytest.mark.asyncio
    async def test_disabled_no_match(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_category(
            title="Random Thing",
            description="This is some random item I want to sell",
            listing_type="item",
        )

        assert result["category_slug"] == "other-items"
        assert result["confidence"] == 0.2

    @pytest.mark.asyncio
    async def test_disabled_service_match(self, optimizer_disabled):
        result = await optimizer_disabled.suggest_category(
            title="Math Tutoring Sessions",
            description="I offer tutoring for calculus, algebra, and exam prep",
            listing_type="service",
        )

        assert result["category_slug"] == "tutoring"

    @pytest.mark.asyncio
    async def test_unknown_listing_type(self, optimizer):
        result = await optimizer.suggest_category(
            title="Something",
            description="Description text here",
            listing_type="unknown",
        )

        assert result["category_slug"] is None
        assert result["confidence"] == 0.0

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back(self, optimizer):
        optimizer.ai.structured_output = AsyncMock(side_effect=Exception("fail"))

        result = await optimizer.suggest_category(
            title="Used Laptop",
            description="Selling my laptop computer",
            listing_type="item",
        )

        assert "category_slug" in result
        assert "confidence" in result


# ---- Completeness Scoring ----


class TestCompletenessScoring:
    def test_empty_listing(self, optimizer):
        result = optimizer.score_completeness()

        assert result["score"] == 0
        assert result["max_score"] == sum(COMPLETENESS_WEIGHTS.values())
        assert result["percentage"] == 0
        assert len(result["suggestions"]) > 0

    def test_fully_complete_listing(self, optimizer):
        result = optimizer.score_completeness(
            title="MacBook Air M2 - Excellent Condition",
            description="A" * MIN_GOOD_DESCRIPTION_LENGTH,
            price_hint="$650",
            category_id="some-uuid",
            photos_count=3,
            location_type="on_campus",
            location_hint="Near Student Union",
            availability={"days": ["mon", "wed"]},
        )

        assert result["score"] == result["max_score"]
        assert result["percentage"] == 100
        assert len(result["suggestions"]) == 0

    def test_partial_listing(self, optimizer):
        result = optimizer.score_completeness(
            title="Used Desk",
            description="A wooden desk for sale, good condition.",
        )

        assert 0 < result["score"] < result["max_score"]
        assert 0 < result["percentage"] < 100
        assert len(result["suggestions"]) > 0

    def test_title_scoring_tiers(self, optimizer):
        # Short title (5-9 chars)
        r1 = optimizer.score_completeness(title="Desks")
        # Medium title (10-19 chars)
        r2 = optimizer.score_completeness(title="Used Desk On Sale")
        # Long title (20+ chars)
        r3 = optimizer.score_completeness(title="Used Standing Desk - Great Condition")

        assert r1["breakdown"]["title"] < r2["breakdown"]["title"]
        assert r2["breakdown"]["title"] <= r3["breakdown"]["title"]

    def test_title_too_short(self, optimizer):
        result = optimizer.score_completeness(title="Hi")
        assert result["breakdown"]["title"] == 0

    def test_description_scoring_tiers(self, optimizer):
        # Short description (20-49 chars)
        r1 = optimizer.score_completeness(description="A desk that I want to sell.")
        # Medium description (50-79 chars) — must be < MIN_GOOD_DESCRIPTION_LENGTH
        r2 = optimizer.score_completeness(
            description="A nice wooden desk for sale in good working condition."
        )
        # Long description (80+ chars)
        r3 = optimizer.score_completeness(description="A" * MIN_GOOD_DESCRIPTION_LENGTH)

        assert r1["breakdown"]["description"] < r2["breakdown"]["description"]
        assert r2["breakdown"]["description"] < r3["breakdown"]["description"]

    def test_description_too_short(self, optimizer):
        result = optimizer.score_completeness(description="Short")
        assert result["breakdown"]["description"] == 0

    def test_photos_scoring(self, optimizer):
        r0 = optimizer.score_completeness(photos_count=0)
        r1 = optimizer.score_completeness(photos_count=1)
        r2 = optimizer.score_completeness(photos_count=2)
        r3 = optimizer.score_completeness(photos_count=3)
        r5 = optimizer.score_completeness(photos_count=5)

        assert r0["breakdown"]["photos"] == 0
        assert r1["breakdown"]["photos"] > 0
        assert r2["breakdown"]["photos"] > r1["breakdown"]["photos"]
        assert r3["breakdown"]["photos"] == COMPLETENESS_WEIGHTS["photos"]
        assert r5["breakdown"]["photos"] == COMPLETENESS_WEIGHTS["photos"]

    def test_price_hint_present(self, optimizer):
        result = optimizer.score_completeness(price_hint="$25")
        assert result["breakdown"]["price_hint"] == COMPLETENESS_WEIGHTS["price_hint"]

    def test_price_hint_absent(self, optimizer):
        result = optimizer.score_completeness(price_hint=None)
        assert result["breakdown"]["price_hint"] == 0

    def test_category_present(self, optimizer):
        result = optimizer.score_completeness(category_id="some-id")
        assert result["breakdown"]["category_id"] == COMPLETENESS_WEIGHTS["category_id"]

    def test_location_hint_suggestion(self, optimizer):
        result = optimizer.score_completeness()
        suggestions_lower = [s.lower() for s in result["suggestions"]]
        assert any("location" in s for s in suggestions_lower)

    def test_suggestions_for_missing_fields(self, optimizer):
        result = optimizer.score_completeness()
        # Should have suggestions for all missing fields
        assert len(result["suggestions"]) >= 4


# ---- Platform Categories ----


class TestPlatformCategories:
    def test_item_categories_exist(self):
        assert "item" in PLATFORM_CATEGORIES
        assert len(PLATFORM_CATEGORIES["item"]) > 0

    def test_service_categories_exist(self):
        assert "service" in PLATFORM_CATEGORIES
        assert len(PLATFORM_CATEGORIES["service"]) > 0

    def test_other_items_category_exists(self):
        assert "other-items" in PLATFORM_CATEGORIES["item"]

    def test_other_services_category_exists(self):
        assert "other-services" in PLATFORM_CATEGORIES["service"]


# ---- Keyword fallback category matching ----


class TestFallbackCategoryMatching:
    def test_electronics_keywords(self, optimizer_disabled):
        result = ListingOptimizerService._fallback_category(
            "Gaming Laptop",
            "Selling my gaming laptop computer with monitor",
            "item",
        )
        assert result["category_slug"] == "electronics"

    def test_furniture_keywords(self, optimizer_disabled):
        result = ListingOptimizerService._fallback_category(
            "Study Desk",
            "Wooden desk with chair included",
            "item",
        )
        assert result["category_slug"] == "furniture"

    def test_clothing_keywords(self, optimizer_disabled):
        result = ListingOptimizerService._fallback_category(
            "Nike Sneakers",
            "Size 10 sneakers and a jacket",
            "item",
        )
        assert result["category_slug"] == "clothing"

    def test_tutoring_keywords(self, optimizer_disabled):
        result = ListingOptimizerService._fallback_category(
            "Homework Help",
            "I offer tutoring and test prep sessions for math",
            "service",
        )
        assert result["category_slug"] == "tutoring"

    def test_rides_keywords(self, optimizer_disabled):
        result = ListingOptimizerService._fallback_category(
            "Airport Ride",
            "Offering carpool ride to the airport",
            "service",
        )
        assert result["category_slug"] == "rides"

    def test_confidence_increases_with_more_matches(self):
        r1 = ListingOptimizerService._fallback_category(
            "Laptop",
            "For sale",
            "item",
        )
        r2 = ListingOptimizerService._fallback_category(
            "Laptop Computer",
            "Selling laptop with monitor and keyboard and mouse",
            "item",
        )
        assert r2["confidence"] > r1["confidence"]

    def test_confidence_capped_at_0_8(self):
        result = ListingOptimizerService._fallback_category(
            "Laptop Phone Tablet Computer Monitor Keyboard Mouse",
            "laptop phone tablet computer charger headphone speaker monitor keyboard mouse",
            "item",
        )
        assert result["confidence"] <= 0.8
