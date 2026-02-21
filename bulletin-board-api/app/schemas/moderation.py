from enum import Enum

from pydantic import BaseModel, Field


class ViolationType(str, Enum):
    SCAM = "scam"
    HARASSMENT = "harassment"
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    PROHIBITED = "prohibited"
    NONE = "none"


class ModerationAction(str, Enum):
    ALLOW = "allow"
    FLAG = "flag"
    BLOCK = "block"


class ModerationVerdict(BaseModel):
    """Structured verdict from AI content moderation analysis."""

    violation_type: ViolationType = Field(
        description="Type of policy violation detected, or 'none' if clean"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score for the verdict (0.0 to 1.0)"
    )
    reasoning: str = Field(
        description="Brief explanation of why this verdict was reached"
    )
    action: ModerationAction = Field(
        description="Recommended action: allow, flag for review, or block"
    )
