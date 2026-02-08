/**
 * Chatbot Engine — GimmeDat Support
 *
 * Self-contained client-side implementation:
 * - Message classification into 5 categories
 * - Embedded knowledge base with synonym expansion
 * - Multi-factor scoring for KB retrieval
 * - Confidence-based escalation to human support
 * - Banned word filtering
 * - Rate limiting
 */

// ─── Types ───────────────────────────────────────────────────────
export type MessageCategory =
  | "FAQ_GENERAL"
  | "ACCOUNT_SPECIFIC"
  | "SAFETY_EMERGENCY"
  | "POLICY_LEGAL"
  | "ABUSE_SPAM";

export interface ChatSource {
  title: string;
  url: string;
  excerpt: string;
}

export interface ChatResponse {
  replyText: string;
  category: MessageCategory;
  confidence: number;
  sources: ChatSource[];
  escalation: boolean;
}

interface KBEntry {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  content: string;
  excerpt: string;
}

interface KBResult {
  answer: string;
  confidence: number;
  sources: ChatSource[];
  relatedAnswers?: { title: string; content: string; score: number }[];
}

// ─── Configuration ───────────────────────────────────────────────
const MAX_MESSAGES_PER_MINUTE = 10;

const BANNED_WORDS = [
  "uber",
  "lyft",
  "rideshare app",
  "hail a ride",
  "order ride",
  "dispatch",
  "dispatching",
  "fare",
  "commission",
  "guaranteed delivery",
  "shipping label",
  "tracking number",
  "we ship",
  "free shipping",
];

// ─── Classifier ──────────────────────────────────────────────────
const EMERGENCY_PATTERNS = [
  /\b(emergency|911|police|ambulance|fire|danger|unsafe|threat|harass|assault|attack)\b/i,
  /\b(campus safety|call cops|call police)\b/i,
  /\b(hurt|injured|accident)\b/i,
  /\b(help me|need help urgent)\b/i,
  /\b(stalking|stalker|follow(?:ing)? me)\b/i,
];

const ACCOUNT_PATTERNS = [
  /\b(my account|my profile|my password|my email)\b/i,
  /\b(can't login|cannot login|login issue|password reset)\b/i,
  /\b(delete my|deactivate my|close my account)\b/i,
  /\b(my offers|my messages|my listings)\b/i,
  /\b(verify my|verification code|confirm email)\b/i,
  /\b(change my|update my email|update my phone)\b/i,
  /\b(i posted|i messaged|i signed up)\b/i,
  /\b(forgot password|reset password)\b/i,
];

const POLICY_PATTERNS = [
  /\b(terms of service|terms and conditions|tos)\b/i,
  /\b(privacy policy|data protection|gdpr)\b/i,
  /\b(legal|lawsuit|liability|sue)\b/i,
  /\b(refund|compensation|damages)\b/i,
  /\b(copyright|trademark|intellectual property)\b/i,
  /\b(prohibited items|banned items)\b/i,
];

const ABUSE_PATTERNS = [
  /\b(fuck|shit|damn|ass|bitch|bastard)\b/i,
  /(.)\1{5,}/i,
  /(https?:\/\/[^\s]+){3,}/i,
  /^[^a-zA-Z]*$/i,
];

export function classifyMessage(message: string): {
  category: MessageCategory;
  confidence: number;
} {
  const normalized = message.toLowerCase().trim();

  for (const pattern of ABUSE_PATTERNS) {
    if (pattern.test(message)) {
      return { category: "ABUSE_SPAM", confidence: 0.9 };
    }
  }

  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(normalized)) {
      return { category: "SAFETY_EMERGENCY", confidence: 0.95 };
    }
  }

  let accountScore = 0;
  for (const pattern of ACCOUNT_PATTERNS) {
    if (pattern.test(normalized)) accountScore++;
  }
  if (accountScore >= 1) {
    return {
      category: "ACCOUNT_SPECIFIC",
      confidence: Math.min(0.5 + accountScore * 0.2, 0.95),
    };
  }

  for (const pattern of POLICY_PATTERNS) {
    if (pattern.test(normalized)) {
      return { category: "POLICY_LEGAL", confidence: 0.8 };
    }
  }

  return { category: "FAQ_GENERAL", confidence: 0.7 };
}

