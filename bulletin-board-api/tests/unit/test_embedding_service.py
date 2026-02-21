"""Tests for the embedding service — vector generation, storage, and search."""

import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from app.services.ai_service import AIResponse, AIService
from app.services.embedding_service import EMBEDDING_DIM, EmbeddingService

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.anthropic_api_key = "test-api-key"
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    settings.embedding_dimension = 384
    return settings


@pytest.fixture
def mock_settings_no_key():
    settings = MagicMock()
    settings.anthropic_api_key = None
    settings.ai_model = "claude-sonnet-4-20250514"
    settings.ai_max_tokens = 1024
    settings.embedding_dimension = 384
    return settings


@pytest.fixture
def ai_service(mock_settings):
    return AIService(mock_settings)


@pytest.fixture
def ai_service_disabled(mock_settings_no_key):
    return AIService(mock_settings_no_key)


@pytest.fixture
def embedding_service(ai_service, mock_settings):
    return EmbeddingService(ai_service, mock_settings)


@pytest.fixture
def embedding_service_disabled(ai_service_disabled, mock_settings_no_key):
    return EmbeddingService(ai_service_disabled, mock_settings_no_key)


# ---------------------------------------------------------------------------
# Service initialization
# ---------------------------------------------------------------------------


class TestEmbeddingServiceInit:
    def test_creates_with_settings(self, embedding_service, mock_settings):
        assert embedding_service.settings == mock_settings
        assert embedding_service.dim == 384

    def test_enabled_when_api_key_set(self, embedding_service):
        assert embedding_service.enabled is True

    def test_disabled_when_api_key_none(self, embedding_service_disabled):
        assert embedding_service_disabled.enabled is False


# ---------------------------------------------------------------------------
# Tokenization
# ---------------------------------------------------------------------------


class TestTokenize:
    def test_basic_tokenization(self, embedding_service):
        tokens = embedding_service._tokenize("Selling my old textbooks cheap")
        assert "selling" in tokens
        assert "old" in tokens
        assert "textbooks" in tokens
        assert "cheap" in tokens

    def test_stop_words_removed(self, embedding_service):
        tokens = embedding_service._tokenize("I am selling the best laptop in the world")
        # "i" is a stop word and single-char; "the", "in" are stop words
        assert "the" not in tokens
        assert "in" not in tokens
        # "am", "selling", "best", "laptop", "world" are not stop words
        assert "selling" in tokens
        assert "laptop" in tokens
        assert "world" in tokens

    def test_single_char_tokens_removed(self, embedding_service):
        tokens = embedding_service._tokenize("I have a b c laptop")
        assert "laptop" in tokens
        # Single chars 'a', 'b', 'c' should be removed
        for c in ["a", "b", "c"]:
            assert c not in tokens

    def test_case_insensitive(self, embedding_service):
        tokens = embedding_service._tokenize("LAPTOP Computer DESK")
        assert "laptop" in tokens
        assert "computer" in tokens
        assert "desk" in tokens

    def test_non_alphanumeric_stripped(self, embedding_service):
        tokens = embedding_service._tokenize("laptop! @desk #computer $50")
        assert "laptop" in tokens
        assert "desk" in tokens
        assert "computer" in tokens
        assert "50" in tokens

    def test_empty_string(self, embedding_service):
        tokens = embedding_service._tokenize("")
        assert tokens == []

    def test_only_stop_words(self, embedding_service):
        tokens = embedding_service._tokenize("the a an is are")
        assert tokens == []

    def test_numbers_preserved(self, embedding_service):
        tokens = embedding_service._tokenize("iPhone 15 Pro Max 256gb")
        assert "iphone" in tokens
        assert "15" in tokens
        assert "pro" in tokens
        assert "256gb" in tokens


# ---------------------------------------------------------------------------
# Hash vectorization
# ---------------------------------------------------------------------------


