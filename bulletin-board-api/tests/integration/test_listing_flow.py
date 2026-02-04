import pytest


@pytest.mark.asyncio
async def test_create_and_browse_listing(
    client,
    authenticated_user,
    seeded_categories,
):
    """Test full listing flow: create -> browse -> view."""
    user, headers = authenticated_user

    listing_data = {
        "type": "service",
        "category_id": "00000000-0000-0000-0000-000000000010",
        "title": "Python Programming Tutoring",
        "description": "Learn Python from scratch. Covering basics to advanced OOP concepts.",
        "price_hint": "$30/hour",
        "location_type": "on_campus",
        "contact_preference": "in_app",
    }

    response = await client.post(
        "/api/v1/listings",
        json=listing_data,
        headers=headers,
    )
    assert response.status_code == 201
    created = response.json()
    assert created["title"] == "Python Programming Tutoring"
    assert created["status"] == "active"
    listing_id = created["id"]

    # Browse listings
    response = await client.get(
        "/api/v1/listings",
        params={"type": "service", "q": "python"},
        headers=headers,
    )
    assert response.status_code == 200
    results = response.json()
    assert results["pagination"]["total_items"] >= 1
    assert any(item["id"] == listing_id for item in results["items"])

    # View single listing
    response = await client.get(
        f"/api/v1/listings/{listing_id}",
        headers=headers,
    )
    assert response.status_code == 200
    detail = response.json()
    assert detail["id"] == listing_id
    assert detail["view_count"] >= 0


@pytest.mark.asyncio
async def test_listing_moderation_blocked_keyword(
    client,
    authenticated_user,
    seeded_categories,
    db_session,
):
    """Test that banned keywords block listing creation."""
    user, headers = authenticated_user

    from app.models.admin import BannedKeyword

    keyword = BannedKeyword(
        keyword="scam",
        match_type="contains",
        action="block",
    )
    db_session.add(keyword)
    await db_session.commit()

    response = await client.post(
        "/api/v1/listings",
        json={
            "type": "service",
            "category_id": "00000000-0000-0000-0000-000000000010",
            "title": "Totally not a scam tutoring",
            "description": "This is legitimate tutoring services for students.",
            "contact_preference": "in_app",
        },
        headers=headers,
    )
    assert response.status_code == 400
    assert "prohibited" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_favorite_and_unfavorite(
    client,
    authenticated_user,
    seeded_categories,
):
    """Test favoriting a listing."""
    user, headers = authenticated_user

    # Create a listing first
    response = await client.post(
        "/api/v1/listings",
        json={
            "type": "service",
            "category_id": "00000000-0000-0000-0000-000000000010",
            "title": "Math Tutoring Sessions Available",
            "description": "Calculus, Linear Algebra, and more. All levels welcome.",
            "contact_preference": "in_app",
        },
        headers=headers,
    )
    assert response.status_code == 201
    listing_id = response.json()["id"]

    # Favorite it
    response = await client.post(
        f"/api/v1/favorites/{listing_id}",
        headers=headers,
    )
    assert response.status_code == 201

    # List favorites
    response = await client.get("/api/v1/favorites", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["items"]) >= 1

    # Unfavorite
    response = await client.delete(
        f"/api/v1/favorites/{listing_id}",
        headers=headers,
    )
    assert response.status_code == 204
