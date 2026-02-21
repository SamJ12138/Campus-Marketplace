"""Embedding service for semantic search using pgvector.

Generates fixed-dimension vector embeddings from listing text using a
hash-based vectorizer. When the AI service is available, Claude enriches
the text with semantic features before vectorization, producing higher
quality embeddings. Falls back to direct text vectorization when AI is
disabled.

Vectors are stored in the ``embedding`` column on the ``listings`` table
(pgvector ``Vector(384)``) and queried via cosine distance for semantic
search, recommendations, and similar-listing lookups.
"""

import hashlib
import json
import logging
import re
from uuid import UUID

import numpy as np
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.favorite import Favorite
from app.models.listing import Listing, ListingStatus
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

# Embedding dimension — must match the pgvector column width
EMBEDDING_DIM = 384


class EmbeddingService:
    """Generate, store, and query vector embeddings for listings."""

    def __init__(self, ai_service: AIService, settings: Settings):
        self.ai = ai_service
        self.settings = settings
        self.dim = settings.embedding_dimension

    @property
    def enabled(self) -> bool:
        """Whether AI-enhanced embeddings are available."""
        return self.ai.enabled

    # ------------------------------------------------------------------
    # Text → vector
    # ------------------------------------------------------------------

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text.

        When AI is enabled, Claude extracts semantic features first,
        producing a richer representation. Otherwise falls back to the
        hash vectorizer directly.
        """
        if not text or not text.strip():
            return [0.0] * self.dim

        if self.ai.enabled:
            try:
                enriched = await self._enrich_with_ai(text)
                return self._hash_vectorize(enriched)
            except Exception:
                logger.warning(
                    "[Embedding] AI enrichment failed, falling back to direct vectorization",
                    exc_info=True,
                )

        return self._hash_vectorize(text)

    async def _enrich_with_ai(self, text: str) -> str:
        """Use Claude to extract semantic features from listing text."""
        response = await self.ai.structured_output(
            prompt=(
                "Extract semantic features from this marketplace listing text. "
                "Return a JSON object with keys: category, keywords (list of 5-10), "
                "condition, intent (buy/sell/service), and summary (1 sentence).\n\n"
                f"Text: {text[:1000]}"
            ),
            system=(
                "You are a feature extractor for a campus marketplace. "
                "Return only valid JSON."
            ),
            max_tokens=256,
        )

        try:
            features = json.loads(response.content)
            parts = [
                text,
                features.get("summary", ""),
                " ".join(features.get("keywords", [])),
                features.get("category", ""),
                features.get("condition", ""),
                features.get("intent", ""),
            ]
            return " ".join(p for p in parts if p)
        except (json.JSONDecodeError, TypeError):
            return text

    def _hash_vectorize(self, text: str) -> list[float]:
        """Convert text to a fixed-dimension vector via feature hashing.

        Tokenizes text into unigrams and bigrams, hashes each to a bucket
        in a fixed-dimension vector, applies term-frequency weighting, and
        L2-normalizes the result.
        """
        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * self.dim

        vec = np.zeros(self.dim, dtype=np.float64)

        # Unigrams
        for token in tokens:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            bucket = h % self.dim
            sign = 1.0 if (h // self.dim) % 2 == 0 else -1.0
            vec[bucket] += sign

        # Bigrams for local context
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i + 1]}"
            h = int(hashlib.md5(bigram.encode("utf-8")).hexdigest(), 16)
            bucket = h % self.dim
            sign = 1.0 if (h // self.dim) % 2 == 0 else -1.0
            vec[bucket] += sign * 0.5

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec.tolist()

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        """Lowercase, strip non-alphanumeric, remove stop words."""
        words = re.findall(r"[a-z0-9]+", text.lower())
        stop_words = {
            "a", "an", "the", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "shall",
            "can", "to", "of", "in", "for", "on", "with", "at", "by",
            "from", "as", "into", "through", "during", "before", "after",
            "above", "below", "between", "out", "off", "over", "under",
            "again", "further", "then", "once", "here", "there", "when",
            "where", "why", "how", "all", "each", "every", "both", "few",
            "more", "most", "other", "some", "such", "no", "nor", "not",
            "only", "own", "same", "so", "than", "too", "very", "just",
            "because", "but", "and", "or", "if", "while", "about", "up",
            "it", "its", "this", "that", "i", "me", "my", "we", "our",
            "you", "your", "he", "him", "his", "she", "her", "they",
            "them", "their", "what", "which", "who", "whom",
        }
        return [w for w in words if w not in stop_words and len(w) > 1]

    # ------------------------------------------------------------------
    # Cosine similarity helper
    # ------------------------------------------------------------------

    @staticmethod
    def cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        va = np.array(a, dtype=np.float64)
        vb = np.array(b, dtype=np.float64)
        dot = float(np.dot(va, vb))
        norm_a = float(np.linalg.norm(va))
        norm_b = float(np.linalg.norm(vb))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    # ------------------------------------------------------------------
    # Database operations
    # ------------------------------------------------------------------

    async def store_embedding(
        self,
        db: AsyncSession,
        listing_id: UUID,
        embedding: list[float],
    ) -> None:
        """Store an embedding vector for a listing."""
        await db.execute(
            update(Listing)
            .where(Listing.id == listing_id)
            .values(embedding=embedding)
        )
        await db.commit()

    async def generate_and_store(
        self,
        db: AsyncSession,
        listing_id: UUID,
        text: str,
    ) -> list[float]:
        """Generate an embedding and store it for a listing."""
        embedding = await self.generate_embedding(text)
        await self.store_embedding(db, listing_id, embedding)
        return embedding

    async def semantic_search(
        self,
        db: AsyncSession,
        query: str,
        campus_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[tuple[Listing, float]]:
        """Search listings by semantic similarity to a query string.

        Returns a list of (Listing, similarity_score) tuples ordered by
        descending similarity.
        """
        query_embedding = await self.generate_embedding(query)
        return await self._search_by_vector(
            db, query_embedding, campus_id=campus_id, limit=limit, offset=offset
        )

    async def find_similar(
        self,
        db: AsyncSession,
        listing_id: UUID,
        limit: int = 10,
    ) -> list[tuple[Listing, float]]:
        """Find listings similar to the given listing."""
        listing = await db.get(Listing, listing_id)
        if not listing or listing.embedding is None:
            return []

        embedding = (
            listing.embedding
            if isinstance(listing.embedding, list)
            else list(listing.embedding)
        )

        return await self._search_by_vector(
            db,
            embedding,
            campus_id=listing.campus_id,
            limit=limit + 1,  # +1 to exclude self
            exclude_ids=[listing_id],
        )

    async def get_recommendations(
        self,
        db: AsyncSession,
        user_id: UUID,
        limit: int = 20,
    ) -> list[tuple[Listing, float]]:
        """Recommend listings based on user's favorited listings.

        Computes the centroid of the user's favorited listing embeddings
        and finds the closest non-favorited active listings.
        """
        # Get user's favorited listing embeddings
        fav_result = await db.execute(
            select(Listing.embedding)
            .join(Favorite, Favorite.listing_id == Listing.id)
            .where(
                Favorite.user_id == user_id,
                Listing.embedding.isnot(None),
                Listing.status == ListingStatus.ACTIVE,
            )
        )
        fav_embeddings = [row[0] for row in fav_result.all() if row[0] is not None]

        if not fav_embeddings:
            return []

        # Compute centroid
        vectors = np.array(
            [list(e) if not isinstance(e, list) else e for e in fav_embeddings],
            dtype=np.float64,
        )
        centroid = vectors.mean(axis=0)
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid = centroid / norm
        centroid_list = centroid.tolist()

        # Get favorited listing IDs to exclude
        fav_ids_result = await db.execute(
            select(Favorite.listing_id).where(Favorite.user_id == user_id)
        )
        fav_ids = [row[0] for row in fav_ids_result.all()]

        return await self._search_by_vector(
            db,
            centroid_list,
            limit=limit,
            exclude_ids=fav_ids,
            exclude_user_id=user_id,
        )

    async def _search_by_vector(
        self,
        db: AsyncSession,
        embedding: list[float],
        campus_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
        exclude_ids: list[UUID] | None = None,
        exclude_user_id: UUID | None = None,
    ) -> list[tuple[Listing, float]]:
        """Internal: find listings closest to the given embedding vector.

        Uses pgvector's cosine distance operator (<=>). Falls back to
        in-memory cosine similarity when pgvector operators aren't available.
        """
        from sqlalchemy.orm import selectinload

        base = (
            select(Listing)
            .options(
                selectinload(Listing.user),
                selectinload(Listing.category),
                selectinload(Listing.photos),
            )
            .where(
                Listing.status == ListingStatus.ACTIVE,
                Listing.embedding.isnot(None),
            )
        )

        if campus_id:
            base = base.where(Listing.campus_id == campus_id)
        if exclude_ids:
            base = base.where(Listing.id.notin_(exclude_ids))
        if exclude_user_id:
            base = base.where(Listing.user_id != exclude_user_id)

        try:
            # pgvector cosine distance: lower = more similar
            distance = Listing.embedding.cosine_distance(embedding)
            query = base.order_by(distance).offset(offset).limit(limit)
            result = await db.execute(query)
            listings = list(result.scalars().all())

            # Convert distance to similarity: sim = 1 - distance
            results = []
            for listing in listings:
                emb = (
                    listing.embedding
                    if isinstance(listing.embedding, list)
                    else list(listing.embedding)
                )
                sim = self.cosine_similarity(embedding, emb)
                results.append((listing, round(sim, 4)))
            return results

        except Exception:
            # Fallback: load all and compute similarity in Python
            logger.warning(
                "[Embedding] pgvector distance query failed, using in-memory fallback",
                exc_info=True,
            )
            result = await db.execute(base)
            listings = list(result.scalars().all())

            scored: list[tuple[Listing, float]] = []
            for listing in listings:
                emb = (
                    listing.embedding
                    if isinstance(listing.embedding, list)
                    else list(listing.embedding)
                )
                sim = self.cosine_similarity(embedding, emb)
                scored.append((listing, round(sim, 4)))

            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[offset : offset + limit]

    # ------------------------------------------------------------------
    # Batch operations
    # ------------------------------------------------------------------

    async def batch_generate_embeddings(
        self,
        db: AsyncSession,
        batch_size: int = 50,
    ) -> int:
        """Generate embeddings for all active listings that don't have one.

        Returns the number of listings processed.
        """
        result = await db.execute(
            select(Listing)
            .where(
                Listing.status == ListingStatus.ACTIVE,
                Listing.embedding.is_(None),
            )
            .limit(batch_size)
        )
        listings = list(result.scalars().all())

        count = 0
        for listing in listings:
            text = f"{listing.title} {listing.description}"
            if listing.price_hint:
                text += f" {listing.price_hint}"
            embedding = await self.generate_embedding(text)
            await db.execute(
                update(Listing)
                .where(Listing.id == listing.id)
                .values(embedding=embedding)
            )
            count += 1

        if count > 0:
            await db.commit()
            logger.info("[Embedding] Generated embeddings for %d listings", count)

        return count
