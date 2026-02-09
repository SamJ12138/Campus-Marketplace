"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  CalendarDays,
  Info,
} from "lucide-react";
import type { Ad } from "@/lib/types/ads";
import { useAds } from "@/lib/hooks/use-ads";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { trackAdImpression, trackAdClick } from "@/lib/utils/ad-tracking";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getAdAction(ad: Ad) {
  switch (ad.type) {
    case "EXTERNAL_LINK":
      return {
        kind: "external" as const,
        href: ad.externalUrl ?? "#",
      };
    case "INTERNAL_DETAIL":
    case "COUPON":
    case "EVENT":
      return {
        kind: "internal" as const,
        href: `/ads/${ad.id}`,
      };
  }
}

function adTypeIcon(type: Ad["type"]) {
  switch (type) {
    case "EXTERNAL_LINK":
      return <ExternalLink className="h-4 w-4" />;
    case "COUPON":
      return <Tag className="h-4 w-4" />;
    case "EVENT":
      return <CalendarDays className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

function adTypeBadge(type: Ad["type"]) {
  const labels: Record<Ad["type"], string> = {
    INTERNAL_DETAIL: "Featured",
    EXTERNAL_LINK: "Sponsored",
    COUPON: "Coupon",
    EVENT: "Event",
  };
  return labels[type];
}

// ──────────────────────────────────────────────
// Skeleton loader
// ──────────────────────────────────────────────

function AdHeroBoardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col md:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-4 p-6 md:p-10">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-2 h-10 w-36" />
        </div>
        <div className="relative aspect-[16/10] w-full md:aspect-auto md:w-[45%]">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Single slide
// ──────────────────────────────────────────────

function AdSlide({
  ad,
  isCurrent,
}: {
  ad: Ad;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const action = getAdAction(ad);
  const impressionFired = useRef(false);

  // Fire impression when slide becomes visible
  useEffect(() => {
    if (isCurrent && !impressionFired.current) {
      impressionFired.current = true;
      trackAdImpression(ad.id);
    }
  }, [isCurrent, ad.id]);

  const handleCta = useCallback(() => {
    trackAdClick(ad.id);

    if (action.kind === "external") {
      window.open(action.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(action.href);
    }
  }, [ad.id, action, router]);

  const accentColor = ad.theme?.accent;

  return (
    <div
      className="flex w-full flex-shrink-0 flex-col md:flex-row"
      role="group"
      aria-roledescription="slide"
      aria-label={ad.title}
    >
      {/* Left – text content */}
      <div className="flex flex-1 flex-col justify-center gap-3 p-6 md:gap-4 md:p-10">
        {/* Badge */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              ad.type === "EXTERNAL_LINK"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                : ad.type === "COUPON"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : ad.type === "EVENT"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
            )}
          >
            {adTypeIcon(ad.type)}
            {adTypeBadge(ad.type)}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
          {ad.title}
        </h2>

        {/* Subtitle */}
        {ad.subtitle && (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            {ad.subtitle}
          </p>
        )}

        {/* CTA */}
        <div className="mt-1 flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleCta}
            className="gap-2"
            style={accentColor ? { backgroundColor: accentColor } : undefined}
          >
            {ad.ctaText}
            {action.kind === "external" && (
              <ExternalLink className="h-4 w-4" />
            )}
          </Button>

          {action.kind === "internal" && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => router.push(action.href)}
              className="text-muted-foreground"
            >
              View details
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="mt-1 text-xs text-muted-foreground/60">
          Ads are informational. We do not process payments.
        </p>
      </div>

      {/* Right – image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-auto md:w-[45%]">
        <Image
          src={ad.image.src}
          alt={ad.image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          priority={isCurrent}
          className="object-cover"
        />
        {/* Gradient overlay for visual depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-card/20 to-transparent md:from-card/10" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main carousel component
// ──────────────────────────────────────────────

const AUTO_ADVANCE_MS = 6000;

export default function AdHeroBoard() {
  const user = useAuthStore((s) => s.user);
  const campusId = user?.campus_slug;

  const { data: ads, isLoading, isError } = useAds(campusId);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = ads?.length ?? 0;

  // Clamp current index when ads change
  useEffect(() => {
    if (total > 0 && current >= total) {
      setCurrent(0);
    }
  }, [total, current]);

  const goTo = useCallback(
    (index: number) => {
      setCurrent((index + total) % total);
    },
    [total],
  );

  const prev = useCallback(() => goTo(current - 1), [goTo, current]);
  const next = useCallback(() => goTo(current + 1), [goTo, current]);

  // Auto-advance every 6 seconds, pause on hover or manual interaction
  useEffect(() => {
    if (total <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % total);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [total, paused]);

  // Pause auto-advance briefly after manual navigation
  const interactAndPause = useCallback(() => {
    setPaused(true);
    const t = setTimeout(() => setPaused(false), AUTO_ADVANCE_MS * 2);
    return () => clearTimeout(t);
  }, []);

  const handlePrev = useCallback(() => {
    prev();
    interactAndPause();
  }, [prev, interactAndPause]);

  const handleNext = useCallback(() => {
    next();
    interactAndPause();
  }, [next, interactAndPause]);

  const handleGoTo = useCallback(
    (index: number) => {
      goTo(index);
      interactAndPause();
    },
    [goTo, interactAndPause],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext],
  );

  // ── Loading state ──
  if (isLoading) {
    return <AdHeroBoardSkeleton />;
  }

  // ── Error / empty state ──
  if (isError || !ads || ads.length === 0) {
    return null;
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Advertisements"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Slides track */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
        aria-live="polite"
      >
        {ads.map((ad, i) => (
          <AdSlide key={ad.id} ad={ad} isCurrent={i === current} />
        ))}
      </div>

      {/* Navigation arrows (visible on hover / focus) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous ad"
            className={cn(
              "absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm",
              "text-foreground/70 transition hover:bg-background hover:text-foreground",
              "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next ad"
            className={cn(
              "absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm",
              "text-foreground/70 transition hover:bg-background hover:text-foreground",
              "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {total > 1 && (
        <div
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5"
          role="tablist"
          aria-label="Ad slides"
        >
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to ad ${i + 1}: ${ad.title}`}
              onClick={() => handleGoTo(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === current
                  ? "w-6 bg-primary"
                  : "w-2 bg-foreground/20 hover:bg-foreground/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
