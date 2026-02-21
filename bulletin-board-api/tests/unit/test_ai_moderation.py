import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.moderation import ModerationAction, ModerationVerdict, ViolationType
from app.services.ai_moderation_service import AIModerationService
from app.services.ai_service import AIResponse, AIService


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
def mod_service(ai_service):
    return AIModerationService(ai_service)


@pytest.fixture
def mod_service_disabled(ai_service_disabled):
    return AIModerationService(ai_service_disabled)


def _make_ai_response(verdict_dict: dict) -> AIResponse:
    """Helper to create an AIResponse wrapping a JSON verdict."""
    return AIResponse(
        content=json.dumps(verdict_dict),
        model="claude-sonnet-4-20250514",
        usage={"input_tokens": 50, "output_tokens": 30},
        stop_reason="end_turn",
    )


class TestModerationVerdictSchema:
    def test_valid_verdict(self):
        verdict = ModerationVerdict(
            violation_type=ViolationType.SCAM,
            confidence=0.85,
            reasoning="Content requests money transfer via Venmo",
            action=ModerationAction.BLOCK,
        )
        assert verdict.violation_type == ViolationType.SCAM
        assert verdict.confidence == 0.85
        assert verdict.action == ModerationAction.BLOCK

    def test_clean_verdict(self):
        verdict = ModerationVerdict(
            violation_type=ViolationType.NONE,
            confidence=0.0,
            reasoning="Content is a normal listing",
            action=ModerationAction.ALLOW,
        )
        assert verdict.violation_type == ViolationType.NONE
        assert verdict.action == ModerationAction.ALLOW

    def test_confidence_bounds(self):
        verdict = ModerationVerdict(
            violation_type=ViolationType.NONE,
            confidence=0.0,
            reasoning="test",
            action=ModerationAction.ALLOW,
        )
        assert verdict.confidence == 0.0

        verdict = ModerationVerdict(
            violation_type=ViolationType.NONE,
            confidence=1.0,
            reasoning="test",
            action=ModerationAction.ALLOW,
        )
        assert verdict.confidence == 1.0

    def test_confidence_out_of_bounds_raises(self):
        with pytest.raises(Exception):
            ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=1.5,
                reasoning="test",
                action=ModerationAction.ALLOW,
            )

    def test_all_violation_types(self):
        for vtype in ViolationType:
            verdict = ModerationVerdict(
                violation_type=vtype,
                confidence=0.5,
                reasoning="test",
                action=ModerationAction.FLAG,
            )
            assert verdict.violation_type == vtype

    def test_all_action_types(self):
        for action in ModerationAction:
            verdict = ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=0.5,
                reasoning="test",
                action=action,
            )
            assert verdict.action == action


class TestAIModerationServiceInit:
    def test_enabled_when_api_key_set(self, mod_service):
        assert mod_service.enabled is True

    def test_disabled_when_no_api_key(self, mod_service_disabled):
        assert mod_service_disabled.enabled is False


class TestAnalyzeContent:
    @pytest.mark.asyncio
    async def test_returns_allow_when_disabled(self, mod_service_disabled):
        result = await mod_service_disabled.analyze_content("some content")
        assert result.action == ModerationAction.ALLOW
        assert result.violation_type == ViolationType.NONE
        assert result.confidence == 0.0

    @pytest.mark.asyncio
    async def test_clean_content_allowed(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.05,
                "reasoning": "Normal tutoring listing",
                "action": "allow",
            })
        )

        result = await mod_service.analyze_content("Math tutoring available $20/hr")
        assert result.action == ModerationAction.ALLOW
        assert result.violation_type == ViolationType.NONE

    @pytest.mark.asyncio
    async def test_scam_content_blocked(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "scam",
                "confidence": 0.92,
                "reasoning": "Content requests wire transfer and promises unrealistic returns",
                "action": "block",
            })
        )

        result = await mod_service.analyze_content(
            "Send $100 to my account and I'll double it!"
        )
        assert result.action == ModerationAction.BLOCK
        assert result.violation_type == ViolationType.SCAM
        assert result.confidence > 0.7

    @pytest.mark.asyncio
    async def test_suspicious_content_flagged(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "spam",
                "confidence": 0.45,
                "reasoning": "Possibly promotional but may be legitimate",
                "action": "flag",
            })
        )

        result = await mod_service.analyze_content("BUY NOW BEST DEAL EVER!!!")
        assert result.action == ModerationAction.FLAG
        assert result.violation_type == ViolationType.SPAM

    @pytest.mark.asyncio
    async def test_passes_context_type(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.0,
                "reasoning": "Clean",
                "action": "allow",
            })
        )

        await mod_service.analyze_content("Hey, is the bike still available?", context="message")

        call_kwargs = ai_service.structured_output.call_args.kwargs
        assert "message" in call_kwargs["prompt"]

    @pytest.mark.asyncio
    async def test_uses_system_prompt(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.0,
                "reasoning": "Clean",
                "action": "allow",
            })
        )

        await mod_service.analyze_content("Test content")

        call_kwargs = ai_service.structured_output.call_args.kwargs
        assert "content moderation" in call_kwargs["system"].lower()

    @pytest.mark.asyncio
    async def test_returns_allow_on_api_error(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            side_effect=Exception("API error")
        )

        result = await mod_service.analyze_content("Some content")
        assert result.action == ModerationAction.ALLOW
        assert result.violation_type == ViolationType.NONE

    @pytest.mark.asyncio
    async def test_handles_json_with_markdown_fences(self, mod_service, ai_service):
        raw_json = json.dumps({
            "violation_type": "harassment",
            "confidence": 0.8,
            "reasoning": "Threatening language detected",
            "action": "block",
        })
        ai_service.structured_output = AsyncMock(
            return_value=AIResponse(
                content=f"```json\n{raw_json}\n```",
                model="claude-sonnet-4-20250514",
                usage={"input_tokens": 50, "output_tokens": 30},
                stop_reason="end_turn",
            )
        )

        result = await mod_service.analyze_content("I'm going to hurt you")
        assert result.action == ModerationAction.BLOCK
        assert result.violation_type == ViolationType.HARASSMENT

    @pytest.mark.asyncio
    async def test_max_tokens_set_to_256(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.0,
                "reasoning": "Clean",
                "action": "allow",
            })
        )

        await mod_service.analyze_content("Test")

        call_kwargs = ai_service.structured_output.call_args.kwargs
        assert call_kwargs["max_tokens"] == 256


