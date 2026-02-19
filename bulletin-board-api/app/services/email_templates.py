"""
Clean, deliverability-focused email templates for GimmeDat.

Design principles:
- Simple HTML table layout (no CSS media queries, no VML conditionals)
- No hidden text (preview text hacks trigger spam filters)
- No emoji or unicode entities (trigger spam filters)
- High text-to-markup ratio
- Minimal decorative elements
- Each template returns (html, plain_text) tuple for multipart emails
"""

from html import escape


def _base_template(content: str, footer_extra: str = "") -> str:
    """Wrap content in a clean, modern email layout."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GimmeDat</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f7;">
        <tr>
            <td style="padding: 40px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 540px; margin: 0 auto;">

                    <!-- Header -->
                    <tr>
                        <td style="padding-bottom: 24px; text-align: center;">
                            <span style="font-size: 22px; font-weight: 800; color: #8b5cf6; letter-spacing: -0.5px;">GimmeDat</span>
                        </td>
                    </tr>

                    <!-- Content card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 8px; padding: 32px 28px;">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 24px; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
                                GimmeDat - The student marketplace for services,
                                items, and campus connections.
                            </p>
                            {footer_extra}
                            <p style="margin: 0; font-size: 12px; color: #999;">
                                You received this because you have a GimmeDat account.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''


def verification_email(verify_url: str, display_name: str = "there") -> tuple[str, str]:
    """Generate a verification email. Returns (html, plain_text)."""
    safe_name = escape(display_name)
    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Welcome to GimmeDat
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, thanks for joining the student marketplace for services, items, and campus connections. Verify your email to get started.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 24px 0;">
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Verify My Email</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; text-align: center;">
            Or copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {verify_url}
        </p>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            This link expires in 24 hours. If you did not create an account, you can ignore this email.
        </p>
    '''

    plain_text = f"""Welcome to GimmeDat

Hey {display_name}, thanks for joining GimmeDat -- the student marketplace for services, items, and campus connections.

Verify your email: {verify_url}

This link expires in 24 hours. If you did not create an account, you can ignore this email.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text


def password_reset_email(reset_url: str) -> tuple[str, str]:
    """Generate a password reset email. Returns (html, plain_text)."""
    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Reset Your Password
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            We received a request to reset your GimmeDat password. Click the button below to choose a new one.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 24px 0;">
                    <a href="{reset_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Reset Password</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; text-align: center;">
            Or copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {reset_url}
        </p>

        <p style="margin: 0 0 6px 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            This link expires in 1 hour for security reasons.
        </p>
        <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
            If you did not request a password reset, you can ignore this email.
        </p>
    '''

    plain_text = f"""Reset Your Password

We received a request to reset your GimmeDat password. Use the link below to choose a new one:

{reset_url}

This link expires in 1 hour for security reasons.

If you did not request a password reset, you can ignore this email. Your password will remain unchanged.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text


def new_message_email(
    sender_name: str,
    listing_title: str,
    message_preview: str,
    thread_url: str,
) -> tuple[str, str]:
    """Generate a message notification email. Returns (html, plain_text)."""
    safe_sender = escape(sender_name)
    safe_title = escape(listing_title)
    preview = escape(message_preview[:150])
    if len(message_preview) > 150:
        preview += "..."

    settings_url = thread_url.split("/messages")[0] + "/profile/settings"

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            New Message
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            <strong>{safe_sender}</strong> sent you a message about <strong>{safe_title}</strong>.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="background-color: #f8f8fa; border-radius: 6px; padding: 14px 18px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.5;">
                        "{preview}"
                    </p>
                </td>
            </tr>
        </table>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 20px 0;">
                    <a href="{thread_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">View Conversation</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            You can manage notification preferences in your <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">account settings</a>.
        </p>
    '''

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Manage email preferences</a>
                            </p>'''

    plain_text = f"""New Message on GimmeDat

{sender_name} sent you a message about {listing_title}:

"{preview}"

View the conversation: {thread_url}

--
GimmeDat - The student marketplace for services, items, and campus connections.
Manage email preferences: {settings_url}
"""

    return _base_template(content, footer_extra), plain_text


def resend_verification_email(verify_url: str) -> tuple[str, str]:
    """Generate a resend verification email. Returns (html, plain_text)."""
    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Verify Your Email
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Here is a new verification link as requested. Click below to activate your GimmeDat account.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 24px 0;">
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Verify My Email</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #666; text-align: center;">
            Or copy and paste this link:
        </p>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {verify_url}
        </p>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            This link expires in 24 hours.
        </p>
    '''

    plain_text = f"""Verify Your Email

Here is a new verification link as requested. Use it to activate your GimmeDat account:

{verify_url}

This link expires in 24 hours.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text
