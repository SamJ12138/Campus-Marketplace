"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  GraduationCap,
  ShoppingBag,
  Wrench,
  Search,
  MessageCircle,
  ShieldCheck,
  Users,
  Plus,
  Sun,
  Moon,
  LogIn,
  Handshake,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Truck,
  BadgeCheck,
  EyeOff,
  BookOpen,
  MessageSquare,
  Check,
  Heart,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useAds } from "@/lib/hooks/use-ads";
import type { Ad } from "@/lib/types/ads";
import { en as t } from "@/lib/i18n/en";

// ----------------------------------------------------------------
// Landing nav — lightweight top bar for the landing page only
// ----------------------------------------------------------------
function LandingNav() {
  const { isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            {t.common.appName}
          </span>
        </Link>

        {/* Center links — hidden on mobile */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/feed?type=item"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Items
          </Link>
          <Link
            href="/feed?type=service"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Services
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/join-team"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Join the Team
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}
          {isAuthenticated ? (
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Marketplace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ----------------------------------------------------------------
// Direction card — points users to a section of the app
// ----------------------------------------------------------------
function DirectionCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          accent,
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
        Explore
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

// ----------------------------------------------------------------
// Stat pill
// ----------------------------------------------------------------
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ----------------------------------------------------------------
// Main landing page
// ----------------------------------------------------------------
// ----------------------------------------------------------------
// Hero carousel
// ----------------------------------------------------------------
function HeroCarousel({ ads, isAuthenticated }: { ads: Ad[]; isAuthenticated: boolean }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = ads.length;

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (paused || count <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % count);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, count]);

  if (count === 0) return null;

  const ad = ads[current];
  const ctaHref =
    ad.type === "EXTERNAL_LINK" && ad.externalUrl
      ? ad.externalUrl
      : ad.type === "EVENT"
        ? `/feed`
        : `/feed`;

  return (
    <section
      className="relative flex min-h-[100vh] items-center overflow-hidden pt-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image + overlay */}
      {ads.map((a, i) => (
        <div
          key={a.id}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-700",
            i === current ? "opacity-100" : "opacity-0",
          )}
          style={{ backgroundImage: `url(${a.image.src})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          {ad.subtitle && (
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-white/70">
              {ad.subtitle}
            </p>
          )}
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            {ad.title}
          </h1>
          {ad.body && (
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
              {ad.body}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              {ad.ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {isAuthenticated ? (
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                <Search className="h-4 w-4" />
                Browse Marketplace
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {ads.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------
// Fallback hero (when no ads are available)
// ----------------------------------------------------------------
function FallbackHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            <GraduationCap className="h-4 w-4 text-primary" />
            Your campus, your community
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The marketplace
            <br />
            <span className="text-primary">built for students</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Buy, sell, and offer services within your verified campus
            community. No strangers, no spam — just students helping students.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                >
                  <Search className="h-4 w-4" />
                  Browse Marketplace
                </Link>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Post an Offer
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/feed"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
                >
                  <Search className="h-4 w-4" />
                  Browse Offers
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { isAuthenticated, initialize, isLoading } = useAuthStore();
  const { data: ads } = useAds(undefined, 10);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      {ads && ads.length > 0 ? (
        <HeroCarousel ads={ads} isAuthenticated={isAuthenticated} />
      ) : (
        <FallbackHero isAuthenticated={isAuthenticated} />
      )}

      {/* ── Direction cards ── */}
      <section className="relative border-t border-border bg-muted/30 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              What are you looking for?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Jump straight into the section that matters to you.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DirectionCard
              href="/feed?type=item"
              icon={ShoppingBag}
              title="Shop Items"
              description="Textbooks, electronics, furniture, clothing — find great deals from fellow students."
              accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            />
            <DirectionCard
              href="/feed?type=service"
              icon={Wrench}
              title="Find Services"
              description="Tutoring, photography, tech help, music lessons — hire talent on your campus."
              accent="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            />
            <DirectionCard
              href={isAuthenticated ? "/listings/new" : "/register"}
              icon={Plus}
              title="Post an Offer"
              description="Have something to sell or a skill to share? List it in under a minute."
              accent="bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
            />
          </div>
        </div>
      </section>

      {/* ── How it works (quick preview) ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Simple by design
            </h2>
            <p className="mt-3 text-muted-foreground">
              From sign-up to handshake in four easy steps.
            </p>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Users,
                title: "Sign up",
                desc: "Verify with your .edu email to join your campus community.",
              },
              {
                step: "02",
                icon: Search,
                title: "Browse or post",
                desc: "Search offers or create your own listing with photos and details.",
              },
              {
                step: "03",
                icon: MessageCircle,
                title: "Connect",
                desc: "Message sellers directly through the platform — no personal info shared.",
              },
              {
                step: "04",
                icon: Handshake,
                title: "Meet & exchange",
                desc: "Meet on campus, complete the deal, and mark the listing as sold.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <span className="text-5xl font-bold text-primary/10">
                  {item.step}
                </span>
                <div className="mx-auto -mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Learn more about how it works
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-border bg-muted/30 px-5 py-14">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-12 sm:gap-16">
          <Stat value="100%" label="Free to use" />
          <div className="hidden h-10 w-px bg-border sm:block" />
          <Stat value=".edu" label="Verified emails" />
          <div className="hidden h-10 w-px bg-border sm:block" />
          <Stat value="Private" label="Campus-only" />
          <div className="hidden h-10 w-px bg-border sm:block" />
          <Stat value="24hr" label="Moderation" />
        </div>
      </section>

      {/* ── What is GimmeDat? ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            What is GimmeDat?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            GimmeDat is a <span className="font-semibold text-foreground">free, campus-only marketplace</span> built
            exclusively for college students. Buy, sell, and trade items and services with verified
            students at your university — no outsiders, no fees, no hassle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <BadgeCheck className="h-4 w-4" />
              .edu verified
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
              100% free
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
              Campus only
            </span>
          </div>
        </div>
      </section>

      {/* ── Why not eBay / Facebook Marketplace? ── */}
      <section className="border-y border-border bg-muted/30 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Why not eBay or Facebook Marketplace?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built from scratch for the college experience.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: DollarSign,
                title: "Zero fees",
                desc: "eBay takes ~13% of every sale. We take nothing. Keep every dollar.",
                accent: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
              },
              {
                icon: Truck,
                title: "No shipping hassle",
                desc: "Meet on campus, hand it over between classes. No boxes, no labels, no waiting.",
                accent: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
              },
              {
                icon: BadgeCheck,
                title: "Campus-verified only",
                desc: "Every user is verified with a .edu email. You know exactly who you're dealing with.",
                accent: "bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
              },
              {
                icon: EyeOff,
                title: "Privacy first",
                desc: "No social media profile needed. No personal info shared with buyers or sellers.",
                accent: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
              },
              {
                icon: BookOpen,
                title: "Built for students",
                desc: "Categories, features, and pricing designed around campus life — textbooks, dorm gear, tutoring, and more.",
                accent: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
              },
              {
                icon: MessageSquare,
                title: "In-app messaging",
                desc: "Chat directly in the app. No need to share your phone number or personal email.",
                accent: "bg-teal-100 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-7"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    item.accent,
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 100% Free. No catch. ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            100% Free. No catch.
          </h2>
          <p className="mt-4 text-muted-foreground">
            We believe campus commerce should be accessible to every student.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "No listing fees",
              "No transaction fees",
              "No hidden costs",
              "No premium tier",
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built with your feedback ── */}
      <section className="border-y border-border bg-muted/30 px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Built with your feedback
          </h2>
          <p className="mt-4 text-muted-foreground">
            GimmeDat is shaped by students, for students. Every feature request
            and suggestion helps us build a better marketplace for your campus.
          </p>
          <div className="mt-8">
            <Link
              href="/how-it-works#feedback"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Share your feedback
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Safety highlights ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Safety first
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Trade with confidence
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every layer of GimmeDat is designed to keep your campus
                community safe and trusted.
              </p>

              <ul className="mt-8 space-y-5">
                {[
                  [
                    "Verified students only",
                    "Only .edu email holders can sign up — no outsiders, no anonymous accounts.",
                  ],
                  [
                    "In-app messaging",
                    "Communicate without sharing your phone number or personal email.",
                  ],
                  [
                    "One-click reporting",
                    "Flag suspicious listings or users — our moderation team reviews every report.",
                  ],
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: ShieldCheck,
                  label: "Community standards",
                  color:
                    "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                },
                {
                  icon: Users,
                  label: "Campus-only access",
                  color:
                    "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
                },
                {
                  icon: MessageCircle,
                  label: "Secure messaging",
                  color:
                    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                },
                {
                  icon: Search,
                  label: "Transparent listings",
                  color:
                    "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      item.color,
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-5 py-20 text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to join your campus marketplace?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Thousands of students are already buying, selling, and connecting.
            It takes less than a minute to get started.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
              >
                Go to Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:bg-white/90"
                >
                  Sign Up Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                <span className="font-bold">{t.common.appName}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your campus marketplace for services, items, and community
                connections.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Marketplace
              </h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/feed?type=item"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse Items
                  </Link>
                </li>
                <li>
                  <Link
                    href="/feed?type=service"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse Services
                  </Link>
                </li>
                <li>
                  <Link
                    href="/feed"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    All Offers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Community
              </h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/how-it-works"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works#faq"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/how-it-works#safety"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Safety
                  </Link>
                </li>
                <li>
                  <Link
                    href="/join-team"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Join the Team
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t.common.appName}. A student
            community project.
          </div>
        </div>
      </footer>
    </div>
  );
}