// ─── Knowledge Base ──────────────────────────────────────────────
const SYNONYMS: Record<string, string[]> = {
  offer: ["listing", "post", "item", "service", "sell", "selling"],
  buy: ["purchase", "get", "find", "looking for", "want"],
  sell: ["list", "post", "offer", "selling", "put up"],
  message: ["chat", "contact", "communicate", "talk", "reach out", "dm"],
  "sign up": ["register", "create account", "join", "enroll"],
  login: ["log in", "sign in", "signin", "logging in"],
  report: ["flag", "complaint", "issue", "problem", "inappropriate"],
  safe: ["safety", "secure", "security", "protection", "trust"],
  verify: ["verification", "verified", "confirm", "validate"],
  favorite: ["save", "saved", "bookmark", "like", "heart"],
  campus: ["school", "college", "university", "institution"],
  delete: ["remove", "cancel", "deactivate", "close"],
  price: ["cost", "money", "pay", "charge", "fee", "how much"],
  free: ["cost", "price", "charge", "fee"],
  category: ["type", "filter", "sort", "kind"],
  photo: ["image", "picture", "pic", "photos", "upload"],
};

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: "what-is-cb",
    title: "What is GimmeDat?",
    url: "/how-it-works",
    keywords: [
      "what is",
      "platform",
      "about",
      "gimmedat",
      "what is this",
      "tell me about",
      "marketplace",
    ],
    content:
      "GimmeDat is a campus marketplace that connects college students to buy, sell, and trade items and services within their school community. Each campus is a completely separate, isolated community — you only see offers from students at your own school. It's a safe, trusted space built exclusively for verified .edu email holders.",
    excerpt: "Campus marketplace for college students",
  },
  {
    id: "how-it-works",
    title: "How It Works",
    url: "/how-it-works",
    keywords: [
      "how",
      "work",
      "works",
      "use",
      "using",
      "get started",
      "start",
      "process",
      "steps",
    ],
    content:
      "Getting started is easy — 4 steps: 1) Create Your Account — sign up with your .edu email to join your verified campus community. 2) Browse or Post — explore existing offers or create your own with photos, descriptions, and pricing. 3) Connect — message other students directly through the platform to discuss details. 4) Complete the Exchange — meet on campus in a safe, public location to complete your transaction.",
    excerpt: "Step-by-step guide to using the platform",
  },
  {
    id: "post-offer",
    title: "How to Post an Offer",
    url: "/listings/new",
    keywords: [
      "post",
      "create",
      "sell",
      "list",
      "new offer",
      "how to sell",
      "put up",
      "post offer",
      "create offer",
    ],
    content:
      'To post an offer: Click the "New Offer" button in the header or navigation. Choose whether it\'s an Item (something you\'re selling) or a Service (something you\'re offering to do). Fill in the title, description, category, price hint, and location. Add photos to make your offer stand out. Once posted, it will be visible to all verified students on your campus.',
    excerpt: "How to create and post offers",
  },
  {
    id: "browse-offers",
    title: "Browsing the Marketplace",
    url: "/feed",
    keywords: [
      "browse",
      "find",
      "search",
      "look",
      "marketplace",
      "feed",
      "explore",
      "filter",
    ],
    content:
      "The Marketplace page shows all active offers from students at your campus. You can filter by type (Items or Services), browse by category, and sort by newest, oldest, or most popular. Use the search bar to find specific items. Save offers you're interested in by clicking the heart icon — find them later on your Saved page.",
    excerpt: "How to find and filter offers",
  },
  {
    id: "messaging",
    title: "Messaging Other Users",
    url: "/messages",
    keywords: [
      "message",
      "chat",
      "contact",
      "communicate",
      "talk",
      "reach",
      "messaging",
      "send message",
      "dm",
      "inbox",
    ],
    content:
      "GimmeDat has built-in messaging so you can coordinate with other users without sharing personal contact info. To start a conversation, click \"Message\" on any offer page. All communication stays within the platform. You'll receive notifications for new messages based on your notification preferences.",
    excerpt: "In-app messaging system",
  },
  {
    id: "safety",
    title: "Safety Features",
    url: "/how-it-works",
    keywords: [
      "safe",
      "safety",
      "secure",
      "verify",
      "verified",
      "trust",
      "protection",
      "safety features",
    ],
    content:
      "GimmeDat has several safety features: 1) Verified Community — only students with valid .edu email addresses can join. 2) Campus Isolation — each school is a completely separate community; no cross-campus content sharing. 3) In-App Messaging — communicate without sharing personal contact info. 4) Report System — easily report inappropriate behavior or content. 5) Content Moderation — our team reviews reports and enforces community standards.",
    excerpt: "Platform safety features",
  },
  {
    id: "safety-tips",
    title: "Safety Tips for Meeting In Person",
    url: "/how-it-works",
    keywords: [
      "meeting",
      "in person",
      "meet up",
      "safe meeting",
      "tips",
      "precaution",
      "exchange",
    ],
    content:
      "When meeting other users in person: Meet in a public place on campus during daylight hours. Tell a friend or roommate where you're going and who you're meeting. Don't share personal information (home address, financial details) before meeting. Trust your instincts — if something feels off, walk away. For higher-value items, consider meeting at a campus security office.",
    excerpt: "Tips for safe in-person meetups",
  },
  {
    id: "emergency",
    title: "Emergency Contacts",
    url: "/how-it-works",
    keywords: [
      "emergency",
      "help",
      "danger",
      "unsafe",
      "campus safety",
      "911",
      "police",
      "urgent",
    ],
    content:
      "For immediate safety concerns: Emergency: 911. Campus Safety (Gettysburg College): (717) 337-6911 (available 24/7). Counseling Services: (717) 337-6960. Do not wait for email support in an emergency. Use the report feature for non-urgent safety concerns.",
    excerpt: "Emergency contact information",
  },
  {
    id: "campus-isolation",
    title: "Campus Isolation",
    url: "/how-it-works",
    keywords: [
      "campus",
      "isolation",
      "other schools",
      "cross campus",
      "only my school",
      "separate",
      "community",
    ],
    content:
      "Each campus on GimmeDat is a completely separate community. You can only see and interact with offers and users from your own school. Your profile, offers, and messages are never visible to students at other campuses. This ensures a trusted, tight-knit marketplace where you know everyone is part of your campus community.",
    excerpt: "How campus isolation works",
  },
  {
    id: "categories",
    title: "Offer Categories",
    url: "/feed",
    keywords: [
      "category",
      "categories",
      "type",
      "types",
      "what can i sell",
      "kinds",
      "filter",
    ],
    content:
      "GimmeDat offers are organized into two types and multiple categories. Items include textbooks, electronics, furniture, clothing, and more. Services include tutoring, transportation, music lessons, tech help, and repairs. Use the filter pills on the Marketplace page to browse by specific categories.",
    excerpt: "Available offer types and categories",
  },
  {
    id: "favorites",
    title: "Saving Offers",
    url: "/profile/saved",
    keywords: [
      "favorite",
      "save",
      "saved",
      "bookmark",
      "like",
      "heart",
      "wishlist",
    ],
    content:
      "To save an offer you're interested in, click the heart icon on any offer card or detail page. Access your saved offers anytime from the Saved page in your profile. Saved offers are private — only you can see what you've saved. You can remove a saved offer by clicking the heart icon again.",
    excerpt: "How to save and manage favorite offers",
  },
  {
    id: "eligibility",
    title: "Who Can Use GimmeDat",
    url: "/how-it-works",
    keywords: [
      "who",
      "eligible",
      "can i use",
      "requirements",
      "age",
      "student",
      "faculty",
      "staff",
      "who can",
      "sign up",
      "join",
    ],
    content:
      "Only members of a participating college or university community with a valid .edu email address can create accounts. This includes students, faculty, and staff. You must be at least 18 years old to use the platform.",
    excerpt: "Eligibility requirements",
  },
  {
    id: "is-free",
    title: "Platform Fees",
    url: "/how-it-works",
    keywords: [
      "free",
      "fee",
      "subscription",
      "cost to use",
      "charges",
      "is it free",
      "does it cost",
    ],
    content:
      "Yes, GimmeDat is completely free to use! There are no fees for posting offers, messaging, or browsing. We don't process payments — all transactions are arranged directly between users.",
    excerpt: "No fees — the platform is free",
  },
  {
    id: "prohibited-items",
    title: "Prohibited Items & Conduct",
    url: "/terms",
    keywords: [
      "prohibited",
      "banned",
      "not allowed",
      "can't sell",
      "illegal",
      "restricted",
      "rules",
      "what can't",
    ],
    content:
      "The following are strictly prohibited: Weapons, firearms, ammunition, or explosives. Illegal drugs, controlled substances, or drug paraphernalia. Alcohol or tobacco products. Stolen property. Counterfeit or pirated goods. Hazardous materials. Adult content or services. Academic dishonesty services (writing papers, taking exams). Pyramid schemes, MLM, or solicitations. Spam, phishing, or deceptive content.",
    excerpt: "Items and behaviors not allowed on the platform",
  },
  {
    id: "report-issue",
    title: "Reporting Problems",
    url: "/how-it-works",
    keywords: [
      "report",
      "problem",
      "issue",
      "complaint",
      "bad experience",
      "inappropriate",
      "flag",
      "violation",
    ],
    content:
      "To report issues: Use the report button on any offer page or user profile. Provide details about the problem so our moderation team can investigate. Reports are reviewed and appropriate action is taken, including content removal and account suspension for serious violations. For immediate safety concerns, contact Campus Safety directly.",
    excerpt: "How to report problems",
  },
  {
    id: "account-help",
    title: "Account Issues",
    url: "/how-it-works",
    keywords: [
      "account",
      "login",
      "password",
      "email",
      "profile",
      "delete",
      "reset",
      "can't log in",
      "forgot password",
    ],
    content:
      "For account issues: Can't log in? Make sure you're using your .edu email and check for typos. Forgot password? Use the password reset flow on the login page. Email verification not received? Check your spam folder. To update your profile, go to your Profile page. To delete your account, visit your account settings.",
    excerpt: "Help with account-related issues",
  },
  {
    id: "privacy",
    title: "Privacy Information",
    url: "/privacy",
    keywords: [
      "privacy",
      "data",
      "information",
      "collect",
      "share",
      "protect",
      "personal data",
    ],
    content:
      "We collect account info (email, display name, class year), profile info (bio, avatar), offer content, and messages. We do NOT sell your personal information. Your data is only visible within your campus community. You can request data deletion at any time through your account settings. See our full Privacy Policy at /privacy.",
    excerpt: "Privacy and data protection",
  },
  {
    id: "terms",
    title: "Terms of Service",
    url: "/terms",
    keywords: [
      "terms",
      "service",
      "agreement",
      "legal",
      "tos",
      "terms of service",
    ],
    content:
      "By using GimmeDat, you agree to our Terms of Service. Key points: you must be 18+, have a valid .edu email, post only accurate and legal content, and follow community guidelines. The platform is provided as-is and is not liable for transactions between users. See /terms for full details.",
    excerpt: "Terms of Service overview",
  },
  {
    id: "photos",
    title: "Adding Photos to Offers",
    url: "/listings/new",
    keywords: [
      "photo",
      "image",
      "picture",
      "upload",
      "add photo",
      "camera",
      "photos",
    ],
    content:
      "You can add photos when creating or editing an offer. Photos help your offer stand out and give buyers a clear idea of what you're offering. Upload multiple photos to show different angles or details. For items, include photos of any wear or damage for transparency. For services, consider adding examples of your work.",
    excerpt: "How to add photos to offers",
  },
  {
    id: "transactions",
    title: "Completing Transactions",
    url: "/terms",
    keywords: [
      "transaction",
      "payment",
      "pay",
      "venmo",
      "cash",
      "exchange",
      "buy",
      "purchase",
      "how to pay",
    ],
    content:
      "GimmeDat connects buyers and sellers but doesn't process payments. All transactions are arranged directly between users. Payment methods (cash, Venmo, etc.) are agreed upon between buyer and seller. We strongly recommend meeting in public, well-lit campus locations for exchanges. The platform is not responsible for the quality, safety, legality, or delivery of items or services.",
    excerpt: "How transactions work",
  },
  {
    id: "edit-delete-offer",
    title: "Editing or Deleting an Offer",
    url: "/feed",
    keywords: [
      "edit",
      "update",
      "change",
      "modify",
      "delete",
      "remove",
      "take down",
      "sold",
    ],
    content:
      "To edit your offer, go to the offer detail page and click the Edit button. You can update the title, description, price, photos, and location. To delete an offer, click the Delete button on the offer page. You can also mark an item as sold. Deleted offers are soft-deleted and may be retained for moderation purposes for up to 90 days.",
    excerpt: "Managing your posted offers",
  },
  {
    id: "dark-mode",
    title: "Dark Mode",
    url: "/feed",
    keywords: [
      "dark mode",
      "theme",
      "dark theme",
      "light mode",
      "appearance",
      "night mode",
    ],
    content:
      "GimmeDat supports both light and dark themes. Toggle dark mode using the sun/moon icon button in the header. Your preference is saved automatically.",
    excerpt: "Theme toggle information",
  },
  {
    id: "notifications",
    title: "Notifications",
    url: "/how-it-works",
    keywords: [
      "notification",
      "notifications",
      "alerts",
      "email notification",
      "unread",
      "badge",
    ],
    content:
      "You'll receive notifications for new messages and activity on your offers. The messages icon in the navigation shows an unread count badge. You can manage your notification preferences in your account settings.",
    excerpt: "How notifications work",
  },
  {
    id: "search",
    title: "Searching for Offers",
    url: "/feed",
    keywords: [
      "search",
      "find",
      "look for",
      "search bar",
      "query",
      "looking for",
    ],
    content:
      "Use the search bar on the Marketplace page to find specific items or services. You can search by keywords, and results will match offer titles and descriptions. Combine search with category filters and type toggles (Items/Services) to narrow down results.",
    excerpt: "How to search the marketplace",
  },
  {
    id: "contact-support",
    title: "Contact Support",
    url: "/how-it-works",
    keywords: [
      "contact",
      "support",
      "email",
      "reach",
      "help",
      "get in touch",
      "support team",
    ],
    content:
      "For general questions, try this support chat first. For account-specific issues, use the platform's support channels. For privacy-related requests, see the Privacy Policy page. For urgent safety concerns, contact Campus Safety at (717) 337-6911.",
    excerpt: "How to reach support",
  },
  {
    id: "class-year",
    title: "Class Year & Profile",
    url: "/profile",
    keywords: [
      "class year",
      "graduation",
      "profile",
      "bio",
      "avatar",
      "display name",
      "edit profile",
    ],
    content:
      "Your profile shows your display name, class year, bio, and avatar to other users on your campus. You can update these details anytime from your Profile page. Your class year helps other students know who they're interacting with. Adding a bio and avatar photo builds trust in the community.",
    excerpt: "Profile and class year information",
  },
  {
    id: "not-affiliated",
    title: "Official Affiliation",
    url: "/how-it-works",
    keywords: [
      "official",
      "college",
      "affiliated",
      "endorsed",
      "run by",
      "student project",
    ],
    content:
      "GimmeDat is a student-created platform. It is not officially affiliated with, operated by, or endorsed by any college or university. The platform connects community members for peer-to-peer buying, selling, and trading.",
    excerpt: "Platform affiliation status",
  },
];

