from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai_service import AIResponse, AIService


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.anthropic_api_key = "test-api-key"
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    return settings


@pytest.fixture
def ai_service(mock_settings):
    return AIService(mock_settings)


@pytest.fixture
def mock_response():
    """Create a mock Anthropic API response."""
    response = MagicMock()
    response.content = [MagicMock(text="Hello, world!")]
    response.model = "claude-sonnet-4-20250514"
    response.usage = MagicMock(input_tokens=10, output_tokens=5)
    response.stop_reason = "end_turn"
    return response


class TestAIServiceInit:
    def test_creates_with_settings(self, mock_settings):
        service = AIService(mock_settings)
        assert service.settings == mock_settings
        assert service._client is None

    def test_enabled_when_api_key_set(self, ai_service):
        assert ai_service.enabled is True

    def test_disabled_when_api_key_empty(self, mock_settings):
        mock_settings.anthropic_api_key = ""
        service = AIService(mock_settings)
        assert service.enabled is False

    def test_disabled_when_api_key_none(self, mock_settings):
        mock_settings.anthropic_api_key = None
        service = AIService(mock_settings)
        assert service.enabled is False

    @patch("app.services.ai_service.anthropic.AsyncAnthropic")
    def test_client_lazy_init(self, mock_anthropic_cls, ai_service):
        _ = ai_service.client
        mock_anthropic_cls.assert_called_once_with(api_key="test-api-key")

    @patch("app.services.ai_service.anthropic.AsyncAnthropic")
    def test_client_cached_after_first_access(self, mock_anthropic_cls, ai_service):
        client1 = ai_service.client
        client2 = ai_service.client
        assert client1 is client2
        mock_anthropic_cls.assert_called_once()


class TestComplete:
    @pytest.mark.asyncio
    async def test_complete_basic(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        result = await ai_service.complete(prompt="Say hello")

        assert isinstance(result, AIResponse)
        assert result.content == "Hello, world!"
        assert result.model == "claude-sonnet-4-20250514"
        assert result.usage == {"input_tokens": 10, "output_tokens": 5}
        assert result.stop_reason == "end_turn"

    @pytest.mark.asyncio
    async def test_complete_with_system_prompt(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.complete(prompt="Say hello", system="You are helpful.")

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["system"] == "You are helpful."

    @pytest.mark.asyncio
    async def test_complete_uses_default_model(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.complete(prompt="test")

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-sonnet-4-20250514"
        assert call_kwargs["max_tokens"] == 1024

    @pytest.mark.asyncio
    async def test_complete_with_custom_model(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.complete(
            prompt="test",
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
        )

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["model"] == "claude-haiku-4-5-20251001"
        assert call_kwargs["max_tokens"] == 256

    @pytest.mark.asyncio
    async def test_complete_handles_empty_content(self, ai_service):
        empty_response = MagicMock()
        empty_response.content = []
        empty_response.model = "claude-sonnet-4-20250514"
        empty_response.usage = MagicMock(input_tokens=10, output_tokens=0)
        empty_response.stop_reason = "end_turn"

        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=empty_response)

        result = await ai_service.complete(prompt="test")
        assert result.content == ""


class TestChat:
    @pytest.mark.asyncio
    async def test_chat_multi_turn(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        messages = [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello!"},
            {"role": "user", "content": "How are you?"},
        ]
        result = await ai_service.chat(messages=messages)

        assert result.content == "Hello, world!"
        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["messages"] == messages

    @pytest.mark.asyncio
    async def test_chat_with_system(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.chat(
            messages=[{"role": "user", "content": "Hi"}],
            system="Be concise.",
        )

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["system"] == "Be concise."


class TestStructuredOutput:
    @pytest.mark.asyncio
    async def test_structured_output_uses_zero_temp(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.structured_output(prompt="Return JSON")

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert call_kwargs["temperature"] == 0.0

    @pytest.mark.asyncio
    async def test_structured_output_appends_json_instruction(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.structured_output(
            prompt="Return JSON",
            system="You analyze data.",
        )

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert "valid JSON only" in call_kwargs["system"]
        assert "You analyze data." in call_kwargs["system"]

    @pytest.mark.asyncio
    async def test_structured_output_without_system(self, ai_service, mock_response):
        ai_service._client = MagicMock()
        ai_service._client.messages.create = AsyncMock(return_value=mock_response)

        await ai_service.structured_output(prompt="Return JSON")

        call_kwargs = ai_service._client.messages.create.call_args.kwargs
        assert "valid JSON only" in call_kwargs["system"]


class TestAIResponse:
    def test_dataclass_fields(self):
        resp = AIResponse(
            content="test",
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 5, "output_tokens": 3},
            stop_reason="end_turn",
        )
        assert resp.content == "test"
        assert resp.model == "claude-sonnet-4-20250514"
        assert resp.usage == {"input_tokens": 5, "output_tokens": 3}
        assert resp.stop_reason == "end_turn"

    def test_stop_reason_defaults_to_none(self):
        resp = AIResponse(
            content="test",
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 5, "output_tokens": 3},
        )
        assert resp.stop_reason is None
