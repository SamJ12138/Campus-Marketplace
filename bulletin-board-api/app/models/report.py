import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReportReason(str, enum.Enum):
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    PROHIBITED = "prohibited"
    SCAM = "scam"
    HARASSMENT = "harassment"
    OTHER = "other"


class ReportTargetType(str, enum.Enum):
    LISTING = "listing"
    USER = "user"
    MESSAGE = "message"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ReportPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        Index("idx_reports_status", "status"),
        Index("idx_reports_target", "target_type", "target_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    target_type: Mapped[ReportTargetType] = mapped_column(
        Enum(ReportTargetType, name="report_target_type"), nullable=False
    )
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    reason: Mapped[ReportReason] = mapped_column(
        Enum(ReportReason, name="report_reason"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_urls: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status"), default=ReportStatus.PENDING
    )
    priority: Mapped[ReportPriority] = mapped_column(
        Enum(ReportPriority, name="report_priority"), default=ReportPriority.NORMAL
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    resolution_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], lazy="selectin")
    resolver = relationship("User", foreign_keys=[resolved_by], lazy="selectin")
