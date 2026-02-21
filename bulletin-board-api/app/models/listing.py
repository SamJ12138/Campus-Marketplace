import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

try:
    from pgvector.sqlalchemy import Vector
except ImportError:  # pragma: no cover
    Vector = None  # type: ignore[assignment,misc]


class ListingType(str, enum.Enum):
    SERVICE = "service"
    ITEM = "item"


class LocationType(str, enum.Enum):
    ON_CAMPUS = "on_campus"
    OFF_CAMPUS = "off_campus"
    REMOTE = "remote"


class ContactPreference(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PHONE = "phone"


class ListingStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    REMOVED = "removed"
    SOLD = "sold"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    listing_type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    requires_regulated_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    listings = relationship("Listing", back_populates="category", lazy="selectin")


class Listing(Base, TimestampMixin):
    __tablename__ = "listings"
    __table_args__ = (
        Index("idx_listings_user", "user_id"),
        Index("idx_listings_campus", "campus_id"),
        Index("idx_listings_type", "type"),
        Index("idx_listings_category", "category_id"),
        Index("idx_listings_status", "status"),
        Index(
            "idx_listings_expires",
            "expires_at",
            postgresql_where=Column("status") == "active",
        ),
        Index("idx_listings_search", "search_vector", postgresql_using="gin"),
        Index("idx_listings_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    campus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=False
    )
    type: Mapped[ListingType] = mapped_column(
        Enum(ListingType, name="listing_type"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price_hint: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, name="location_type"), default=LocationType.ON_CAMPUS
    )
    location_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    availability: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    contact_preference: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference, name="contact_preference"),
        default=ContactPreference.IN_APP,
    )
    contact_details: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_regulated: Mapped[bool] = mapped_column(Boolean, default=False)
    disclaimer_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus, name="listing_status"), default=ListingStatus.ACTIVE
    )
    removal_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    renewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(384) if Vector else Text, nullable=True
    )

    # Relationships
    user = relationship("User", back_populates="listings", lazy="selectin")
    campus = relationship("Campus", back_populates="listings", lazy="selectin")
    category = relationship("Category", back_populates="listings", lazy="selectin")
    photos = relationship(
        "ListingPhoto",
        back_populates="listing",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ListingPhoto.position",
    )


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("listings.id", ondelete="CASCADE"),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    content_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    listing = relationship("Listing", back_populates="photos")
