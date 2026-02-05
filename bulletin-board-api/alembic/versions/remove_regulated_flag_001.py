"""Remove regulated flag from Hair & Beauty category

Revision ID: remove_regulated_001
Revises: c928df889c07
Create Date: 2026-02-05
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "remove_regulated_001"
down_revision = "c928df889c07"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Set requires_regulated_flag to False for Hair & Beauty category
    op.execute(
        "UPDATE categories SET requires_regulated_flag = false WHERE slug = 'hair-beauty'"
    )


def downgrade() -> None:
    # Restore requires_regulated_flag to True for Hair & Beauty category
    op.execute(
        "UPDATE categories SET requires_regulated_flag = true WHERE slug = 'hair-beauty'"
    )
