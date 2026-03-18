"""
Clean, deliverability-focused email templates for GimmeDat.

Design principles:
- Simple HTML table layout (no CSS media queries, no VML conditionals)
- No hidden text (preview text hacks trigger spam filters)
- No emoji or unicode entities (trigger spam filters)
- High text-to-markup ratio
- Minimal decorative elements
- Each template returns (html, plain_text) tuple for multipart emails

Smart notification templates added for:
- Digest emails (daily/weekly)
- Expiry nudge emails with engagement stats
- Price drop alert emails
- Re-engagement campaign emails
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


def batched_message_email(
    message_items: list[dict],
    listing_title: str,
    thread_url: str,
    sender_names: list[str],
) -> tuple[str, str]:
    """Generate a batched message notification email. Returns (html, plain_text).

    message_items: list of dicts with keys: sender_name, content, created_at
    """
    count = len(message_items)
    safe_title = escape(listing_title)
    settings_url = thread_url.split("/messages")[0] + "/profile/settings"

    # Heading
    heading = "New Message" if count == 1 else f"{count} New Messages"

    # Sender summary
    unique_senders = list(dict.fromkeys(sender_names))  # preserve order, dedupe
    if len(unique_senders) == 1:
        sender_summary = f"<strong>{escape(unique_senders[0])}</strong>"
    elif len(unique_senders) == 2:
        sender_summary = (
            f"<strong>{escape(unique_senders[0])}</strong> and "
            f"<strong>{escape(unique_senders[1])}</strong>"
        )
    else:
        sender_summary = (
            f"<strong>{escape(unique_senders[0])}</strong> and "
            f"{len(unique_senders) - 1} others"
        )

    # Build message preview cards (up to 5 most recent)
    shown = message_items[:5]
    cards_html = ""
    cards_text = ""
    for item in shown:
        safe_sender = escape(item["sender_name"])
        preview = escape(item["content"][:200])
        if len(item["content"]) > 200:
            preview += "..."
        timestamp = item.get("created_at", "")
        if hasattr(timestamp, "strftime"):
            timestamp = timestamp.strftime("%b %d, %I:%M %p")
        else:
            timestamp = str(timestamp)[:16] if timestamp else ""

        cards_html += f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 10px;">
            <tr>
                <td style="background-color: #f8f8fa; border-radius: 6px; padding: 12px 16px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">
                        <strong style="color: #1a1a2e;">{safe_sender}</strong>
                        <span style="margin-left: 8px; font-size: 12px; color: #999;">{escape(timestamp)}</span>
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.5;">
                        {preview}
                    </p>
                </td>
            </tr>
        </table>'''
        cards_text += f"\n{item['sender_name']} ({timestamp}):\n  \"{item['content'][:200]}{'...' if len(item['content']) > 200 else ''}\"\n"

    earlier_note = ""
    if count > 5:
        earlier_note = f'''
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #999; text-align: center;">
            + {count - 5} earlier message{"s" if count - 5 > 1 else ""}
        </p>'''

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            {heading}
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            {sender_summary} sent you {"a message" if count == 1 else "messages"} about <strong>{safe_title}</strong>.
        </p>

        {cards_html}
        {earlier_note}

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

    # Plain text sender summary
    if len(unique_senders) == 1:
        sender_text = unique_senders[0]
    elif len(unique_senders) == 2:
        sender_text = f"{unique_senders[0]} and {unique_senders[1]}"
    else:
        sender_text = f"{unique_senders[0]} and {len(unique_senders) - 1} others"

    plain_text = f"""{heading} on GimmeDat

{sender_text} sent you {"a message" if count == 1 else "messages"} about {listing_title}:
{cards_text}
{"+ " + str(count - 5) + " earlier messages" + chr(10) if count > 5 else ""}
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


