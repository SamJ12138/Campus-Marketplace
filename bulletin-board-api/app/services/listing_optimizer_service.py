"""AI-powered listing quality and optimization service.

Provides AI-assisted listing creation features:
- Description generation from keywords/context
- Title suggestions from descriptions
- Price suggestions based on similar listings
- Category auto-detection
- Listing completeness scoring
"""

import json
import logging
import re

from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

# Weights for completeness scoring (field → max points)
COMPLETENESS_WEIGHTS: dict[str, int] = {
    "title": 15,
    "description": 25,
    "price_hint": 15,
    "category_id": 10,
    "photos": 20,
    "location_type": 5,
    "location_hint": 5,
    "availability": 5,
}

# Minimum description length for a "good" description
MIN_GOOD_DESCRIPTION_LENGTH = 80

# Categories available on the platform (slug → display name)
PLATFORM_CATEGORIES: dict[str, dict[str, str]] = {
    "item": {
        "textbooks": "Textbooks",
        "electronics": "Electronics",
        "furniture": "Furniture",
        "clothing": "Clothing",
        "supplies": "School Supplies",
        "tickets": "Tickets & Events",
        "free-stuff": "Free Stuff",
        "other-items": "Other Items",
    },
    "service": {
        "tutoring": "Tutoring",
        "rides": "Rides & Transportation",
        "moving-help": "Moving Help",
        "tech-help": "Tech Help",
        "creative": "Creative Services",
        "fitness": "Fitness & Wellness",
        "other-services": "Other Services",
    },
}


def _parse_json_response(text: str) -> dict | None:
    """Parse a JSON response, handling optional markdown code fences."""
    if not text or not text.strip():
        return None

    cleaned = text.strip()

    # Strip markdown code fences
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
        return None
    except (json.JSONDecodeError, TypeError):
        return None


