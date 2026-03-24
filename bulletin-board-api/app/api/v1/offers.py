import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.core.rate_limit import check_rate_limit
from app.dependencies import get_db, get_redis
from app.models.user import User
from app.schemas.message import ThreadListingBrief
from app.schemas.offer import (
    CounterOfferRequest,
    CreateOfferRequest,
    OfferActionResponse,
    OfferResponse,
)
from app.schemas.user import UserBrief
from app.services.ai_moderation_service import AIModerationService
from app.services.ai_service import AIService
from app.services.moderation_service import ModerationService
from app.services.offer_service import OfferService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/offers", tags=["offers"])


def _offer_to_response(offer) -> OfferResponse:
    """Convert Offer ORM model to OfferResponse schema."""
    listing_brief = None
    if offer.listing:
        first_photo = None
        if hasattr(offer.listing, "photos") and offer.listing.photos:
            first_photo = offer.listing.photos[0].url
        listing_brief = ThreadListingBrief(
            id=offer.listing.id,
            title=offer.listing.title,
            first_photo_url=first_photo,
        )
    return OfferResponse(
        id=offer.id,
        thread_id=offer.thread_id,
        listing=listing_brief,
        offerer=UserBrief(
            id=offer.offerer.id,
            display_name=offer.offerer.display_name,
            avatar_url=offer.offerer.avatar_url,
            class_year=offer.offerer.class_year,
        ),
        recipient=UserBrief(
            id=offer.recipient.id,
            display_name=offer.recipient.display_name,
            avatar_url=offer.recipient.avatar_url,
            class_year=offer.recipient.class_year,
        ),
        amount=offer.amount,
        status=offer.status,
        parent_offer_id=offer.parent_offer_id,
        message_id=offer.message_id,
        expires_at=offer.expires_at,
        responded_at=offer.responded_at,
        created_at=offer.created_at,
    )


async def _moderate_note(
    note: str, db: AsyncSession, campus_id: UUID | None
) -> None:
    """Run content moderation on offer note. Raises HTTPException if blocked."""
    moderation = ModerationService(db)
    filter_result = await moderation.check_content(
        note, campus_id, context="messages"
    )
    if filter_result.blocked:
        raise HTTPException(400, "Offer note contains prohibited content")

    settings = get_settings()
    ai_service = AIService(settings)
    ai_mod = AIModerationService(ai_service)
    if ai_mod.enabled and not filter_result.blocked:
        verdict = await ai_mod.analyze_content(note, context="message")
        if verdict.action.value == "block":
            raise HTTPException(400, "Offer note violates platform policies")


@router.post("/threads/{thread_id}", response_model=OfferResponse, status_code=201)
async def create_offer(
    thread_id: UUID,
    data: CreateOfferRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new offer in a thread."""
    await check_rate_limit(
        redis, f"offers:{current_user.id}", limit=20, window_seconds=3600
    )

    if data.note:
        await _moderate_note(data.note, db, current_user.campus_id)

    service = OfferService(db)
    try:
        offer, _message = await service.create_offer(
            thread_id=thread_id,
            offerer_id=current_user.id,
            amount=data.amount,
            note=data.note,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return _offer_to_response(offer)


@router.patch("/{offer_id}/accept", response_model=OfferActionResponse)
async def accept_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Accept a pending offer."""
    service = OfferService(db)
    try:
        offer = await service.accept_offer(offer_id, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return OfferActionResponse(
        offer=_offer_to_response(offer),
        message="Offer accepted!",
    )


@router.patch("/{offer_id}/decline", response_model=OfferActionResponse)
async def decline_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Decline a pending offer."""
    service = OfferService(db)
    try:
        offer = await service.decline_offer(offer_id, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return OfferActionResponse(
        offer=_offer_to_response(offer),
        message="Offer declined.",
    )


@router.post("/{offer_id}/counter", response_model=OfferResponse, status_code=201)
async def counter_offer(
    offer_id: UUID,
    data: CounterOfferRequest,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Counter an existing offer with a new amount."""
    await check_rate_limit(
        redis, f"offers:{current_user.id}", limit=20, window_seconds=3600
    )

    if data.note:
        await _moderate_note(data.note, db, current_user.campus_id)

    service = OfferService(db)
    try:
        counter, _message = await service.counter_offer(
            original_offer_id=offer_id,
            user_id=current_user.id,
            amount=data.amount,
            note=data.note,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return _offer_to_response(counter)


@router.get("/threads/{thread_id}", response_model=list[OfferResponse])
async def get_thread_offers(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all offers in a thread."""
    service = OfferService(db)
    try:
        offers = await service.get_thread_offers(thread_id, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return [_offer_to_response(o) for o in offers]
