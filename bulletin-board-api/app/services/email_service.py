import logging

from app.config import Settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def send_email_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email synchronously. Use in background tasks / threads."""
        return self._do_send(to_email, subject, html_content, text_content)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email. Runs blocking SDK calls in a thread to avoid blocking the event loop."""
        import asyncio
        return await asyncio.to_thread(self._do_send, to_email, subject, html_content, text_content)

    def _do_send(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Internal send implementation (blocking)."""
        provider = self.settings.email_provider
        logger.info(f"[EMAIL] Attempting to send email via '{provider}' to {to_email}")

        if provider == "console":
            print(f"[EMAIL] To: {to_email}, Subject: {subject}")
            print(f"[EMAIL] Content: {html_content[:200]}...")
            return True

        elif provider == "sendgrid":
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
                logger.info(f"[EMAIL] Successfully sent via SendGrid to {to_email}")
                return True
            except Exception as e:
                logger.error(f"[EMAIL ERROR] SendGrid failed: {e}")
                return False

        elif provider == "resend":
            try:
                import resend

                if not self.settings.resend_api_key:
                    logger.error("[EMAIL ERROR] RESEND_API_KEY is not set!")
                    return False

                if "resend.dev" in self.settings.email_from_address:
                    logger.warning(
                        "[EMAIL WARNING] Using sandbox from address '%s' — "
                        "emails will only be delivered to the account owner. "
                        "Set EMAIL_FROM_ADDRESS to your verified domain.",
                        self.settings.email_from_address,
                    )

                resend.api_key = self.settings.resend_api_key
                from_address = (
                    f"{self.settings.email_from_name}"
                    f" <{self.settings.email_from_address}>"
                )
                logger.info(f"[EMAIL] Resend from: {from_address}")

                # Build the email payload with proper headers
                frontend_url = self.settings.primary_frontend_url
                settings_url = f"{frontend_url}/profile/settings"

                payload: dict = {
                    "from": from_address,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "reply_to": self.settings.email_from_address,
                    "headers": {
                        "List-Unsubscribe": f"<{settings_url}>",
                        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                    },
                }

                # Include plain text alternative for better deliverability
                if text_content:
                    payload["text"] = text_content

                result = resend.Emails.send(payload)
                logger.info(f"[EMAIL] Resend response: {result}")
                return True
            except Exception as e:
                logger.error(f"[EMAIL ERROR] Resend failed: {e}", exc_info=True)
                return False

        else:
            logger.error(f"[EMAIL ERROR] Unknown provider: {provider}")
            return False
