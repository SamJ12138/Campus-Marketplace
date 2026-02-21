import json
import logging
from typing import Literal

from app.schemas.moderation import ModerationAction, ModerationVerdict, ViolationType
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

MODERATION_SYSTEM_PROMPT = (
    "You are a content moderation agent for a college campus marketplace "
    "called GimmeDat. Students use this platform to buy/sell items and "
    "discover services on their campus.\n\n"
    "Your job is to analyze user-generated content and determine if it "
    "violates platform policies.\n\n"
    "## Policy violations to detect:\n"
    "- **scam**: Requests for money transfers, fake products, phishing "
    "attempts, too-good-to-be-true offers\n"
    "- **harassment**: Threats, bullying, hate speech, personal attacks, "
    "doxxing\n"
    "- **spam**: Repetitive content, mass promotional messages, irrelevant "
    "advertising\n"
    "- **inappropriate**: Adult content, graphic violence, illegal "
    "substances, weapons\n"
    "- **prohibited**: Items/services explicitly banned on a college "
    "marketplace (fake IDs, drugs, academic fraud)\n\n"
    "## Context types:\n"
    '- "listing": A product/service listing (title + description). '
    "Be slightly stricter since these are public.\n"
    '- "message": A private message between users. Allow more casual '
    "language but flag threats/scams.\n"
    '- "report": Content from a user report. Analyze the reported content '
    "objectively.\n\n"
    "## Response format:\n"
    "Respond with a JSON object containing exactly these fields:\n"
    '- violation_type: one of "scam", "harassment", "spam", '
    '"inappropriate", "prohibited", "none"\n'
    "- confidence: a float between 0.0 and 1.0\n"
    "- reasoning: a brief 1-2 sentence explanation\n"
    '- action: one of "allow", "flag", "block"\n\n'
    "## Action guidelines:\n"
    '- "allow": Content is clean (confidence < 0.3 that any violation '
    "exists)\n"
    '- "flag": Content is suspicious but not clearly violating '
    "(confidence 0.3-0.7), or minor violation\n"
    '- "block": Content clearly violates policies (confidence > 0.7 for '
    "serious violations like scam, harassment, prohibited)\n\n"
    "Be calibrated. Most content on a college marketplace is legitimate. "
    "Do not over-flag normal commerce."
)


class AIModerationService:
    """LLM-powered content moderation as a second-pass after keyword filtering."""

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    @property
    def enabled(self) -> bool:
        return self.ai_service.enabled

    async def analyze_content(
        self,
        content: str,
        context: Literal["listing", "message", "report"] = "listing",
    ) -> ModerationVerdict:
        """Analyze content using AI and return a structured moderation verdict.

        This is intended as a second-pass check after keyword-based filtering.
        If the AI service is not configured, returns an allow verdict.
        """
        if not self.enabled:
            logger.debug("[AI-MOD] AI moderation disabled (no API key), allowing content")
            return ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=0.0,
                reasoning="AI moderation not configured; skipping analysis",
                action=ModerationAction.ALLOW,
            )

        prompt = f"Context type: {context}\n\nContent to analyze:\n{content}"

        try:
            response = await self.ai_service.structured_output(
                prompt=prompt,
                system=MODERATION_SYSTEM_PROMPT,
                max_tokens=256,
            )

            verdict = self._parse_verdict(response.content)
            logger.info(
                "[AI-MOD] Verdict: %s (confidence=%.2f, action=%s)",
                verdict.violation_type.value,
                verdict.confidence,
                verdict.action.value,
            )
            return verdict

        except Exception:
            logger.exception("[AI-MOD] AI moderation analysis failed, defaulting to allow")
            return ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=0.0,
                reasoning="AI analysis failed; falling back to keyword-only moderation",
                action=ModerationAction.ALLOW,
            )

    async def triage_report(
        self,
        reported_content: str,
        report_reason: str,
        reporter_description: str | None = None,
    ) -> ModerationVerdict:
        """Analyze reported content to auto-triage priority.

        Used when a user submits a report to provide initial severity assessment.
        """
        if not self.enabled:
            return ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=0.0,
                reasoning="AI moderation not configured; skipping triage",
                action=ModerationAction.ALLOW,
            )

        parts = [
            f"Report reason: {report_reason}",
            f"Reported content:\n{reported_content}",
        ]
        if reporter_description:
            parts.append(f"Reporter's description: {reporter_description}")

        prompt = "\n\n".join(parts)

        try:
            response = await self.ai_service.structured_output(
                prompt=prompt,
                system=MODERATION_SYSTEM_PROMPT,
                max_tokens=256,
            )

            verdict = self._parse_verdict(response.content)
            logger.info(
                "[AI-MOD] Report triage: %s (confidence=%.2f, action=%s)",
                verdict.violation_type.value,
                verdict.confidence,
                verdict.action.value,
            )
            return verdict

        except Exception:
            logger.exception("[AI-MOD] Report triage failed, defaulting to allow")
            return ModerationVerdict(
                violation_type=ViolationType.NONE,
                confidence=0.0,
                reasoning="AI triage failed; manual review required",
                action=ModerationAction.ALLOW,
            )

    def _parse_verdict(self, raw: str) -> ModerationVerdict:
        """Parse AI response JSON into a ModerationVerdict."""
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [ln for ln in lines if not ln.strip().startswith("```")]
            text = "\n".join(lines)

        data = json.loads(text)
        return ModerationVerdict(
            violation_type=ViolationType(data["violation_type"]),
            confidence=float(data["confidence"]),
            reasoning=str(data["reasoning"]),
            action=ModerationAction(data["action"]),
        )
