from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief


class ReportReason(str, Enum):
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    PROHIBITED = "prohibited"
    SCAM = "scam"
    HARASSMENT = "harassment"
    OTHER = "other"


class ReportTargetType(str, Enum):
    LISTING = "listing"
    USER = "user"
    MESSAGE = "message"


class CreateReportRequest(BaseModel):
    target_type: ReportTargetType
    target_id: UUID
    reason: ReportReason
    description: str | None = Field(None, max_length=2000)


class ReportResponse(BaseModel):
    id: UUID
    target_type: ReportTargetType
    target_id: UUID
    reason: ReportReason
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminReportResponse(ReportResponse):
    reporter: UserBrief | None
    target_details: dict
    resolved_by_user: UserBrief | None = None
    resolution_type: str | None
    resolution_note: str | None
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class ReportResolution(str, Enum):
    NO_ACTION = "no_action"
    WARNING_ISSUED = "warning_issued"
    CONTENT_REMOVED = "content_removed"
    USER_SUSPENDED = "user_suspended"
    USER_BANNED = "user_banned"


class ResolveReportRequest(BaseModel):
    resolution_type: ReportResolution
    resolution_note: str | None = Field(None, max_length=1000)
