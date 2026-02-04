from app.config import Settings


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
        if self.settings.email_provider == "console":
            print(f"[EMAIL] To: {to_email}, Subject: {subject}")
            return True

        elif self.settings.email_provider == "sendgrid":
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
                return True
            except Exception as e:
                print(f"[EMAIL ERROR] {e}")
                return False

        return False
