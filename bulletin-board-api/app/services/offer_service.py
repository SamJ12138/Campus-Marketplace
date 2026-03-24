from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.message import Message, MessageThread
from app.models.offer import Offer
from app.services.message_service import MessageService

OFFER_EXPIRY_HOURS = 48


class OfferService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.message_service = MessageService(db)

    async def create_offer(
        self,
        thread_id: UUID,
        offerer_id: UUID,
        amount: str,
        note: str = "",
    ) -> tuple[Offer, Message]:
        """Create a new offer and its linked message in the thread."""
        thread = await self.db.get(MessageThread, thread_id)
        if not thread:
            raise ValueError("Thread not found")
        if offerer_id not in (thread.initiator_id, thread.recipient_id):
            raise ValueError("Not a participant")

        # Determine recipient (the other participant)
        recipient_id = (
            thread.recipient_id
            if thread.initiator_id == offerer_id
            else thread.initiator_id
        )

        # Resolve listing_id from thread
        resolved_listing_id = thread.listing_id

        # Create the Offer record
        offer = Offer(
            thread_id=thread_id,
            listing_id=resolved_listing_id,
            offerer_id=offerer_id,
            recipient_id=recipient_id,
            amount=amount,
            status="pending",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=OFFER_EXPIRY_HOURS),
        )
        self.db.add(offer)
        await self.db.flush()  # get offer.id without committing

        # Create the linked Message with type "offer"
        content = f"Offer: {amount}" + (f" — {note}" if note else "")
        message = await self.message_service.send_message(
            thread_id=thread_id,
            sender_id=offerer_id,
            content=content,
            message_type="offer",
            meta={
                "offer_id": str(offer.id),
                "amount": amount,
                "status": "pending",
                "note": note,
            },
            listing_id=resolved_listing_id,
        )

        # Link message back to offer
        offer.message_id = message.id
        await self.db.commit()
        await self.db.refresh(offer, ["offerer", "recipient", "listing"])

        return offer, message

    async def accept_offer(self, offer_id: UUID, user_id: UUID) -> Offer:
        """Accept a pending offer. Only the recipient can accept."""
        offer = await self._get_offer(offer_id)
        if offer.recipient_id != user_id:
            raise ValueError("Only the recipient can accept this offer")
        if offer.status != "pending":
            raise ValueError(f"Cannot accept offer with status '{offer.status}'")

        offer.status = "accepted"
        offer.responded_at = datetime.now(timezone.utc)

        # Update the linked message meta
        await self._update_message_meta(offer.message_id, "accepted")

        # Send a system message announcing acceptance
        await self.message_service.send_message(
            thread_id=offer.thread_id,
            sender_id=user_id,
            content=f"Offer of {offer.amount} accepted!",
            message_type="offer_accepted",
            meta={
                "offer_id": str(offer.id),
                "amount": offer.amount,
                "status": "accepted",
            },
        )

        await self.db.commit()
        await self.db.refresh(offer, ["offerer", "recipient", "listing"])
        return offer

    async def decline_offer(self, offer_id: UUID, user_id: UUID) -> Offer:
        """Decline a pending offer. Only the recipient can decline."""
        offer = await self._get_offer(offer_id)
        if offer.recipient_id != user_id:
            raise ValueError("Only the recipient can decline this offer")
        if offer.status != "pending":
            raise ValueError(f"Cannot decline offer with status '{offer.status}'")

        offer.status = "declined"
        offer.responded_at = datetime.now(timezone.utc)

        await self._update_message_meta(offer.message_id, "declined")

        await self.message_service.send_message(
            thread_id=offer.thread_id,
            sender_id=user_id,
            content=f"Offer of {offer.amount} declined.",
            message_type="offer_declined",
            meta={
                "offer_id": str(offer.id),
                "amount": offer.amount,
                "status": "declined",
            },
        )

        await self.db.commit()
        await self.db.refresh(offer, ["offerer", "recipient", "listing"])
        return offer

    async def counter_offer(
        self,
        original_offer_id: UUID,
        user_id: UUID,
        amount: str,
        note: str = "",
    ) -> tuple[Offer, Message]:
        """Counter an existing offer with a new amount."""
        parent = await self._get_offer(original_offer_id)
        if parent.recipient_id != user_id:
            raise ValueError("Only the recipient can counter this offer")
        if parent.status != "pending":
            raise ValueError(f"Cannot counter offer with status '{parent.status}'")

        # Mark parent as countered
        parent.status = "countered"
        parent.responded_at = datetime.now(timezone.utc)
        await self._update_message_meta(parent.message_id, "countered")

        # Create counter-offer (roles swap)
        counter = Offer(
            thread_id=parent.thread_id,
            listing_id=parent.listing_id,
            offerer_id=user_id,
            recipient_id=parent.offerer_id,
            amount=amount,
            status="pending",
            parent_offer_id=parent.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=OFFER_EXPIRY_HOURS),
        )
        self.db.add(counter)
        await self.db.flush()

        content = f"Counter offer: {amount}" + (f" — {note}" if note else "")
        message = await self.message_service.send_message(
            thread_id=parent.thread_id,
            sender_id=user_id,
            content=content,
            message_type="offer",
            meta={
                "offer_id": str(counter.id),
                "amount": amount,
                "status": "pending",
                "note": note,
                "parent_offer_id": str(parent.id),
            },
            listing_id=parent.listing_id,
        )

        counter.message_id = message.id
        await self.db.commit()
        await self.db.refresh(counter, ["offerer", "recipient", "listing"])

        return counter, message

    async def get_thread_offers(
        self, thread_id: UUID, user_id: UUID
    ) -> list[Offer]:
        """Get all offers in a thread."""
        thread = await self.db.get(MessageThread, thread_id)
        if not thread or user_id not in (thread.initiator_id, thread.recipient_id):
            raise ValueError("Thread not found or not a participant")

        result = await self.db.execute(
            select(Offer)
            .options(
                selectinload(Offer.listing),
                selectinload(Offer.offerer),
                selectinload(Offer.recipient),
            )
            .where(Offer.thread_id == thread_id)
            .order_by(Offer.created_at.desc())
        )
        return list(result.scalars().all())

    # --- Internal helpers ---

    async def _get_offer(self, offer_id: UUID) -> Offer:
        offer = await self.db.scalar(
            select(Offer)
            .options(
                selectinload(Offer.listing),
                selectinload(Offer.offerer),
                selectinload(Offer.recipient),
            )
            .where(Offer.id == offer_id)
        )
        if not offer:
            raise ValueError("Offer not found")
        return offer

    async def _update_message_meta(
        self, message_id: UUID | None, new_status: str
    ) -> None:
        if not message_id:
            return
        message = await self.db.get(Message, message_id)
        if message and message.meta:
            message.meta = {**message.meta, "status": new_status}
