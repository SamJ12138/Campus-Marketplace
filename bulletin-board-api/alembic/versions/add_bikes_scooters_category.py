"""Add Bikes & Scooters item category

Revision ID: add_bikes_scooters
Revises: add_offers_deals_reviews
Create Date: 2026-03-20

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'add_bikes_scooters'
down_revision: Union[str, None] = 'add_offers_deals_reviews'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO categories (id, name, slug, listing_type, icon, sort_order, is_active)
        VALUES (
            gen_random_uuid(),
            'Bikes & Scooters',
            'bikes-scooters',
            'item',
            '🚲',
            6,
            true
        )
    """)


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug = 'bikes-scooters'")
