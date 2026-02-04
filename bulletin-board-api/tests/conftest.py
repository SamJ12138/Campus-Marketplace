import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock

from app.config import get_settings
from app.dependencies import get_db, get_redis
from app.main import app
from app.models.base import Base

settings = get_settings()
TEST_DB_URL = settings.database_url.replace("/bulletin_board", "/bulletin_board_test")


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def mock_redis():
    """Mock Redis for tests."""
    redis = AsyncMock()
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock()
    redis.ttl = AsyncMock(return_value=3600)
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock()
    redis.delete = AsyncMock()
    return redis


@pytest_asyncio.fixture
async def client(db_session, mock_redis):
    """Test client with dependency overrides."""
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_redis] = lambda: mock_redis

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def test_campus_data():
    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "Test University",
        "domain": "test.edu",
        "slug": "test-u",
    }


@pytest.fixture
def test_user_data():
    return {
        "email": "student@test.edu",
        "password": "SecurePass123",
        "display_name": "Test Student",
        "campus_slug": "test-u",
    }


@pytest_asyncio.fixture
async def seeded_campus(db_session, test_campus_data):
    """Create test campus."""
    from app.models.campus import Campus

    campus = Campus(**test_campus_data)
    db_session.add(campus)
    await db_session.commit()
    return campus


@pytest_asyncio.fixture
async def seeded_categories(db_session):
    """Create test categories."""
    from app.models.listing import Category

    categories = [
        Category(
            id="00000000-0000-0000-0000-000000000010",
            name="Tutoring",
            slug="tutoring",
            listing_type="service",
        ),
        Category(
            id="00000000-0000-0000-0000-000000000011",
            name="Electronics",
            slug="electronics",
            listing_type="item",
        ),
    ]
    db_session.add_all(categories)
    await db_session.commit()
    return categories


@pytest_asyncio.fixture
async def authenticated_user(client, db_session, seeded_campus, test_user_data):
    """Register and login a user, return (user, headers)."""
    from app.models.user import User

    # Register
    response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert response.status_code == 201

    # Manually verify email
    user = await db_session.scalar(
        select(User).where(User.email == test_user_data["email"])
    )
    user.email_verified = True
    await db_session.commit()

    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    return user, {"Authorization": f"Bearer {token}"}