def newsletter_digest_email(
    data: dict,
    base_url: str,
    settings_url: str,
) -> tuple[str, str]:
    """Generate a visual newsletter digest email with card grid.

    Args:
        data: Structured dict from generate_newsletter_digest() with keys:
            user_name, campus_name, subject, is_fallback, stats,
            featured, listings, trending, price_drops
        base_url: Frontend base URL for building listing links
        settings_url: URL to notification settings page

    Returns:
        (html, plain_text) tuple.
    """
    safe_name = escape(data.get("user_name", "there"))
    campus = escape(data.get("campus_name", "campus"))
    is_fallback = data.get("is_fallback", False)
    stats = data.get("stats", {})
    featured = data.get("featured")
    listings = data.get("listings", [])
    trending = data.get("trending", [])
    price_drops = data.get("price_drops", [])

    heading = "Still Available" if is_fallback else "What's New This Week"

    # ── Stats bar ──
    stats_html = ""
    if not is_fallback:
        new_l = stats.get("new_listings", 0)
        sold = stats.get("items_sold", 0)
        active = stats.get("total_active", 0)
        stats_html = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="text-align: center; padding: 10px; background-color: #f3f0ff; border-radius: 6px;">
                    <span style="font-size: 22px; font-weight: 700; color: #8b5cf6;">{new_l}</span><br>
                    <span style="font-size: 12px; color: #666;">new offer{"s" if new_l != 1 else ""}</span>
                </td>
                <td style="width: 8px;"></td>
                <td style="text-align: center; padding: 10px; background-color: #f3f0ff; border-radius: 6px;">
                    <span style="font-size: 22px; font-weight: 700; color: #8b5cf6;">{sold}</span><br>
                    <span style="font-size: 12px; color: #666;">sold</span>
                </td>
                <td style="width: 8px;"></td>
                <td style="text-align: center; padding: 10px; background-color: #f3f0ff; border-radius: 6px;">
                    <span style="font-size: 22px; font-weight: 700; color: #8b5cf6;">{active}</span><br>
                    <span style="font-size: 12px; color: #666;">active</span>
                </td>
            </tr>
        </table>'''

    # ── Featured listing (full-width card) ──
    featured_html = ""
    if featured and not is_fallback:
        f_title = escape(featured["title"])
        f_price = escape(featured.get("price_hint") or "")
        f_cat = escape(featured.get("category_name", ""))
        f_url = f'{base_url}{featured["listing_url"]}'
        f_photo = featured.get("photo_url")

        photo_cell = f'''<img src="{f_photo}" alt="{f_title}" width="100%" style="display: block; border-radius: 6px 6px 0 0; max-height: 220px; object-fit: cover;" />''' if f_photo else '''<div style="height: 140px; background-color: #e9e4f5; border-radius: 6px 6px 0 0;"></div>'''

        featured_html = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr><td colspan="2" style="font-size: 13px; font-weight: 600; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px;">Featured</td></tr>
            <tr>
                <td colspan="2" style="border: 1px solid #eee; border-radius: 6px; overflow: hidden;">
                    <a href="{f_url}" style="text-decoration: none; color: inherit;">
                        {photo_cell}
                        <div style="padding: 14px 16px;">
                            <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a2e;">{f_title}</p>
                            <p style="margin: 0; font-size: 14px; color: #8b5cf6; font-weight: 600;">{f_price}</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">{f_cat}</p>
                        </div>
                    </a>
                </td>
            </tr>
        </table>'''

    # ── Listing card grid (2-column) ──
    grid_listings = [li for li in listings if not featured or li["id"] != featured["id"]]
    cards_html = ""
    if grid_listings:
        section_title = "Still Available" if is_fallback else "New This Week"
        cards_html = f'''
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px;">{section_title}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">'''

        for i in range(0, len(grid_listings), 2):
            cards_html += '<tr>'
            for j in range(2):
                idx = i + j
                if idx < len(grid_listings):
                    item = grid_listings[idx]
                    t = escape(item["title"])
                    p = escape(item.get("price_hint") or "")
                    u = f'{base_url}{item["listing_url"]}'
                    photo = item.get("photo_url")

                    img_cell = f'<img src="{photo}" alt="{t}" width="100%" style="display: block; border-radius: 4px 4px 0 0; height: 120px; object-fit: cover;" />' if photo else '<div style="height: 80px; background-color: #e9e4f5; border-radius: 4px 4px 0 0;"></div>'

                    cards_html += f'''
                <td width="48%" style="vertical-align: top; padding-bottom: 12px;">
                    <a href="{u}" style="text-decoration: none; color: inherit;">
                        <div style="border: 1px solid #eee; border-radius: 4px; overflow: hidden;">
                            {img_cell}
                            <div style="padding: 8px 10px;">
                                <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: 600; color: #1a1a2e; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">{t}</p>
                                <p style="margin: 0; font-size: 13px; color: #8b5cf6; font-weight: 600;">{p}</p>
                            </div>
                        </div>
                    </a>
                </td>'''
                else:
                    cards_html += '<td width="48%"></td>'
                if j == 0:
                    cards_html += '<td width="4%"></td>'
            cards_html += '</tr>'

        cards_html += '</table>'

    # ── Browse all CTA ──
    browse_url = f"{base_url}/feed"
    browse_html = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0 24px 0;">
            <tr>
                <td style="text-align: center;">
                    <a href="{browse_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Browse All Listings</a>
                </td>
            </tr>
        </table>'''

    # ── Trending categories ──
    trending_html = ""
    if trending and not is_fallback:
        cats = " | ".join(
            f'{escape(c["name"])} ({c["count"]})' for c in trending
        )
        trending_html = f'''
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px;">Trending Categories</p>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #444;">{cats}</p>'''

    # ── Price drops on favorites ──
    price_drops_html = ""
    if price_drops:
        drops_rows = ""
        for item in price_drops:
            t = escape(item["title"])
            p = escape(item.get("price_hint") or "updated")
            u = f'{base_url}{item["listing_url"]}'
            drops_rows += f'''
            <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #1a1a2e;">{t}</td>
                <td style="padding: 6px 8px; font-size: 14px; color: #8b5cf6; font-weight: 600;">{p}</td>
                <td style="padding: 6px 0; text-align: right;">
                    <a href="{u}" style="font-size: 13px; color: #8b5cf6; text-decoration: underline;">View</a>
                </td>
            </tr>'''

        price_drops_html = f'''
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.5px;">Price Drops on Your Favorites</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            {drops_rows}
        </table>'''

    # ── Assemble content ──
    content = f'''
        <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            {heading}
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, here is what is new at {campus} this week
        </p>

        {stats_html}
        {featured_html}
        {cards_html}
        {browse_html}
        {trending_html}
        {price_drops_html}

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            Manage digest preferences in your <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">account settings</a>.
        </p>
    '''

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Manage email preferences</a>
                            </p>'''

    # ── Plain text ──
    plain_lines = [f"{heading}", ""]
    plain_lines.append(f"Hey {data.get('user_name', 'there')}, here is what is new at {data.get('campus_name', 'campus')} this week.")
    plain_lines.append("")

    if not is_fallback:
        plain_lines.append(
            f"Stats: {stats.get('new_listings', 0)} new | "
            f"{stats.get('items_sold', 0)} sold | "
            f"{stats.get('total_active', 0)} active"
        )
        plain_lines.append("")

    if featured and not is_fallback:
        plain_lines.append(f"FEATURED: {featured['title']} - {featured.get('price_hint', '')}")
        plain_lines.append(f"  {base_url}{featured['listing_url']}")
        plain_lines.append("")

    section = "STILL AVAILABLE:" if is_fallback else "NEW THIS WEEK:"
    if grid_listings:
        plain_lines.append(section)
        for item in grid_listings:
            price = f" - {item['price_hint']}" if item.get("price_hint") else ""
            plain_lines.append(f"  - {item['title']}{price}")
            plain_lines.append(f"    {base_url}{item['listing_url']}")
        plain_lines.append("")

    if trending and not is_fallback:
        plain_lines.append("TRENDING: " + ", ".join(
            f"{c['name']} ({c['count']})" for c in trending
        ))
        plain_lines.append("")

    if price_drops:
        plain_lines.append("PRICE DROPS ON YOUR FAVORITES:")
        for item in price_drops:
            plain_lines.append(f"  - {item['title']} -> {item.get('price_hint', 'updated')}")
            plain_lines.append(f"    {base_url}{item['listing_url']}")
        plain_lines.append("")

    plain_lines.append(f"Browse all: {browse_url}")
    plain_lines.append("")
    plain_lines.append("--")
    plain_lines.append("GimmeDat - The student marketplace for services, items, and campus connections.")
    plain_lines.append(f"Manage email preferences: {settings_url}")

    plain_text = "\n".join(plain_lines)

    return _base_template(content, footer_extra), plain_text


