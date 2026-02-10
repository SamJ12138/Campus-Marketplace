"use client";

import Link from "next/link";
import {
  Mail,
  MessageCircle,
  MessageSquarePlus,
  Clock,
  ShieldCheck,
  Bug,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Contact channels                                                    */
/* ------------------------------------------------------------------ */

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: "Email Us",
    description:
      "Send us an email and we'll get back to you as soon as possible. Best for detailed questions, account issues, or anything that needs a paper trail.",
    action: "mailto:support@gimme-dat.com",
    actionLabel: "support@gimme-dat.com",
    actionType: "email" as const,
    responseTime: "Within 24 hours",
  },
  {
    icon: MessageCircle,
    title: "In-App Chat",
    description:
      "Use the chat bubble in the bottom-right corner of any page to ask questions. Our chatbot can help with common issues instantly, or escalate to a human.",
    action: "#chat",
    actionLabel: "Open Chat",
    actionType: "chat" as const,
    responseTime: "Instant (bot) / 24 hours (human)",
  },
  {
    icon: MessageSquarePlus,
    title: "Feedback Form",
    description:
      "Have a feature idea or want to report a bug? Use our in-app feedback form. Go to the newsletter board on the feed page and click \"Give Feedback\" to submit directly.",
    action: "/feed",
    actionLabel: "Go to Feed",
    actionType: "internal" as const,
    responseTime: "Reviewed weekly",
  },
];

/* ------------------------------------------------------------------ */
/*  What we can help with                                               */
/* ------------------------------------------------------------------ */

const HELP_TOPICS = [
  {
    icon: HelpCircle,
    title: "Account & Login",
    description:
      "Trouble signing in, email verification issues, password resets, or updating your profile.",
  },
  {
    icon: Bug,
    title: "Bug Reports",
    description:
      "Something broken or not working as expected? Let us know with details and screenshots if possible.",
  },
  {
    icon: Lightbulb,
    title: "Feature Requests",
    description:
      "Have an idea that would make GimmeDat better? We love hearing student suggestions — many features came from feedback.",
  },
  {
    icon: AlertTriangle,
    title: "Report a User or Listing",
    description:
      "If you see something that violates our community guidelines, use the report button on any listing or profile, or email us.",
  },
  {
    icon: ShieldCheck,
    title: "Safety Concerns",
    description:
      "If you feel unsafe during a transaction or encounter harassment, contact us immediately. For emergencies, contact campus security.",
  },
  {
    icon: Clock,
    title: "Listing Issues",
    description:
      "Problems posting, editing, or deleting your offers? Photos not uploading? We can help troubleshoot.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ items                                                           */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    question: "How long does it take to get a response?",
    answer:
      "Email responses typically arrive within 24 hours on weekdays. The in-app chatbot provides instant answers to common questions. For complex issues that require a human, allow up to 48 hours.",
  },
  {
    question: "I can't log in to my account. What do I do?",
    answer:
      "First, try the \"Forgot Password\" link on the login page. If you're not receiving the reset email, check your spam folder. If you still can't access your account, email us at support@gimme-dat.com with the email address you signed up with.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Email support@gimme-dat.com from the email address associated with your account and request account deletion. We'll process your request and confirm once complete.",
  },
  {
    question: "Someone is misusing the platform. What should I do?",
    answer:
      "Use the report button on the user's profile or listing. For urgent safety concerns, email us immediately at support@gimme-dat.com and contact your campus security if needed.",
  },
  {
    question: "My listing was removed. Why?",
    answer:
      "Listings may be removed if they violate our community guidelines or Terms of Service. Common reasons include prohibited items, misleading descriptions, or duplicate postings. Email us if you believe this was an error.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                       */
/* ------------------------------------------------------------------ */

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-foreground pr-4">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-96 pb-5" : "max-h-0",
        )}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function ContactPage() {
  const { isAuthenticated } = useAuthStore();
  const [emailCopied, setEmailCopied] = useState(false);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("support@gimme-dat.com").then(() => {
      setEmailCopied(true);
      toastTimeout.current = setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const handleOpenChat = () => {
    // Trigger the SupportChat widget open
    const chatButton = document.querySelector<HTMLButtonElement>(
      "[aria-label='Open support chat']"
    );
    if (chatButton) chatButton.click();
  };

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-4 py-20 text-primary-foreground sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Headphones className="h-4 w-4" />
            Support
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            How Can We{" "}
            <span className="text-white/90">Help?</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-primary-foreground/80">
            Our team is here to help you with anything related to your GimmeDat
            experience. Reach out through any of the channels below.
          </p>
        </div>
      </section>

      {/* ── Contact channels ── */}
      <section className="bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Get in Touch
            </h2>
            <p className="mt-2 text-muted-foreground">
              Choose the channel that works best for you.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {CONTACT_CHANNELS.map((channel) => (
              <div
                key={channel.title}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <channel.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {channel.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {channel.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {channel.responseTime}
                </div>
                <div className="mt-4">
                  {channel.actionType === "email" ? (
                    <div className="flex gap-2">
                      <a
                        href={channel.action}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        <Mail className="h-4 w-4" />
                        Send Email
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                        title="Copy email address"
                      >
                        {emailCopied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ) : channel.actionType === "chat" ? (
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {channel.actionLabel}
                    </button>
                  ) : (
                    <Link
                      href={channel.action}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      {channel.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we can help with ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <HelpCircle className="h-3.5 w-3.5" />
              Common Topics
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              What We Can Help With
            </h2>
            <p className="mt-2 text-muted-foreground">
              Here are some of the most common reasons students reach out.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {HELP_TOPICS.map((topic) => (
              <div
                key={topic.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <topic.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground">
                  {topic.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Support FAQ
            </h2>
          </div>

          <div className="mt-10 rounded-xl border border-border bg-card px-6">
            {FAQS.map((faq) => (
              <FaqItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-gradient-to-r from-primary to-primary/80 px-4 py-16 text-center text-primary-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Still Need Help?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Don&apos;t hesitate to reach out. We read every message and are here
            to make your GimmeDat experience as smooth as possible.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:support@gimme-dat.com"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
            >
              <Mail className="h-4 w-4" />
              Email support@gimme-dat.com
            </a>
            {isAuthenticated ? (
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Back to Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                How It Works
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
