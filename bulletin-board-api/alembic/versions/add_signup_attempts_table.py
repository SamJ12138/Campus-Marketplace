"""Add signup_attempts table for reliable abandoned signup tracking

Revision ID: add_signup_attempts_table
Revises: fix_fulfilled_enum_case
Create Date: 2026-04-02

Replaces fragile Redis-based abandoned_signup tracking with a persistent
PostgreSQL table. Eliminates TTL race conditions where Redis keys expire
before the worker processes them.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "add_signup_attempts_table"
down_revision: Union[str, None] = "fix_fulfilled_enum_case"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS signup_attempts (
            id UUID NOT NULL PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            code_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            apology_sent BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_signup_attempts_apology
        ON signup_attempts (apology_sent, code_expires_at)
    """)


def downgrade() -> None:
    op.drop_index("idx_signup_attempts_apology", table_name="signup_attempts")
    op.drop_table("signup_attempts")