class ListingOptimizerService:
    """AI-assisted listing creation and optimization."""

    def __init__(self, ai_service: AIService):
        self.ai = ai_service

    @property
    def enabled(self) -> bool:
        return self.ai.enabled

    async def suggest_description(
        self,
        *,
        title: str,
        listing_type: str = "item",
        keywords: list[str] | None = None,
        category: str | None = None,
    ) -> dict:
        """Generate a listing description from title/keywords.

        Returns:
            dict with keys: description, tips (list of improvement tips)
        """
        if not self.ai.enabled:
            return self._fallback_description(title, listing_type, keywords)

        keyword_str = ", ".join(keywords) if keywords else "none provided"
        category_str = category or "not specified"

        prompt = (
            f"Generate a compelling marketplace listing description.\n\n"
            f"Title: {title}\n"
            f"Type: {listing_type}\n"
            f"Category: {category_str}\n"
            f"Keywords: {keyword_str}\n\n"
            f"Return JSON with:\n"
            f'- "description": a 2-4 sentence description that is specific, '
            f"honest, and highlights key details. Include condition for items.\n"
            f'- "tips": list of 2-3 short tips to improve the listing further.'
        )

        system = (
            "You are a helpful assistant for a college campus marketplace called GimmeDat. "
            "Write natural, student-friendly descriptions. Be specific and honest — "
            "avoid marketing fluff. The marketplace is messaging-only (no payments)."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt,
                system=system,
                max_tokens=512,
            )
            parsed = _parse_json_response(response.content)
            if parsed and "description" in parsed:
                return {
                    "description": str(parsed["description"]),
                    "tips": parsed.get("tips", []),
                }
        except Exception:
            logger.warning(
                "[ListingOptimizer] Description generation failed",
                exc_info=True,
            )

        return self._fallback_description(title, listing_type, keywords)

    async def suggest_title(
        self,
        *,
        description: str,
        listing_type: str = "item",
        category: str | None = None,
    ) -> dict:
        """Suggest listing titles from a description.

        Returns:
            dict with keys: titles (list of 3 suggestions), reasoning
        """
        if not self.ai.enabled:
            return self._fallback_title(description)

        category_str = category or "not specified"

        prompt = (
            f"Suggest 3 concise, descriptive titles for this campus marketplace listing.\n\n"
            f"Description: {description[:500]}\n"
            f"Type: {listing_type}\n"
            f"Category: {category_str}\n\n"
            f"Return JSON with:\n"
            f'- "titles": list of 3 title strings (5-80 chars each, specific and searchable)\n'
            f'- "reasoning": one sentence explaining your approach'
        )

        system = (
            "You are a helpful assistant for a college campus marketplace. "
            "Suggest clear, specific titles that help buyers find the listing. "
            "Include brand, size, or condition when relevant. "
            "Titles must be between 5 and 80 characters."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt,
                system=system,
                max_tokens=256,
            )
            parsed = _parse_json_response(response.content)
            if parsed and "titles" in parsed and isinstance(parsed["titles"], list):
                titles = [str(t) for t in parsed["titles"] if t][:3]
                if titles:
                    return {
                        "titles": titles,
                        "reasoning": str(parsed.get("reasoning", "")),
                    }
        except Exception:
            logger.warning(
                "[ListingOptimizer] Title suggestion failed",
                exc_info=True,
            )

        return self._fallback_title(description)

    async def suggest_price(
        self,
        *,
        title: str,
        description: str,
        listing_type: str = "item",
        category: str | None = None,
    ) -> dict:
        """Suggest a price hint for a listing.

        Returns:
            dict with keys: price_hint, reasoning, price_range (low/high)
        """
        if not self.ai.enabled:
            return self._fallback_price(listing_type)

        category_str = category or "not specified"

        prompt = (
            f"Suggest a price for this college campus marketplace listing.\n\n"
            f"Title: {title}\n"
            f"Description: {description[:500]}\n"
            f"Type: {listing_type}\n"
            f"Category: {category_str}\n\n"
            f"Context: This is a student marketplace. Prices should be student-friendly "
            f"(typically lower than retail). For services, suggest hourly or flat rates.\n\n"
            f"Return JSON with:\n"
            f'- "price_hint": a price string like "$25", "$15/hr", "Free", or "$20-30"\n'
            f'- "reasoning": one sentence explaining the suggestion\n'
            f'- "price_range": object with "low" and "high" numeric values (in dollars)'
        )

        system = (
            "You are a pricing assistant for a college campus marketplace. "
            "Suggest fair, student-friendly prices. Consider that most items are used. "
            "For services, suggest reasonable hourly or flat rates for college students."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt,
                system=system,
                max_tokens=256,
            )
            parsed = _parse_json_response(response.content)
            if parsed and "price_hint" in parsed:
                return {
                    "price_hint": str(parsed["price_hint"]),
                    "reasoning": str(parsed.get("reasoning", "")),
                    "price_range": parsed.get("price_range", {}),
                }
        except Exception:
            logger.warning(
                "[ListingOptimizer] Price suggestion failed",
                exc_info=True,
            )

        return self._fallback_price(listing_type)

    async def suggest_category(
        self,
        *,
        title: str,
        description: str,
        listing_type: str = "item",
    ) -> dict:
        """Auto-detect the best category for a listing.

        Returns:
            dict with keys: category_slug, category_name, confidence, reasoning
        """
        type_categories = PLATFORM_CATEGORIES.get(listing_type, {})
        if not type_categories:
            return {
                "category_slug": None,
                "category_name": None,
                "confidence": 0.0,
                "reasoning": "Unknown listing type",
            }

        if not self.ai.enabled:
            return self._fallback_category(title, description, listing_type)

        cat_list = ", ".join(
            f"{slug} ({name})" for slug, name in type_categories.items()
        )

        prompt = (
            f"Classify this campus marketplace listing into the best category.\n\n"
            f"Title: {title}\n"
            f"Description: {description[:500]}\n"
            f"Type: {listing_type}\n\n"
            f"Available categories: {cat_list}\n\n"
            f"Return JSON with:\n"
            f'- "category_slug": the slug of the best matching category\n'
            f'- "category_name": the display name of the category\n'
            f'- "confidence": float 0.0-1.0 indicating confidence\n'
            f'- "reasoning": one sentence explaining why'
        )

        system = (
            "You are a classification assistant for a college campus marketplace. "
            "Select the single best category from the available options. "
            "If none fit well, choose the closest match and indicate lower confidence."
        )

        try:
            response = await self.ai.structured_output(
                prompt=prompt,
                system=system,
                max_tokens=256,
            )
            parsed = _parse_json_response(response.content)
            if parsed and "category_slug" in parsed:
                slug = str(parsed["category_slug"])
                if slug in type_categories:
                    return {
                        "category_slug": slug,
                        "category_name": type_categories[slug],
                        "confidence": float(parsed.get("confidence", 0.8)),
                        "reasoning": str(parsed.get("reasoning", "")),
                    }
        except Exception:
            logger.warning(
                "[ListingOptimizer] Category suggestion failed",
                exc_info=True,
            )

        return self._fallback_category(title, description, listing_type)

    def score_completeness(
        self,
        *,
        title: str | None = None,
        description: str | None = None,
        price_hint: str | None = None,
        category_id: str | None = None,
        photos_count: int = 0,
        location_type: str | None = None,
        location_hint: str | None = None,
        availability: dict | None = None,
    ) -> dict:
        """Score listing completeness from 0-100.

        Returns:
            dict with keys: score, max_score, breakdown (field → points),
                            suggestions (list of improvement tips)
        """
        breakdown: dict[str, int] = {}
        suggestions: list[str] = []

        # Title
        if title and len(title.strip()) >= 5:
            points = COMPLETENESS_WEIGHTS["title"]
            if len(title.strip()) >= 20:
                points = COMPLETENESS_WEIGHTS["title"]
            elif len(title.strip()) >= 10:
                points = int(COMPLETENESS_WEIGHTS["title"] * 0.8)
            else:
                points = int(COMPLETENESS_WEIGHTS["title"] * 0.5)
                suggestions.append("Make your title more descriptive (10+ characters)")
            breakdown["title"] = points
        else:
            breakdown["title"] = 0
            suggestions.append("Add a descriptive title (at least 5 characters)")

        # Description
        if description and len(description.strip()) >= 20:
            desc_len = len(description.strip())
            if desc_len >= MIN_GOOD_DESCRIPTION_LENGTH:
                breakdown["description"] = COMPLETENESS_WEIGHTS["description"]
            elif desc_len >= 50:
                breakdown["description"] = int(
                    COMPLETENESS_WEIGHTS["description"] * 0.7
                )
                suggestions.append(
                    "Expand your description to 80+ characters for better results"
                )
            else:
                breakdown["description"] = int(
                    COMPLETENESS_WEIGHTS["description"] * 0.4
                )
                suggestions.append(
                    "Add more detail to your description (50+ characters recommended)"
                )
        else:
            breakdown["description"] = 0
            suggestions.append("Add a description (at least 20 characters)")

        # Price hint
        if price_hint and price_hint.strip():
            breakdown["price_hint"] = COMPLETENESS_WEIGHTS["price_hint"]
        else:
            breakdown["price_hint"] = 0
            suggestions.append("Add a price or price range to attract more interest")

        # Category
        if category_id:
            breakdown["category_id"] = COMPLETENESS_WEIGHTS["category_id"]
        else:
            breakdown["category_id"] = 0
            suggestions.append("Select a category to help buyers find your listing")

        # Photos
        if photos_count >= 3:
            breakdown["photos"] = COMPLETENESS_WEIGHTS["photos"]
        elif photos_count >= 1:
            breakdown["photos"] = int(
                COMPLETENESS_WEIGHTS["photos"] * (photos_count / 3)
            )
            suggestions.append(
                f"Add {3 - photos_count} more photo(s) — listings with 3+ photos get more views"
            )
        else:
            breakdown["photos"] = 0
            suggestions.append(
                "Add photos — listings with photos get significantly more views"
            )

        # Location type
        if location_type:
            breakdown["location_type"] = COMPLETENESS_WEIGHTS["location_type"]
        else:
            breakdown["location_type"] = 0

        # Location hint
        if location_hint and location_hint.strip():
            breakdown["location_hint"] = COMPLETENESS_WEIGHTS["location_hint"]
        else:
            breakdown["location_hint"] = 0
            suggestions.append("Add a location hint (e.g., 'Near Student Union')")

        # Availability
        if availability:
            breakdown["availability"] = COMPLETENESS_WEIGHTS["availability"]
        else:
            breakdown["availability"] = 0

        score = sum(breakdown.values())
        max_score = sum(COMPLETENESS_WEIGHTS.values())

        return {
            "score": score,
            "max_score": max_score,
            "percentage": round(score / max_score * 100) if max_score > 0 else 0,
            "breakdown": breakdown,
            "suggestions": suggestions,
        }

    # ------------------------------------------------------------------
    # Fallbacks (when AI is disabled)
    # ------------------------------------------------------------------

    @staticmethod
    def _fallback_description(
        title: str,
        listing_type: str,
        keywords: list[str] | None,
    ) -> dict:
        """Generate a basic description template when AI is unavailable."""
        keyword_str = ", ".join(keywords) if keywords else ""
        if listing_type == "service":
            desc = (
                f"Offering {title.lower()}. "
                f"{('Related: ' + keyword_str + '. ') if keyword_str else ''}"
                f"Message me for details about availability and pricing."
            )
        else:
            desc = (
                f"{title}. "
                f"{('Details: ' + keyword_str + '. ') if keyword_str else ''}"
                f"Message me if interested or for more details."
            )
        tips = [
            "Add specific details about condition and brand",
            "Include photos to attract more interest",
            "Mention your availability for pickup/meetup",
        ]
        return {"description": desc, "tips": tips}

    @staticmethod
    def _fallback_title(description: str) -> dict:
        """Generate simple title suggestions from first words of description."""
        words = description.strip().split()
        if len(words) >= 4:
            title = " ".join(words[:6])
        elif words:
            title = " ".join(words)
        else:
            title = "Listing"

        # Truncate to 80 chars
        if len(title) > 80:
            title = title[:77] + "..."

        return {
            "titles": [title],
            "reasoning": "Generated from the first words of your description",
        }

    @staticmethod
    def _fallback_price(listing_type: str) -> dict:
        """Return a generic price suggestion when AI is unavailable."""
        if listing_type == "service":
            return {
                "price_hint": "$15/hr",
                "reasoning": "Average student service rate",
                "price_range": {"low": 10, "high": 25},
            }
        return {
            "price_hint": "$20",
            "reasoning": "Common student marketplace price point",
            "price_range": {"low": 5, "high": 50},
        }

    @staticmethod
    def _fallback_category(
        title: str,
        description: str,
        listing_type: str,
    ) -> dict:
        """Simple keyword-based category detection as fallback."""
        text = f"{title} {description}".lower()
        type_categories = PLATFORM_CATEGORIES.get(listing_type, {})

        keyword_map: dict[str, list[str]] = {
            # Items
            "textbooks": ["textbook", "book", "isbn", "edition", "chapter"],
            "electronics": ["laptop", "phone", "computer", "tablet", "charger",
                           "headphone", "speaker", "monitor", "keyboard", "mouse"],
            "furniture": ["desk", "chair", "table", "shelf", "lamp", "bed",
                         "couch", "sofa", "dresser", "mattress"],
            "clothing": ["shirt", "pants", "shoes", "jacket", "dress",
                        "hoodie", "sneakers", "jeans", "coat"],
            "supplies": ["notebook", "pen", "pencil", "calculator", "backpack",
                        "binder", "folder", "planner"],
            "tickets": ["ticket", "concert", "game", "event", "show", "pass"],
            "free-stuff": ["free", "giving away", "giveaway"],
            # Services
            "tutoring": ["tutor", "tutoring", "homework", "study", "math",
                        "writing", "essay", "test prep", "exam"],
            "rides": ["ride", "carpool", "drive", "airport", "trip"],
            "moving-help": ["moving", "move", "haul", "carry", "lift"],
            "tech-help": ["computer help", "tech support", "fix", "repair",
                         "setup", "install", "website", "coding"],
            "creative": ["photo", "video", "design", "graphic", "art",
                        "music", "edit", "logo"],
            "fitness": ["fitness", "workout", "gym", "yoga", "training",
                       "personal trainer", "exercise"],
        }

        best_slug = None
        best_count = 0

        for slug, keywords in keyword_map.items():
            if slug not in type_categories:
                continue
            count = sum(1 for kw in keywords if kw in text)
            if count > best_count:
                best_count = count
                best_slug = slug

        if best_slug and best_count > 0:
            return {
                "category_slug": best_slug,
                "category_name": type_categories[best_slug],
                "confidence": min(0.3 + best_count * 0.15, 0.8),
                "reasoning": "Matched based on keywords in title/description",
            }

        # Default to "other"
        other_slug = f"other-{listing_type}s"
        return {
            "category_slug": other_slug if other_slug in type_categories else None,
            "category_name": type_categories.get(other_slug),
            "confidence": 0.2,
            "reasoning": "No strong keyword match found, defaulting to Other",
        }
