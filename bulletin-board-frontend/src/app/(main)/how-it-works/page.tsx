"use client";

import Link from "next/link";
import {
  UserPlus,
  Search,
  MessageCircle,
  Handshake,
  ShieldCheck,
  Mail,
  AlertTriangle,
  MapPin,
  Users,
  Lock,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  GraduationCap,
  Package,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";

/* ------------------------------------------------------------------ */
/*  Steps                                                              */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description:
      "Sign up with your college email address. Your .edu email verifies you're part of the campus community, keeping everyone safe.",
  },
  {
    number: "02",
    icon: Search,
    title: "Browse or Post",
    description:
      "Search offers for items and services from fellow students, or create your own offer in seconds. Add photos, set your price, and choose how to be contacted.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Connect & Coordinate",
    description:
      "Message other students directly through the platform. Discuss details, negotiate prices, and arrange meetups — all without sharing personal contact info.",
  },
  {
    number: "04",
    icon: Handshake,
    title: "Complete the Exchange",
    description:
      "Meet in a safe, public campus location to complete your transaction. Mark offers as sold when done, and keep the campus marketplace fresh.",
  },
];

/* ------------------------------------------------------------------ */
/*  Safety features                                                    */
/* ------------------------------------------------------------------ */

const SAFETY_FEATURES = [
  {
    icon: Lock,
    title: "Verified .edu Emails",
    description:
      "Only students with verified college email addresses can join. No outsiders, no anonymous accounts.",
  },
  {
    icon: Users,
    title: "Campus-Only Community",
    description:
      "Each school is its own private community. You only see offers and interact with students from your campus.",
  },
  {
    icon: Mail,
    title: "In-App Messaging",
    description:
      "Communicate through the platform without sharing your phone number or personal email.",
  },
  {
    icon: AlertTriangle,
    title: "Report System",
    description:
      "Easily report suspicious offers or users. Our moderation team reviews reports promptly.",
  },
  {
    icon: MapPin,
    title: "Campus Meetup Spots",
    description:
      "We recommend meeting in well-lit, public campus locations for all in-person exchanges.",
  },
  {
    icon: ShieldCheck,
    title: "Community Standards",
    description:
      "Clear guidelines and content moderation keep the platform respectful and safe for everyone.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ items                                                          */
/* ------------------------------------------------------------------ */

const FAQS = [
  {
    question: "Is this an official college service?",
    answer:
      "GimmeDat is a student-created platform designed to serve the college community. It is not officially affiliated with or endorsed by any college or university.",
  },
  {
    question: "How do I price my items or services?",
    answer:
      "Pricing is entirely up to you. For items, check similar listings for reference. For services like tutoring, consider going rates on campus. You can also mark items as \"free\" or use terms like \"negotiable.\"",
  },
  {
    question: "What if I have a problem with another user?",
    answer:
      "Use the report feature on any listing or user profile to flag an issue. Our moderation team reviews all reports. For urgent safety concerns, contact your campus security.",
  },
  {
    question: "Can students from other campuses see my listings?",
    answer:
      "No. Each campus is a completely separate, private community. Your offers are only visible to verified students at your school.",
  },
  {
    question: "What can I list on the platform?",
    answer:
      "You can list items for sale (textbooks, electronics, furniture, etc.) and services (tutoring, photography, tech help, etc.). Prohibited items include weapons, drugs, alcohol, and anything illegal. Check our Terms of Service for full details.",
  },
  {
    question: "Is there a fee to use the platform?",
    answer:
      "GimmeDat is completely free to use. There are no listing fees, transaction fees, or subscription costs. We may show relevant campus ads to keep the platform running.",
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  const { isAuthenticated } = useAuthStore();

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
            <GraduationCap className="h-4 w-4" />
            Campus Community
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Your Campus Marketplace,{" "}
            <span className="text-white/90">Made Simple</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-primary-foreground/80">
            Buy, sell, and find services from fellow students at your school. A
            private, verified community — no strangers, no spam, just students
            helping students.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
                >
                  <Search className="h-4 w-4" />
                  Browse Offers
                </Link>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Package className="h-4 w-4" />
                  Post an Offer
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up Free
                </Link>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  <Search className="h-4 w-4" />
                  Browse Offers
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Getting started steps ── */}
      <section className="bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Getting Started
            </h2>
            <p className="mt-2 text-muted-foreground">
              Four simple steps to start buying, selling, and connecting.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary/30">
                    {step.number}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <step.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Sellers ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Package className="h-3.5 w-3.5" />
              For Sellers
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Sell Your Stuff, Your Way
            </h2>
            <p className="mt-3 text-muted-foreground">
              Declutter your dorm, sell your old textbooks, or offer your skills
              to fellow students.
            </p>

            <ul className="mt-6 space-y-4">
              {[
                [
                  "Set Your Own Price",
                  "You're in control — list items for sale, free, or negotiable.",
                ],
                [
                  "Verified Buyers Only",
                  "Only verified students from your campus can see and respond to your listings.",
                ],
                [
                  "Quick & Easy Posting",
                  "Create an offer in under a minute with photos, description, and category.",
                ],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href={isAuthenticated ? "/listings/new" : "/register"}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Post an Offer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-8">
            <div className="space-y-4">
              <div className="text-center">
                <Package className="mx-auto h-12 w-12 text-primary/60" />
                <p className="mt-3 text-sm font-medium text-foreground">
                  Popular Categories
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Textbooks",
                  "Electronics",
                  "Furniture",
                  "Clothing",
                  "Tickets",
                  "Tutoring",
                  "Photography",
                  "Tech Help",
                ].map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Buyers / Service seekers ── */}
      <section className="bg-muted/40 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1 rounded-2xl border border-border bg-card p-8">
            <div className="space-y-4 text-center">
              <Wrench className="mx-auto h-12 w-12 text-primary/60" />
              <p className="text-sm font-medium text-foreground">
                Find What You Need
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Affordable textbooks",
                  "Dorm furniture",
                  "Campus tutors",
                  "Photography",
                  "Tech support",
                  "Music lessons",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Search className="h-3.5 w-3.5" />
              For Buyers
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Find Deals From Your Peers
            </h2>
            <p className="mt-3 text-muted-foreground">
              Why pay full price when a classmate is selling exactly what you
              need?
            </p>

            <ul className="mt-6 space-y-4">
              {[
                [
                  "Search & Filter",
                  "Find offers by category, type, or keyword search.",
                ],
                [
                  "Message Sellers Directly",
                  "Ask questions and negotiate through secure in-app messaging.",
                ],
                [
                  "Save Your Favorites",
                  "Bookmark offers you're interested in and come back later.",
                ],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/feed"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Browse Offers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Safety ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Safety First
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Your Safety Matters
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
              We&apos;ve built multiple layers of protection so you can trade with
              confidence on campus.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary transition-transform group-hover:scale-110">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  {feature.description}
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
              Frequently Asked Questions
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
            Ready to Get Started?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Join your campus community and start buying, selling, and connecting
            with fellow students today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
              >
                Go to Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
                >
                  Sign Up Free
                </Link>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Browse Offers
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
