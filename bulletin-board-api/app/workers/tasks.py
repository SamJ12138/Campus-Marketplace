import io
from datetime import datetime, timedelta
from uuid import UUID

from PIL import Image
from sqlalchemy import select, update


async def send_sms(ctx, to: str, message: str):
    """Send SMS notification. Console provider for dev, Twilio for production."""
    settings = ctx["settings"]
    sms_provider = getattr(settings, "sms_provider", "console")

    if sms_provider == "console":
        print(f"[SMS] To: {to}, Message: {message}")
        return

    if sms_provider == "twilio":
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=message,
            from_=settings.twilio_from_number,
            to=to,
        )


async def send_email(ctx, email_type: str, recipient_email: str, data: dict):
    """Send transactional email."""
    settings = ctx["settings"]

    templates = {
        "verify_email": {
            "subject": "Verify your GimmeDat email",
        },
        "password_reset": {
            "subject": "Reset your password",
        },
        "new_message": {
            "subject": "You have a new message on GimmeDat",
        },
        "listing_expiring": {
            "subject": "Your listing is expiring soon",
        },
        "report_resolved": {
            "subject": "Update on your report",
        },
    }

    template_info = templates.get(email_type)
    if not template_info:
        raise ValueError(f"Unknown email type: {email_type}")

    if settings.email_provider == "console":
        print(
            f"[EMAIL] To: {recipient_email}, "
            f"Subject: {template_info['subject']}, "
            f"Data: {data}"
        )
        return

    elif settings.email_provider == "sendgrid":
        import sendgrid
        from sendgrid.helpers.mail import Mail

        sg = sendgrid.SendGridAPIClient(api_key=settings.sendgrid_api_key)
        message = Mail(
            from_email=(settings.email_from_address, settings.email_from_name),
            to_emails=recipient_email,
            subject=template_info["subject"],
            html_content=f"<p>{data}</p>",
        )
        sg.send(message)


async def generate_thumbnail(ctx, photo_id: str, storage_key: str):
    """Generate thumbnail for listing photo."""
    import aioboto3

    settings = ctx["settings"]
    session = aioboto3.Session()

    s3_kwargs = {
        "endpoint_url": settings.s3_endpoint_url,
        "aws_access_key_id": settings.s3_access_key_id,
        "aws_secret_access_key": settings.s3_secret_access_key,
        "region_name": settings.s3_region,
    }

    async with session.client("s3", **s3_kwargs) as s3:
        response = await s3.get_object(
            Bucket=settings.s3_bucket_name,
            Key=storage_key,
        )
        original_bytes = await response["Body"].read()

        img = Image.open(io.BytesIO(original_bytes))
        img.thumbnail((400, 400), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=80)
        buffer.seek(0)

        thumb_key = (
            storage_key.replace("/photos/", "/thumbs/").rsplit(".", 1)[0] + ".webp"
        )
        await s3.put_object(
            Bucket=settings.s3_bucket_name,
            Key=thumb_key,
            Body=buffer.getvalue(),
            ContentType="image/webp",
        )

        async with ctx["db_session"]() as db:
            from app.models.listing import ListingPhoto

            photo = await db.get(ListingPhoto, UUID(photo_id))
            if photo:
                photo.thumbnail_url = f"{settings.cdn_url}/{thumb_key}"
                await db.commit()


async def expire_listings(ctx):
    """Mark expired listings as expired."""
    async with ctx["db_session"]() as db:
        from app.models.listing import Listing

        result = await db.execute(
            update(Listing)
            .where(
                Listing.status == "active",
                Listing.expires_at < datetime.utcnow(),
            )
            .values(status="expired", updated_at=datetime.utcnow())
        )
        await db.commit()
        print(f"[CRON] Expired {result.rowcount} listings")


async def cleanup_orphan_uploads(ctx):
    """Delete temp uploads older than 1 hour."""
    import aioboto3

    settings = ctx["settings"]
    session = aioboto3.Session()

    s3_kwargs = {
        "endpoint_url": settings.s3_endpoint_url,
        "aws_access_key_id": settings.s3_access_key_id,
        "aws_secret_access_key": settings.s3_secret_access_key,
        "region_name": settings.s3_region,
    }

    async with session.client("s3", **s3_kwargs) as s3:
        paginator = s3.get_paginator("list_objects_v2")
        cutoff = datetime.utcnow() - timedelta(hours=1)
        deleted = 0

        async for page in paginator.paginate(
            Bucket=settings.s3_bucket_name,
            Prefix="tmp/",
        ):
            for obj in page.get("Contents", []):
                if obj["LastModified"].replace(tzinfo=None) < cutoff:
                    await s3.delete_object(
                        Bucket=settings.s3_bucket_name,
                        Key=obj["Key"],
                    )
                    deleted += 1

        print(f"[CRON] Cleaned up {deleted} orphan uploads")