def digest_email(
    display_name: str,
    subject: str,
    body_html: str,
    body_text: str,
    cta_url: str,
    settings_url: str,
) -> tuple[str, str]:
    """Generate a digest email (daily or weekly). Returns (html, plain_text).

    The body_html/body_text are pre-generated by SmartNotificationService
    (either AI or fallback). This template wraps them in the standard layout.
    """
    safe_name = escape(display_name)

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Your GimmeDat Digest
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, here is what has been happening on your campus marketplace.
        </p>

        <div style="margin-bottom: 24px; font-size: 14px; color: #444; line-height: 1.6;">
            {body_html}
        </div>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 20px 0;">
                    <a href="{cta_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Browse Listings</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            Manage digest preferences in your <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">account settings</a>.
        </p>
    '''

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Manage email preferences</a>
                            </p>'''

    plain = f"""Your GimmeDat Digest

Hey {display_name}, here is what has been happening:

{body_text}

Browse listings: {cta_url}

--
GimmeDat - The student marketplace for services, items, and campus connections.
Manage email preferences: {settings_url}
"""

    return _base_template(content, footer_extra), plain


def expiry_nudge_email(
    display_name: str,
    listing_title: str,
    days_until_expiry: int,
    view_count: int,
    message_count: int,
    renew_url: str,
    settings_url: str,
) -> tuple[str, str]:
    """Generate a listing expiry nudge email with engagement stats."""
    safe_name = escape(display_name)
    safe_title = escape(listing_title)

    stats_html = ""
    if view_count > 0 or message_count > 0:
        stats_html = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
            <tr>
                <td style="text-align: center; padding: 14px; background-color: #f8f8fa; border-radius: 6px;">
                    <span style="font-size: 24px; font-weight: 700; color: #8b5cf6;">{view_count}</span>
                    <br>
                    <span style="font-size: 12px; color: #666;">view{"s" if view_count != 1 else ""}</span>
                </td>
                <td style="width: 12px;"></td>
                <td style="text-align: center; padding: 14px; background-color: #f8f8fa; border-radius: 6px;">
                    <span style="font-size: 24px; font-weight: 700; color: #8b5cf6;">{message_count}</span>
                    <br>
                    <span style="font-size: 12px; color: #666;">message{"s" if message_count != 1 else ""}</span>
                </td>
            </tr>
        </table>'''

    day_word = "day" if days_until_expiry == 1 else "days"

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Listing Expiring Soon
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, your listing <strong>{safe_title}</strong> expires in {days_until_expiry} {day_word}.
        </p>

        {stats_html}

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 20px 0;">
                    <a href="{renew_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">Renew Listing</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">Manage notification settings</a>
        </p>
    '''

    plain = f"""Listing Expiring Soon

Hey {display_name}, your listing "{listing_title}" expires in {days_until_expiry} {day_word}.

Stats: {view_count} views, {message_count} messages

Renew your listing: {renew_url}

--
GimmeDat - The student marketplace for services, items, and campus connections.
Manage settings: {settings_url}
"""

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Manage email preferences</a>
                            </p>'''

    return _base_template(content, footer_extra), plain


def price_drop_alert_email(
    display_name: str,
    listing_title: str,
    price_hint: str,
    listing_url: str,
    settings_url: str,
) -> tuple[str, str]:
    """Generate a price drop alert email for a favorited listing."""
    safe_name = escape(display_name)
    safe_title = escape(listing_title)
    safe_price = escape(price_hint or "Updated price")

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Price Update
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, a listing you saved has been updated.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="background-color: #f8f8fa; border-radius: 6px; padding: 14px 18px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1a1a2e;">
                        {safe_title}
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #8b5cf6; font-weight: 600;">
                        {safe_price}
                    </p>
                </td>
            </tr>
        </table>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 20px 0;">
                    <a href="{listing_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">View Listing</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">Manage notification settings</a>
        </p>
    '''

    plain = f"""Price Update on GimmeDat

Hey {display_name}, a listing you saved has been updated:

{listing_title} -- {price_hint or "Updated price"}

View listing: {listing_url}

--
GimmeDat - The student marketplace for services, items, and campus connections.
Manage settings: {settings_url}
"""

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Manage email preferences</a>
                            </p>'''

    return _base_template(content, footer_extra), plain


def re_engagement_email(
    display_name: str,
    subject: str,
    body: str,
    cta_url: str,
    settings_url: str,
) -> tuple[str, str]:
    """Generate a re-engagement campaign email."""
    safe_body = escape(body).replace("\n", "<br>")

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            We have been thinking of you
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            {safe_body}
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="text-align: center; padding: 4px 0 20px 0;">
                    <a href="{cta_url}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 6px;">See What is New</a>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            <a href="{settings_url}" style="color: #8b5cf6; text-decoration: underline;">Manage notification settings</a>
        </p>
    '''

    plain = f"""We have been thinking of you, {display_name}!

{body}

See what is new: {cta_url}

--
GimmeDat - The student marketplace for services, items, and campus connections.
Manage settings: {settings_url}
"""

    footer_extra = f'''<p style="margin: 0 0 6px 0; font-size: 12px; color: #999;">
                                <a href="{settings_url}" style="color: #999; text-decoration: underline;">Unsubscribe from re-engagement emails</a>
                            </p>'''

    return _base_template(content, footer_extra), plain


