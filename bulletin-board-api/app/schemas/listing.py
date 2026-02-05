from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import PaginationMeta
from app.schemas.user import UserBrief


class ListingType(str, Enum):
    SERVICE = "service"
    ITEM = "item"


class LocationType(str, Enum):
    ON_CAMPUS = "on_campus"
    OFF_CAMPUS = "off_campus"
    REMOTE = "remote"


class ContactPreference(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PHONE = "phone"


class ListingStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    REMOVED = "removed"
    SOLD = "sold"


class ListingCreate(BaseModel):
    type: ListingType
    category_id: UUID
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=20, max_length=5000)
    price_hint: str | None = Field(None, max_length=100)
    location_type: LocationType = LocationType.ON_CAMPUS
    location_hint: str | None = Field(None, max_length=255)
    availability: dict | None = None
    contact_preference: ContactPreference = ContactPreference.IN_APP
    contact_details: str | None = Field(None, max_length=255)
    is_regulated: bool = False
    disclaimer_accepted: bool = False


class ListingUpdate(BaseModel):
    title: str | None = Field(None, min_length=5, max_length=150)
    description: str | None = Field(None, min_length=20, max_length=5000)
    price_hint: str | None = Field(None, max_length=100)
    location_type: LocationType | None = None
    location_hint: str | None = None
    availability: dict | None = None
    contact_preference: ContactPreference | None = None
    contact_details: str | None = None


class PhotoResponse(BaseModel):
    id: UUID
    url: str
    thumbnail_url: str | None
    position: int

    model_config = {"from_attributes": True}


class CategoryBrief(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    listing_type: str
    description: str | None
    icon: str | None
    sort_order: int

    model_config = {"from_attributes": True}


class ListingResponse(BaseModel):
    id: UUID
    type: ListingType
    title: str
    description: str
    price_hint: str | None
    category: CategoryBrief | None
    location_type: LocationType
    location_hint: str | None
    availability: dict | None
    contact_preference: ContactPreference
    is_regulated: bool
    status: ListingStatus
    view_count: int
    photos: list[PhotoResponse]
    user: UserBrief
    is_favorited: bool = False
    is_own: bool = False
    created_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class ListingListResponse(BaseModel):
    items: list[ListingResponse]
    pagination: PaginationMeta
