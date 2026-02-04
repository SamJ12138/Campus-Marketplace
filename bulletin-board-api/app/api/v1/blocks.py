from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import and_, delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.dependencies import get_db
from app.models.block import Block
from app.models.message import MessageThread
from app.models.user import User
from app.schemas.user import UserBrief

router = APIRouter(prefix="/blocks", tags=["moderation"])


@router.post("", status_code=201)
async def block_user(
    user_id: UUID = Body(..., embed=True),
    reason: str | None = Body(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Block a user."""
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot block yourself")

    target = await db.get(User, user_id)
    if not target or target.campus_id != current_user.campus_id:
        raise HTTPException(404, "User not found")

    existing = await db.scalar(
        select(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    if existing:
        raise HTTPException(400, "User already blocked")

    block = Block(
        blocker_id=current_user.id,
        blocked_id=user_id,
        reason=reason,
    )
    db.add(block)

    # Archive any existing threads between the users
    await db.execute(
        update(MessageThread)
        .where(
            or_(
                and_(
                    MessageThread.initiator_id == current_user.id,
                    MessageThread.recipient_id == user_id,
                ),
                and_(
                    MessageThread.initiator_id == user_id,
                    MessageThread.recipient_id == current_user.id,
                ),
            )
        )
        .values(status="blocked")
    )

    await db.commit()
    return {"message": "User blocked"}


@router.delete("/{user_id}", status_code=204)
async def unblock_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Unblock a user."""
    result = await db.execute(
        delete(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == user_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(404, "Block not found")
    await db.commit()


@router.get("", response_model=list[UserBrief])
async def list_blocked_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List users I've blocked."""
    result = await db.execute(
        select(User)
        .join(Block, Block.blocked_id == User.id)
        .where(Block.blocker_id == current_user.id)
    )
    return list(result.scalars().all())
