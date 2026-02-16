from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.block import Block
from app.models.listing import Listing, ListingStatus
from app.models.message import Message, MessageThread
from app.schemas.message import (
    MessageResponse,
    ThreadListingBrief,
    ThreadResponse,
)
from app.schemas.user import UserBrief


class MessageService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def can_message(self, sender_id: UUID, recipient_id: UUID) -> bool:
        """Check if sender can message recipient (not blocked)."""
        block = await self.db.scalar(
            select(Block).where(
                or_(
                    and_(
                        Block.blocker_id == recipient_id,
                        Block.blocked_id == sender_id,
                    ),
                    and_(
                        Block.blocker_id == sender_id,
                        Block.blocked_id == recipient_id,
                    ),
                )
            )
        )
        return block is None

    async def _find_thread_for_user_pair(
        self, user_a_id: UUID, user_b_id: UUID
    ) -> MessageThread | None:
        """Find an existing active thread between two users (either direction)."""
        return await self.db.scalar(
            select(MessageThread)
            .options(
                selectinload(MessageThread.listing),
                selectinload(MessageThread.initiator),
                selectinload(MessageThread.recipient),
            )
            .where(
                MessageThread.status != "archived",
                or_(
                    and_(
                        MessageThread.initiator_id == user_a_id,
                        MessageThread.recipient_id == user_b_id,
                    ),
                    and_(
                        MessageThread.initiator_id == user_b_id,
                        MessageThread.recipient_id == user_a_id,
                    ),
                ),
            )
        )

    async def get_or_create_thread(
        self,
        listing_id: UUID,
        initiator_id: UUID,
        campus_id: UUID | None = None,
    ) -> tuple[MessageThread, bool]:
        """Get existing thread or create new one.

        Threads are per-user-pair: if a thread already exists between the
        initiator and the listing owner (in either direction), it is reused
        regardless of which listing started the original conversation.
        """
        listing = await self.db.get(Listing, listing_id)
        if not listing or listing.status != ListingStatus.ACTIVE:
            raise ValueError("Listing not found or inactive")

        if campus_id and listing.campus_id != campus_id:
            raise ValueError("Listing not found or inactive")

        if listing.user_id == initiator_id:
            raise ValueError("Cannot message yourself")

        recipient_id = listing.user_id

        if not await self.can_message(initiator_id, recipient_id):
            raise ValueError("Cannot message this user")

        # Look for ANY existing thread between these two users (either direction)
        thread = await self._find_thread_for_user_pair(initiator_id, recipient_id)

        if thread:
            return thread, False

        thread = MessageThread(
            listing_id=listing_id,
            initiator_id=initiator_id,
            recipient_id=recipient_id,
        )
        self.db.add(thread)
        await self.db.commit()
        await self.db.refresh(thread, ["listing", "initiator", "recipient"])

        return thread, True

    async def get_user_threads(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[ThreadResponse], int]:
        """List threads for a user with pagination."""
        base_query = (
            select(MessageThread)
            .options(
                selectinload(MessageThread.listing),
                selectinload(MessageThread.initiator),
                selectinload(MessageThread.recipient),
                selectinload(MessageThread.messages),
            )
            .where(
                or_(
                    MessageThread.initiator_id == user_id,
                    MessageThread.recipient_id == user_id,
                ),
                MessageThread.status != "blocked",
            )
        )

        total = await self.db.scalar(
            select(func.count()).select_from(base_query.subquery())
        )
        total = total or 0

        result = await self.db.execute(
            base_query.order_by(MessageThread.last_message_at.desc().nullslast())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        threads = list(result.scalars().all())

        items = []
        for thread in threads:
            items.append(self._thread_to_response(thread, user_id))

        return items, total

    async def get_thread_messages(
        self,
        thread_id: UUID,
        user_id: UUID,
        page: int = 1,
        per_page: int = 50,
    ) -> tuple[list[MessageResponse], int]:
        """Get messages in a thread with pagination."""
        total = await self.db.scalar(
            select(func.count()).where(Message.thread_id == thread_id)
        )
        total = total or 0

        result = await self.db.execute(
            select(Message)
            .options(
                selectinload(Message.sender),
                selectinload(Message.listing),
            )
            .where(Message.thread_id == thread_id)
            .order_by(Message.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        messages = list(result.scalars().all())

        items = []
        for msg in messages:
            listing_brief = None
            if msg.listing:
                first_photo = None
                if hasattr(msg.listing, "photos") and msg.listing.photos:
                    first_photo = msg.listing.photos[0].url
                listing_brief = ThreadListingBrief(
                    id=msg.listing.id,
                    title=msg.listing.title,
                    first_photo_url=first_photo,
                )
            items.append(
                MessageResponse(
                    id=msg.id,
                    sender_id=msg.sender_id,
                    sender_name=msg.sender.display_name if msg.sender else "Unknown",
                    content=msg.content,
                    is_read=msg.is_read,
                    is_own=msg.sender_id == user_id,
                    listing=listing_brief,
                    created_at=msg.created_at,
                )
            )

        return items, total

    async def send_message(
        self,
        thread_id: UUID,
        sender_id: UUID,
        content: str,
        flagged: bool = False,
        listing_id: UUID | None = None,
    ) -> Message:
        """Send a message in a thread."""
        thread = await self.db.get(MessageThread, thread_id)
        if not thread:
            raise ValueError("Thread not found")

        if sender_id not in (thread.initiator_id, thread.recipient_id):
            raise ValueError("Not a participant")

        if thread.status == "blocked":
            raise ValueError("Thread is blocked")

        message = Message(
            thread_id=thread_id,
            sender_id=sender_id,
            content=content,
            is_flagged=flagged,
            listing_id=listing_id,
        )
        self.db.add(message)

        thread.last_message_at = datetime.utcnow()
        if sender_id == thread.initiator_id:
            thread.recipient_unread_count += 1
        else:
            thread.initiator_unread_count += 1

        # Increment message_count on the specific listing being discussed
        target_listing_id = listing_id or thread.listing_id
        if target_listing_id:
            await self.db.execute(
                update(Listing)
                .where(Listing.id == target_listing_id)
                .values(message_count=Listing.message_count + 1)
            )

        await self.db.commit()
        await self.db.refresh(message, ["sender", "listing"])

        return message

    async def mark_thread_read(self, thread_id: UUID, user_id: UUID) -> None:
        """Mark all messages in thread as read for a user."""
        thread = await self.db.get(MessageThread, thread_id)
        if not thread:
            return

        if user_id == thread.initiator_id:
            thread.initiator_unread_count = 0
        elif user_id == thread.recipient_id:
            thread.recipient_unread_count = 0

        await self.db.execute(
            update(Message)
            .where(
                Message.thread_id == thread_id,
                Message.sender_id != user_id,
                Message.is_read.is_(False),
            )
            .values(is_read=True)
        )

        await self.db.commit()

    async def archive_thread(self, thread_id: UUID, user_id: UUID) -> bool:
        """Archive a thread for the user."""
        thread = await self.db.get(MessageThread, thread_id)
        if not thread:
            return False

        if user_id not in (thread.initiator_id, thread.recipient_id):
            return False

        thread.status = "archived"
        await self.db.commit()
        return True

    def _thread_to_response(
        self, thread: MessageThread, user_id: UUID
    ) -> ThreadResponse:
        """Convert thread model to response."""
        is_initiator = thread.initiator_id == user_id
        other_user = thread.recipient if is_initiator else thread.initiator
        unread = (
            thread.initiator_unread_count
            if is_initiator
            else thread.recipient_unread_count
        )

        last_message_preview = None
        if thread.messages:
            last_message_preview = thread.messages[0].content[:100]

        listing_brief = None
        if thread.listing:
            first_photo = None
            if hasattr(thread.listing, "photos") and thread.listing.photos:
                first_photo = thread.listing.photos[0].url
            listing_brief = ThreadListingBrief(
                id=thread.listing.id,
                title=thread.listing.title,
                first_photo_url=first_photo,
            )

        return ThreadResponse(
            id=thread.id,
            listing=listing_brief,
            other_user=UserBrief(
                id=other_user.id,
                display_name=other_user.display_name,
                avatar_url=other_user.avatar_url,
                class_year=other_user.class_year,
            )
            if other_user
            else UserBrief(id=user_id, display_name="Unknown", avatar_url=None, class_year=None),
            last_message_preview=last_message_preview,
            unread_count=unread,
            last_message_at=thread.last_message_at,
            created_at=thread.created_at,
        )
