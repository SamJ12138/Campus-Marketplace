"""Add listing_mode, budget, urgency, response_count for requests feature

Revision ID: add_listing_mode_requests
Revises: add_application_role
Create Date: 2026-04-02

Non-destructive migration:
- Adds listing_mode column with server default 'offering' (existing rows auto-populate)
- Adds budget_min, budget_max (nullable) for request price ranges
- Adds urgency enum column (nullable) for request urgency
- Adds response_count (default 0) for tracking request engagement
- Adds 'fulfilled' to listing_status enum
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "add_listing_mode_requests"
down_revision: Union[str, None] = "add_application_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create listing_mode enum type
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE listing_mode_enum AS ENUM ('offering', 'seeking');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create urgency enum type
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE urgency_enum AS ENUM ('low', 'medium', 'high', 'asap');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Add 'fulfilled' to existing listing_status enum
    op.execute("""
        ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'fulfilled';
    """)

    # Add new columns
    op.add_column(
        "listings",
        sa.Column(
            "listing_mode",
            sa.Enum("offering", "seeking", name="listing_mode_enum", create_type=False),
            server_default="offering",
            nullable=False,
        ),
    )
    op.add_column(
        "listings",
        sa.Column("budget_min", sa.Float(), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column("budget_max", sa.Float(), nullable=True),
    )
    op.add_column(
        "listings",
        sa.Column(
            "urgency",
            sa.Enum("low", "medium", "high", "asap", name="urgency_enum", create_type=False),
            nullable=True,
        ),
    )
    op.add_column(
        "listings",
        sa.Column("response_count", sa.Integer(), server_default="0", nullable=False),
    )

    # Add index for filtering by mode
    op.create_index("idx_listings_mode", "listings", ["listing_mode"])


def downgrade() -> None:
    op.drop_index("idx_listings_mode", table_name="listings")
    op.drop_column("listings", "response_count")
    op.drop_column("listings", "urgency")
    op.drop_column("listings", "budget_max")
    op.drop_column("listings", "budget_min")
    op.drop_column("listings", "listing_mode")
    op.execute("DROP TYPE IF EXISTS urgency_enum")
    op.execute("DROP TYPE IF EXISTS listing_mode_enum")
    # Note: cannot remove 'fulfilled' from listing_status enum in PostgreSQL
