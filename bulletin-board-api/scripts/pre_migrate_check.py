#!/usr/bin/env python
"""Pre-migration safety check.

Verifies the database has expected data before running alembic migrations.
This prevents silently creating empty tables on a wrong or empty database.

Exit codes:
    0 - Database looks correct, safe to run migrations
    1 - Database appears empty/wrong, migrations should be skipped

Set ALLOW_FRESH_DB=true to bypass this check for genuine first-time setup.
"""
import asyncio
import os
import sys


async def check_database() -> bool:
    """Return True if the database has the expected campuses data."""
    import asyncpg

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL is not set")
        return False

    # asyncpg expects postgresql:// not postgresql+asyncpg://
    connect_url = database_url.replace("postgresql+asyncpg://", "postgresql://")

    try:
        conn = await asyncpg.connect(connect_url, timeout=10)
    except Exception as e:
        print(f"ERROR: Cannot connect to database: {e}")
        return False

    try:
        # Check if campuses table exists and has rows
        row = await conn.fetchrow(
            "SELECT COUNT(*) AS cnt FROM information_schema.tables "
            "WHERE table_name = 'campuses'"
        )
        if row is None or row["cnt"] == 0:
            print("WARNING: 'campuses' table does not exist")
            return False

        row = await conn.fetchrow("SELECT COUNT(*) AS cnt FROM campuses")
        if row is None or row["cnt"] == 0:
            print("WARNING: 'campuses' table is empty")
            return False

        print(f"OK: Database has {row['cnt']} campus(es) — safe to migrate")
        return True
    except Exception as e:
        print(f"ERROR: Database check failed: {e}")
        return False
    finally:
        await conn.close()


def main():
    allow_fresh = os.environ.get("ALLOW_FRESH_DB", "").lower() == "true"
    if allow_fresh:
        print("ALLOW_FRESH_DB=true — bypassing pre-migration check")
        sys.exit(0)

    safe = asyncio.run(check_database())
    sys.exit(0 if safe else 1)


if __name__ == "__main__":
    main()
