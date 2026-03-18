"""Add offers, deals, reviews, meetings tables and extend messages/users

Revision ID: add_offers_deals_reviews
Revises: add_feedback_table
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_offers_deals_reviews'
down_revision: Union[str, None] = 'add_feedback_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Extend messages table --
    op.execute("""
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'text'
    """)
    op.execute("""
        ALTER TABLE messages
        ADD COLUMN IF NOT EXISTS metadata JSONB
    """)

    # -- Extend users table --
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS average_rating FLOAT DEFAULT 0.0
    """)
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0
    """)

    # -- Create offers table --
    op.execute("""
        CREATE TABLE IF NOT EXISTS offers (
            id UUID NOT NULL PRIMARY KEY,
            thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
            listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
            offerer_id UUID NOT NULL REFERENCES users(id),
            recipient_id UUID NOT NULL REFERENCES users(id),
            amount VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            parent_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
            message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            expires_at TIMESTAMP WITH TIME ZONE,
            responded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_offers_thread ON offers (thread_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_offers_status ON offers (status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers (listing_id)")

    # -- Create deals table --
    op.execute("""
        CREATE TABLE IF NOT EXISTS deals (
            id UUID NOT NULL PRIMARY KEY,
            listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
            thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,
            buyer_id UUID NOT NULL REFERENCES users(id),
            seller_id UUID NOT NULL REFERENCES users(id),
            offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
            agreed_price VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
            seller_confirmed_at TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_deals_listing ON deals (listing_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_deals_buyer ON deals (buyer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_deals_seller ON deals (seller_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status)")

    # -- Create reviews table --
    op.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id UUID NOT NULL PRIMARY KEY,
            deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
            reviewer_id UUID NOT NULL REFERENCES users(id),
            reviewee_id UUID NOT NULL REFERENCES users(id),
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT uq_reviews_deal_reviewer UNIQUE (deal_id, reviewer_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews (reviewee_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reviews_deal ON reviews (deal_id)")

    # -- Create meetings table --
    op.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id UUID NOT NULL PRIMARY KEY,
            deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
            thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
            proposer_id UUID NOT NULL REFERENCES users(id),
            location_name VARCHAR(255) NOT NULL,
            location_details TEXT,
            proposed_time TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) DEFAULT 'proposed',
            message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            responded_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_meetings_deal ON meetings (deal_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_meetings_thread ON meetings (thread_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS meetings")
    op.execute("DROP TABLE IF EXISTS reviews")
    op.execute("DROP TABLE IF EXISTS deals")
    op.execute("DROP TABLE IF EXISTS offers")

    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS message_type")
    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS metadata")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS average_rating")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS review_count")
