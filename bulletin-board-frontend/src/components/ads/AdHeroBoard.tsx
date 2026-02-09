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
  Share2,
  MessageSquarePlus,
  Check,
  X,
  Loader2,
  Send,
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
  const ctaUrl = ad.ctaUrl;

  // Special actions
  if (ctaUrl === "action:share") {
    return { kind: "share" as const, href: "#" };
  }
  if (ctaUrl === "action:feedback") {
    return { kind: "feedback" as const, href: "#" };
  }

  // Custom internal URL
  if (ctaUrl && ctaUrl.startsWith("/")) {
    return { kind: "internal" as const, href: ctaUrl };
  }

  // Custom external URL
  if (ctaUrl && (ctaUrl.startsWith("http://") || ctaUrl.startsWith("https://"))) {
    return { kind: "external" as const, href: ctaUrl };
  }

  // Default behavior by type
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
// Share helper
// ──────────────────────────────────────────────

async function handleShare(): Promise<"shared" | "copied" | "failed"> {
  const shareData = {
    title: "Check out GimmeDat!",
    text: "GimmeDat is a campus marketplace built by Gettysburg students. Buy, sell, and trade with people you trust!",
    url: window.location.origin,
  };

  // Try native share (mobile)
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch {
      // User cancelled or error — fall through to clipboard
    }
  }

  // Fallback: copy link
  try {
    await navigator.clipboard.writeText(
      `${shareData.text}\n${shareData.url}`
    );
    return "copied";
  } catch {
    return "failed";
  }
}

// ──────────────────────────────────────────────
// Feedback modal
// ──────────────────────────────────────────────

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const user = useAuthStore((s) => s.user);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);

    // Build mailto link as a simple feedback mechanism
    const contactEmail = email || user?.email || "anonymous";
    const subject = encodeURIComponent("GimmeDat Feedback");
    const body = encodeURIComponent(
      `From: ${contactEmail}\n\n${message}`
    );
    window.open(
      `mailto:gimmedat@gettysburg.edu?subject=${subject}&body=${body}`,
      "_blank"
    );

    // Brief delay so user sees the sending state
    await new Promise((r) => setTimeout(r, 500));
    setIsSending(false);
    setSubmitted(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold">Thanks for your feedback!</h3>
            <p className="text-sm text-muted-foreground">
              Your email client should have opened with the feedback pre-filled.
              You can also reach us on Instagram @gimmedatapp.
            </p>
            <Button onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Send Feedback</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Bug report, feature idea, or just a thought — we read every message.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {!user && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              )}

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Also: gimmedat@gettysburg.edu
                </p>
                <Button
                  type="submit"
                  disabled={!message.trim() || isSending}
                  className="gap-2"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Toast notification
// ──────────────────────────────────────────────

function Toast({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
        <Check className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
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
  onShare,
  onFeedback,
}: {
  ad: Ad;
  isCurrent: boolean;
  onShare: () => void;
  onFeedback: () => void;
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

    switch (action.kind) {
      case "external":
        window.open(action.href, "_blank", "noopener,noreferrer");
        break;
      case "share":
        onShare();
        break;
      case "feedback":
        onFeedback();
        break;
      case "internal":
        router.push(action.href);
        break;
    }
  }, [ad.id, action, router, onShare, onFeedback]);

  const accentColor = ad.theme?.accent;

  // Choose the right icon for the CTA button
  const ctaIcon =
    action.kind === "external" ? (
      <ExternalLink className="h-4 w-4" />
    ) : action.kind === "share" ? (
      <Share2 className="h-4 w-4" />
    ) : action.kind === "feedback" ? (
      <MessageSquarePlus className="h-4 w-4" />
    ) : null;

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
            {ctaIcon}
          </Button>
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
  const [toast, setToast] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
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

  // Share handler
  const handleShareAction = useCallback(async () => {
    const result = await handleShare();
    if (result === "copied") {
      setToast("Link copied to clipboard!");
    } else if (result === "shared") {
      setToast("Shared successfully!");
    } else {
      setToast("Couldn't share — try copying the URL manually.");
    }
  }, []);

  // Feedback handler
  const handleFeedbackAction = useCallback(() => {
    setShowFeedback(true);
  }, []);

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
    <>
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
            <AdSlide
              key={ad.id}
              ad={ad}
              isCurrent={i === current}
              onShare={handleShareAction}
              onFeedback={handleFeedbackAction}
            />
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

      {/* Toast notification */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Feedback modal */}
      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}
