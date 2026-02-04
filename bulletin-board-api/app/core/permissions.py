from uuid import UUID

from app.models.user import User, UserRole


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


def is_moderator(user: User) -> bool:
    return user.role in (UserRole.MODERATOR, UserRole.ADMIN)


def is_owner(user: User, resource_user_id: UUID) -> bool:
    return user.id == resource_user_id


def can_modify_listing(user: User, listing_user_id: UUID) -> bool:
    return is_owner(user, listing_user_id) or is_moderator(user)


def can_modify_user(user: User, target_user_id: UUID) -> bool:
    return is_owner(user, target_user_id) or is_admin(user)
