"""Extend notification_preferences with digest, smart timing, and engagement fields

Revision ID: extend_notifications
Revises: merge_user_pair_threads
Create Date: 2026-02-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "extend_notifications"
down_revision: Union[str, None] = "merge_user_pair_threads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _col_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :column"
    ), {"table": table, "column": column})
    return result.fetchone() is not None


def _add_col_if_missing(conn, table: str, column: sa.Column) -> None:
    if not _col_exists(conn, table, column.name):
        op.add_column(table, column)


def upgrade() -> None:
    conn = op.get_bind()

    # Create digest_frequency enum type
    digest_freq = sa.Enum("none", "daily", "weekly", name="digest_frequency")
    digest_freq.create(conn, checkfirst=True)

    t = "notification_preferences"

    # Digest preferences
    _add_col_if_missing(conn, t, sa.Column(
        "digest_frequency",
        sa.Enum("none", "daily", "weekly", name="digest_frequency"),
        server_default="weekly", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "digest_last_sent_at", sa.DateTime(timezone=True), nullable=True,
    ))

    # Smart notification preferences
    _add_col_if_missing(conn, t, sa.Column(
        "email_price_drops", sa.Boolean(), server_default="true", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "email_listing_expiry", sa.Boolean(), server_default="true", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "email_recommendations", sa.Boolean(), server_default="false", nullable=False,
    ))

    # Smart timing
    _add_col_if_missing(conn, t, sa.Column(
        "quiet_hours_start", sa.Integer(), nullable=True,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "quiet_hours_end", sa.Integer(), nullable=True,
    ))

    # Engagement tracking
    _add_col_if_missing(conn, t, sa.Column(
        "engagement_score", sa.Float(), server_default="1.0", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "emails_sent_count", sa.Integer(), server_default="0", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "emails_opened_count", sa.Integer(), server_default="0", nullable=False,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "last_email_opened_at", sa.DateTime(timezone=True), nullable=True,
    ))
    _add_col_if_missing(conn, t, sa.Column(
        "last_digest_opened_at", sa.DateTime(timezone=True), nullable=True,
    ))


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
