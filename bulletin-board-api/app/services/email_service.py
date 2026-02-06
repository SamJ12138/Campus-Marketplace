import logging

from app.config import Settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """Send an email using the configured provider."""
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

                resend.api_key = self.settings.resend_api_key
                from_address = f"{self.settings.email_from_name} <{self.settings.email_from_address}>"
                logger.info(f"[EMAIL] Resend from: {from_address}")

                result = resend.Emails.send(
                    {
                        "from": from_address,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_content,
                    }
                )
                logger.info(f"[EMAIL] Resend response: {result}")
                return True
            except Exception as e:
                logger.error(f"[EMAIL ERROR] Resend failed: {e}", exc_info=True)
                return False

        else:
            logger.error(f"[EMAIL ERROR] Unknown provider: {provider}")
            return False
