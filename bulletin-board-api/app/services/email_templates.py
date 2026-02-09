"""
Professional email templates for GimmeDat
Dark mode compatible across all major email clients.
"""


def _base_template(content: str, preview_text: str = "") -> str:
    """Wrap content in a responsive, dark-mode-safe email template."""
    return f'''<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
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
        :root {{
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }}
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        @media (prefers-color-scheme: dark) {{
            body, .email-bg {{
                background-color: #1a1a2e !important;
            }}
            .email-card {{
                background-color: #16213e !important;
            }}
            .email-heading {{
                color: #f0f0f5 !important;
            }}
            .email-body-text {{
                color: #c8c8d4 !important;
            }}
            .email-muted-text {{
                color: #9a9ab0 !important;
            }}
            .email-footer-text {{
                color: #8888a0 !important;
            }}
            .email-preview-box {{
                background-color: #1e2a4a !important;
            }}
            .email-preview-text {{
                color: #c8c8d4 !important;
            }}
            .email-link-box {{
                background-color: #1e2a4a !important;
            }}
            .email-divider {{
                border-color: #2a2a4a !important;
            }}
        }}
    </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f0f0f3; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Preview text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {preview_text}
        &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
    </div>

    <!-- Main wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-bg" style="background-color: #f0f0f3;">
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
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-card" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
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
                            <p class="email-footer-text" style="margin: 0 0 8px 0; font-size: 13px; color: #6b6b80;">
                                Gimme Dat &mdash; Campus Marketplace for Gettysburg College
                            </p>
                            <p class="email-footer-text" style="margin: 0; font-size: 12px; color: #8888a0;">
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
    """Generate a verification email (dark mode safe)."""
    content = f'''
        <!-- Greeting -->
        <h1 class="email-heading" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a2e;">
            Welcome to Gimme Dat!
        </h1>
        <p class="email-body-text" style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a5a; line-height: 1.6;">
            Hey {display_name}, thanks for joining the campus marketplace. Let&rsquo;s verify your email to get started.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 8px 0 24px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{verify_url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="21%" fillcolor="#8b5cf6">
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Verify My Email</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px;">Verify My Email</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p class="email-muted-text" style="margin: 0 0 16px 0; font-size: 14px; color: #6b6b80;">
            Or copy and paste this link into your browser:
        </p>
        <div class="email-link-box" style="margin: 0 0 24px 0; background-color: #f0f0f3; padding: 12px 16px; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #8b5cf6; word-break: break-all;">
                {verify_url}
            </p>
        </div>

        <!-- Expiry notice -->
        <div class="email-divider" style="border-top: 1px solid #e0e0e8; padding-top: 20px;">
            <p class="email-muted-text" style="margin: 0; font-size: 13px; color: #8888a0;">
                This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
            </p>
        </div>
    '''
    return _base_template(content, f"Hey {display_name}, verify your email to start using Gimme Dat!")


def password_reset_email(reset_url: str) -> str:
    """Generate a password reset email (dark mode safe)."""
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #8b5cf6; padding: 16px; border-radius: 50%;">
                <span style="font-size: 28px; line-height: 1; color: #ffffff;">&#128272;</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 class="email-heading" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Reset Your Password
        </h1>
        <p class="email-body-text" style="margin: 0 0 28px 0; font-size: 16px; color: #4a4a5a; line-height: 1.6; text-align: center;">
            We received a request to reset your password. Click the button below to choose a new one.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 28px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{reset_url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="21%" fillcolor="#8b5cf6">
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Reset Password</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{reset_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px;">Reset Password</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p class="email-muted-text" style="margin: 0 0 16px 0; font-size: 14px; color: #6b6b80; text-align: center;">
            Or copy and paste this link into your browser:
        </p>
        <div class="email-link-box" style="margin: 0 0 24px 0; background-color: #f0f0f3; padding: 12px 16px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #8b5cf6; word-break: break-all;">
                {reset_url}
            </p>
        </div>

        <!-- Security notice -->
        <div class="email-divider" style="border-top: 1px solid #e0e0e8; padding-top: 20px;">
            <p class="email-muted-text" style="margin: 0 0 8px 0; font-size: 13px; color: #6b6b80;">
                This link expires in 1 hour for security reasons.
            </p>
            <p class="email-muted-text" style="margin: 0; font-size: 13px; color: #8888a0;">
                If you didn&rsquo;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
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
    """Generate a message notification email (dark mode safe)."""
    # Truncate preview if too long
    preview = message_preview[:150] + ("..." if len(message_preview) > 150 else "")
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #8b5cf6; padding: 16px; border-radius: 50%;">
                <span style="font-size: 28px; line-height: 1; color: #ffffff;">&#128172;</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 class="email-heading" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a2e; text-align: center;">
            New Message
        </h1>
        <p class="email-body-text" style="margin: 0 0 24px 0; font-size: 16px; color: #4a4a5a; line-height: 1.6; text-align: center;">
            <strong>{sender_name}</strong> sent you a message about <strong>{listing_title}</strong>.
        </p>

        <!-- Message preview -->
        <div class="email-preview-box" style="background-color: #f0f0f3; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; border-left: 4px solid #8b5cf6;">
            <p class="email-preview-text" style="margin: 0; font-size: 14px; color: #3a3a4a; line-height: 1.6; font-style: italic;">
                &ldquo;{preview}&rdquo;
            </p>
        </div>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 24px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{thread_url}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#8b5cf6">
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">View Conversation</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{thread_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px;">View Conversation</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>

        <!-- Footer note -->
        <div class="email-divider" style="border-top: 1px solid #e0e0e8; padding-top: 20px;">
            <p class="email-muted-text" style="margin: 0; font-size: 13px; color: #8888a0; text-align: center;">
                You can manage your email notification preferences in your account settings.
            </p>
        </div>
    '''
    return _base_template(content, f"{sender_name} sent you a message about {listing_title}")


def resend_verification_email(verify_url: str) -> str:
    """Generate a resend verification email (dark mode safe)."""
    content = f'''
        <!-- Icon -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #8b5cf6; padding: 16px; border-radius: 50%;">
                <span style="font-size: 28px; line-height: 1; color: #ffffff;">&#9993;&#65039;</span>
            </div>
        </div>

        <!-- Heading -->
        <h1 class="email-heading" style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Verify Your Email
        </h1>
        <p class="email-body-text" style="margin: 0 0 28px 0; font-size: 16px; color: #4a4a5a; line-height: 1.6; text-align: center;">
            Here&rsquo;s a new verification link as requested. Click below to activate your account.
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 8px 0 28px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{verify_url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="21%" fillcolor="#8b5cf6">
                        <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Verify My Email</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{verify_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px;">Verify My Email</a>
                    <!--<![endif]-->
                </td>
            </tr>
        </table>

        <!-- Alternative link -->
        <p class="email-muted-text" style="margin: 0 0 16px 0; font-size: 14px; color: #6b6b80; text-align: center;">
            Or copy and paste this link:
        </p>
        <div class="email-link-box" style="margin: 0 0 24px 0; background-color: #f0f0f3; padding: 12px 16px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #8b5cf6; word-break: break-all;">
                {verify_url}
            </p>
        </div>

        <!-- Expiry notice -->
        <div class="email-divider" style="border-top: 1px solid #e0e0e8; padding-top: 20px;">
            <p class="email-muted-text" style="margin: 0; font-size: 13px; color: #8888a0; text-align: center;">
                This link expires in 24 hours.
            </p>
        </div>
    '''
    return _base_template(content, "Verify your email to start using Gimme Dat")
