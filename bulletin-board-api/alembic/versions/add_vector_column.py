"""Add pgvector embedding column to listings table

Revision ID: add_vector_column
Revises: merge_user_pair_threads
Create Date: 2026-02-21

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_vector_column"
down_revision: Union[str, None] = "merge_user_pair_threads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension (idempotent)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Add embedding column (384-dimensional vector)
    op.add_column(
        "listings",
        sa.Column("embedding", sa.Text(), nullable=True),
    )

    # Convert to vector type
    op.execute(
        "ALTER TABLE listings "
        "ALTER COLUMN embedding TYPE vector(384) "
        "USING embedding::vector(384)"
    )

    # Add HNSW index for fast cosine similarity search
    # (HNSW works with any number of rows, unlike ivfflat which needs >= lists)
    op.execute(
        "CREATE INDEX idx_listings_embedding ON listings "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_listings_embedding")
    op.drop_column("listings", "embedding")
