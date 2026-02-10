from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, cast, func, or_, select, update, Float
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.config import get_settings
from app.models.admin import AdminAction
from app.models.favorite import Favorite
from app.models.listing import (
    Category,
    Listing,
    ListingPhoto,
    ListingStatus,
    ListingType,
)
from app.schemas.listing import (
    CategoryBrief,
    ListingCreate,
    ListingResponse,
    ListingUpdate,
    PhotoResponse,
)
from app.models.user import User
from app.schemas.user import UserBrief

settings = get_settings()


class ListingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _escape_like(value: str) -> str:
        """Escape special characters for LIKE/ILIKE patterns."""
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    @staticmethod
    def _build_search_vector_value(title: str, description: str) -> str:
        """Build raw SQL expression for search_vector from title + description."""
        return func.to_tsvector(
            "english",
            func.coalesce(title, "") + " " + func.coalesce(description, ""),
        )

    async def search_listings(
        self,
        campus_id: UUID | None = None,
        type: ListingType | None = None,
        category_slug: str | None = None,
        query: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        page: int = 1,
        per_page: int = 20,
        sort: str = "newest",
        viewer_id: UUID | None = None,
    ) -> tuple[list[ListingResponse], int]:
        """Search listings with filters and pagination."""
        base_query = (
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(Listing.status == ListingStatus.ACTIVE)
        )

        # Always join Category so we can search/filter on it
        category_joined = False

        if campus_id:
            base_query = base_query.where(Listing.campus_id == campus_id)
        if type:
            base_query = base_query.where(Listing.type == type)
        if category_slug:
            base_query = base_query.join(Category).where(Category.slug == category_slug)
            category_joined = True
        if query:
            # Use full-text search via TSVECTOR (GIN-indexed) with ILIKE fallback
            # for fields not in the search vector (category name, price, location)
            ts_query = func.plainto_tsquery("english", query)
            safe_query = self._escape_like(query)
            if not category_joined:
                base_query = base_query.join(Category)
                category_joined = True
            base_query = base_query.where(
                or_(
                    Listing.search_vector.op("@@")(ts_query),
                    Category.name.ilike(f"%{safe_query}%"),
                    Listing.price_hint.ilike(f"%{safe_query}%"),
                    Listing.location_hint.ilike(f"%{safe_query}%"),
                )
            )

        # Price range filter — extract first numeric value from price_hint string
        if min_price is not None or max_price is not None:
            # Extract leading number from strings like "$25", "$10/hr", "25.50"
            numeric_price = cast(
                func.nullif(
                    func.regexp_replace(Listing.price_hint, r"[^0-9.]", "", "g"),
                    "",
                ),
                Float,
            )
            if min_price is not None:
                base_query = base_query.where(
                    and_(Listing.price_hint.isnot(None), numeric_price >= min_price)
                )
            if max_price is not None:
                base_query = base_query.where(
                    and_(Listing.price_hint.isnot(None), numeric_price <= max_price)
                )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await self.db.scalar(count_query) or 0

        # Sort
        if sort == "newest":
            base_query = base_query.order_by(Listing.created_at.desc())
        elif sort == "oldest":
            base_query = base_query.order_by(Listing.created_at.asc())
        elif sort == "popular":
            base_query = base_query.order_by(Listing.view_count.desc())

        # Paginate
        base_query = base_query.offset((page - 1) * per_page).limit(per_page)
        result = await self.db.execute(base_query)
        listings = list(result.scalars().all())

        # Check favorites if viewer
        favorited_ids = set()
        if viewer_id:
            fav_result = await self.db.execute(
                select(Favorite.listing_id).where(
                    Favorite.user_id == viewer_id,
                    Favorite.listing_id.in_([l.id for l in listings]),
                )
            )
            favorited_ids = {row[0] for row in fav_result.all()}

        items = []
        for listing in listings:
            items.append(self._to_response(listing, viewer_id, favorited_ids))

        return items, total

    async def get_listing(
        self,
        listing_id: UUID,
        viewer_id: UUID | None = None,
        increment_views: bool = False,
        campus_id: UUID | None = None,
    ) -> ListingResponse | None:
        """Get a single listing by ID."""
        query = (
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(Listing.id == listing_id)
        )
        if campus_id:
            query = query.where(Listing.campus_id == campus_id)
        result = await self.db.execute(query)
        listing = result.scalar_one_or_none()

        if not listing:
            return None

        # Don't show removed/draft listings to non-owners
        if listing.status in (ListingStatus.REMOVED, ListingStatus.DRAFT):
            if not viewer_id or listing.user_id != viewer_id:
                return None

        if increment_views and (not viewer_id or listing.user_id != viewer_id):
            await self.db.execute(
                update(Listing)
                .where(Listing.id == listing_id)
                .values(view_count=Listing.view_count + 1)
            )
            await self.db.commit()
            listing.view_count += 1

        favorited_ids = set()
        if viewer_id:
            fav = await self.db.scalar(
                select(Favorite.id).where(
                    Favorite.user_id == viewer_id,
                    Favorite.listing_id == listing_id,
                )
            )
            if fav:
                favorited_ids.add(listing_id)

        return self._to_response(listing, viewer_id, favorited_ids)

    async def create_listing(
        self,
        user_id: UUID,
        campus_id: UUID,
        data: ListingCreate,
        flagged: bool = False,
    ) -> ListingResponse:
        """Create a new listing."""
        listing = Listing(
            user_id=user_id,
            campus_id=campus_id,
            type=data.type,
            category_id=data.category_id,
            title=data.title,
            description=data.description,
            price_hint=data.price_hint,
            location_type=data.location_type,
            location_hint=data.location_hint,
            availability=data.availability,
            contact_preference=data.contact_preference,
            contact_details=data.contact_details,
            is_regulated=data.is_regulated,
            disclaimer_accepted=data.disclaimer_accepted,
            status=ListingStatus.ACTIVE,
            expires_at=datetime.utcnow() + timedelta(days=settings.listing_expiry_days),
        )
        self.db.add(listing)
        await self.db.flush()

        # Populate search_vector for full-text search
        await self.db.execute(
            update(Listing)
            .where(Listing.id == listing.id)
            .values(
                search_vector=func.to_tsvector(
                    "english",
                    func.coalesce(data.title, "") + " " + func.coalesce(data.description, ""),
                )
            )
        )

        # Increment user listing count

        await self.db.execute(
            update(User).where(User.id == user_id).values(listing_count=User.listing_count + 1)
        )

        await self.db.commit()
        await self.db.refresh(listing, ["user", "category", "photos"])

        return self._to_response(listing, user_id, set())

    async def update_listing(
        self,
        listing_id: UUID,
        user_id: UUID,
        data: ListingUpdate,
    ) -> ListingResponse | None:
        """Update an existing listing. Owner only."""
        result = await self.db.execute(
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(Listing.id == listing_id, Listing.user_id == user_id)
        )
        listing = result.scalar_one_or_none()

        if not listing:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(listing, field, value)

        # Update search_vector if title or description changed
        if "title" in update_data or "description" in update_data:
            await self.db.execute(
                update(Listing)
                .where(Listing.id == listing_id)
                .values(
                    search_vector=func.to_tsvector(
                        "english",
                        func.coalesce(listing.title, "") + " " + func.coalesce(listing.description, ""),
                    )
                )
            )

        await self.db.commit()
        await self.db.refresh(listing)

        return self._to_response(listing, user_id, set())

    async def delete_listing(self, listing_id: UUID, user_id: UUID) -> bool:
        """Soft delete a listing."""
        result = await self.db.execute(
            select(Listing).where(
                Listing.id == listing_id,
                Listing.user_id == user_id,
            )
        )
        listing = result.scalar_one_or_none()

        if not listing:
            return False

        listing.status = ListingStatus.REMOVED
        listing.removal_reason = "Deleted by owner"


        await self.db.execute(
            update(User)
            .where(User.id == user_id, User.listing_count > 0)
            .values(listing_count=User.listing_count - 1)
        )

        await self.db.commit()
        return True

    async def renew_listing(self, listing_id: UUID, user_id: UUID) -> ListingResponse | None:
        """Renew listing for another expiry period."""
        result = await self.db.execute(
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(
                Listing.id == listing_id,
                Listing.user_id == user_id,
                Listing.status.in_([ListingStatus.ACTIVE, ListingStatus.EXPIRED]),
            )
        )
        listing = result.scalar_one_or_none()

        if not listing:
            return None

        listing.status = ListingStatus.ACTIVE
        listing.expires_at = datetime.utcnow() + timedelta(days=settings.listing_expiry_days)
        listing.renewed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(listing)

        return self._to_response(listing, user_id, set())

    async def mark_sold(self, listing_id: UUID, user_id: UUID) -> ListingResponse | None:
        """Mark an item listing as sold."""
        result = await self.db.execute(
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(
                Listing.id == listing_id,
                Listing.user_id == user_id,
                Listing.status == ListingStatus.ACTIVE,
            )
        )
        listing = result.scalar_one_or_none()

        if not listing:
            return None

        listing.status = ListingStatus.SOLD
        await self.db.commit()
        await self.db.refresh(listing)

        return self._to_response(listing, user_id, set())

    async def get_user_listings(
        self,
        user_id: UUID,
        include_inactive: bool = False,
    ) -> list[ListingResponse]:
        """Get all listings for a user."""
        query = (
            select(Listing)
            .options(selectinload(Listing.user), selectinload(Listing.category), selectinload(Listing.photos))
            .where(Listing.user_id == user_id)
        )

        if not include_inactive:
            query = query.where(Listing.status == ListingStatus.ACTIVE)

        query = query.order_by(Listing.created_at.desc())
        result = await self.db.execute(query)
        listings = list(result.scalars().all())

        return [self._to_response(l, user_id, set()) for l in listings]

    async def admin_remove_listing(
        self,
        listing_id: UUID,
        admin_id: UUID,
        reason: str,
    ) -> bool:
        """Admin removal with audit log."""
        listing = await self.db.get(Listing, listing_id)
        if not listing:
            return False

        listing.status = ListingStatus.REMOVED
        listing.removal_reason = reason

        audit = AdminAction(
            admin_id=admin_id,
            action_type="listing_removed",
            target_type="listing",
            target_id=listing_id,
            reason=reason,
        )
        self.db.add(audit)

        await self.db.commit()
        return True

    def _to_response(
        self,
        listing: Listing,
        viewer_id: UUID | None,
        favorited_ids: set[UUID],
    ) -> ListingResponse:
        """Convert Listing model to response schema."""
        return ListingResponse(
            id=listing.id,
            type=listing.type,
            title=listing.title,
            description=listing.description,
            price_hint=listing.price_hint,
            category=CategoryBrief(
                id=listing.category.id,
                name=listing.category.name,
                slug=listing.category.slug,
            )
            if listing.category
            else None,
            location_type=listing.location_type,
            location_hint=listing.location_hint,
            availability=listing.availability,
            contact_preference=listing.contact_preference,
            is_regulated=listing.is_regulated,
            status=listing.status,
            view_count=listing.view_count,
            photos=[
                PhotoResponse(
                    id=p.id,
                    url=p.url,
                    thumbnail_url=p.thumbnail_url,
                    position=p.position,
                )
                for p in (listing.photos or [])
            ],
            user=UserBrief(
                id=listing.user.id,
                display_name=listing.user.display_name,
                avatar_url=listing.user.avatar_url,
                class_year=listing.user.class_year,
            )
            if listing.user
            else UserBrief(id=listing.user_id, display_name="Unknown", avatar_url=None, class_year=None),
            is_favorited=listing.id in favorited_ids,
            is_own=viewer_id is not None and listing.user_id == viewer_id,
            created_at=listing.created_at,
            expires_at=listing.expires_at,
        )
