"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Tag,
  CalendarDays,
  MapPin,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useAd } from "@/lib/hooks/use-ads";
import { trackAdClick } from "@/lib/utils/ad-tracking";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: ad, isLoading, isError } = useAd(params.id);

  const [copied, setCopied] = useState(false);

  const copyCoupon = useCallback(async () => {
    if (!ad?.couponCode) return;
    try {
      await navigator.clipboard.writeText(ad.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable
    }
  }, [ad?.couponCode]);

  const handleExternalClick = useCallback(() => {
    if (!ad) return;
    trackAdClick(ad.id);
    if (ad.externalUrl) {
      window.open(ad.externalUrl, "_blank", "noopener,noreferrer");
    }
  }, [ad]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    );
  }

  // ── Error / not found ──
  if (isError || !ad) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Ad not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This ad may have expired or been removed.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/feed")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to feed
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => router.push("/feed")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </button>

      {/* Hero image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
        <img
          src={ad.image.src}
          alt={ad.image.alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Title + badge */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
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
            {ad.type === "EXTERNAL_LINK" && <ExternalLink className="h-3 w-3" />}
            {ad.type === "COUPON" && <Tag className="h-3 w-3" />}
            {ad.type === "EVENT" && <CalendarDays className="h-3 w-3" />}
            {ad.type === "EXTERNAL_LINK"
              ? "Sponsored"
              : ad.type === "COUPON"
                ? "Coupon"
                : ad.type === "EVENT"
                  ? "Event"
                  : "Featured"}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {ad.title}
        </h1>

        {ad.subtitle && (
          <p className="text-base leading-relaxed text-muted-foreground">
            {ad.subtitle}
          </p>
        )}
      </div>

      {/* Body */}
      {ad.body && (
        <div className="prose prose-slate max-w-none dark:prose-invert">
          {ad.body.split("\n").map((paragraph, i) =>
            paragraph.trim() ? (
              <p key={i}>{paragraph}</p>
            ) : null,
          )}
        </div>
      )}

      {/* ── Type-specific sections ── */}

      {/* COUPON */}
      {ad.type === "COUPON" && ad.couponCode && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/30">
          <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-300">
            Your coupon code
          </p>
          <div className="flex items-center gap-3">
            <code className="rounded-md border border-green-300 bg-white px-4 py-2 text-lg font-bold tracking-wider text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
              {ad.couponCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyCoupon}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* EVENT */}
      {ad.type === "EVENT" && ad.event && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm font-medium">
                {format(new Date(ad.event.startAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            {ad.event.location && (
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {ad.event.location}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXTERNAL_LINK */}
      {ad.type === "EXTERNAL_LINK" && ad.externalUrl && (
        <Button size="lg" onClick={handleExternalClick} className="gap-2">
          {ad.ctaText}
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}

      {/* Disclaimer */}
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Ads are informational. We do not process payments. All transactions
        happen offline between users.
      </p>
    </div>
  );
}
