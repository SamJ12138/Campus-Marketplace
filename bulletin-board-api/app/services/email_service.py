import asyncio
import logging
from typing import Optional

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

# Module-level singleton
_instance: Optional["EmailService"] = None


def get_email_service(settings: Settings) -> "EmailService":
    """Return a singleton EmailService. Safe for FastAPI (Settings is lru_cached)."""
    global _instance
    if _instance is None:
        _instance = EmailService(settings)
    return _instance


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._provider = settings.email_provider

        # Pre-compute Resend-specific fields once at init
        if self._provider == "resend":
            if not settings.resend_api_key:
                logger.error("[EMAIL] RESEND_API_KEY is not set!")

            if "resend.dev" in settings.email_from_address:
                logger.warning(
                    "[EMAIL] Using sandbox from address '%s' -- "
                    "emails only delivered to account owner. "
                    "Set EMAIL_FROM_ADDRESS to your verified domain.",
                    settings.email_from_address,
                )

            self._resend_from = (
                f"{settings.email_from_name} <{settings.email_from_address}>"
            )
            self._resend_reply_to = settings.email_from_address
            self._settings_url = (
                f"{settings.primary_frontend_url}/profile/settings"
            )
            resend_headers = {
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            }
            # Async client with connection pooling for route handlers / ARQ workers
            self._async_client = httpx.AsyncClient(
                base_url="https://api.resend.com",
                headers=resend_headers,
                timeout=10.0,
            )
            # Sync client with connection pooling for BackgroundTasks threads
            self._sync_client = httpx.Client(
                base_url="https://api.resend.com",
                headers=resend_headers,
                timeout=10.0,
            )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email asynchronously. Truly async for Resend (no thread pool)."""
        logger.info("[EMAIL] Attempting to send via '%s' to %s", self._provider, to_email)

        if self._provider == "console":
            return self._send_console(to_email, subject, html_content)
        elif self._provider == "sendgrid":
            return await asyncio.to_thread(
                self._send_sendgrid, to_email, subject, html_content, text_content
            )
        elif self._provider == "resend":
            return await self._send_resend_async(
                to_email, subject, html_content, text_content
            )
        else:
            logger.error("[EMAIL ERROR] Unknown provider: %s", self._provider)
            return False

    def send_email_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email synchronously. Use in background tasks / threads."""
        logger.info("[EMAIL] Attempting to send via '%s' to %s", self._provider, to_email)

        if self._provider == "console":
            return self._send_console(to_email, subject, html_content)
        elif self._provider == "sendgrid":
            return self._send_sendgrid(to_email, subject, html_content, text_content)
        elif self._provider == "resend":
            return self._send_resend_sync(to_email, subject, html_content, text_content)
        else:
            logger.error("[EMAIL ERROR] Unknown provider: %s", self._provider)
            return False

    # --- Provider implementations ---

    def _send_console(
        self, to_email: str, subject: str, html_content: str
    ) -> bool:
        print(f"[EMAIL] To: {to_email}, Subject: {subject}")
        print(f"[EMAIL] Content: {html_content[:200]}...")
        return True

    def _send_sendgrid(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None,
    ) -> bool:
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail

            sg = sendgrid.SendGridAPIClient(
                api_key=self.settings.sendgrid_api_key
            )
            message = Mail(
                from_email=(
                    self.settings.email_from_address,
                    self.settings.email_from_name,
                ),
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
            )
            if text_content:
                from sendgrid.helpers.mail import Content

                message.content = [
                    Content("text/plain", text_content),
                    Content("text/html", html_content),
                ]
            sg.send(message)
            logger.info("[EMAIL] Successfully sent via SendGrid to %s", to_email)
            return True
        except Exception as e:
            logger.error("[EMAIL ERROR] SendGrid failed: %s", e)
            return False

    def _build_resend_payload(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None,
    ) -> dict:
        payload: dict = {
            "from": self._resend_from,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "reply_to": self._resend_reply_to,
            "headers": {
                "List-Unsubscribe": f"<{self._settings_url}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        }
        if text_content:
            payload["text"] = text_content
        return payload

    async def _send_resend_async(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None,
    ) -> bool:
        """Send via Resend API using async httpx client with connection pooling."""
        try:
            if not self.settings.resend_api_key:
                logger.error("[EMAIL ERROR] RESEND_API_KEY is not set!")
                return False

            payload = self._build_resend_payload(
                to_email, subject, html_content, text_content
            )
            # Retry up to 3 times on 429 rate limit
            for attempt in range(3):
                response = await self._async_client.post("/emails", json=payload)
                if response.status_code == 429:
                    wait = float(response.headers.get("retry-after", 1 + attempt))
                    logger.warning("[EMAIL] Rate limited, retrying in %.1fs", wait)
                    await asyncio.sleep(wait)
                    continue
                response.raise_for_status()
                logger.info("[EMAIL] Resend response: %s", response.json())
                return True
            logger.error("[EMAIL ERROR] Resend rate limited after 3 retries")
            return False
        except Exception as e:
            logger.error("[EMAIL ERROR] Resend failed: %s", e, exc_info=True)
            return False

    def _send_resend_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None,
    ) -> bool:
        """Send via Resend API using sync httpx client (for background threads)."""
        try:
            if not self.settings.resend_api_key:
                logger.error("[EMAIL ERROR] RESEND_API_KEY is not set!")
                return False

            payload = self._build_resend_payload(
                to_email, subject, html_content, text_content
            )
            # Retry up to 3 times on 429 rate limit
            for attempt in range(3):
                response = self._sync_client.post("/emails", json=payload)
                if response.status_code == 429:
                    import time as _time
                    wait = float(response.headers.get("retry-after", 1 + attempt))
                    logger.warning("[EMAIL] Rate limited, retrying in %.1fs", wait)
                    _time.sleep(wait)
                    continue
                response.raise_for_status()
                logger.info("[EMAIL] Resend response: %s", response.json())
                return True
            logger.error("[EMAIL ERROR] Resend rate limited after 3 retries")
            return False
        except Exception as e:
            logger.error("[EMAIL ERROR] Resend failed: %s", e, exc_info=True)
            return False

    async def close(self):
        """Close HTTP clients. Call during app/worker shutdown."""
        if hasattr(self, "_async_client"):
            await self._async_client.aclose()
        if hasattr(self, "_sync_client"):
            self._sync_client.close()
