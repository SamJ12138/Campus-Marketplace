from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_analytics,
    ads,
    applications,
    auth,
    blocks,
    campus_onboarding,
    campuses,
    categories,
    chatbot,
    favorites,
    feedback,
    listing_assist,
    listings,
    messages,
    reports,
    search,
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
api_router.include_router(feedback.router)
api_router.include_router(applications.router)
api_router.include_router(chatbot.router)
api_router.include_router(search.router)
api_router.include_router(listing_assist.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(campus_onboarding.router)
