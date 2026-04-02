"""Fix fulfilled enum value case to match existing UPPERCASE convention

Revision ID: fix_fulfilled_enum_case
Revises: add_listing_mode_requests
Create Date: 2026-04-02

The initial migration created listing_status enum values in UPPERCASE
(DRAFT, ACTIVE, EXPIRED, REMOVED, SOLD). The requests migration
incorrectly added 'fulfilled' in lowercase. This adds 'FULFILLED'
in UPPERCASE to match the existing convention. The stale lowercase
value remains (PostgreSQL cannot remove enum values) but is never used.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "fix_fulfilled_enum_case"
down_revision: Union[str, None] = "add_listing_mode_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'FULFILLED';
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values
    pass