class TestHashVectorize:
    def test_output_dimension(self, embedding_service):
        vec = embedding_service._hash_vectorize("Selling textbooks")
        assert len(vec) == EMBEDDING_DIM

    def test_output_is_normalized(self, embedding_service):
        vec = embedding_service._hash_vectorize("Selling textbooks cheap")
        norm = np.linalg.norm(vec)
        assert abs(norm - 1.0) < 1e-6

    def test_empty_text_returns_zeros(self, embedding_service):
        vec = embedding_service._hash_vectorize("")
        assert all(v == 0.0 for v in vec)

    def test_only_stop_words_returns_zeros(self, embedding_service):
        vec = embedding_service._hash_vectorize("the a is")
        assert all(v == 0.0 for v in vec)

    def test_similar_text_similar_vectors(self, embedding_service):
        vec1 = embedding_service._hash_vectorize("Selling laptop MacBook Pro")
        vec2 = embedding_service._hash_vectorize("Selling laptop MacBook Air")
        similarity = EmbeddingService.cosine_similarity(vec1, vec2)
        assert similarity > 0.5  # Should be reasonably similar

    def test_different_text_lower_similarity(self, embedding_service):
        vec1 = embedding_service._hash_vectorize("Selling laptop MacBook Pro")
        vec2 = embedding_service._hash_vectorize("Tutoring math calculus homework")
        similarity = EmbeddingService.cosine_similarity(vec1, vec2)
        # These should be less similar than the laptop-laptop pair
        vec3 = embedding_service._hash_vectorize("Selling laptop Dell XPS")
        sim_laptops = EmbeddingService.cosine_similarity(vec1, vec3)
        assert sim_laptops > similarity

    def test_deterministic_output(self, embedding_service):
        vec1 = embedding_service._hash_vectorize("Selling textbooks")
        vec2 = embedding_service._hash_vectorize("Selling textbooks")
        assert vec1 == vec2

    def test_bigrams_improve_differentiation(self, embedding_service):
        # "new york" and "york new" should produce different vectors due to bigrams
        vec1 = embedding_service._hash_vectorize("new york city guide")
        vec2 = embedding_service._hash_vectorize("york new city guide")
        # They share the same unigrams but different bigrams
        similarity = EmbeddingService.cosine_similarity(vec1, vec2)
        assert similarity < 1.0  # Should not be identical


# ---------------------------------------------------------------------------
# Cosine similarity
# ---------------------------------------------------------------------------


class TestCosineSimilarity:
    def test_identical_vectors(self):
        vec = [1.0, 2.0, 3.0]
        assert abs(EmbeddingService.cosine_similarity(vec, vec) - 1.0) < 1e-6

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0, 0.0]
        b = [0.0, 1.0, 0.0]
        assert abs(EmbeddingService.cosine_similarity(a, b)) < 1e-6

    def test_opposite_vectors(self):
        a = [1.0, 2.0, 3.0]
        b = [-1.0, -2.0, -3.0]
        assert abs(EmbeddingService.cosine_similarity(a, b) - (-1.0)) < 1e-6

    def test_zero_vector(self):
        a = [0.0, 0.0, 0.0]
        b = [1.0, 2.0, 3.0]
        assert EmbeddingService.cosine_similarity(a, b) == 0.0

    def test_both_zero_vectors(self):
        a = [0.0, 0.0]
        b = [0.0, 0.0]
        assert EmbeddingService.cosine_similarity(a, b) == 0.0


# ---------------------------------------------------------------------------
# Generate embedding (async)
# ---------------------------------------------------------------------------


