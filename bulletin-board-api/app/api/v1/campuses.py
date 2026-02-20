from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.campus import Campus

router = APIRouter(prefix="/campuses", tags=["campuses"])


class CampusResponse(BaseModel):
    slug: str
    name: str
    domain: str
    allow_non_edu: bool

    model_config = {"from_attributes": True}


@router.get("", response_model=list[CampusResponse])
async def list_campuses(
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint returning active campuses."""
    result = await db.execute(
        select(Campus).where(Campus.is_active.is_(True)).order_by(Campus.name)
    )
    return list(result.scalars().all())
