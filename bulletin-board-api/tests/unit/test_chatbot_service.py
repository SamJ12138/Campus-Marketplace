import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.ai_service import AIResponse, AIService
from app.services.chatbot_service import (
    ESCALATION_THRESHOLD,
    KNOWLEDGE_BASE,
    ChatbotResponse,
    ChatbotService,
    DocCategory,
    KBArticle,
)

# ── Fixtures ──


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.anthropic_api_key = "test-api-key"
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    return settings


@pytest.fixture
def mock_settings_disabled():
    settings = MagicMock()
    settings.anthropic_api_key = None
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    return settings


@pytest.fixture
def ai_service(mock_settings):
    return AIService(mock_settings)


@pytest.fixture
def ai_service_disabled(mock_settings_disabled):
    return AIService(mock_settings_disabled)


@pytest.fixture
def chatbot(ai_service):
    return ChatbotService(ai_service)


@pytest.fixture
def chatbot_disabled(ai_service_disabled):
    return ChatbotService(ai_service_disabled)


def _make_ai_response(reply_dict: dict) -> AIResponse:
    """Create an AIResponse wrapping a JSON chatbot reply."""
    return AIResponse(
        content=json.dumps(reply_dict),
        model="claude-sonnet-4-20250514",
        usage={"input_tokens": 100, "output_tokens": 50},
        stop_reason="end_turn",
    )


# ── Knowledge Base Tests ──


class TestKnowledgeBase:
    def test_knowledge_base_not_empty(self):
        assert len(KNOWLEDGE_BASE) > 0

    def test_all_articles_have_required_fields(self):
        for article in KNOWLEDGE_BASE:
            assert article.id
            assert article.title
            assert isinstance(article.category, DocCategory)
            assert len(article.keywords) > 0
            assert article.content
            assert article.url

    def test_article_ids_are_unique(self):
        ids = [a.id for a in KNOWLEDGE_BASE]
        assert len(ids) == len(set(ids))

    def test_all_categories_represented(self):
        categories = {a.category for a in KNOWLEDGE_BASE}
        assert DocCategory.GENERAL in categories
        assert DocCategory.SAFETY in categories
        assert DocCategory.POLICY in categories
        assert DocCategory.ACCOUNT in categories
        assert DocCategory.FEATURES in categories


# ── Retrieval Tests ──


class TestRetrieval:
    def test_retrieve_how_it_works(self, chatbot):
        results = chatbot._retrieve("how does this work")
        assert len(results) > 0
        titles = [r.title for r in results]
        assert any("How It Works" in t for t in titles)

    def test_retrieve_safety(self, chatbot):
        results = chatbot._retrieve("is the platform safe")
        assert len(results) > 0
        categories = [r.category for r in results]
        assert DocCategory.SAFETY in categories

    def test_retrieve_prohibited_items(self, chatbot):
        results = chatbot._retrieve("what items are banned or prohibited")
        assert len(results) > 0
        assert any("Prohibited" in r.title for r in results)

    def test_retrieve_returns_top_k(self, chatbot):
        results = chatbot._retrieve("how do I use the platform", top_k=2)
        assert len(results) <= 2

    def test_retrieve_no_results_for_gibberish(self, chatbot):
        results = chatbot._retrieve("xyzzy flurp garblux")
        assert len(results) == 0

    def test_retrieve_account_issues(self, chatbot):
        results = chatbot._retrieve("I can't log in to my account")
        assert len(results) > 0
        assert any("Account" in r.title for r in results)

    def test_retrieve_pricing(self, chatbot):
        results = chatbot._retrieve("is it free")
        assert len(results) > 0
        assert any("Fee" in r.title or "free" in r.content.lower() for r in results)


# ── Query Expansion Tests ──


class TestQueryExpansion:
    def test_expand_with_synonym(self, chatbot):
        expanded = chatbot._expand_query("how do i sell something")
        assert "list" in expanded or "post" in expanded or "offer" in expanded

    def test_expand_no_synonyms(self, chatbot):
        expanded = chatbot._expand_query("random question")
        assert len(expanded) >= 1  # At least the original query


