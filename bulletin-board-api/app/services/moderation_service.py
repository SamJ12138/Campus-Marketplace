import re
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import BannedKeyword


@dataclass
class FilterResult:
    blocked: bool
    flagged: bool
    matched_keyword: str | None = None


class ModerationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def load_keywords(self, campus_id: UUID | None = None) -> list[BannedKeyword]:
        """Load banned keywords from DB."""
        result = await self.db.execute(
            select(BannedKeyword).where(
                BannedKeyword.is_active.is_(True),
                or_(
                    BannedKeyword.campus_id.is_(None),
                    BannedKeyword.campus_id == campus_id,
                ),
            )
        )
        return list(result.scalars().all())

    async def check_content(
        self,
        content: str,
        campus_id: UUID,
        context: Literal["all", "title", "description", "messages"] = "all",
    ) -> FilterResult:
        """Check content against banned keywords."""
        keywords = await self.load_keywords(campus_id)
        normalized = content.lower()

        for rule in keywords:
            if rule.applies_to != "all" and rule.applies_to != context:
                continue

            matched = False
            keyword_lower = rule.keyword.lower()

            if rule.match_type == "exact":
                matched = keyword_lower in normalized.split()
            elif rule.match_type == "contains":
                matched = keyword_lower in normalized
            elif rule.match_type == "regex":
                try:
                    matched = bool(re.search(rule.keyword, normalized, re.IGNORECASE))
                except re.error:
                    continue

            if matched:
                return FilterResult(
                    blocked=rule.action == "block",
                    flagged=rule.action in ("flag", "warn"),
                    matched_keyword=rule.keyword,
                )

        if await self._check_spam_patterns(content):
            return FilterResult(blocked=False, flagged=True)

        return FilterResult(blocked=False, flagged=False)

    async def _check_spam_patterns(self, content: str) -> bool:
        """Check for spam indicators."""
        patterns = [
            r"\b\d{10}\b",
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            r"(https?://|www\.)\S+",
            r"(venmo|cashapp|zelle|paypal|bitcoin|crypto)\b",
        ]

        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True
        return False
