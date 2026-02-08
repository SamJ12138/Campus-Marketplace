"""
Professional email templates for GimmeDat
"""


def _base_template(content: str, preview_text: str = "") -> str:
    """Wrap content in a beautiful, responsive email template."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Gimme Dat</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
    </div>

    <!-- Main wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 520px; margin: 0 auto;">

                    <!-- Logo header -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 32px;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 16px 28px; border-radius: 16px;">
                                <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Gimme Dat</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Content card -->
                    <tr>
                        <td>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                <tr>
                                    <td style="padding: 40px 36px;">
                                        {content}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
                                Gimme Dat - Campus Marketplace for Gettysburg College
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                                You received this email because you signed up for Gimme Dat.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''


def verification_email(verify_url: str, display_name: str = "there") -> str:
    """Generate a beautiful verification email."""
    content = f'''
        <!-- Greeting -->
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b;">
            Welcome to Gimme Dat! 🎉
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #52525b; line-height: 1.6;">
            Hey {display_name}, thanks for joining the campus marketplace. Let's verify your email to get started.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 8px 0 24px 0;">
                    <a href="{verify_url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.4);">Verify My Email</a>
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a;">
            Or copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; background-color: #f4f4f5; padding: 12px 16px; border-radius: 8px;">
            {verify_url}
        </p>

        <!-- Expiry notice -->
        <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                ⏰ This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
        </div>
    '''
    return _base_template(content, f"Hey {display_name}, verify your email to start using Gimme Dat!")


def password_reset_email(reset_url: str) -> str:
    """Generate a beautiful password reset email."""
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #fef3c7; padding: 16px; border-radius: 50%;">
                <span style="font-size: 32px;">🔐</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
            Reset Your Password
        </h1>
        <p style="margin: 0 0 28px 0; font-size: 16px; color: #52525b; line-height: 1.6; text-align: center;">
            We received a request to reset your password. Click the button below to choose a new one.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 28px 0;">
                    <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.4);">Reset Password</a>
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
            Or copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #f59e0b; word-break: break-all; background-color: #fffbeb; padding: 12px 16px; border-radius: 8px; text-align: center;">
            {reset_url}
        </p>

        <!-- Security notice -->
        <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
                ⏰ This link expires in 1 hour for security reasons.
            </p>
            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
        </div>
    '''
    return _base_template(content, "Reset your Gimme Dat password")


def new_message_email(
    sender_name: str,
    listing_title: str,
    message_preview: str,
    thread_url: str,
) -> str:
    """Generate an email notification for a new message."""
    # Truncate preview if too long
    preview = message_preview[:150] + ("..." if len(message_preview) > 150 else "")
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #ede9fe; padding: 16px; border-radius: 50%;">
                <span style="font-size: 32px;">💬</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
            New Message
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #52525b; line-height: 1.6; text-align: center;">
            <strong>{sender_name}</strong> sent you a message about <strong>{listing_title}</strong>.
        </p>

        <!-- Message preview -->
        <div style="background-color: #f4f4f5; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px;">
            <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6; font-style: italic;">
                &ldquo;{preview}&rdquo;
            </p>
        </div>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 24px 0;">
                    <a href="{thread_url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.4);">View Conversation</a>
                </td>
            </tr>
        </table>

        <!-- Footer note -->
        <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                You can manage your email notification preferences in your account settings.
            </p>
        </div>
    '''
    return _base_template(content, f"{sender_name} sent you a message about {listing_title}")


def resend_verification_email(verify_url: str) -> str:
    """Generate a beautiful resend verification email."""
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #dbeafe; padding: 16px; border-radius: 50%;">
                <span style="font-size: 32px;">✉️</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
            Verify Your Email
        </h1>
        <p style="margin: 0 0 28px 0; font-size: 16px; color: #52525b; line-height: 1.6; text-align: center;">
            Here's a new verification link as requested. Click below to activate your account.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 28px 0;">
                    <a href="{verify_url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.4);">Verify My Email</a>
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #71717a; text-align: center;">
            Or copy and paste this link:
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #8b5cf6; word-break: break-all; background-color: #f4f4f5; padding: 12px 16px; border-radius: 8px; text-align: center;">
            {verify_url}
        </p>

        <!-- Expiry notice -->
        <div style="border-top: 1px solid #e4e4e7; padding-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                ⏰ This link expires in 24 hours.
            </p>
        </div>
    '''
    return _base_template(content, "Verify your email to start using Gimme Dat")