class TestTriageReport:
    @pytest.mark.asyncio
    async def test_returns_allow_when_disabled(self, mod_service_disabled):
        result = await mod_service_disabled.triage_report(
            reported_content="some content",
            report_reason="spam",
        )
        assert result.action == ModerationAction.ALLOW

    @pytest.mark.asyncio
    async def test_triages_scam_report(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "scam",
                "confidence": 0.9,
                "reasoning": "Clear phishing attempt",
                "action": "block",
            })
        )

        result = await mod_service.triage_report(
            reported_content="Send your password to this email for a free laptop",
            report_reason="scam",
            reporter_description="This user is trying to steal passwords",
        )
        assert result.action == ModerationAction.BLOCK
        assert result.violation_type == ViolationType.SCAM

    @pytest.mark.asyncio
    async def test_includes_reporter_description(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.0,
                "reasoning": "Clean",
                "action": "allow",
            })
        )

        await mod_service.triage_report(
            reported_content="Normal content",
            report_reason="other",
            reporter_description="User was rude to me",
        )

        call_kwargs = ai_service.structured_output.call_args.kwargs
        assert "User was rude to me" in call_kwargs["prompt"]

    @pytest.mark.asyncio
    async def test_works_without_reporter_description(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "violation_type": "none",
                "confidence": 0.0,
                "reasoning": "Clean",
                "action": "allow",
            })
        )

        result = await mod_service.triage_report(
            reported_content="Normal content",
            report_reason="spam",
        )
        assert result.action == ModerationAction.ALLOW

    @pytest.mark.asyncio
    async def test_returns_allow_on_api_error(self, mod_service, ai_service):
        ai_service.structured_output = AsyncMock(
            side_effect=Exception("API timeout")
        )

        result = await mod_service.triage_report(
            reported_content="Content",
            report_reason="spam",
        )
        assert result.action == ModerationAction.ALLOW


class TestParseVerdict:
    def test_parses_clean_json(self, mod_service):
        raw = json.dumps({
            "violation_type": "none",
            "confidence": 0.1,
            "reasoning": "Normal content",
            "action": "allow",
        })
        verdict = mod_service._parse_verdict(raw)
        assert verdict.violation_type == ViolationType.NONE
        assert verdict.action == ModerationAction.ALLOW

    def test_parses_json_with_code_fences(self, mod_service):
        inner = json.dumps({
            "violation_type": "spam",
            "confidence": 0.6,
            "reasoning": "Repetitive promotional content",
            "action": "flag",
        })
        raw = f"```json\n{inner}\n```"
        verdict = mod_service._parse_verdict(raw)
        assert verdict.violation_type == ViolationType.SPAM
        assert verdict.action == ModerationAction.FLAG

    def test_raises_on_invalid_json(self, mod_service):
        with pytest.raises(Exception):
            mod_service._parse_verdict("not valid json at all")

    def test_raises_on_invalid_violation_type(self, mod_service):
        raw = json.dumps({
            "violation_type": "unknown_type",
            "confidence": 0.5,
            "reasoning": "test",
            "action": "allow",
        })
        with pytest.raises(ValueError):
            mod_service._parse_verdict(raw)

    def test_all_violation_types_parse(self, mod_service):
        for vtype in ViolationType:
            raw = json.dumps({
                "violation_type": vtype.value,
                "confidence": 0.5,
                "reasoning": "test",
                "action": "flag",
            })
            verdict = mod_service._parse_verdict(raw)
            assert verdict.violation_type == vtype

    def test_all_action_types_parse(self, mod_service):
        for action in ModerationAction:
            raw = json.dumps({
                "violation_type": "none",
                "confidence": 0.5,
                "reasoning": "test",
                "action": action.value,
            })
            verdict = mod_service._parse_verdict(raw)
            assert verdict.action == action
