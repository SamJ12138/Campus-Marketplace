import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Ban,
  HandCoins,
  MapPin,
  Scale,
  Pencil,
  Trash2,
  RefreshCw,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    icon: FileText,
    number: "1",
    title: "Acceptance of Terms",
    content:
      'By creating an account or using Campus Board ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.',
  },
  {
    icon: UserCheck,
    number: "2",
    title: "Eligibility",
    content:
      "You must be a currently enrolled student, faculty member, or staff member at a participating college or university. You must register using a valid .edu email address associated with your institution. You must be at least 18 years of age to use this Platform.",
  },
  {
    icon: ShieldCheck,
    number: "3",
    title: "Account Responsibilities",
    bullets: [
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You agree to provide accurate and truthful information during registration and in all offers.",
      "You may not share your account or let others access the Platform through your account.",
      "You must notify us immediately of any unauthorized use of your account.",
    ],
  },
  {
    icon: Pencil,
    number: "4",
    title: "Offers & Content",
    content:
      "You are solely responsible for the content you post, including offer titles, descriptions, photos, and messages. By posting content, you represent that:",
    bullets: [
      "You have the legal right to sell, trade, or offer the item or service.",
      "Your offer is accurate, not misleading, and does not violate any law.",
      "You will not post prohibited items (see Section 5).",
    ],
  },
  {
    icon: Ban,
    number: "5",
    title: "Prohibited Items & Conduct",
    content: "The following are strictly prohibited on the Platform:",
    bullets: [
      "Weapons, firearms, ammunition, or explosives",
      "Illegal drugs, controlled substances, or drug paraphernalia",
      "Alcohol or tobacco products",
      "Stolen property",
      "Counterfeit or pirated goods",
      "Hazardous materials",
      "Adult content or services",
      "Academic dishonesty services (e.g., writing papers for others, taking exams)",
      "Pyramid schemes, multi-level marketing, or solicitations",
      "Harassment, threats, discrimination, or hate speech",
      "Spam, phishing, or deceptive content",
      "Impersonation of another person or entity",
    ],
  },
  {
    icon: HandCoins,
    number: "6",
    title: "Transactions",
    content:
      "Campus Board is a platform that connects buyers and sellers. We are not a party to any transaction between users. We do not process payments, guarantee transactions, or provide escrow services.",
    bullets: [
      "All transactions are conducted at your own risk.",
      "You are responsible for negotiating terms, arranging payment, and completing exchanges.",
      "We strongly recommend meeting in public, well-lit campus locations.",
      "We are not responsible for the quality, safety, legality, or delivery of items or services.",
    ],
  },
  {
    icon: MapPin,
    number: "7",
    title: "Safety & Meeting in Person",
    content:
      "When meeting other users in person, exercise caution and common sense:",
    bullets: [
      "Meet in a public place on campus during daylight hours.",
      "Tell a friend or roommate where you are going and who you are meeting.",
      "Do not share personal information (home address, financial details) before meeting.",
      "Trust your instincts \u2014 if something feels off, walk away.",
    ],
  },
  {
    icon: Scale,
    number: "8",
    title: "Intellectual Property",
    content:
      "The Platform and its original content, features, and functionality are owned by Campus Board and are protected by copyright and other intellectual property laws. You retain ownership of content you post but grant us a non-exclusive license to display and distribute it on the Platform.",
  },
  {
    icon: AlertTriangle,
    number: "9",
    title: "Content Moderation",
    content:
      "We reserve the right to remove any content that violates these Terms or is otherwise objectionable, at our sole discretion. We may also suspend or terminate accounts that repeatedly violate these Terms.",
  },
  {
    icon: ShieldCheck,
    number: "10",
    title: "Limitation of Liability",
    content:
      'Campus Board is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the Platform, including but not limited to losses from transactions, personal injury, or property damage.',
  },
  {
    icon: ShieldCheck,
    number: "11",
    title: "Indemnification",
    content:
      "You agree to indemnify and hold harmless Campus Board, its creators, and contributors from any claims, damages, or expenses arising from your use of the Platform or violation of these Terms.",
  },
  {
    icon: RefreshCw,
    number: "12",
    title: "Changes to Terms",
    content:
      "We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms. We will notify users of significant changes via email or platform notification.",
  },
  {
    icon: Trash2,
    number: "13",
    title: "Termination",
    content:
      "We may suspend or terminate your account at any time for any reason, including violation of these Terms. You may delete your account at any time through your profile settings.",
  },
  {
    icon: MessageCircle,
    number: "14",
    title: "Contact",
    content:
      "If you have questions about these Terms, please reach out through the Platform's support channels.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <FileText className="h-3.5 w-3.5" />
            Legal
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/70">
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <div className="mt-10 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-sm text-muted-foreground">
          See also our Privacy Policy
        </p>
        <Link
          href="/privacy"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Privacy Policy
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
