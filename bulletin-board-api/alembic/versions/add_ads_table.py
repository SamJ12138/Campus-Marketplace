"""Add ads table for admin-managed featured ads

Revision ID: add_ads_table
Revises: add_pending_uploads
Create Date: 2026-02-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_ads_table'
down_revision: Union[str, None] = 'add_pending_uploads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum via raw SQL to safely handle "already exists" from partial prior run
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ad_type AS ENUM ('internal_detail', 'external_link', 'coupon', 'event');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Use sa.String for the column type to avoid SQLAlchemy's automatic enum creation,
    # then alter to the real enum type via raw SQL
    op.create_table(
        'ads',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('campus_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', sa.String(50), nullable=False, server_default='internal_detail'),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('subtitle', sa.String(500), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('cta_text', sa.String(100), nullable=False, server_default='Learn More'),
        sa.Column('image_url', sa.String(512), nullable=True),
        sa.Column('image_alt', sa.String(200), nullable=True),
        sa.Column('accent_color', sa.String(50), nullable=True),
        sa.Column('external_url', sa.String(512), nullable=True),
        sa.Column('coupon_code', sa.String(100), nullable=True),
        sa.Column('event_start_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('event_location', sa.String(200), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campus_id'], ['campuses.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )

    # Now alter the column to use the enum type
    op.execute("""
        ALTER TABLE ads
        ALTER COLUMN type TYPE ad_type USING type::ad_type,
        ALTER COLUMN type SET DEFAULT 'internal_detail';
    """)

    op.create_index('idx_ads_campus', 'ads', ['campus_id'])
    op.create_index('idx_ads_active', 'ads', ['is_active', 'starts_at', 'ends_at'])


def downgrade() -> None:
    op.drop_index('idx_ads_active', table_name='ads')
    op.drop_index('idx_ads_campus', table_name='ads')
    op.drop_table('ads')
    op.execute('DROP TYPE IF EXISTS ad_type')