// ─── KB Retrieval Engine ─────────────────────────────────────────
function expandQuery(query: string): string[] {
  const normalized = query.toLowerCase();
  const expandedTerms = [normalized];

  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (normalized.includes(key)) {
      expandedTerms.push(...synonyms);
    }
    for (const synonym of synonyms) {
      if (normalized.includes(synonym)) {
        expandedTerms.push(key);
        break;
      }
    }
  }

  return expandedTerms;
}

function retrieveFromKB(query: string): KBResult {
  const normalized = query.toLowerCase();
  const queryWords = normalized
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const expandedTerms = expandQuery(normalized);

  const scores = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;

    // Expanded term matching against keywords
    for (const term of expandedTerms) {
      for (const keyword of entry.keywords) {
        if (term.includes(keyword)) {
          score += 4;
        } else if (normalized.includes(keyword)) {
          score += 3;
        }
      }
    }

    // Bigram matching
    if (queryWords.length >= 2) {
      for (let i = 0; i < queryWords.length - 1; i++) {
        const bigram = queryWords[i] + " " + queryWords[i + 1];
        for (const keyword of entry.keywords) {
          if (keyword.includes(bigram) || bigram.includes(keyword)) {
            score += 2;
          }
        }
      }
    }

    // Partial word matching in keywords
    for (const keyword of entry.keywords) {
      const keywordWords = keyword.split(/\s+/);
      for (const kw of keywordWords) {
        if (kw.length > 2) {
          for (const qw of queryWords) {
            if (qw.includes(kw) || kw.includes(qw)) {
              score += 1;
            }
          }
        }
      }
    }

    // Content word matching
    const contentWords = entry.content.toLowerCase().split(/\s+/);
    for (const qw of queryWords) {
      if (contentWords.includes(qw)) {
        score += 0.5;
      }
    }

    // Title matching
    const titleLower = entry.title.toLowerCase();
    if (normalized.includes(titleLower) || titleLower.includes(normalized)) {
      score += 5;
    }
    for (const qw of queryWords) {
      if (titleLower.includes(qw)) {
        score += 1;
      }
    }

    return { entry, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const topMatches = scores.filter((s) => s.score > 1).slice(0, 3);

  if (topMatches.length === 0) {
    return {
      answer:
        "I couldn't find specific information about that. You can browse our How It Works page or reach out through the platform's support channels.",
      confidence: 0.2,
      sources: [
        {
          title: "How It Works",
          url: "/how-it-works",
          excerpt: "Platform overview and guide",
        },
      ],
    };
  }

  const maxScore = topMatches[0].score;
  let confidence: number;
  if (maxScore >= 8) confidence = 0.95;
  else if (maxScore >= 6) confidence = 0.9;
  else if (maxScore >= 4) confidence = 0.75;
  else if (maxScore >= 2) confidence = 0.5;
  else confidence = 0.3;

  const bestMatch = topMatches[0].entry;
  const sources: ChatSource[] = [];
  const seenKeys = new Set<string>();

  for (const m of topMatches) {
    const key = m.entry.url + "|" + m.entry.title;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      sources.push({
        title: m.entry.title,
        url: m.entry.url,
        excerpt: m.entry.excerpt,
      });
    }
  }

  return {
    answer: bestMatch.content,
    confidence,
    sources,
    relatedAnswers: topMatches.slice(1).map((m) => ({
      title: m.entry.title,
      content: m.entry.content,
      score: m.score,
    })),
  };
}

