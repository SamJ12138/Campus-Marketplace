"""Extend notification_preferences with digest, smart timing, and engagement fields

Revision ID: extend_notifications
Revises: add_vector_column
Create Date: 2026-02-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "extend_notifications"
down_revision: Union[str, None] = "add_vector_column"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create digest_frequency enum type
    digest_freq = sa.Enum("none", "daily", "weekly", name="digest_frequency")
    digest_freq.create(op.get_bind(), checkfirst=True)

    # Digest preferences
    op.add_column(
        "notification_preferences",
        sa.Column(
            "digest_frequency",
            sa.Enum("none", "daily", "weekly", name="digest_frequency"),
            server_default="weekly",
            nullable=False,
        ),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("digest_last_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Smart notification preferences
    op.add_column(
        "notification_preferences",
        sa.Column("email_price_drops", sa.Boolean(), server_default="true", nullable=False),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("email_listing_expiry", sa.Boolean(), server_default="true", nullable=False),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("email_recommendations", sa.Boolean(), server_default="false", nullable=False),
    )

    # Smart timing
    op.add_column(
        "notification_preferences",
        sa.Column("quiet_hours_start", sa.Integer(), nullable=True),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("quiet_hours_end", sa.Integer(), nullable=True),
    )

    # Engagement tracking
    op.add_column(
        "notification_preferences",
        sa.Column("engagement_score", sa.Float(), server_default="1.0", nullable=False),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("emails_sent_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("emails_opened_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("last_email_opened_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "notification_preferences",
        sa.Column("last_digest_opened_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_preferences", "last_digest_opened_at")
    op.drop_column("notification_preferences", "last_email_opened_at")
    op.drop_column("notification_preferences", "emails_opened_count")
    op.drop_column("notification_preferences", "emails_sent_count")
    op.drop_column("notification_preferences", "engagement_score")
    op.drop_column("notification_preferences", "quiet_hours_end")
    op.drop_column("notification_preferences", "quiet_hours_start")
    op.drop_column("notification_preferences", "email_recommendations")
    op.drop_column("notification_preferences", "email_listing_expiry")
    op.drop_column("notification_preferences", "email_price_drops")
    op.drop_column("notification_preferences", "digest_last_sent_at")
    op.drop_column("notification_preferences", "digest_frequency")

    # Drop the enum type
    sa.Enum(name="digest_frequency").drop(op.get_bind(), checkfirst=True)
