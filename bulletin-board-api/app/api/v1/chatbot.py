from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.config import get_settings
from app.services.ai_service import AIService
from app.services.chatbot_service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


# ── Schemas ──


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: list[ChatMessage] | None = None


class ChatSourceResponse(BaseModel):
    title: str
    url: str


class ChatResponse(BaseModel):
    reply: str
    confidence: float
    sources: list[ChatSourceResponse]
    escalation: bool


# ── Endpoint ──


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatRequest):
    """Handle a support chatbot message.

    This endpoint is public (no auth required) so unauthenticated visitors
    can get help. Rate limiting is handled client-side; the backend focuses
    on delivering high-quality answers.
    """
    settings = get_settings()
    ai_service = AIService(settings)
    chatbot = ChatbotService(ai_service)

    history = None
    if data.conversation_history:
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in data.conversation_history
        ]

    result = await chatbot.answer(
        message=data.message,
        conversation_history=history,
    )

    sources = [
        ChatSourceResponse(title=s["title"], url=s["url"])
        for s in result.sources
    ]

    return ChatResponse(
        reply=result.reply,
        confidence=result.confidence,
        sources=sources,
        escalation=result.escalation,
    )