function generateKBResponse(kbResult: KBResult): string {
  if (!kbResult.answer) {
    return "I couldn't find information about that. Please check our How It Works page or contact support.";
  }

  let response = kbResult.answer;

  if (kbResult.relatedAnswers && kbResult.relatedAnswers.length > 0) {
    const related = kbResult.relatedAnswers[0];
    if (
      related.score >= 3 &&
      !response.includes(related.content.slice(0, 30))
    ) {
      response += "\n\n**Related:** " + related.content;
    }
  }

  return response;
}

// ─── Banned Word Filter ──────────────────────────────────────────
function filterBannedWords(text: string): string {
  let filtered = text;
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(word, "gi");
    if (word.includes("dispatch")) {
      filtered = filtered.replace(regex, "coordinate");
    } else if (word.includes("fare") || word.includes("commission")) {
      filtered = filtered.replace(regex, "shared costs");
    } else if (word.includes("ship")) {
      filtered = filtered.replace(regex, "exchange in person");
    } else {
      filtered = filtered.replace(regex, "[platform feature]");
    }
  }
  return filtered;
}

// ─── Response Handlers ───────────────────────────────────────────
function handleEmergency(): ChatResponse {
  return {
    replyText:
      "**For immediate safety concerns, please contact emergency services:**\n\n" +
      "- Emergency: 911\n" +
      "- Campus Safety (Gettysburg): (717) 337-6911 (24/7)\n" +
      "- Counseling Services: (717) 337-6960\n\n" +
      "Do not wait for chat support in an emergency.",
    category: "SAFETY_EMERGENCY",
    confidence: 1.0,
    sources: [
      {
        title: "Safety Information",
        url: "/how-it-works",
        excerpt: "Emergency contacts and safety tips",
      },
    ],
    escalation: false,
  };
}

