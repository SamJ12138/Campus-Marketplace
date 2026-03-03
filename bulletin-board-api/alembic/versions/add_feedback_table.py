"""Add feedback table for user feedback submissions

Revision ID: add_feedback_table
Revises: cleanup_test_users
Create Date: 2026-03-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_feedback_table'
down_revision: Union[str, None] = 'cleanup_test_users'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum idempotently
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE feedback_status AS ENUM ('new', 'reviewed', 'archived');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create table idempotently (may already exist from create_all)
    op.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id UUID NOT NULL PRIMARY KEY,
            user_id UUID REFERENCES users(id),
            email VARCHAR(255),
            message TEXT NOT NULL,
            status feedback_status DEFAULT 'new' NOT NULL,
            admin_note TEXT,
            reviewed_by UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            reviewed_at TIMESTAMP WITH TIME ZONE
        )
    """)

    op.execute("CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback (user_id)")


def downgrade() -> None:
    op.drop_index('idx_feedback_user', table_name='feedback')
    op.drop_index('idx_feedback_created', table_name='feedback')
    op.drop_index('idx_feedback_status', table_name='feedback')
    op.drop_table('feedback')
    op.execute('DROP TYPE IF EXISTS feedback_status')
