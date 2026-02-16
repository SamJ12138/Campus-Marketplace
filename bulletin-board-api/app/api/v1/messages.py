import logging
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.core.rate_limit import check_message_rate_limit
from app.dependencies import get_db, get_redis
from app.models.message import MessageThread
from app.models.notification import NotificationPreference
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.message import (
    MessageResponse,
    SendMessageRequest,
    StartThreadRequest,
    ThreadDetailResponse,
    ThreadListingBrief,
    ThreadListResponse,
)
from app.services.email_service import EmailService
from app.services.email_templates import new_message_email
from app.services.message_service import MessageService
from app.services.moderation_service import ModerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/threads", tags=["messaging"])


def _send_notification_email(
    recipient_email: str,
    sender_name: str,
    listing_title: str,
    message_content: str,
    thread_url: str,
) -> None:
    """Send email notification in background thread. Called by FastAPI BackgroundTasks."""
    try:
        settings = get_settings()
        html, text = new_message_email(sender_name, listing_title, message_content, thread_url)
        email_service = EmailService(settings)
        ok = email_service.send_email_sync(
            to_email=recipient_email,
            subject=f"New message from {sender_name} - Gimme Dat",
            html_content=html,
            text_content=text,
        )
        if not ok:
            logger.error("[MSG-NOTIFY] Email send returned failure for %s", recipient_email)
    except Exception:
        logger.exception("Failed to send message notification email")


async def _maybe_queue_email(
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    recipient_id: UUID,
    sender_name: str,
    listing_title: str,
    message_content: str,
    thread_id: UUID,
) -> None:
    """Check preferences and queue email notification as background task."""
    try:
        prefs = await db.scalar(
            select(NotificationPreference).where(
                NotificationPreference.user_id == recipient_id
            )
        )
        if prefs and not prefs.email_messages:
            logger.info(
                "[MSG-NOTIFY] Skipped: recipient %s has email_messages disabled",
                recipient_id,
            )
            return

        recipient = await db.get(User, recipient_id)
        if not recipient or not recipient.email:
            logger.warning(
                "[MSG-NOTIFY] Skipped: recipient %s not found or has no email",
                recipient_id,
            )
            return

        settings = get_settings()
        thread_url = f"{settings.primary_frontend_url}/messages?thread={thread_id}"

        logger.info("[MSG-NOTIFY] Queuing email to %s for thread %s", recipient.email, thread_id)
        background_tasks.add_task(
            _send_notification_email,
            recipient.email,
            sender_name,
            listing_title,
            message_content,
            thread_url,
        )
    except Exception:
        logger.exception("Failed to queue message notification email")


