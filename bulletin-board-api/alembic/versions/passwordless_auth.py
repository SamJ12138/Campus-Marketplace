"""passwordless auth: nullable password_hash, login_code enum, attempt_count

Revision ID: passwordless_auth
Revises: add_bikes_scooters
Create Date: 2026-03-28

Non-destructive migration:
- Existing password_hash values are preserved (column becomes nullable)
- New enum value is additive (LOGIN_CODE)
- New column attempt_count has a server default of 0
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "passwordless_auth"
down_revision: Union[str, None] = "add_bikes_scooters"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add LOGIN_CODE to the email_verification_purpose enum
    # Raw SQL required — Alembic autogenerate cannot add enum values
    op.execute(
        "ALTER TYPE email_verification_purpose ADD VALUE IF NOT EXISTS 'LOGIN_CODE'"
    )

    # 2. Make password_hash nullable (existing rows keep their values)
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=True,
    )

    # 3. Add attempt_count to email_verifications for brute-force tracking
    op.add_column(
        "email_verifications",
        sa.Column(
            "attempt_count",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    # Remove attempt_count column
    op.drop_column("email_verifications", "attempt_count")

    # Restore password_hash to NOT NULL
    # First set any NULLs to a placeholder so the constraint can be applied
    op.execute(
        "UPDATE users SET password_hash = 'migrated_passwordless' "
        "WHERE password_hash IS NULL"
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=False,
    )

    # Note: PostgreSQL does not support removing enum values.
    # LOGIN_CODE will remain in the enum but is harmless if unused.
