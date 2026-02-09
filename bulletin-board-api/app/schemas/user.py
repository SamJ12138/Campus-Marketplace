from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class UserBrief(BaseModel):
    id: UUID
    display_name: str
    avatar_url: str | None
    class_year: int | None

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    id: UUID
    display_name: str
    avatar_url: str | None
    class_year: int | None
    bio: str | None
    listing_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMeResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None
    class_year: int | None
    bio: str | None
    phone_number: str | None = None
    role: str
    campus_slug: str | None = None
    campus_name: str | None = None
    email_verified: bool
    listing_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(None, min_length=2, max_length=100)
    bio: str | None = Field(None, max_length=500)
    class_year: int | None = Field(None, ge=2020, le=2035)
    phone_number: str | None = Field(None, max_length=20)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class NotificationPreferencesResponse(BaseModel):
    email_messages: bool
    email_listing_replies: bool
    email_report_updates: bool
    email_marketing: bool

    model_config = {"from_attributes": True}


class UpdateNotificationPreferencesRequest(BaseModel):
    email_messages: bool | None = None
    email_listing_replies: bool | None = None
    email_report_updates: bool | None = None
    email_marketing: bool | None = None
