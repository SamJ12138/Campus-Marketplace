"""Add pending_uploads table for upload tracking without Redis

Revision ID: add_pending_uploads
Revises: remove_regulated_flag_001
Create Date: 2025-02-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_pending_uploads'
down_revision: Union[str, None] = 'remove_regulated_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pending_uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purpose', sa.String(50), nullable=False),
        sa.Column('storage_key', sa.String(500), nullable=False),
        sa.Column('listing_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    # Index for cleanup queries
    op.create_index('ix_pending_uploads_user_expires', 'pending_uploads', ['user_id', 'expires_at'])


def downgrade() -> None:
    op.drop_index('ix_pending_uploads_user_expires', table_name='pending_uploads')
    op.drop_table('pending_uploads')