# ── Context Building Tests ──


class TestContextBuilding:
    def test_build_context_with_articles(self, chatbot):
        articles = [
            KBArticle(
                id="test",
                title="Test Article",
                category=DocCategory.GENERAL,
                keywords=["test"],
                content="This is a test.",
                url="/test",
            )
        ]
        context = chatbot._build_context(articles)
        assert "Test Article" in context
        assert "This is a test." in context

    def test_build_context_empty(self, chatbot):
        context = chatbot._build_context([])
        assert "No relevant articles" in context

    def test_build_context_multiple_articles(self, chatbot):
        articles = KNOWLEDGE_BASE[:3]
        context = chatbot._build_context(articles)
        for article in articles:
            assert article.title in context


# ── Response Parsing Tests ──


class TestResponseParsing:
    def test_parse_valid_json(self, chatbot):
        raw = json.dumps({
            "reply": "Here is your answer.",
            "confidence": 0.9,
            "escalation": False,
        })
        result = chatbot._parse_response(raw)
        assert result.reply == "Here is your answer."
        assert result.confidence == 0.9
        assert result.escalation is False

    def test_parse_json_with_code_fences(self, chatbot):
        raw = '```json\n{"reply": "Answer", "confidence": 0.8, "escalation": false}\n```'
        result = chatbot._parse_response(raw)
        assert result.reply == "Answer"
        assert result.confidence == 0.8

    def test_parse_invalid_json_falls_back(self, chatbot):
        raw = "This is not JSON, just a plain text response."
        result = chatbot._parse_response(raw)
        assert result.reply == raw
        assert result.confidence == 0.4
        assert result.escalation is True

    def test_parse_partial_json(self, chatbot):
        raw = json.dumps({"reply": "Answer here"})
        result = chatbot._parse_response(raw)
        assert result.reply == "Answer here"
        assert result.confidence == 0.5  # default

    def test_parse_high_confidence(self, chatbot):
        raw = json.dumps({
            "reply": "Confident answer",
            "confidence": 0.95,
            "escalation": False,
        })
        result = chatbot._parse_response(raw)
        assert result.escalation is False

    def test_parse_low_confidence_triggers_escalation(self, chatbot):
        raw = json.dumps({
            "reply": "Not sure about this",
            "confidence": 0.3,
            "escalation": True,
        })
        result = chatbot._parse_response(raw)
        assert result.escalation is True


# ── Fallback Response Tests ──


class TestFallbackResponse:
    def test_fallback_no_articles(self, chatbot):
        result = chatbot._fallback_response("test", [], [])
        assert "couldn't find" in result.reply.lower()
        assert result.escalation is True
        assert len(result.sources) > 0

    def test_fallback_with_articles(self, chatbot):
        articles = KNOWLEDGE_BASE[:2]
        sources = [{"title": a.title, "url": a.url} for a in articles]
        result = chatbot._fallback_response("test", articles, sources)
        assert articles[0].content in result.reply
        assert len(result.sources) == 2

    def test_fallback_single_article(self, chatbot):
        articles = [KNOWLEDGE_BASE[0]]
        sources = [{"title": articles[0].title, "url": articles[0].url}]
        result = chatbot._fallback_response("test", articles, sources)
        assert articles[0].content in result.reply
        assert "Related:" not in result.reply


# ── Answer Method Tests (AI Enabled) ──


