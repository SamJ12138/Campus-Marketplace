"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import NextImage from "next/image";
import {
  ArrowRight,
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
  Mail,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { en as t } from "@/lib/i18n/en";

// ----------------------------------------------------------------
// Example listings — showcase what students post on GimmeDat
// ----------------------------------------------------------------
const EXAMPLE_LISTINGS = [
  {
    title: "Organic Chemistry (Wade) 9th Ed",
    price: "$45",
    category: "Textbooks",
    categoryColor: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    snippet: "Lightly highlighted, all pages intact. Used for one semester of Orgo I.",
  },
  {
    title: "Box Braids - All Lengths",
    price: "From $80",
    category: "Hair & Beauty",
    categoryColor: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
    snippet: "Knotless box braids, medium and small. Hair included up to 30 inches.",
  },
  {
    title: 'MacBook Air M2 13" - Like New',
    price: "$750",
    category: "Electronics",
    categoryColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
    snippet: "256GB, 8GB RAM, Space Gray. Battery cycle count under 50. Includes charger.",
  },
  {
    title: "Orgo Tutor - Aced Orgo I & II",
    price: "$25/hr",
    category: "Tutoring",
    categoryColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    snippet: "Biochem major with A's in both semesters. Library or Zoom sessions available.",
  },
  {
    title: "Nike Dunk Low (Panda) Size 10",
    price: "$75",
    category: "Clothing",
    categoryColor: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    snippet: "Worn maybe 5 times, no creasing. Comes with original box.",
  },
  {
    title: "Graduation Photo Sessions",
    price: "$75/session",
    category: "Photography",
    categoryColor: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    snippet: "30 min session, 20+ edited photos within a week. Best campus spots.",
  },
  {
    title: "Personal Training - Strength",
    price: "$20/session",
    category: "Fitness",
    categoryColor: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    snippet: "NASM certified. Custom programs for muscle gain, fat loss, or athletics.",
  },
  {
    title: "IKEA KALLAX Shelf (White, 4x2)",
    price: "$35",
    category: "Furniture",
    categoryColor: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    snippet: "Perfect dorm storage. Easy to take apart for transport. No scratches.",
  },
  {
    title: "Guitar Lessons - Acoustic & Electric",
    price: "$20/hr",
    category: "Music Lessons",
    categoryColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    snippet: "10 years experience. Chords to fingerpicking. Beginners welcome.",
  },
  {
    title: "2 Tickets to Spring Formal",
    price: "$25 each",
    category: "Tickets",
    categoryColor: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
    snippet: "Can't make it anymore. Digital transfer. Selling below face value.",
  },
  {
    title: "Laptop Repair & Cleanup",
    price: "From $25",
    category: "Tech Help",
    categoryColor: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
    snippet: "CS major. Fix slow laptops, replace screens, remove malware. Same day.",
  },
  {
    title: "Gel Nail Sets - Custom Designs",
    price: "$30-45",
    category: "Hair & Beauty",
    categoryColor: "bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
    snippet: "French tips, chrome, nail art. Lasts 2-3 weeks. Booking this weekend.",
  },
] as const;

// ----------------------------------------------------------------
// Static branded hero slides — no API call, images preload instantly
// ----------------------------------------------------------------
const HERO_SLIDES = [
  {
    id: "slide-1",
    title: "Your Stuff Has Value",
    subtitle: "Campus Marketplace",
    body: "That textbook collecting dust, those dorm supplies you\u2019ll never use \u2014 turn them into cash.",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1920&h=1080&fit=crop&q=80",
    ctaText: "Start Selling",
    ctaHref: "/register",
  },
  {
    id: "slide-2",
    title: "Got a Skill? Get Paid",
    subtitle: "Student Services",
    body: "Tutoring, photography, tech help \u2014 your talent is worth something.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&h=1080&fit=crop&q=80",
    ctaText: "Offer a Service",
    ctaHref: "/register",
  },
  {
    id: "slide-3",
    title: "Why Let It Go to Waste?",
    subtitle: "End-of-Semester Deals",
    body: "Semester\u2019s ending, dorm\u2019s full \u2014 someone on campus wants what you don\u2019t.",
    image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1920&h=1080&fit=crop&q=80",
    ctaText: "List It Now",
    ctaHref: "/register",
  },
  {
    id: "slide-4",
    title: "Students Helping Students",
    subtitle: "Your Campus Community",
    body: "No strangers, no fees, just your campus community.",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&h=1080&fit=crop&q=80",
    ctaText: "Join Free",
    ctaHref: "/register",
  },
] as const;

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
          <NextImage src="/images/logo-v2.png" alt="GimmeDat" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            {t.common.appName}
          </span>
        </Link>

        {/* Center links — hidden on mobile */}
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/feed"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Marketplace
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
// Hero carousel — static branded slides with Next.js <Image>
// ----------------------------------------------------------------
function HeroCarousel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = HERO_SLIDES.length;

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

  const slide = HERO_SLIDES[current];

  return (
    <section
      className="relative flex min-h-[100vh] items-center overflow-hidden pt-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background images with Next.js <Image> for instant preloading */}
      {HERO_SLIDES.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === current ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={s.image}
            alt={s.title}
            fill
            sizes="100vw"
            className="object-cover"
            {...(i === 0 ? { priority: true } : {})}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>
      ))}

      {/* Content overlay */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5">
        <div className="max-w-2xl">
          <NextImage
            src="/images/logo-v2.png"
            alt=""
            width={64}
            height={64}
            className="mb-5 h-16 w-16 object-contain drop-shadow-lg"
          />
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-white/70">
            {slide.subtitle}
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
            {slide.body}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={isAuthenticated ? "/listings/new" : slide.ctaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              {slide.ctaText}
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
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
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

export default function LandingPage() {
  const { isAuthenticated, initialize, isLoading } = useAuthStore();

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
      <HeroCarousel isAuthenticated={isAuthenticated} />

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

      {/* ── Example listings showcase ── */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              What students are posting
            </h2>
            <p className="mt-3 text-muted-foreground">
              Real examples of the kinds of items and services you&apos;ll find on GimmeDat.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {EXAMPLE_LISTINGS.map((listing) => (
              <div
                key={listing.title}
                className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                    {listing.title}
                  </h3>
                  <span className="shrink-0 text-sm font-bold text-primary">
                    {listing.price}
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-2 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    listing.categoryColor,
                  )}
                >
                  {listing.category}
                </span>
                <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {listing.snippet}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl"
            >
              Browse All Listings
              <ArrowRight className="h-4 w-4" />
            </Link>
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
          <NextImage
            src="/images/logo-v2.png"
            alt="GimmeDat"
            width={72}
            height={72}
            className="mx-auto mb-5 h-[72px] w-[72px] object-contain"
          />
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Link>
            <Link
              href="/how-it-works#feedback"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:shadow-md"
            >
              Learn more
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
          <NextImage
            src="/images/logo-v2.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-5 h-14 w-14 object-contain drop-shadow-lg"
          />
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
              <div className="flex items-center gap-2">
                <NextImage src="/images/logo-v2.png" alt="GimmeDat" width={28} height={28} className="h-7 w-7 object-contain" />
                <span className="font-bold text-primary">{t.common.appName}</span>
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
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Contact Support
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
