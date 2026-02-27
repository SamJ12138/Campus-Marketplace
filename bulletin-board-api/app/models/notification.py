import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DigestFrequency(str, enum.Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"


class NotificationPreference(Base, TimestampMixin):
    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    email_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    email_listing_replies: Mapped[bool] = mapped_column(Boolean, default=True)
    email_report_updates: Mapped[bool] = mapped_column(Boolean, default=True)
    email_marketing: Mapped[bool] = mapped_column(Boolean, default=False)
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_listing_replies: Mapped[bool] = mapped_column(Boolean, default=True)

    # Digest preferences
    # values_callable sends .value (lowercase) to match the DB enum created
    # by the extend_notifications migration (which used lowercase values).
    digest_frequency: Mapped[str] = mapped_column(
        Enum(
            DigestFrequency,
            values_callable=lambda e: [x.value for x in e],
            name="digest_frequency",
        ),
        default=DigestFrequency.WEEKLY,
    )
    digest_last_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Smart notification preferences
    email_price_drops: Mapped[bool] = mapped_column(Boolean, default=True)
    email_listing_expiry: Mapped[bool] = mapped_column(Boolean, default=True)
    email_recommendations: Mapped[bool] = mapped_column(Boolean, default=False)

    # Smart timing
    quiet_hours_start: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Hour 0-23, e.g. 22 for 10pm
    quiet_hours_end: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Hour 0-23, e.g. 8 for 8am

    # Engagement tracking
    engagement_score: Mapped[float] = mapped_column(Float, default=1.0)
    emails_sent_count: Mapped[int] = mapped_column(Integer, default=0)
    emails_opened_count: Mapped[int] = mapped_column(Integer, default=0)
    last_email_opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_digest_opened_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user = relationship("User", back_populates="notification_preferences")
