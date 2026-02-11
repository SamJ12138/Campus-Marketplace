from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.moderation_service import ModerationService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def moderation_service(mock_db):
    return ModerationService(mock_db)


class TestKeywordFilter:
    @pytest.mark.asyncio
    async def test_blocks_exact_match(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [
            MagicMock(
                keyword="scam",
                match_type="exact",
                action="block",
                campus_id=None,
                applies_to="all",
            )
        ]

        result = await moderation_service.check_content(
            "This is a scam listing",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is True
        assert result.matched_keyword == "scam"

    @pytest.mark.asyncio
    async def test_allows_clean_content(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [
            MagicMock(
                keyword="scam",
                match_type="contains",
                action="block",
                campus_id=None,
                applies_to="all",
            )
        ]

        result = await moderation_service.check_content(
            "Professional tutoring services available",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is False
        assert result.flagged is False

    @pytest.mark.asyncio
    async def test_flags_phone_numbers(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        result = await moderation_service.check_content(
            "Call me at 5551234567 for more info",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is False
        assert result.flagged is True

    @pytest.mark.asyncio
    async def test_flags_payment_mentions(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        result = await moderation_service.check_content(
            "Pay me via venmo before the session",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is False
        assert result.flagged is True

    @pytest.mark.asyncio
    async def test_contains_match(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [
            MagicMock(
                keyword="drugs",
                match_type="contains",
                action="block",
                campus_id=None,
                applies_to="all",
            )
        ]

        result = await moderation_service.check_content(
            "Selling drugs and other stuff",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is True

    @pytest.mark.asyncio
    async def test_regex_match(self, moderation_service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [
            MagicMock(
                keyword=r"\b(buy|sell)\s+\w*weed\b",
                match_type="regex",
                action="block",
                campus_id=None,
                applies_to="all",
            )
        ]

        result = await moderation_service.check_content(
            "Looking to buy weed from someone",
            campus_id="00000000-0000-0000-0000-000000000001",
        )

        assert result.blocked is True
