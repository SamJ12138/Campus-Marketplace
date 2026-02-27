"""Remove test users created during signup debugging

Revision ID: cleanup_test_users
Revises: add_vector_column
Create Date: 2026-02-27
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cleanup_test_users"
down_revision: Union[str, None] = "add_vector_column"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Test emails created during signup debugging on 2026-02-27
TEST_EMAILS = [
    "finaltest@gettysburg.edu",
    "frontendtest2@gettysburg.edu",
]


def upgrade() -> None:
    conn = op.get_bind()
    for email in TEST_EMAILS:
        # Cascade deletes handle notification_preferences, email_verifications, etc.
        conn.execute(
            sa.text("DELETE FROM notification_preferences WHERE user_id IN (SELECT id FROM users WHERE email = :email)"),
            {"email": email},
        )
        conn.execute(
            sa.text("DELETE FROM email_verifications WHERE user_id IN (SELECT id FROM users WHERE email = :email)"),
            {"email": email},
        )
        result = conn.execute(
            sa.text("DELETE FROM users WHERE email = :email"),
            {"email": email},
        )
        if result.rowcount:
            print(f"[CLEANUP] Deleted test user: {email}")
        else:
            print(f"[CLEANUP] Test user not found (already gone): {email}")


def downgrade() -> None:
    # Test users are not recreated on downgrade
    pass