@router.get("", response_model=ThreadListResponse)
async def list_threads(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all message threads for current user."""
    service = MessageService(db)
    threads, total = await service.get_user_threads(current_user.id, page, per_page)
    return ThreadListResponse(
        items=threads,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total,
            total_pages=-(-total // per_page) if total > 0 else 0,
            has_next=page * per_page < total,
            has_prev=page > 1,
        ),
    )


@router.post("", response_model=ThreadDetailResponse, status_code=201)
async def start_thread(
    data: StartThreadRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new conversation about a listing (or reuse existing thread with same user)."""
    await check_message_rate_limit(redis, current_user)

    moderation = ModerationService(db)
    filter_result = await moderation.check_content(
        data.message, current_user.campus_id, context="messages"
    )
    if filter_result.blocked:
        raise HTTPException(400, "Message contains prohibited content")

    service = MessageService(db)
    try:
        thread, created = await service.get_or_create_thread(
            data.listing_id, current_user.id, campus_id=current_user.campus_id
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Capture data before send_message commits (avoids detached-instance issues)
    thread_id = thread.id
    listing_title = thread.listing.title if thread.listing else "a listing"
    recipient_id = (
        thread.recipient_id
        if thread.initiator_id == current_user.id
        else thread.initiator_id
    )

    try:
        message = await service.send_message(
            thread_id,
            current_user.id,
            data.message,
            flagged=filter_result.flagged,
            listing_id=data.listing_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Queue email notification (non-blocking background task)
    try:
        await _maybe_queue_email(
            db, background_tasks, recipient_id, current_user.display_name,
            listing_title, data.message, thread_id,
        )
    except Exception:
        logger.exception("Failed to queue email in start_thread")

    # Re-fetch thread with all relationships loaded after commit
    thread = await db.scalar(
        select(MessageThread)
        .options(
            selectinload(MessageThread.listing),
            selectinload(MessageThread.initiator),
            selectinload(MessageThread.recipient),
            selectinload(MessageThread.messages),
        )
        .where(MessageThread.id == thread_id)
    )

    # Build listing brief for the message
    msg_listing = message.listing
    listing_brief = None
    if msg_listing:
        first_photo = None
        if hasattr(msg_listing, "photos") and msg_listing.photos:
            first_photo = msg_listing.photos[0].url
        listing_brief = ThreadListingBrief(
            id=msg_listing.id,
            title=msg_listing.title,
            first_photo_url=first_photo,
        )

    messages_list = [
        MessageResponse(
            id=message.id,
            sender_id=message.sender_id,
            sender_name=(
                message.sender.display_name if message.sender
                else current_user.display_name
            ),
            content=message.content,
            is_read=message.is_read,
            is_own=True,
            listing=listing_brief,
            created_at=message.created_at,
        )
    ]

    thread_response = service._thread_to_response(thread, current_user.id)

    return ThreadDetailResponse(
        thread=thread_response,
        messages=messages_list,
        pagination=PaginationMeta(
            page=1, per_page=50, total_items=1,
            total_pages=1, has_next=False, has_prev=False
        ),
    )


@router.get("/{thread_id}", response_model=ThreadDetailResponse)
async def get_thread(
    thread_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get thread with messages.

    NOTE: This endpoint does NOT auto-mark messages as read.
    Use PATCH /threads/{thread_id}/read explicitly when the user
    actively opens or views the thread.
    """
    service = MessageService(db)

    # Eagerly load all relationships needed by _thread_to_response
    thread = await db.scalar(
        select(MessageThread)
        .options(
            selectinload(MessageThread.listing),
            selectinload(MessageThread.initiator),
            selectinload(MessageThread.recipient),
            selectinload(MessageThread.messages),
        )
        .where(MessageThread.id == thread_id)
    )

    if not thread or current_user.id not in (
        thread.initiator_id,
        thread.recipient_id,
    ):
        raise HTTPException(404, "Thread not found")

    messages, total = await service.get_thread_messages(
        thread_id, current_user.id, page, per_page
    )

    # mark_thread_read removed from here — handled by explicit PATCH call

    thread_response = service._thread_to_response(thread, current_user.id)

    return ThreadDetailResponse(
        thread=thread_response,
        messages=messages,
        pagination=PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total,
            total_pages=-(-total // per_page) if total > 0 else 0,
            has_next=page * per_page < total,
            has_prev=page > 1,
        ),
    )


@router.post("/{thread_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    thread_id: UUID,
    data: SendMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Send a message in an existing thread."""
    await check_message_rate_limit(redis, current_user)

    moderation = ModerationService(db)
    filter_result = await moderation.check_content(
        data.content, current_user.campus_id, context="messages"
    )
    if filter_result.blocked:
        raise HTTPException(400, "Message contains prohibited content")

    service = MessageService(db)
    try:
        message = await service.send_message(
            thread_id,
            current_user.id,
            data.content,
            flagged=filter_result.flagged,
            listing_id=data.listing_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Queue email notification (non-blocking background task)
    thread = await db.scalar(
        select(MessageThread)
        .options(selectinload(MessageThread.listing))
        .where(MessageThread.id == thread_id)
    )
    if thread:
        recipient_id = (
            thread.recipient_id
            if thread.initiator_id == current_user.id
            else thread.initiator_id
        )
        # Use message-level listing title if available, else thread-level
        msg_listing = message.listing
        listing_title = (
            msg_listing.title if msg_listing
            else (thread.listing.title if thread.listing else "a listing")
        )
        await _maybe_queue_email(
            db, background_tasks, recipient_id, current_user.display_name,
            listing_title, data.content, thread_id,
        )

    # Build listing brief for the response
    listing_brief = None
    if message.listing:
        first_photo = None
        if hasattr(message.listing, "photos") and message.listing.photos:
            first_photo = message.listing.photos[0].url
        listing_brief = ThreadListingBrief(
            id=message.listing.id,
            title=message.listing.title,
            first_photo_url=first_photo,
        )

    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=(
            message.sender.display_name if message.sender
            else current_user.display_name
        ),
        content=message.content,
        is_read=message.is_read,
        is_own=True,
        listing=listing_brief,
        created_at=message.created_at,
    )


@router.patch("/{thread_id}/read", status_code=204)
async def mark_read(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark all messages in thread as read.

    Should be called when the user explicitly opens/views a thread:
    - Clicking on a thread in the contact list
    - Returning to the tab with a thread open (window focus)
    - Clicking a notification that links to a thread
    """
    service = MessageService(db)
    await service.mark_thread_read(thread_id, current_user.id)
