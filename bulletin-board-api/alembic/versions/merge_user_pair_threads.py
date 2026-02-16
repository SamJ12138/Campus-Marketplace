"""Merge per-listing threads into per-user-pair threads

- Adds listing_id to messages table so each message tracks which item it's about
- Merges duplicate threads between the same user pair into a single thread
- Replaces the (listing, initiator, recipient) unique constraint with a user-pair index
- Removes auto-mark-read from GET endpoint (handled separately in application code)

Revision ID: merge_user_pair_threads
Revises: add_ad_events_table
Create Date: 2026-02-16
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "merge_user_pair_threads"
down_revision: Union[str, None] = "add_ad_events_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add listing_id column to messages table
    op.add_column(
        "messages",
        sa.Column(
            "listing_id",
            sa.UUID(),
            sa.ForeignKey("listings.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("idx_messages_listing", "messages", ["listing_id"])

    # 2. Backfill messages.listing_id from their thread's listing_id
    op.execute("""
        UPDATE messages m
        SET listing_id = t.listing_id
        FROM message_threads t
        WHERE m.thread_id = t.id
          AND t.listing_id IS NOT NULL
    """)

    # 3. Merge threads: for each user pair with multiple threads,
    #    keep the one with the most recent last_message_at and move all messages to it.
    #    We use LEAST/GREATEST to normalize the user pair regardless of direction.
    op.execute("""
        WITH ranked_threads AS (
            SELECT
                id,
                LEAST(initiator_id, recipient_id) AS user_a,
                GREATEST(initiator_id, recipient_id) AS user_b,
                ROW_NUMBER() OVER (
                    PARTITION BY LEAST(initiator_id, recipient_id),
                                 GREATEST(initiator_id, recipient_id)
                    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
                ) AS rn
            FROM message_threads
            WHERE status != 'archived'
        ),
        canonical AS (
            SELECT user_a, user_b, id AS canonical_id
            FROM ranked_threads
            WHERE rn = 1
        ),
        duplicates AS (
            SELECT rt.id AS dup_id, c.canonical_id
            FROM ranked_threads rt
            JOIN canonical c ON c.user_a = rt.user_a AND c.user_b = rt.user_b
            WHERE rt.rn > 1
        )
        UPDATE messages m
        SET thread_id = d.canonical_id
        FROM duplicates d
        WHERE m.thread_id = d.dup_id
    """)

    # 4. Update unread counts on canonical threads after merging
    op.execute("""
        WITH merged_counts AS (
            SELECT
                m.thread_id,
                t.initiator_id,
                t.recipient_id,
                COALESCE(SUM(CASE WHEN m.sender_id != t.initiator_id AND m.is_read = false THEN 1 ELSE 0 END), 0) AS init_unread,
                COALESCE(SUM(CASE WHEN m.sender_id != t.recipient_id AND m.is_read = false THEN 1 ELSE 0 END), 0) AS recip_unread,
                MAX(m.created_at) AS latest_msg
            FROM messages m
            JOIN message_threads t ON t.id = m.thread_id
            GROUP BY m.thread_id, t.initiator_id, t.recipient_id
        )
        UPDATE message_threads t
        SET
            initiator_unread_count = mc.init_unread,
            recipient_unread_count = mc.recip_unread,
            last_message_at = mc.latest_msg
        FROM merged_counts mc
        WHERE t.id = mc.thread_id
    """)

    # 5. Delete the now-empty duplicate threads
    op.execute("""
        WITH ranked_threads AS (
            SELECT
                id,
                LEAST(initiator_id, recipient_id) AS user_a,
                GREATEST(initiator_id, recipient_id) AS user_b,
                ROW_NUMBER() OVER (
                    PARTITION BY LEAST(initiator_id, recipient_id),
                                 GREATEST(initiator_id, recipient_id)
                    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
                ) AS rn
            FROM message_threads
            WHERE status != 'archived'
        )
        DELETE FROM message_threads
        WHERE id IN (SELECT id FROM ranked_threads WHERE rn > 1)
    """)

    # 6. Drop the old per-listing unique constraint
    op.drop_constraint("uq_thread_unique", "message_threads", type_="unique")

    # 7. Add a unique index on the normalized user pair to prevent duplicate threads
    op.execute("""
        CREATE UNIQUE INDEX uq_thread_user_pair
        ON message_threads (LEAST(initiator_id, recipient_id), GREATEST(initiator_id, recipient_id))
        WHERE status != 'archived'
    """)


def downgrade() -> None:
    # Remove user-pair unique index
    op.execute("DROP INDEX IF EXISTS uq_thread_user_pair")

    # Restore the old unique constraint (will fail if data has duplicates)
    op.create_unique_constraint(
        "uq_thread_unique",
        "message_threads",
        ["listing_id", "initiator_id", "recipient_id"],
    )

    # Remove listing_id from messages
    op.drop_index("idx_messages_listing", table_name="messages")
    op.drop_column("messages", "listing_id")
