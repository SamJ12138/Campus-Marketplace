"""Add ad_events table for tracking impressions and clicks

Revision ID: add_ad_events_table
Revises: add_ads_table
Create Date: 2026-02-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_ad_events_table'
down_revision: Union[str, None] = 'add_ads_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ad_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(20), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.Column('ip_hash', sa.String(64), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )

    op.create_index('idx_ad_events_ad_id', 'ad_events', ['ad_id'])
    op.create_index('idx_ad_events_created_at', 'ad_events', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_ad_events_created_at', table_name='ad_events')
    op.drop_index('idx_ad_events_ad_id', table_name='ad_events')
    op.drop_table('ad_events')
