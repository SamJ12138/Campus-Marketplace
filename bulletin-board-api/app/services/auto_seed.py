"""Auto-seed example listings on startup.

Runs once per deployment. Deletes stale [EXAMPLE] listings and
recreates them under the first admin user found (or a specific
user by email). Each listing gets an Unsplash photo.
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select, update

from app.config import get_settings
from app.models.listing import (
    Category,
    Listing,
    ListingPhoto,
    ListingStatus,
)
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

_U = "https://images.unsplash.com/photo-"
_Q = "?w=800&h=600&fit=crop&q=80"

EXAMPLES = [
    # ── Textbooks ──
    {
        "t": "item",
        "cat": "textbooks",
        "title": "Intro to Psychology — Myers, 12th Ed",
        "desc": (
            "Barely used, clean pages, no highlighting. "
            "Comes with online access code (unused). "
            "Perfect for Psych 101. Can meet at the "
            "library or student center."
        ),
        "price": "$35",
        "loc": "on_campus",
        "hint": "Library main entrance",
        "img": f"{_U}1544716278-ca5e3f4abd8c{_Q}",
    },
    {
        "t": "item",
        "cat": "textbooks",
        "title": "Principles of Microeconomics — Mankiw",
        "desc": (
            "8th edition, some highlighting in chapters "
            "1-6 but otherwise clean. Great condition. "
            "Includes study guide insert. Selling because "
            "I switched majors."
        ),
        "price": "$30",
        "loc": "on_campus",
        "hint": "Economics department building",
        "img": f"{_U}1456513080510-7bf3a84b82f8{_Q}",
    },
    {
        "t": "item",
        "cat": "textbooks",
        "title": "College Writing Skills with Readings",
        "desc": (
            "Langan 10th edition. Required for English "
            "Comp. All pages intact, some margin notes "
            "that are actually helpful. Free highlighter "
            "included if you want it."
        ),
        "price": "$20",
        "loc": "on_campus",
        "hint": "Student center",
        "img": f"{_U}1497633762265-9d179a990aa6{_Q}",
    },
    # ── Tutoring ──
    {
        "t": "service",
        "cat": "tutoring",
        "title": "Spanish Tutor — Native Speaker",
        "desc": (
            "Heritage speaker with 3 years of tutoring "
            "experience. Conversation practice, grammar, "
            "essay writing, and exam prep. Flexible "
            "scheduling — evenings and weekends."
        ),
        "price": "$20/hr",
        "loc": "on_campus",
        "hint": "Library study rooms or Zoom",
        "img": f"{_U}1522202176988-66273c2fd55f{_Q}",
    },
    {
        "t": "service",
        "cat": "tutoring",
        "title": "Calculus Tutoring — Calc I, II & III",
        "desc": (
            "Math major, aced all three semesters. I "
            "break down limits, derivatives, and "
            "integrals in a way that actually clicks. "
            "Exam prep and homework help available."
        ),
        "price": "$25/hr",
        "loc": "on_campus",
        "hint": "Library study rooms or Zoom",
        "img": f"{_U}1434030216411-0b793f4b4173{_Q}",
    },
    # ── Hair & Beauty ──
    {
        "t": "service",
        "cat": "hair-beauty",
        "title": "Box Braids — All Lengths Available",
        "desc": (
            "Knotless box braids, medium and small "
            "sizes. Hair included in price for lengths "
            "up to 30 inches. Booking this weekend and "
            "next — DM me your availability."
        ),
        "price": "From $80",
        "loc": "on_campus",
        "hint": "My dorm or yours — I bring everything",
        "img": f"{_U}1560066984-138dadb4c035{_Q}",
    },
    {
        "t": "service",
        "cat": "hair-beauty",
        "title": "Gel Nail Sets — Custom Designs",
        "desc": (
            "French tips, chrome, nail art, and custom "
            "designs. Lasts 2-3 weeks. I have all the "
            "supplies. Takes about an hour. Just message "
            "me to book a time slot!"
        ),
        "price": "$30-45",
        "loc": "on_campus",
        "hint": "My room — very quick appointment",
        "img": f"{_U}1522337360788-8b13dee7a37e{_Q}",
    },
    # ── Electronics ──
    {
        "t": "item",
        "cat": "electronics",
        "title": "iPad Air (5th Gen) + Apple Pencil",
        "desc": (
            "64GB WiFi, Space Gray. Used for one semester "
            "of note-taking. Screen protector since day "
            "one, zero scratches. Includes Apple Pencil "
            "2nd gen and a magnetic case."
        ),
        "price": "$420",
        "loc": "on_campus",
        "hint": "Can meet anywhere on campus",
        "img": f"{_U}1544244015-0df4b3ffc6b0{_Q}",
    },
    {
        "t": "item",
        "cat": "electronics",
        "title": "Sony WH-1000XM5 Headphones",
        "desc": (
            "Black, excellent condition. Best noise "
            "cancelling for studying in loud dorms. "
            "Battery lasts 30+ hours. Includes case "
            "and charging cable."
        ),
        "price": "$180",
        "loc": "on_campus",
        "hint": "Student center or dining hall",
        "img": f"{_U}1608043152269-423dbba4e7e1{_Q}",
    },
    # ── Photography ──
    {
        "t": "service",
        "cat": "photography",
        "title": "Graduation Photo Sessions — Book Now",
        "desc": (
            "30-minute session, 20+ edited photos within "
            "a week. I know all the best spots on campus. "
            "Portraits, headshots, and couple photos in "
            "natural light."
        ),
        "price": "$75/session",
        "loc": "on_campus",
        "hint": "Best campus photo spots",
        "img": f"{_U}1542038784456-1ea8e935640e{_Q}",
    },
    # ── Furniture ──
    {
        "t": "item",
        "cat": "furniture",
        "title": "IKEA KALLAX Shelf Unit (White, 4x2)",
        "desc": (
            "Perfect dorm storage. Fits books, bins, and "
            "vinyl. Easy to take apart for transport. No "
            "scratches. Bought for $90, selling cheap "
            "because I'm moving off campus."
        ),
        "price": "$35",
        "loc": "on_campus",
        "hint": "Can help carry to your dorm",
        "img": f"{_U}1518455027359-f3f8164ba6bd{_Q}",
    },
    {
        "t": "item",
        "cat": "furniture",
        "title": "Mini Fridge — Perfect for Dorms",
        "desc": (
            "Compact 3.2 cu ft fridge with small freezer "
            "compartment. Runs quiet, perfect for keeping "
            "drinks and snacks cold. Can deliver to any "
            "dorm on campus."
        ),
        "price": "$60",
        "loc": "on_campus",
        "hint": "Can deliver on campus",
        "img": f"{_U}1555041469-a586c61ea9bc{_Q}",
    },
    # ── Clothing ──
    {
        "t": "item",
        "cat": "clothing",
        "title": "Nike Dunk Low (Panda) — Size 10",
        "desc": (
            "Worn maybe 5 times, no creasing. Comes with "
            "original box. Selling because I got a "
            "different colorway. These are clean."
        ),
        "price": "$75",
        "loc": "on_campus",
        "hint": "Student center",
        "img": f"{_U}1542272604-787c3835535d{_Q}",
    },
    {
        "t": "item",
        "cat": "clothing",
        "title": "North Face Puffer Jacket — Women's M",
        "desc": (
            "Black 700-fill down jacket, super warm. "
            "Bought last winter for $250. No rips, all "
            "zippers work. Perfect for cold walks to "
            "class."
        ),
        "price": "$90",
        "loc": "on_campus",
        "hint": "Anywhere on campus",
        "img": f"{_U}1591047139829-d91aecb6caea{_Q}",
    },
    # ── Tickets ──
    {
        "t": "item",
        "cat": "tickets",
        "title": "2 Tickets to Spring Formal",
        "desc": (
            "Can't make it anymore. Paid $30 each, "
            "selling below face value. Digital tickets, "
            "I'll transfer them to your student account."
        ),
        "price": "$25 each",
        "loc": "on_campus",
        "hint": "Digital transfer — no meetup needed",
        "img": f"{_U}1501281668745-f7f57925c3b4{_Q}",
    },
    # ── Music Lessons ──
    {
        "t": "service",
        "cat": "music-lessons",
        "title": "Guitar Lessons — Acoustic & Electric",
        "desc": (
            "Music minor, 10 years experience. Chords, "
            "fingerpicking, and theory. Beginners welcome. "
            "I have extra guitars you can borrow for "
            "practice."
        ),
        "price": "$20/hr",
        "loc": "on_campus",
        "hint": "Music building practice rooms",
        "img": f"{_U}1520523839897-bd043c4cd28f{_Q}",
    },
    {
        "t": "service",
        "cat": "music-lessons",
        "title": "Piano Lessons — Classical & Pop",
        "desc": (
            "12 years of piano experience. Beginners "
            "through intermediate. Sheet music, chords, "
            "or learn your favorite songs. Practice rooms "
            "in the music building are free."
        ),
        "price": "$18/hr",
        "loc": "on_campus",
        "hint": "Music building or my apartment",
        "img": f"{_U}1519892300165-cb5542fb47c7{_Q}",
    },
    # ── Fitness ──
    {
        "t": "service",
        "cat": "fitness",
        "title": "Personal Training — Strength & Conditioning",
        "desc": (
            "NASM certified. Custom programs for muscle "
            "gain, fat loss, or athletic performance. "
            "I work with all fitness levels. First "
            "session free to see if we're a good fit."
        ),
        "price": "$20/session",
        "loc": "on_campus",
        "hint": "Campus gym",
        "img": f"{_U}1544367567-0f2fcb009e0b{_Q}",
    },
    {
        "t": "service",
        "cat": "fitness",
        "title": "Yoga Sessions — Stress Relief",
        "desc": (
            "Certified yoga instructor (200-hour RYT). "
            "45-minute sessions focused on stress relief "
            "and flexibility. Perfect for exam anxiety. "
            "Bring a mat — I have extras."
        ),
        "price": "$10/session",
        "loc": "on_campus",
        "hint": "Campus green or gym studio",
        "img": f"{_U}1549719386-74dfcbf7dbed{_Q}",
    },
    # ── Tech Help ──
    {
        "t": "service",
        "cat": "tech-help",
        "title": "Laptop Repair & Cleanup Service",
        "desc": (
            "CS major. Fix slow laptops, replace screens, "
            "clean up malware. Most repairs done same day. "
            "Way cheaper than the Apple Store. Free quote."
        ),
        "price": "From $25",
        "loc": "on_campus",
        "hint": "My dorm room — quick turnaround",
        "img": f"{_U}1461749280684-dccba630e2f6{_Q}",
    },
    {
        "t": "service",
        "cat": "tech-help",
        "title": "Phone Screen Repair — Same Day",
        "desc": (
            "I fix cracked screens for iPhones and "
            "Samsung Galaxy phones. Parts from reliable "
            "suppliers. Most repairs under an hour. "
            "Bring your phone for a free quote."
        ),
        "price": "From $40",
        "loc": "on_campus",
        "hint": "My dorm room — quick turnaround",
        "img": f"{_U}1581092160607-ee67df30e38e{_Q}",
    },
]

# Marker prefix so we can find/delete seeded listings
_MARKER = "[EXAMPLE] "


async def auto_seed_examples(
    session_factory,
) -> None:
    """Delete old example listings, then recreate them.

    Called from the app lifespan on every startup. Finds the
    first admin user (or user whose email starts with 'jiati01')
    and seeds listings under their account.
    """
    settings = get_settings()

    async with session_factory() as db:
        # ── Find the target user ──
        user = await db.scalar(
            select(User).where(
                User.email.ilike("jiati01%")
            )
        )
        if not user:
            # Fallback: first admin
            user = await db.scalar(
                select(User).where(
                    User.role == UserRole.ADMIN
                )
            )
        if not user:
            logger.warning(
                "[AUTO-SEED] No user found — skipping"
            )
            return

        # ── Check if already seeded with correct count ──
        count = await db.scalar(
            select(func.count(Listing.id)).where(
                Listing.title.like(f"{_MARKER}%"),
                Listing.user_id == user.id,
            )
        ) or 0

        if count >= len(EXAMPLES):
            logger.info(
                "[AUTO-SEED] %d examples exist — skipping",
                count,
            )
            return

        # ── Delete ALL old [EXAMPLE] listings ──
        old_ids_q = select(Listing.id).where(
            Listing.title.like(f"{_MARKER}%")
        )
        old_ids = list(
            (await db.execute(old_ids_q)).scalars().all()
        )

        if old_ids:
            # Delete photos first (FK constraint)
            await db.execute(
                delete(ListingPhoto).where(
                    ListingPhoto.listing_id.in_(old_ids)
                )
            )
            await db.execute(
                delete(Listing).where(
                    Listing.id.in_(old_ids)
                )
            )
            logger.info(
                "[AUTO-SEED] Deleted %d old examples",
                len(old_ids),
            )

        # ── Build category slug map ──
        cats = (
            await db.execute(
                select(Category).where(
                    Category.is_active.is_(True)
                )
            )
        ).scalars().all()
        slug_map = {c.slug: c for c in cats}

        # ── Create new listings ──
        created = 0
        expiry = timedelta(days=settings.listing_expiry_days)

        for item in EXAMPLES:
            cat = slug_map.get(item["cat"])
            if not cat:
                continue

            title = f"{_MARKER}{item['title']}"
            listing = Listing(
                user_id=user.id,
                campus_id=user.campus_id,
                type=item["t"],
                category_id=cat.id,
                title=title,
                description=item["desc"],
                price_hint=item.get("price"),
                location_type=item.get("loc", "on_campus"),
                location_hint=item.get("hint"),
                contact_preference="in_app",
                status=ListingStatus.ACTIVE,
                expires_at=(
                    datetime.now(timezone.utc) + expiry
                ),
            )
            db.add(listing)
            await db.flush()

            # Photo
            if item.get("img"):
                db.add(
                    ListingPhoto(
                        listing_id=listing.id,
                        url=item["img"],
                        storage_key=f"seed/{listing.id}",
                        thumbnail_url=item["img"],
                        position=0,
                        content_type="image/jpeg",
                    )
                )

            # Search vector
            await db.execute(
                update(Listing)
                .where(Listing.id == listing.id)
                .values(
                    search_vector=func.to_tsvector(
                        "english",
                        func.coalesce(title, "")
                        + " "
                        + func.coalesce(
                            item["desc"], ""
                        ),
                    )
                )
            )
            created += 1

        # Update user listing count
        real_count = await db.scalar(
            select(func.count(Listing.id)).where(
                Listing.user_id == user.id,
            )
        ) or 0
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(listing_count=real_count)
        )

        await db.commit()
        logger.info(
            "[AUTO-SEED] Created %d example listings "
            "under %s",
            created,
            user.email,
        )
