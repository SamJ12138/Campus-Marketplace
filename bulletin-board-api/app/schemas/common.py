from pydantic import BaseModel


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


class MessageResponse(BaseModel):
    message: str
