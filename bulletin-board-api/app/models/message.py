import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class MessageThread(Base, TimestampMixin):
    __tablename__ = "message_threads"
    __table_args__ = (
        UniqueConstraint("listing_id", "initiator_id", "recipient_id", name="uq_thread_unique"),
        Index("idx_threads_initiator", "initiator_id"),
        Index("idx_threads_recipient", "recipient_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    listing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True
    )
    initiator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="active")
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    initiator_unread_count: Mapped[int] = mapped_column(Integer, default=0)
    recipient_unread_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    listing = relationship("Listing", lazy="selectin")
    initiator = relationship("User", foreign_keys=[initiator_id], lazy="selectin")
    recipient = relationship("User", foreign_keys=[recipient_id], lazy="selectin")
    messages = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Message.created_at.desc()",
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("idx_messages_thread", "thread_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User", lazy="selectin")
