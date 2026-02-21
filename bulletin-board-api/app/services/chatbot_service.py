import logging
from dataclasses import dataclass, field
from enum import Enum

from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


# ─── Knowledge Base ──────────────────────────────────────────────

class DocCategory(str, Enum):
    GENERAL = "general"
    SAFETY = "safety"
    POLICY = "policy"
    ACCOUNT = "account"
    FEATURES = "features"


@dataclass
class KBArticle:
    id: str
    title: str
    category: DocCategory
    keywords: list[str]
    content: str
    url: str


# Platform knowledge base — mirrors the key content from terms, privacy,
# how-it-works, and FAQ pages that the chatbot should know about.
KNOWLEDGE_BASE: list[KBArticle] = [
    KBArticle(
        id="what-is-gimmedat",
        title="What is GimmeDat?",
        category=DocCategory.GENERAL,
        keywords=["what is", "about", "platform", "gimmedat", "marketplace"],
        content=(
            "GimmeDat is a campus marketplace that connects college students "
            "to buy, sell, and trade items and services within their school "
            "community. Each campus is a completely separate, isolated "
            "community — you only see offers from students at your own school. "
            "It's a safe, trusted space built exclusively for verified .edu "
            "email holders."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="how-it-works",
        title="How It Works",
        category=DocCategory.GENERAL,
        keywords=["how", "works", "get started", "start", "steps", "process"],
        content=(
            "Getting started is easy — 4 steps: "
            "1) Create Your Account — sign up with your .edu email to join "
            "your verified campus community. "
            "2) Browse or Post — explore existing offers or create your own "
            "with photos, descriptions, and pricing. "
            "3) Connect — message other students directly through the platform "
            "to discuss details. "
            "4) Complete the Exchange — meet on campus in a safe, public "
            "location to complete your transaction."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="post-offer",
        title="How to Post an Offer",
        category=DocCategory.FEATURES,
        keywords=["post", "create", "sell", "list", "new offer", "how to sell"],
        content=(
            'To post an offer: Click the "New Offer" button in the header. '
            "Choose whether it's an Item (something you're selling) or a "
            "Service (something you're offering to do). Fill in the title, "
            "description, category, price hint, and location. Add photos to "
            "make your offer stand out. Once posted, it will be visible to all "
            "verified students on your campus."
        ),
        url="/listings/new",
    ),
    KBArticle(
        id="messaging",
        title="Messaging Other Users",
        category=DocCategory.FEATURES,
        keywords=[
            "message", "chat", "contact", "communicate", "talk",
            "messaging", "send message", "dm", "inbox",
        ],
        content=(
            "GimmeDat has built-in messaging so you can coordinate with other "
            "users without sharing personal contact info. To start a "
            'conversation, click "Message" on any offer page. All '
            "communication stays within the platform. You'll receive "
            "notifications for new messages."
        ),
        url="/messages",
    ),
    KBArticle(
        id="safety-features",
        title="Safety Features",
        category=DocCategory.SAFETY,
        keywords=[
            "safe", "safety", "secure", "verify", "verified",
            "trust", "protection",
        ],
        content=(
            "GimmeDat has several safety features: "
            "1) Verified Community — only students with valid .edu email "
            "addresses can join. "
            "2) Campus Isolation — each school is a completely separate "
            "community. "
            "3) In-App Messaging — communicate without sharing personal "
            "contact info. "
            "4) Report System — easily report inappropriate behavior or "
            "content. "
            "5) Content Moderation — our team reviews reports and enforces "
            "community standards."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="safety-tips",
        title="Safety Tips for Meeting In Person",
        category=DocCategory.SAFETY,
        keywords=[
            "meeting", "in person", "meet up", "safe meeting", "tips",
            "exchange",
        ],
        content=(
            "When meeting other users in person: Meet in a public place on "
            "campus during daylight hours. Tell a friend or roommate where "
            "you're going. Don't share personal information before meeting. "
            "Trust your instincts — if something feels off, walk away. For "
            "higher-value items, consider meeting at a campus security office."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="emergency",
        title="Emergency Contacts",
        category=DocCategory.SAFETY,
        keywords=[
            "emergency", "help", "danger", "unsafe", "campus safety",
            "911", "police", "urgent",
        ],
        content=(
            "For immediate safety concerns: Emergency: 911. "
            "Campus Safety (Gettysburg College): (717) 337-6911 (24/7). "
            "Counseling Services: (717) 337-6960. "
            "Do not wait for chat support in an emergency."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="eligibility",
        title="Who Can Use GimmeDat",
        category=DocCategory.GENERAL,
        keywords=[
            "who", "eligible", "requirements", "student", "faculty",
            "sign up", "join", "age",
        ],
        content=(
            "Only members of a participating college or university community "
            "with a valid .edu email address can create accounts. This "
            "includes students, faculty, and staff. You must be at least 18 "
            "years old to use the platform."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="is-free",
        title="Platform Fees",
        category=DocCategory.GENERAL,
        keywords=[
            "free", "fee", "cost", "subscription", "charges", "price",
        ],
        content=(
            "GimmeDat is completely free to use. There are no fees for "
            "posting offers, messaging, or browsing. We don't process "
            "payments — all transactions are arranged directly between users."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="prohibited-items",
        title="Prohibited Items & Conduct",
        category=DocCategory.POLICY,
        keywords=[
            "prohibited", "banned", "not allowed", "illegal", "restricted",
            "rules", "weapons", "drugs",
        ],
        content=(
            "The following are strictly prohibited: Weapons, firearms, "
            "ammunition, or explosives. Illegal drugs, controlled substances, "
            "or drug paraphernalia. Alcohol or tobacco products. Stolen "
            "property. Counterfeit or pirated goods. Hazardous materials. "
            "Adult content or services. Academic dishonesty services. "
            "Pyramid schemes, MLM, or solicitations. Spam, phishing, or "
            "deceptive content."
        ),
        url="/terms",
    ),
    KBArticle(
        id="report-issue",
        title="Reporting Problems",
        category=DocCategory.SAFETY,
        keywords=[
            "report", "problem", "issue", "complaint", "inappropriate",
            "flag", "violation",
        ],
        content=(
            "To report issues: Use the report button on any offer page or "
            "user profile. Provide details about the problem so our "
            "moderation team can investigate. Reports are reviewed and "
            "appropriate action is taken, including content removal and "
            "account suspension for serious violations."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="account-help",
        title="Account Issues",
        category=DocCategory.ACCOUNT,
        keywords=[
            "account", "login", "password", "email", "profile", "delete",
            "reset", "forgot password", "can't log in",
        ],
        content=(
            "For account issues: Can't log in? Make sure you're using your "
            ".edu email and check for typos. Forgot password? Use the "
            "password reset flow on the login page. Email verification not "
            "received? Check your spam folder. To update your profile, go to "
            "your Profile page. To delete your account, visit your account "
            "settings."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="privacy",
        title="Privacy Information",
        category=DocCategory.POLICY,
        keywords=[
            "privacy", "data", "information", "collect", "share",
            "personal data", "gdpr",
        ],
        content=(
            "We collect account info (email, display name, class year), "
            "profile info (bio, avatar), offer content, and messages. "
            "We do NOT sell your personal information. Your data is only "
            "visible within your campus community. You can request data "
            "deletion at any time through your account settings."
        ),
        url="/privacy",
    ),
    KBArticle(
        id="terms",
        title="Terms of Service",
        category=DocCategory.POLICY,
        keywords=[
            "terms", "service", "agreement", "legal", "tos",
        ],
        content=(
            "By using GimmeDat, you agree to our Terms of Service. Key "
            "points: you must be 18+, have a valid .edu email, post only "
            "accurate and legal content, and follow community guidelines. "
            "The platform is provided as-is and is not liable for "
            "transactions between users."
        ),
        url="/terms",
    ),
    KBArticle(
        id="transactions",
        title="Completing Transactions",
        category=DocCategory.FEATURES,
        keywords=[
            "transaction", "payment", "pay", "venmo", "cash", "exchange",
            "buy", "purchase",
        ],
        content=(
            "GimmeDat connects buyers and sellers but doesn't process "
            "payments. All transactions are arranged directly between users. "
            "Payment methods (cash, Venmo, etc.) are agreed upon between "
            "buyer and seller. We strongly recommend meeting in public, "
            "well-lit campus locations for exchanges."
        ),
        url="/terms",
    ),
    KBArticle(
        id="categories",
        title="Offer Categories",
        category=DocCategory.FEATURES,
        keywords=[
            "category", "categories", "type", "types", "what can i sell",
            "filter",
        ],
        content=(
            "Offers are organized into two types and multiple categories. "
            "Items include textbooks, electronics, furniture, clothing, and "
            "more. Services include tutoring, transportation, music lessons, "
            "tech help, and repairs. Use the filter pills on the Marketplace "
            "page to browse by specific categories."
        ),
        url="/feed",
    ),
    KBArticle(
        id="favorites",
        title="Saving Offers",
        category=DocCategory.FEATURES,
        keywords=[
            "favorite", "save", "saved", "bookmark", "like", "heart",
        ],
        content=(
            "To save an offer, click the heart icon on any offer card or "
            "detail page. Access your saved offers anytime from the Saved "
            "page. Saved offers are private — only you can see them. You "
            "can unsave by clicking the heart icon again."
        ),
        url="/saved",
    ),
    KBArticle(
        id="contact-support",
        title="Contact Support",
        category=DocCategory.GENERAL,
        keywords=[
            "contact", "support", "email", "help", "get in touch",
        ],
        content=(
            "For general questions, use this support chat. For "
            "account-specific issues, email us at support@gimme-dat.com. "
            "For privacy-related requests, see the Privacy Policy page. "
            "For urgent safety concerns, contact Campus Safety at "
            "(717) 337-6911."
        ),
        url="/how-it-works",
    ),
    KBArticle(
        id="campus-isolation",
        title="Campus Isolation",
        category=DocCategory.SAFETY,
        keywords=[
            "campus", "isolation", "other schools", "separate", "community",
        ],
        content=(
            "Each campus on GimmeDat is a completely separate community. "
            "You can only see and interact with offers and users from your "
            "own school. Your profile, offers, and messages are never "
            "visible to students at other campuses."
        ),
        url="/how-it-works",
    ),
]

# Synonym map for query expansion
SYNONYMS: dict[str, list[str]] = {
    "offer": ["listing", "post", "item", "service", "sell"],
    "buy": ["purchase", "get", "find", "looking for", "want"],
    "sell": ["list", "post", "offer", "selling"],
    "message": ["chat", "contact", "communicate", "talk", "dm"],
    "sign up": ["register", "create account", "join", "enroll"],
    "login": ["log in", "sign in", "signin"],
    "report": ["flag", "complaint", "issue", "problem"],
    "safe": ["safety", "secure", "security", "protection"],
    "delete": ["remove", "cancel", "deactivate", "close"],
    "price": ["cost", "money", "pay", "charge", "fee"],
    "photo": ["image", "picture", "upload"],
}


# ─── Types ───────────────────────────────────────────────────────

@dataclass
class ChatbotResponse:
    reply: str
    confidence: float
    sources: list[dict[str, str]] = field(default_factory=list)
    escalation: bool = False


# ─── Service ─────────────────────────────────────────────────────

CHATBOT_SYSTEM_PROMPT = (
    "You are the support chatbot for GimmeDat, a campus marketplace platform "
    "where college students buy, sell, and trade items and services within "
    "their school community.\n\n"
    "## Your role:\n"
    "- Answer user questions about the platform using ONLY the provided "
    "knowledge base context\n"
    "- Be friendly, concise, and helpful\n"
    "- If the question is about an emergency or safety concern, always "
    "include emergency contact info: Emergency 911, Campus Safety "
    "(717) 337-6911\n"
    "- If the knowledge base context doesn't contain enough information "
    "to answer confidently, say so and suggest contacting "
    "support@gimme-dat.com\n"
    "- Never make up features or policies that aren't in the context\n"
    "- Keep answers concise (2-4 sentences for simple questions, a short "
    "list for complex ones)\n\n"
    "## Important platform facts:\n"
    "- GimmeDat is NOT affiliated with any college or university\n"
    "- It does NOT process payments — transactions happen directly between "
    "users\n"
    "- Only verified .edu email holders can join\n"
    "- Each campus is isolated — users only see their own school's content\n\n"
    "## Response format:\n"
    "Respond with a JSON object containing:\n"
    '- "reply": your helpful answer as a string (use markdown formatting)\n'
    '- "confidence": float 0.0-1.0 indicating how confident you are in '
    "the answer\n"
    '- "escalation": boolean, true if this needs human support attention\n'
)

# Confidence threshold below which the chatbot signals escalation
ESCALATION_THRESHOLD = 0.5


class ChatbotService:
    """RAG-powered customer support chatbot using the AI service."""

    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service
        self._kb = KNOWLEDGE_BASE

    @property
    def enabled(self) -> bool:
        return self.ai_service.enabled

    async def answer(
        self,
        message: str,
        conversation_history: list[dict[str, str]] | None = None,
    ) -> ChatbotResponse:
        """Answer a user support question using RAG.

        1. Retrieve relevant KB articles
        2. Build context from matched articles
        3. Send to AI with context + conversation history
        4. Parse structured response
        5. Apply escalation logic
        """
        if not message or not message.strip():
            return ChatbotResponse(
                reply="Please type a question and I'll do my best to help!",
                confidence=1.0,
            )

        sanitized = message.strip()[:1000]

        # Step 1: Retrieve relevant KB articles
        matched_articles = self._retrieve(sanitized)
        sources = [
            {"title": a.title, "url": a.url} for a in matched_articles
        ]

        # If AI is disabled, fall back to keyword-based response
        if not self.enabled:
            return self._fallback_response(sanitized, matched_articles, sources)

        # Step 2: Build context from matched articles
        context = self._build_context(matched_articles)

        # Step 3: Build messages (with optional conversation history)
        user_prompt = (
            f"## Knowledge Base Context:\n{context}\n\n"
            f"## User Question:\n{sanitized}"
        )

        messages: list[dict[str, str]] = []
        if conversation_history:
            # Include up to the last 10 messages for context
            for msg in conversation_history[-10:]:
                messages.append(msg)
        messages.append({"role": "user", "content": user_prompt})

        # Step 4: Call AI
        try:
            if conversation_history:
                response = await self.ai_service.chat(
                    messages=messages,
                    system=CHATBOT_SYSTEM_PROMPT,
                    max_tokens=512,
                    temperature=0.3,
                )
            else:
                response = await self.ai_service.structured_output(
                    prompt=user_prompt,
                    system=CHATBOT_SYSTEM_PROMPT,
                    max_tokens=512,
                )

            parsed = self._parse_response(response.content)

            # Step 5: Apply escalation logic
            if parsed.confidence < ESCALATION_THRESHOLD:
                parsed.escalation = True
            parsed.sources = sources

            logger.info(
                "[CHATBOT] Reply (confidence=%.2f, escalation=%s, sources=%d)",
                parsed.confidence,
                parsed.escalation,
                len(sources),
            )
            return parsed

        except Exception:
            logger.exception("[CHATBOT] AI response failed, using fallback")
            return self._fallback_response(sanitized, matched_articles, sources)

    def _retrieve(self, query: str, top_k: int = 3) -> list[KBArticle]:
        """Retrieve the most relevant KB articles for the given query."""
        normalized = query.lower()
        query_words = [w for w in normalized.split() if len(w) > 2]
        expanded = self._expand_query(normalized)

        scored: list[tuple[KBArticle, float]] = []

        for article in self._kb:
            score = 0.0

            # Keyword matching (expanded)
            for term in expanded:
                for kw in article.keywords:
                    if term in kw or kw in term:
                        score += 4.0
                    elif any(tw in kw for tw in term.split()):
                        score += 2.0

            # Title matching
            title_lower = article.title.lower()
            if normalized in title_lower or title_lower in normalized:
                score += 5.0
            for qw in query_words:
                if qw in title_lower:
                    score += 1.0

            # Content word matching
            content_lower = article.content.lower()
            for qw in query_words:
                if qw in content_lower:
                    score += 0.5

            if score > 0:
                scored.append((article, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [article for article, _ in scored[:top_k]]

    def _expand_query(self, query: str) -> list[str]:
        """Expand query with synonyms."""
        terms = [query]
        for key, syns in SYNONYMS.items():
            if key in query:
                terms.extend(syns)
            for syn in syns:
                if syn in query:
                    terms.append(key)
                    break
        return terms

    def _build_context(self, articles: list[KBArticle]) -> str:
        """Build context string from matched KB articles."""
        if not articles:
            return "No relevant articles found in the knowledge base."

        parts = []
        for article in articles:
            parts.append(
                f"### {article.title}\n"
                f"Source: {article.url}\n"
                f"{article.content}"
            )
        return "\n\n".join(parts)

    def _parse_response(self, raw: str) -> ChatbotResponse:
        """Parse the AI JSON response into a ChatbotResponse."""
        import json

        text = raw.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [ln for ln in lines if not ln.strip().startswith("```")]
            text = "\n".join(lines)

        try:
            data = json.loads(text)
            return ChatbotResponse(
                reply=str(data.get("reply", text)),
                confidence=float(data.get("confidence", 0.5)),
                escalation=bool(data.get("escalation", False)),
            )
        except (json.JSONDecodeError, KeyError, ValueError):
            # If JSON parsing fails, treat the whole text as the reply
            logger.warning("[CHATBOT] Failed to parse JSON response, using raw text")
            return ChatbotResponse(
                reply=text,
                confidence=0.4,
                escalation=True,
            )

    def _fallback_response(
        self,
        query: str,
        articles: list[KBArticle],
        sources: list[dict[str, str]],
    ) -> ChatbotResponse:
        """Generate a fallback response without AI using keyword matching."""
        if not articles:
            return ChatbotResponse(
                reply=(
                    "I couldn't find specific information about that. "
                    "You can browse our How It Works page or reach out to "
                    "support@gimme-dat.com for help."
                ),
                confidence=0.2,
                sources=[{"title": "How It Works", "url": "/how-it-works"}],
                escalation=True,
            )

        # Use the best-matched article's content directly
        best = articles[0]
        reply = best.content

        if len(articles) > 1:
            reply += f"\n\n**Related:** {articles[1].content}"

        confidence = min(0.6, 0.3 + 0.1 * len(articles))
        return ChatbotResponse(
            reply=reply,
            confidence=confidence,
            sources=sources,
            escalation=confidence < ESCALATION_THRESHOLD,
        )