function handleAbuse(): ChatResponse {
  return {
    replyText:
      "I'm unable to process this request. If you have a legitimate question about the platform, please rephrase it.",
    category: "ABUSE_SPAM",
    confidence: 1.0,
    sources: [],
    escalation: false,
  };
}

function handleAccountSpecific(message: string): ChatResponse {
  const kbResult = retrieveFromKB(message);

  if (kbResult.confidence >= 0.5) {
    return {
      replyText:
        kbResult.answer +
        "\n\nFor account-specific actions or issues that require identity verification, please use the platform's support channels or contact your campus administrator.",
      category: "ACCOUNT_SPECIFIC",
      confidence: kbResult.confidence,
      sources: [
        ...kbResult.sources,
        {
          title: "Account Help",
          url: "/how-it-works",
          excerpt: "Account management and support",
        },
      ],
      escalation: true,
    };
  }

  return {
    replyText:
      "For account-specific questions or issues, here are some quick tips:\n\n" +
      "- **Can't log in?** Check your .edu email for typos and try resetting your password.\n" +
      "- **Email not verified?** Check your spam folder.\n" +
      "- **Update profile?** Visit your Profile page.\n" +
      "- **Delete account?** Go to your account settings.\n\n" +
      "For issues that require manual help, please reach out through the platform's support channels.",
    category: "ACCOUNT_SPECIFIC",
    confidence: 1.0,
    sources: [
      {
        title: "Account Help",
        url: "/how-it-works",
        excerpt: "Account management and support",
      },
    ],
    escalation: true,
  };
}

