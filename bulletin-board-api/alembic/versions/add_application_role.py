"""add role column to applications table

Revision ID: add_application_role
Revises: passwordless_auth
Create Date: 2026-03-31

Non-destructive migration:
- Adds nullable role column (existing rows keep role=NULL)
- Adds index for filtering by role
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "add_application_role"
down_revision: Union[str, None] = "passwordless_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("role", sa.String(100), nullable=True),
    )
    op.create_index(
        "idx_applications_role",
        "applications",
        ["role"],
    )


def downgrade() -> None:
    op.drop_index("idx_applications_role", table_name="applications")
    op.drop_column("applications", "role")