async def send_expiry_reminders(ctx):
    """Send reminders for listings expiring in 3 days."""
    async with ctx["db_session"]() as db:
        from app.models.listing import Listing
        from app.models.user import User

        three_days = datetime.utcnow() + timedelta(days=3)
        four_days = datetime.utcnow() + timedelta(days=4)

        result = await db.execute(
            select(Listing, User)
            .join(User)
            .where(
                Listing.status == "active",
                Listing.expires_at >= three_days,
                Listing.expires_at < four_days,
            )
        )

        for listing, user in result.all():
            await send_email(
                ctx,
                "listing_expiring",
                user.email,
                {
                    "user_name": user.display_name,
                    "listing_title": listing.title,
                    "expires_at": listing.expires_at.isoformat(),
                    "renew_url": f"{ctx['settings'].frontend_url}/listings/{listing.id}/renew",
                },
            )


async def notify_moderators_new_report(ctx, report_id: str):
    """Notify moderators about a new report."""
    async with ctx["db_session"]() as db:
        from app.models.report import Report
        from app.models.user import User, UserRole

        report = await db.get(Report, UUID(report_id))
        if not report:
            return

        result = await db.execute(
            select(User).where(User.role.in_([UserRole.MODERATOR, UserRole.ADMIN]))
        )
        moderators = list(result.scalars().all())

        for mod in moderators:
            await send_email(
                ctx,
                "new_message",
                mod.email,
                {
                    "user_name": mod.display_name,
                    "thread_url": f"{ctx['settings'].frontend_url}/admin/reports/{report_id}",
                },
            )


async def send_new_message_email(ctx, recipient_id: str, thread_id: str):
    """Send email and/or SMS notification for new message."""
    async with ctx["db_session"]() as db:
        from app.models.notification import NotificationPreference
        from app.models.user import User

        user = await db.get(User, UUID(recipient_id))
        if not user:
            return

        prefs = await db.scalar(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user.id
            )
        )

        thread_url = f"{ctx['settings'].frontend_url}/messages/{thread_id}"

        # Send email if enabled
        if not prefs or prefs.email_messages:
            await send_email(
                ctx,
                "new_message",
                user.email,
                {
                    "user_name": user.display_name,
                    "thread_url": thread_url,
                },
            )

        # Send SMS if enabled and phone number exists
        if prefs and prefs.sms_messages and user.phone_number:
            await send_sms(
                ctx,
                user.phone_number,
                f"You have a new message on GimmeDat. View it here: {thread_url}",
            )


async def send_report_resolved_email(ctx, reporter_id: str, report_id: str):
    """Send email to reporter when their report is resolved."""
    async with ctx["db_session"]() as db:
        from app.models.user import User

        user = await db.get(User, UUID(reporter_id))
        if not user:
            return

        await send_email(
            ctx,
            "report_resolved",
            user.email,
            {
                "user_name": user.display_name,
                "report_url": f"{ctx['settings'].frontend_url}/reports/{report_id}",
            },
        )


async def generate_listing_embedding(ctx, listing_id: str):
    """Generate and store embedding for a single listing."""
    from app.services.ai_service import AIService
    from app.services.embedding_service import EmbeddingService

    settings = ctx["settings"]
    embedding_service = EmbeddingService(AIService(settings), settings)

    async with ctx["db_session"]() as db:
        from app.models.listing import Listing

        listing = await db.get(Listing, UUID(listing_id))
        if not listing:
            return

        text = f"{listing.title} {listing.description}"
        if listing.price_hint:
            text += f" {listing.price_hint}"

        await embedding_service.generate_and_store(db, listing.id, text)
        print(f"[EMBEDDING] Generated embedding for listing {listing_id}")


async def batch_generate_embeddings(ctx, batch_size: int = 50):
    """Generate embeddings for all active listings missing them."""
    from app.services.ai_service import AIService
    from app.services.embedding_service import EmbeddingService

    settings = ctx["settings"]
    embedding_service = EmbeddingService(AIService(settings), settings)

    async with ctx["db_session"]() as db:
        count = await embedding_service.batch_generate_embeddings(db, batch_size)
        print(f"[EMBEDDING] Batch generated embeddings for {count} listings")
