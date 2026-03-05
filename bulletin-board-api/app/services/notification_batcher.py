"""
Debounced/batched message notification system using Redis.

Instead of sending an email per message, this records pending notifications
with a sliding debounce window. A periodic ARQ cron job scans for "ripe"
notifications and sends a single batched email per thread.
"""

import json
import logging
import time
from datetime import date
from uuid import UUID

from redis.asyncio import Redis

from app.config import get_settings

logger = logging.getLogger(__name__)


class NotificationBatcher:
    """Manages pending message notifications in Redis with debounce logic."""

    # Key prefixes
    _PENDING = "notify:msg:pending:{thread}:{user}"
    _DEBOUNCE = "notify:msg:debounce:{thread}:{user}"
    _ONLINE = "notify:msg:online:{thread}:{user}"
    _LAST_SENT = "notify:msg:lastsent:{thread}:{user}"
    _FIRST_SENT = "notify:msg:firstsent:{thread}"
    _DAILY_COUNT = "notify:msg:daily_count:{date}"
    _LOCK = "notify:msg:lock:{thread}:{user}"

    def __init__(self, redis: Redis) -> None:
        self.redis = redis
        self.settings = get_settings()

    def _key(self, template: str, **kwargs: object) -> str:
        return template.format(**kwargs)

    async def record_pending(
        self,
        thread_id: UUID,
        recipient_id: UUID,
        sender_name: str,
        listing_title: str,
    ) -> None:
        """Record a pending notification. Each new message resets the debounce timer."""
        tid, uid = str(thread_id), str(recipient_id)
        pending_key = self._key(self._PENDING, thread=tid, user=uid)
        debounce_key = self._key(self._DEBOUNCE, thread=tid, user=uid)
        first_key = self._key(self._FIRST_SENT, thread=tid)

        # Check if this is the first notification ever for this thread
        is_first = not await self.redis.exists(first_key)
        debounce_seconds = (
            self.settings.msg_notify_debounce_first_seconds
            if is_first
            else self.settings.msg_notify_debounce_reply_seconds
        )

        # Update or create pending metadata
        existing = await self.redis.get(pending_key)
        if existing:
            data = json.loads(existing)
            data["count"] += 1
            # Collect unique sender names
            if sender_name not in data["senders"]:
                data["senders"].append(sender_name)
        else:
            data = {
                "thread_id": tid,
                "recipient_id": uid,
                "listing_title": listing_title,
                "senders": [sender_name],
                "count": 1,
                "first_recorded": time.time(),
            }

        pipe = self.redis.pipeline()
        pipe.set(pending_key, json.dumps(data), ex=1800)  # 30min TTL
        # Sliding debounce: reset timer on each new message
        ripe_at = time.time() + debounce_seconds
        pipe.set(debounce_key, str(ripe_at), ex=1800)
        await pipe.execute()

        logger.info(
            "[NOTIFY-BATCH] Recorded pending: thread=%s, recipient=%s, count=%d, debounce=%ds",
            tid, uid, data["count"], debounce_seconds,
        )

    async def record_heartbeat(self, thread_id: UUID, user_id: UUID) -> None:
        """Record that a user is actively viewing a thread (called from GET /threads/{id})."""
        key = self._key(self._ONLINE, thread=str(thread_id), user=str(user_id))
        await self.redis.set(key, "1", ex=self.settings.msg_notify_online_ttl_seconds)

    async def get_ripe_notifications(self) -> list[dict]:
        """Scan for debounce keys whose timestamp has passed (notification is ripe to send)."""
        ripe = []
        now = time.time()
        async for key in self.redis.scan_iter(match="notify:msg:debounce:*", count=100):
            raw = await self.redis.get(key)
            if not raw:
                continue
            ripe_at = float(raw)
            if ripe_at <= now:
                # Extract thread_id and user_id from key
                # Key format: notify:msg:debounce:{thread}:{user}
                parts = key if isinstance(key, str) else key.decode()
                segments = parts.split(":")
                if len(segments) >= 5:
                    thread_id = segments[3]
                    user_id = segments[4]
                    pending_key = self._key(self._PENDING, thread=thread_id, user=user_id)
                    pending_raw = await self.redis.get(pending_key)
                    if pending_raw:
                        data = json.loads(pending_raw)
                        ripe.append(data)
        return ripe

    async def is_recipient_online(self, thread_id: str, recipient_id: str) -> bool:
        """Check if recipient is actively viewing this thread."""
        key = self._key(self._ONLINE, thread=thread_id, user=recipient_id)
        return bool(await self.redis.exists(key))

    async def extend_debounce(self, thread_id: str, recipient_id: str) -> None:
        """Push the debounce timer forward (when user is online)."""
        debounce_key = self._key(self._DEBOUNCE, thread=thread_id, user=recipient_id)
        ripe_at = time.time() + self.settings.msg_notify_online_ttl_seconds
        await self.redis.set(debounce_key, str(ripe_at), ex=1800)

    async def check_rate_limit(self, thread_id: str, recipient_id: str) -> bool:
        """Return True if we can send (enough time since last email for this thread+user)."""
        key = self._key(self._LAST_SENT, thread=thread_id, user=recipient_id)
        raw = await self.redis.get(key)
        if not raw:
            return True
        last_sent = float(raw)
        return (time.time() - last_sent) >= self.settings.msg_notify_min_interval_seconds

    async def check_daily_limit(self) -> bool:
        """Return True if we haven't hit the daily email cap."""
        key = self._key(self._DAILY_COUNT, date=date.today().isoformat())
        raw = await self.redis.get(key)
        if not raw:
            return True
        return int(raw) < self.settings.msg_notify_max_daily_emails

    async def mark_sent(self, thread_id: str, recipient_id: str) -> None:
        """Cleanup after successfully sending a batched email."""
        pending_key = self._key(self._PENDING, thread=thread_id, user=recipient_id)
        debounce_key = self._key(self._DEBOUNCE, thread=thread_id, user=recipient_id)
        last_sent_key = self._key(self._LAST_SENT, thread=thread_id, user=recipient_id)
        first_key = self._key(self._FIRST_SENT, thread=thread_id)
        daily_key = self._key(self._DAILY_COUNT, date=date.today().isoformat())

        pipe = self.redis.pipeline()
        pipe.delete(pending_key, debounce_key)
        pipe.set(last_sent_key, str(time.time()), ex=86400)  # 24h TTL
        pipe.set(first_key, "1", ex=604800)  # 7d TTL
        pipe.incr(daily_key)
        pipe.expire(daily_key, 86400)  # 24h TTL
        await pipe.execute()

    async def acquire_lock(self, thread_id: str, recipient_id: str) -> bool:
        """Acquire a processing lock to prevent duplicate sends. Returns True if acquired."""
        key = self._key(self._LOCK, thread=thread_id, user=recipient_id)
        return bool(await self.redis.set(key, "1", ex=60, nx=True))

    async def release_lock(self, thread_id: str, recipient_id: str) -> None:
        """Release the processing lock."""
        key = self._key(self._LOCK, thread=thread_id, user=recipient_id)
        await self.redis.delete(key)
