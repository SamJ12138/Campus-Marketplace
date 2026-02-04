from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.rate_limit import check_message_rate_limit
from app.dependencies import get_db, get_redis
from app.models.message import MessageThread
from app.models.user import User
from app.schemas.common import PaginationMeta
from app.schemas.message import (
    MessageResponse,
    SendMessageRequest,
    StartThreadRequest,
    ThreadDetailResponse,
    ThreadListResponse,
)
from app.services.message_service import MessageService
from app.services.moderation_service import ModerationService

router = APIRouter(prefix="/threads", tags=["messaging"])


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
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user),
):
    """Start a new conversation about a listing."""
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

    message = await service.send_message(
        thread.id,
        current_user.id,
        data.message,
        flagged=filter_result.flagged,
    )

    messages_list = [
        MessageResponse(
            id=message.id,
            sender_id=message.sender_id,
            sender_name=message.sender.display_name if message.sender else current_user.display_name,
            content=message.content,
            is_read=message.is_read,
            is_own=True,
            created_at=message.created_at,
        )
    ]

    thread_response = service._thread_to_response(thread, current_user.id)

    return ThreadDetailResponse(
        thread=thread_response,
        messages=messages_list,
        pagination=PaginationMeta(
            page=1, per_page=50, total_items=1, total_pages=1, has_next=False, has_prev=False
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
    """Get thread with messages."""
    service = MessageService(db)
    thread = await db.get(MessageThread, thread_id)

    if not thread or current_user.id not in (
        thread.initiator_id,
        thread.recipient_id,
    ):
        raise HTTPException(404, "Thread not found")

    messages, total = await service.get_thread_messages(
        thread_id, current_user.id, page, per_page
    )

    await service.mark_thread_read(thread_id, current_user.id)

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
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return MessageResponse(
        id=message.id,
        sender_id=message.sender_id,
        sender_name=message.sender.display_name if message.sender else current_user.display_name,
        content=message.content,
        is_read=message.is_read,
        is_own=True,
        created_at=message.created_at,
    )


@router.patch("/{thread_id}/read", status_code=204)
async def mark_read(
    thread_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Mark all messages in thread as read."""
    service = MessageService(db)
    await service.mark_thread_read(thread_id, current_user.id)