class TestAnswerAIEnabled:
    @pytest.mark.asyncio
    async def test_empty_message(self, chatbot):
        result = await chatbot.answer("")
        assert "please type" in result.reply.lower()
        assert result.confidence == 1.0

    @pytest.mark.asyncio
    async def test_whitespace_message(self, chatbot):
        result = await chatbot.answer("   ")
        assert "please type" in result.reply.lower()

    @pytest.mark.asyncio
    async def test_successful_ai_response(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "GimmeDat is a campus marketplace!",
                "confidence": 0.95,
                "escalation": False,
            })
        )
        result = await chatbot.answer("What is GimmeDat?")
        assert "campus marketplace" in result.reply
        assert result.confidence == 0.95
        assert result.escalation is False
        assert len(result.sources) > 0

    @pytest.mark.asyncio
    async def test_low_confidence_triggers_escalation(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "I'm not sure about that.",
                "confidence": 0.3,
                "escalation": False,
            })
        )
        result = await chatbot.answer("Some obscure question")
        assert result.escalation is True  # Forced by threshold

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            side_effect=Exception("API error")
        )
        result = await chatbot.answer("How does it work?")
        # Should fall back to keyword-based response
        assert result.reply  # Got some response
        assert isinstance(result, ChatbotResponse)

    @pytest.mark.asyncio
    async def test_message_truncated_to_1000_chars(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "OK",
                "confidence": 0.9,
                "escalation": False,
            })
        )
        long_message = "a" * 2000
        result = await chatbot.answer(long_message)
        # Should not raise; message is truncated internally
        assert result.reply == "OK"

    @pytest.mark.asyncio
    async def test_sources_populated_from_retrieval(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "Here's the answer.",
                "confidence": 0.85,
                "escalation": False,
            })
        )
        result = await chatbot.answer("How do I post an offer?")
        assert len(result.sources) > 0
        assert all("title" in s and "url" in s for s in result.sources)

    @pytest.mark.asyncio
    async def test_conversation_history_used(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "First answer",
                "confidence": 0.9,
                "escalation": False,
            })
        )
        chatbot.ai_service.chat = AsyncMock(
            return_value=_make_ai_response({
                "reply": "Follow-up answer",
                "confidence": 0.85,
                "escalation": False,
            })
        )
        history = [
            {"role": "user", "content": "What is GimmeDat?"},
            {"role": "assistant", "content": "A campus marketplace."},
        ]
        result = await chatbot.answer("Tell me more", conversation_history=history)
        assert result.reply == "Follow-up answer"
        chatbot.ai_service.chat.assert_called_once()


# ── Answer Method Tests (AI Disabled) ──


class TestAnswerAIDisabled:
    @pytest.mark.asyncio
    async def test_disabled_uses_fallback(self, chatbot_disabled):
        result = await chatbot_disabled.answer("How does it work?")
        assert result.reply  # Got some response
        assert isinstance(result, ChatbotResponse)

    @pytest.mark.asyncio
    async def test_disabled_empty_message(self, chatbot_disabled):
        result = await chatbot_disabled.answer("")
        assert "please type" in result.reply.lower()

    @pytest.mark.asyncio
    async def test_disabled_matching_query(self, chatbot_disabled):
        result = await chatbot_disabled.answer("What items are prohibited?")
        assert "prohibited" in result.reply.lower() or "banned" in result.reply.lower()
        assert len(result.sources) > 0

    @pytest.mark.asyncio
    async def test_disabled_no_match_query(self, chatbot_disabled):
        result = await chatbot_disabled.answer("xyzzy flurp zqxkw")
        assert result.escalation is True
        assert "couldn't find" in result.reply.lower()


# ── Service Property Tests ──


class TestServiceProperties:
    def test_enabled_with_key(self, chatbot):
        assert chatbot.enabled is True

    def test_disabled_without_key(self, chatbot_disabled):
        assert chatbot_disabled.enabled is False


# ── Escalation Threshold Tests ──


class TestEscalationThreshold:
    def test_threshold_is_reasonable(self):
        assert 0.0 < ESCALATION_THRESHOLD < 1.0

    @pytest.mark.asyncio
    async def test_confidence_at_threshold_no_escalation(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "Here's the answer.",
                "confidence": ESCALATION_THRESHOLD,
                "escalation": False,
            })
        )
        result = await chatbot.answer("How do I use this?")
        assert result.escalation is False

    @pytest.mark.asyncio
    async def test_confidence_below_threshold_escalates(self, chatbot):
        chatbot.ai_service.structured_output = AsyncMock(
            return_value=_make_ai_response({
                "reply": "Not sure.",
                "confidence": ESCALATION_THRESHOLD - 0.1,
                "escalation": False,
            })
        )
        result = await chatbot.answer("Something weird")
        assert result.escalation is True
