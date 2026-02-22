"""Add pgvector embedding column to listings table

Revision ID: add_vector_column
Revises: extend_notifications
Create Date: 2026-02-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_vector_column"
down_revision: Union[str, None] = "extend_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Enable pgvector extension (idempotent)
    conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))

    # Check if embedding column already exists (idempotent)
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'listings' AND column_name = 'embedding'"
    ))
    if result.fetchone() is None:
        op.add_column(
            "listings",
            sa.Column("embedding", sa.Text(), nullable=True),
        )

    # Ensure column is vector type (idempotent - safe to re-run)
    conn.execute(sa.text(
        "ALTER TABLE listings "
        "ALTER COLUMN embedding TYPE vector(384) "
        "USING embedding::vector(384)"
    ))

    # Add HNSW index if it doesn't exist
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes "
        "WHERE indexname = 'idx_listings_embedding'"
    ))
    if result.fetchone() is None:
        conn.execute(sa.text(
            "CREATE INDEX idx_listings_embedding ON listings "
            "USING hnsw (embedding vector_cosine_ops)"
        ))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_listings_embedding")
    op.drop_column("listings", "embedding")
