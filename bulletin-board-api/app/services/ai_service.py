import logging
from dataclasses import dataclass
from typing import Any

import anthropic

from app.config import Settings

logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    content: str
    model: str
    usage: dict[str, int]
    stop_reason: str | None = None


class AIService:
    """Reusable async AI service abstraction using Claude as primary provider.

    All other AI agents in the platform should use this service
    rather than calling the Anthropic SDK directly.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client: anthropic.AsyncAnthropic | None = None

    @property
    def client(self) -> anthropic.AsyncAnthropic:
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(
                api_key=self.settings.anthropic_api_key,
            )
        return self._client

    @property
    def enabled(self) -> bool:
        return bool(self.settings.anthropic_api_key)

    async def complete(
        self,
        *,
        prompt: str,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send a single-turn message and return the AI response."""
        model = model or self.settings.ai_model
        max_tokens = max_tokens or self.settings.ai_max_tokens

        messages: list[dict[str, str]] = [{"role": "user", "content": prompt}]

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system:
            kwargs["system"] = system

        logger.info("[AI] Sending request to %s (max_tokens=%d)", model, max_tokens)

        response = await self.client.messages.create(**kwargs)

        text = response.content[0].text if response.content else ""
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }

        logger.info("[AI] Response received: %d output tokens", usage["output_tokens"])

        return AIResponse(
            content=text,
            model=response.model,
            usage=usage,
            stop_reason=response.stop_reason,
        )

    async def chat(
        self,
        *,
        messages: list[dict[str, str]],
        system: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send a multi-turn conversation and return the AI response."""
        model = model or self.settings.ai_model
        max_tokens = max_tokens or self.settings.ai_max_tokens

        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }
        if system:
            kwargs["system"] = system

        logger.info("[AI] Chat request to %s (%d messages)", model, len(messages))

        response = await self.client.messages.create(**kwargs)

        text = response.content[0].text if response.content else ""
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }

        logger.info("[AI] Chat response: %d output tokens", usage["output_tokens"])

        return AIResponse(
            content=text,
            model=response.model,
            usage=usage,
            stop_reason=response.stop_reason,
        )

    async def structured_output(
        self,
        *,
        prompt: str,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.0,
    ) -> AIResponse:
        """Request JSON output from the AI. Uses temperature=0 for determinism."""
        json_system = (system or "") + (
            "\n\nYou must respond with valid JSON only. No additional text or explanation."
        )

        return await self.complete(
            prompt=prompt,
            system=json_system.strip(),
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
