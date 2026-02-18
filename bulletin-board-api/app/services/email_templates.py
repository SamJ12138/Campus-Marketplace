"""
Clean, deliverability-focused email templates for GimmeDat.

Design principles:
- Simple HTML table layout (no CSS media queries, no VML conditionals)
- No hidden text (preview text hacks trigger spam filters)
- No emoji unicode entities
- High text-to-markup ratio
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
<body style="margin: 0; padding: 0; background-color: #f0ecf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0ecf9;">
        <tr>
            <td style="padding: 40px 16px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 540px; margin: 0 auto;">

                    <!-- Header -->
                    <tr>
                        <td style="padding-bottom: 28px; text-align: center;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: #8b5cf6; border-radius: 12px; padding: 10px 24px;">
                                        <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">GimmeDat</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 28px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #8b5cf6;">
                                GimmeDat
                            </p>
                            <p style="margin: 0 0 12px 0; font-size: 12px; color: #888; line-height: 1.5;">
                                The student marketplace for trading services,<br>
                                items, and community connections on campus.
                            </p>
                            {footer_extra}
                            <p style="margin: 0; font-size: 11px; color: #aaa;">
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                    <div style="display: inline-block; background-color: #f0ecf9; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center;">
                        <span style="font-size: 26px; color: #8b5cf6;">&#9993;</span>
                    </div>
                </td>
            </tr>
        </table>

        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #1a1a2e; text-align: center;">
            Welcome aboard!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #555; line-height: 1.7; text-align: center;">
            Hey {safe_name}, thanks for joining GimmeDat — the student marketplace for services, items, and campus connections. Verify your email to get started.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 28px 0;">
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px;">Verify My Email</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888; text-align: center;">
            Or copy this link into your browser:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {verify_url}
        </p>

        <p style="margin: 0; font-size: 12px; color: #aaa; border-top: 1px solid #f0ecf9; padding-top: 16px; text-align: center;">
            This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
    '''

    plain_text = f"""Welcome to GimmeDat!

Hey {display_name}, thanks for joining GimmeDat -- the student marketplace for services, items, and campus connections.

Verify your email: {verify_url}

This link expires in 24 hours. If you didn't create an account, ignore this email.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text


def password_reset_email(reset_url: str) -> tuple[str, str]:
    """Generate a password reset email. Returns (html, plain_text)."""
    content = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                    <div style="display: inline-block; background-color: #fef3cd; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center;">
                        <span style="font-size: 26px;">&#128274;</span>
                    </div>
                </td>
            </tr>
        </table>

        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #1a1a2e; text-align: center;">
            Reset your password
        </h1>
        <p style="margin: 0 0 28px 0; font-size: 15px; color: #555; line-height: 1.7; text-align: center;">
            We received a request to reset your GimmeDat password. Click the button below to choose a new one.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 28px 0;">
                    <a href="{reset_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px;">Reset Password</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888; text-align: center;">
            Or copy this link into your browser:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {reset_url}
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #f0ecf9;">
            <tr>
                <td style="padding-top: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #aaa; text-align: center;">
                        This link expires in 1 hour for security reasons.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #aaa; text-align: center;">
                        Didn't request this? You can safely ignore this email.
                    </p>
                </td>
            </tr>
        </table>
    '''

    plain_text = f"""Reset your password

We received a request to reset your GimmeDat password. Use the link below to choose a new one:

{reset_url}

This link expires in 1 hour for security reasons.

Didn't request this? You can safely ignore this email. Your password will remain unchanged.

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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                    <div style="display: inline-block; background-color: #f0ecf9; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center;">
                        <span style="font-size: 26px; color: #8b5cf6;">&#9993;</span>
                    </div>
                </td>
            </tr>
        </table>

        <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #1a1a2e; text-align: center;">
            New message
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #555; line-height: 1.7; text-align: center;">
            <strong style="color: #1a1a2e;">{safe_sender}</strong> sent you a message about <strong style="color: #1a1a2e;">{safe_title}</strong>
        </p>

        <!-- Message preview -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 28px;">
            <tr>
                <td style="background-color: #faf9fc; border-radius: 12px; padding: 18px 20px; border-left: 4px solid #8b5cf6;">
                    <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.6; font-style: italic;">
                        &ldquo;{preview}&rdquo;
                    </p>
                </td>
            </tr>
        </table>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 0 0 24px 0;">
                    <a href="{thread_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px;">View Conversation</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 12px; color: #aaa; border-top: 1px solid #f0ecf9; padding-top: 16px; text-align: center;">
            Manage notifications in your <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">account settings</a>.
        </p>
    '''

    footer_extra = f'''<p style="margin: 0 0 8px 0; font-size: 11px; color: #aaa;">
                                <a href="{settings_url}" style="color: #aaa; text-decoration: underline;">Email preferences</a>
                            </p>'''

    plain_text = f"""New message on GimmeDat

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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding-bottom: 24px;">
                    <div style="display: inline-block; background-color: #f0ecf9; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center;">
                        <span style="font-size: 26px; color: #8b5cf6;">&#9993;</span>
                    </div>
                </td>
            </tr>
        </table>

        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #1a1a2e; text-align: center;">
            Verify your email
        </h1>
        <p style="margin: 0 0 28px 0; font-size: 15px; color: #555; line-height: 1.7; text-align: center;">
            Here is a fresh verification link. Click below to activate your GimmeDat account.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 28px 0;">
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px;">Verify My Email</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 8px 0; font-size: 13px; color: #888; text-align: center;">
            Or copy this link into your browser:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; text-align: center;">
            {verify_url}
        </p>

        <p style="margin: 0; font-size: 12px; color: #aaa; border-top: 1px solid #f0ecf9; padding-top: 16px; text-align: center;">
            This link expires in 24 hours.
        </p>
    '''

    plain_text = f"""Verify your email

Here is a fresh verification link for your GimmeDat account:

{verify_url}

This link expires in 24 hours.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text
