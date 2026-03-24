from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.message import ThreadListingBrief
from app.schemas.user import UserBrief


class CreateOfferRequest(BaseModel):
    amount: str = Field(..., min_length=1, max_length=100)
    note: str = Field("", max_length=2000)


class CounterOfferRequest(BaseModel):
    amount: str = Field(..., min_length=1, max_length=100)
    note: str = Field("", max_length=2000)


class OfferResponse(BaseModel):
    id: UUID
    thread_id: UUID
    listing: ThreadListingBrief | None = None
    offerer: UserBrief
    recipient: UserBrief
    amount: str
    status: str
    parent_offer_id: UUID | None = None
    message_id: UUID | None = None
    expires_at: datetime | None = None
    responded_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OfferActionResponse(BaseModel):
    offer: OfferResponse
    message: str
