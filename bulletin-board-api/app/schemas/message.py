from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import PaginationMeta
from app.schemas.user import UserBrief


class StartThreadRequest(BaseModel):
    listing_id: UUID
    message: str = Field(..., min_length=1, max_length=2000)


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: UUID
    sender_id: UUID
    sender_name: str
    content: str
    is_read: bool
    is_own: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadListingBrief(BaseModel):
    id: UUID
    title: str
    first_photo_url: str | None

    model_config = {"from_attributes": True}


class ThreadResponse(BaseModel):
    id: UUID
    listing: ThreadListingBrief | None
    other_user: UserBrief
    last_message_preview: str | None
    unread_count: int
    last_message_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadDetailResponse(BaseModel):
    thread: ThreadResponse
    messages: list[MessageResponse]
    pagination: PaginationMeta


class ThreadListResponse(BaseModel):
    items: list[ThreadResponse]
    pagination: PaginationMeta