function handlePolicyLegal(message: string): ChatResponse {
  const kbResult = retrieveFromKB(message);

  if (kbResult.confidence >= 0.6) {
    const response = generateKBResponse(kbResult);
    return {
      replyText:
        response +
        "\n\nFor the complete policy, please review the linked documents below.",
      category: "POLICY_LEGAL",
      confidence: kbResult.confidence,
      sources: kbResult.sources,
      escalation: kbResult.confidence < 0.8,
    };
  }

  return {
    replyText:
      "For specific policy or legal questions, please review our official documentation:\n\n" +
      "- **Terms of Service:** /terms\n" +
      "- **Privacy Policy:** /privacy\n\n" +
      "If you need clarification, please reach out through the platform's support channels.",
    category: "POLICY_LEGAL",
    confidence: 0.5,
    sources: [
      {
        title: "Terms of Service",
        url: "/terms",
        excerpt: "Legal terms for using the platform",
      },
      {
        title: "Privacy Policy",
        url: "/privacy",
        excerpt: "How we handle your data",
      },
    ],
    escalation: true,
  };
}

function handleGeneralFAQ(message: string): ChatResponse {
  const kbResult = retrieveFromKB(message);

  if (kbResult.confidence >= 0.7) {
    const response = generateKBResponse(kbResult);
    return {
      replyText: response,
      category: "FAQ_GENERAL",
      confidence: kbResult.confidence,
      sources: kbResult.sources,
      escalation: false,
    };
  }

  if (kbResult.confidence >= 0.4) {
    return {
      replyText:
        "Here's what I found that might help:\n\n" +
        kbResult.answer +
        "\n\nIf this doesn't answer your question, try browsing our How It Works page for more details.",
      category: "FAQ_GENERAL",
      confidence: kbResult.confidence,
      sources: kbResult.sources,
      escalation: true,
    };
  }

  return {
    replyText:
      "I'm not sure I can fully answer that. Here are some helpful resources:\n\n" +
      "- **How It Works:** /how-it-works\n" +
      "- **Terms of Service:** /terms\n" +
      "- **Privacy Policy:** /privacy\n\n" +
      "You can also try rephrasing your question, or reach out through the platform's support channels.",
    category: "FAQ_GENERAL",
    confidence: kbResult.confidence,
    sources: [
      {
        title: "How It Works",
        url: "/how-it-works",
        excerpt: "Platform overview and guide",
      },
      {
        title: "Terms of Service",
        url: "/terms",
        excerpt: "Legal terms",
      },
    ],
    escalation: true,
  };
}