def feedback_received_email(display_name: str) -> tuple[str, str]:
    """Confirmation email sent when a user submits feedback. Returns (html, plain_text)."""
    safe_name = escape(display_name)

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            We Got Your Feedback
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, thanks for taking the time to share your thoughts with us.
            Your feedback is important and our team will review it shortly.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="background-color: #f8f8fa; border-radius: 6px; padding: 14px 18px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.5;">
                        Your submission is currently <strong>under review</strong>.
                        We will reach out if we need more details.
                    </p>
                </td>
            </tr>
        </table>

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            Have more to share? You can always submit another feedback from the feed page.
        </p>
    '''

    plain_text = f"""We Got Your Feedback

Hey {display_name}, thanks for taking the time to share your thoughts with us.
Your feedback is important and our team will review it shortly.

Your submission is currently under review. We will reach out if we need more details.

--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text


def feedback_reviewed_email(
    display_name: str,
    admin_note: str | None,
) -> tuple[str, str]:
    """Email sent when admin marks feedback as reviewed. Returns (html, plain_text)."""
    safe_name = escape(display_name)

    note_html = ""
    note_plain = ""
    if admin_note:
        safe_note = escape(admin_note)
        note_html = f'''
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
            <tr>
                <td style="background-color: #f8f8fa; border-radius: 6px; padding: 14px 18px; border-left: 3px solid #8b5cf6;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">
                        Response from the GimmeDat Team
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.5;">
                        {safe_note}
                    </p>
                </td>
            </tr>
        </table>'''
        note_plain = f"\nResponse from the GimmeDat Team:\n\n{admin_note}\n"

    content = f'''
        <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center;">
            Update on Your Feedback
        </h1>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #444; line-height: 1.6; text-align: center;">
            Hey {safe_name}, our team has reviewed your feedback. Thank you for helping us improve GimmeDat!
        </p>

        {note_html}

        <p style="margin: 0; font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
            Have more to share? You can always submit another feedback from the feed page.
        </p>
    '''

    plain_text = f"""Update on Your Feedback

Hey {display_name}, our team has reviewed your feedback. Thank you for helping us improve GimmeDat!
{note_plain}
--
GimmeDat - The student marketplace for services, items, and campus connections.
"""

    return _base_template(content), plain_text