class TestGenerateEmbedding:
    @pytest.mark.asyncio
    async def test_empty_text_returns_zeros(self, embedding_service):
        vec = await embedding_service.generate_embedding("")
        assert len(vec) == EMBEDDING_DIM
        assert all(v == 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_whitespace_only_returns_zeros(self, embedding_service):
        vec = await embedding_service.generate_embedding("   ")
        assert len(vec) == EMBEDDING_DIM
        assert all(v == 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_disabled_ai_uses_direct_vectorization(
        self, embedding_service_disabled
    ):
        vec = await embedding_service_disabled.generate_embedding(
            "Selling textbooks for cheap"
        )
        assert len(vec) == EMBEDDING_DIM
        # Should still produce a non-zero vector
        assert any(v != 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_ai_enrichment_used_when_enabled(self, embedding_service):
        mock_response = AIResponse(
            content=json.dumps({
                "category": "textbooks",
                "keywords": ["textbook", "college", "academic", "study", "book"],
                "condition": "used",
                "intent": "sell",
                "summary": "Used college textbooks for sale",
            }),
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 30},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        vec = await embedding_service.generate_embedding("Selling textbooks")
        assert len(vec) == EMBEDDING_DIM
        assert any(v != 0.0 for v in vec)
        embedding_service.ai.structured_output.assert_called_once()

    @pytest.mark.asyncio
    async def test_ai_failure_falls_back_to_direct(self, embedding_service):
        embedding_service.ai.structured_output = AsyncMock(
            side_effect=Exception("API Error")
        )

        vec = await embedding_service.generate_embedding("Selling textbooks")
        assert len(vec) == EMBEDDING_DIM
        assert any(v != 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_ai_returns_invalid_json_falls_back(self, embedding_service):
        mock_response = AIResponse(
            content="not json at all",
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 10},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        vec = await embedding_service.generate_embedding("Selling textbooks")
        assert len(vec) == EMBEDDING_DIM
        assert any(v != 0.0 for v in vec)


# ---------------------------------------------------------------------------
# AI enrichment
# ---------------------------------------------------------------------------


class TestEnrichWithAI:
    @pytest.mark.asyncio
    async def test_enrichment_appends_features(self, embedding_service):
        features = {
            "category": "electronics",
            "keywords": ["laptop", "computer", "tech"],
            "condition": "new",
            "intent": "sell",
            "summary": "New laptop for sale",
        }
        mock_response = AIResponse(
            content=json.dumps(features),
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 40},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        result = await embedding_service._enrich_with_ai("Selling new laptop")
        assert "Selling new laptop" in result
        assert "New laptop for sale" in result
        assert "laptop computer tech" in result
        assert "electronics" in result
        assert "new" in result
        assert "sell" in result

    @pytest.mark.asyncio
    async def test_enrichment_handles_partial_json(self, embedding_service):
        # Missing some keys should still work
        features = {"category": "books", "keywords": ["book"]}
        mock_response = AIResponse(
            content=json.dumps(features),
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 20},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        result = await embedding_service._enrich_with_ai("Selling books")
        assert "Selling books" in result
        assert "books" in result

    @pytest.mark.asyncio
    async def test_enrichment_invalid_json_returns_original(self, embedding_service):
        mock_response = AIResponse(
            content="I can't parse this",
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 10},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        result = await embedding_service._enrich_with_ai("Selling books")
        assert result == "Selling books"

    @pytest.mark.asyncio
    async def test_enrichment_truncates_long_input(self, embedding_service):
        long_text = "x" * 2000
        mock_response = AIResponse(
            content=json.dumps({"category": "misc", "keywords": []}),
            model="claude-sonnet-4-20250514",
            usage={"input_tokens": 50, "output_tokens": 10},
        )
        embedding_service.ai.structured_output = AsyncMock(return_value=mock_response)

        await embedding_service._enrich_with_ai(long_text)
        call_args = embedding_service.ai.structured_output.call_args
        prompt = call_args.kwargs["prompt"]
        # The text in the prompt should be truncated to 1000 chars
        assert len(prompt) < 2100  # prompt text + instructions


# ---------------------------------------------------------------------------
# Store embedding
# ---------------------------------------------------------------------------


class TestStoreEmbedding:
    @pytest.mark.asyncio
    async def test_store_calls_db_update(self, embedding_service):
        mock_db = AsyncMock()
        listing_id = uuid.uuid4()
        embedding = [0.1] * EMBEDDING_DIM

        await embedding_service.store_embedding(mock_db, listing_id, embedding)
        mock_db.execute.assert_called_once()
        mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Generate and store
# ---------------------------------------------------------------------------


class TestGenerateAndStore:
    @pytest.mark.asyncio
    async def test_generate_and_store(self, embedding_service_disabled):
        mock_db = AsyncMock()
        listing_id = uuid.uuid4()

        result = await embedding_service_disabled.generate_and_store(
            mock_db, listing_id, "Selling textbooks"
        )
        assert len(result) == EMBEDDING_DIM
        assert any(v != 0.0 for v in result)
        mock_db.execute.assert_called_once()
        mock_db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Semantic search (mocked DB)
# ---------------------------------------------------------------------------


class TestSemanticSearch:
    @pytest.mark.asyncio
    async def test_returns_empty_for_no_matches(self, embedding_service_disabled):
        mock_db = AsyncMock()
        # Mock the execute to return empty results
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        results = await embedding_service_disabled.semantic_search(
            mock_db, query="nonexistent item"
        )
        assert results == []


# ---------------------------------------------------------------------------
# Find similar (mocked DB)
# ---------------------------------------------------------------------------


class TestFindSimilar:
    @pytest.mark.asyncio
    async def test_returns_empty_when_listing_has_no_embedding(
        self, embedding_service_disabled
    ):
        mock_db = AsyncMock()
        listing_id = uuid.uuid4()

        mock_listing = MagicMock()
        mock_listing.embedding = None
        mock_db.get.return_value = mock_listing

        results = await embedding_service_disabled.find_similar(mock_db, listing_id)
        assert results == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_listing_not_found(
        self, embedding_service_disabled
    ):
        mock_db = AsyncMock()
        listing_id = uuid.uuid4()
        mock_db.get.return_value = None

        results = await embedding_service_disabled.find_similar(mock_db, listing_id)
        assert results == []


# ---------------------------------------------------------------------------
# Recommendations (mocked DB)
# ---------------------------------------------------------------------------


class TestRecommendations:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_favorites(self, embedding_service_disabled):
        mock_db = AsyncMock()
        user_id = uuid.uuid4()

        # Mock: no favorites with embeddings
        mock_fav_result = MagicMock()
        mock_fav_result.all.return_value = []
        mock_db.execute.return_value = mock_fav_result

        results = await embedding_service_disabled.get_recommendations(
            mock_db, user_id
        )
        assert results == []


# ---------------------------------------------------------------------------
# Batch generate embeddings
# ---------------------------------------------------------------------------


class TestBatchGenerateEmbeddings:
    @pytest.mark.asyncio
    async def test_processes_listings_without_embeddings(
        self, embedding_service_disabled
    ):
        mock_db = AsyncMock()

        # Create mock listings
        listing1 = MagicMock()
        listing1.id = uuid.uuid4()
        listing1.title = "MacBook Pro"
        listing1.description = "Great condition laptop"
        listing1.price_hint = "$500"

        listing2 = MagicMock()
        listing2.id = uuid.uuid4()
        listing2.title = "Calculus Textbook"
        listing2.description = "Barely used textbook"
        listing2.price_hint = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [listing1, listing2]
        mock_db.execute.return_value = mock_result

        count = await embedding_service_disabled.batch_generate_embeddings(
            mock_db, batch_size=50
        )
        assert count == 2
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_returns_zero_when_all_have_embeddings(
        self, embedding_service_disabled
    ):
        mock_db = AsyncMock()

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        count = await embedding_service_disabled.batch_generate_embeddings(mock_db)
        assert count == 0
        mock_db.commit.assert_not_called()


# ---------------------------------------------------------------------------
# Constants and configuration
# ---------------------------------------------------------------------------


class TestConstants:
    def test_embedding_dim_is_384(self):
        assert EMBEDDING_DIM == 384

    def test_settings_dimension_matches_constant(self, embedding_service):
        assert embedding_service.dim == EMBEDDING_DIM


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_unicode_text_vectorization(self, embedding_service):
        vec = embedding_service._hash_vectorize("Vendo libros baratos 日本語テスト")
        assert len(vec) == EMBEDDING_DIM

    def test_very_long_text(self, embedding_service):
        long_text = "laptop " * 10000
        vec = embedding_service._hash_vectorize(long_text)
        assert len(vec) == EMBEDDING_DIM
        norm = np.linalg.norm(vec)
        assert abs(norm - 1.0) < 1e-6

    def test_special_characters_only(self, embedding_service):
        vec = embedding_service._hash_vectorize("!@#$%^&*()")
        assert all(v == 0.0 for v in vec)

    @pytest.mark.asyncio
    async def test_generate_embedding_none_text(self, embedding_service_disabled):
        # Passing empty string should produce zero vector
        vec = await embedding_service_disabled.generate_embedding("")
        assert len(vec) == EMBEDDING_DIM
        assert all(v == 0.0 for v in vec)