// ─── Main Processing Function ────────────────────────────────────
export function processMessage(message: string): ChatResponse {
  const sanitized = message.trim().slice(0, 1000);
  if (sanitized.length === 0) {
    return {
      replyText: "Please type a question and I'll do my best to help!",
      category: "FAQ_GENERAL",
      confidence: 1.0,
      sources: [],
      escalation: false,
    };
  }

  const classification = classifyMessage(sanitized);

  let response: ChatResponse;
  switch (classification.category) {
    case "SAFETY_EMERGENCY":
      response = handleEmergency();
      break;
    case "ABUSE_SPAM":
      response = handleAbuse();
      break;
    case "ACCOUNT_SPECIFIC":
      response = handleAccountSpecific(sanitized);
      break;
    case "POLICY_LEGAL":
      response = handlePolicyLegal(sanitized);
      break;
    case "FAQ_GENERAL":
    default:
      response = handleGeneralFAQ(sanitized);
      break;
  }

  response.replyText = filterBannedWords(response.replyText);
  return response;
}

// ─── Rate Limiter ────────────────────────────────────────────────
const messageTimestamps: number[] = [];

export function isRateLimited(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Prune old timestamps
  while (messageTimestamps.length > 0 && messageTimestamps[0] <= oneMinuteAgo) {
    messageTimestamps.shift();
  }

  return messageTimestamps.length >= MAX_MESSAGES_PER_MINUTE;
}

export function recordMessage(): void {
  messageTimestamps.push(Date.now());
}

// ─── Quick Actions ───────────────────────────────────────────────
export const QUICK_ACTIONS = [
  { label: "How it works", question: "How does GimmeDat work?" },
  { label: "Post an offer", question: "How do I post an offer?" },
  { label: "Safety tips", question: "What safety features does the platform have?" },
  { label: "Is it free?", question: "Is the platform free to use?" },
  { label: "Report issue", question: "How do I report a problem?" },
  { label: "Prohibited items", question: "What items are prohibited?" },
  { label: "Privacy & data", question: "How is my data protected?" },
  { label: "Account help", question: "I need help with my account" },
];
