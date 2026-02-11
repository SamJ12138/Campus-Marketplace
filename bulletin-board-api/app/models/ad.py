import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class AdType(str, enum.Enum):
    INTERNAL_DETAIL = "internal_detail"
    EXTERNAL_LINK = "external_link"
    COUPON = "coupon"
    EVENT = "event"


class Ad(Base, TimestampMixin):
    __tablename__ = "ads"
    __table_args__ = (
        Index("idx_ads_campus", "campus_id"),
        Index("idx_ads_active", "is_active", "starts_at", "ends_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True
    )
    type: Mapped[AdType] = mapped_column(
        Enum(AdType, name="ad_type"), nullable=False, default=AdType.INTERNAL_DETAIL
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    cta_text: Mapped[str] = mapped_column(String(100), nullable=False, default="Learn More")
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_alt: Mapped[str | None] = mapped_column(String(200), nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    coupon_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_start_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    event_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    starts_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    # Relationships
    campus = relationship("Campus", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
