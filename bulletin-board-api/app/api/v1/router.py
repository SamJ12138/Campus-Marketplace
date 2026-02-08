from fastapi import APIRouter

from app.api.v1 import (
    admin,
    ads,
    auth,
    blocks,
    campuses,
    categories,
    favorites,
    listings,
    messages,
    reports,
    uploads,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(campuses.router)
api_router.include_router(users.router)
api_router.include_router(listings.router)
api_router.include_router(favorites.router)
api_router.include_router(messages.router)
api_router.include_router(reports.router)
api_router.include_router(blocks.router)
api_router.include_router(uploads.router)
api_router.include_router(admin.router)
api_router.include_router(ads.router)
api_router.include_router(categories.router)
