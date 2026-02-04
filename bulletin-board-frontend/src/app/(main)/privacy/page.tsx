import Link from "next/link";
import {
  Shield,
  Eye,
  Database,
  Share2,
  Clock,
  Lock,
  UserCheck,
  Cookie,
  Baby,
  RefreshCw,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Shield,
    number: "1",
    title: "Introduction",
    content:
      'Campus Board ("we," "our," or "the Platform") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.',
  },
  {
    icon: Eye,
    number: "2",
    title: "Information We Collect",
    subsections: [
      {
        subtitle: "2.1 Information You Provide",
        bullets: [
          "Account information: email address, display name, class year, phone number (optional), and campus affiliation.",
          "Profile information: bio, avatar photo, and any other details you choose to add.",
          "Offers: titles, descriptions, photos, pricing, and category selections.",
          "Messages: content of messages sent through the Platform\u2019s messaging system.",
          "Reports: information you provide when reporting other users or content.",
        ],
      },
      {
        subtitle: "2.2 Information Collected Automatically",
        bullets: [
          "Device and browser information: browser type, operating system, and device identifiers (via User-Agent header).",
          "Usage data: pages visited, offer views, search queries, and interaction patterns.",
          "IP address: collected for security, rate limiting, and fraud prevention purposes.",
        ],
      },
    ],
  },
  {
    icon: Database,
    number: "3",
    title: "How We Use Your Information",
    content: "We use the information we collect to:",
    bullets: [
      "Provide and maintain the Platform and its features.",
      "Verify your identity and campus affiliation.",
      "Display your offers and profile to other users on your campus.",
      "Facilitate messaging between users.",
      "Send you notifications about your account, offers, and messages (based on your preferences).",
      "Moderate content and enforce our Terms of Service.",
      "Detect and prevent fraud, abuse, and security threats.",
      "Improve the Platform through aggregate analytics.",
    ],
  },
  {
    icon: Share2,
    number: "4",
    title: "Information Sharing",
    content:
      "We do not sell your personal information. We share information only in these limited circumstances:",
    bullets: [
      "With other users on your campus: your display name, avatar, class year, bio, and offer content are visible to authenticated users at your school.",
      "Cross-campus isolation: your information is never shared with users at other campuses. Each school is a completely separate community.",
      "Service providers: we may share data with third-party services that help us operate the Platform (e.g., hosting, email delivery, error tracking), under strict data protection agreements.",
      "Legal requirements: we may disclose information if required by law, court order, or to protect the safety of users.",
    ],
  },
  {
    icon: Clock,
    number: "5",
    title: "Data Retention",
    bullets: [
      "Account data is retained as long as your account is active.",
      "Deleted offers are soft-deleted and may be retained for moderation purposes for up to 90 days.",
      "Messages are retained for the duration of the conversation thread.",
      "You may request full deletion of your account and associated data at any time.",
    ],
  },
  {
    icon: Lock,
    number: "6",
    title: "Data Security",
    content:
      "We implement appropriate technical and organizational measures to protect your data, including:",
    bullets: [
      "Passwords are hashed using industry-standard algorithms (never stored in plain text).",
      "Authentication tokens are securely managed with expiration and rotation.",
      "API access is protected by rate limiting and input validation.",
      "Database connections are encrypted.",
    ],
    note: "However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.",
  },
  {
    icon: UserCheck,
    number: "7",
    title: "Your Rights",
    content: "You have the right to:",
    bullets: [
      "Access your personal data through your profile and account settings.",
      "Correct inaccurate information by editing your profile.",
      "Delete your account and associated data.",
      "Control notifications through your notification preferences.",
      "Export your data upon request.",
    ],
  },
  {
    icon: Cookie,
    number: "8",
    title: "Cookies & Local Storage",
    content:
      "The Platform uses browser local storage to maintain your authentication session. We do not use tracking cookies or third-party advertising trackers. Session data is stored locally in your browser and expires after 30 days of inactivity.",
  },
  {
    icon: Baby,
    number: "9",
    title: "Children\u2019s Privacy",
    content:
      "The Platform is intended for college students aged 18 and older. We do not knowingly collect information from anyone under 18. If we learn that we have collected data from a minor, we will delete it promptly.",
  },
  {
    icon: RefreshCw,
    number: "10",
    title: "Changes to This Policy",
    content:
      "We may update this Privacy Policy from time to time. We will notify users of significant changes via email or platform notification. Continued use of the Platform after changes constitutes acceptance of the updated policy.",
  },
  {
    icon: MessageCircle,
    number: "11",
    title: "Contact",
    content:
      "If you have questions about this Privacy Policy or wish to exercise your data rights, please reach out through the Platform's support channels.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-8 text-white sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" />
            Privacy
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="mt-8 space-y-4">
        {SECTIONS.map((section) => (
          <div
            key={section.number}
            className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                <section.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {section.number}. {section.title}
                </h2>

                {section.content && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.content}
                  </p>
                )}

                {section.subsections?.map((sub) => (
                  <div key={sub.subtitle} className="mt-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      {sub.subtitle}
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {sub.bullets.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {section.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {section.bullets.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {"note" in section && section.note && (
                  <p className="mt-3 rounded-lg border border-amber-200/50 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-900/10 dark:text-amber-300">
                    {section.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="mt-10 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-sm text-muted-foreground">
          See also our Terms of Service
        </p>
        <Link
          href="/terms"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Terms of Service
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
