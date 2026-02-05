"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Loader2,
  Pencil,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { useListings, useRenewListing, useMarkSold } from "@/lib/hooks/use-listings";
import type { Listing, ListingStatus } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

const STATUS_CONFIG: Record<
  ListingStatus,
  { label: string; icon: typeof CheckCircle; className: string }
> = {
  active: {
    label: t.listings.statusActive,
    icon: CheckCircle,
    className: "bg-success/10 text-success",
  },
  expired: {
    label: t.listings.statusExpired,
    icon: Clock,
    className: "bg-warning/10 text-warning",
  },
  sold: {
    label: t.listings.statusSold,
    icon: ShoppingBag,
    className: "bg-muted text-muted-foreground",
  },
  draft: {
    label: t.listings.statusDraft,
    icon: Pencil,
    className: "bg-muted text-muted-foreground",
  },
  removed: {
    label: t.listings.statusRemoved,
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

function StatusBadge({ status }: { status: ListingStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ListingCard({
  listing,
  onRenew,
  onMarkSold,
  isRenewing,
  isMarkingSold,
}: {
  listing: Listing;
  onRenew: (id: string) => void;
  onMarkSold: (id: string) => void;
  isRenewing: boolean;
  isMarkingSold: boolean;
}) {
  const thumbnailUrl =
    listing.photos.length > 0 ? listing.photos[0].thumbnail_url : null;

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30">
      {/* Thumbnail */}
      <div className="h-20 w-20 shrink-0 rounded-md bg-muted overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <Link
            href={`/listings/${listing.id}`}
            className="text-sm font-medium hover:underline line-clamp-1"
          >
            {listing.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={listing.status} />
            {listing.price_hint && (
              <span className="text-xs text-muted-foreground">
                {listing.price_hint}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          {listing.status === "active" && (
            <>
              <Link
                href={`/listings/${listing.id}/edit`}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2",
                  "text-xs font-medium hover:bg-accent transition-colors",
                )}
              >
                <Pencil className="h-3 w-3" />
                {t.common.edit}
              </Link>
              <button
                type="button"
                onClick={() => onMarkSold(listing.id)}
                disabled={isMarkingSold}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2",
                  "text-xs font-medium hover:bg-accent transition-colors",
                  "disabled:opacity-50 disabled:pointer-events-none",
                )}
              >
                {isMarkingSold ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ShoppingBag className="h-3 w-3" />
                )}
                {t.listings.markSold}
              </button>
            </>
          )}
          {listing.status === "expired" && (
            <button
              type="button"
              onClick={() => onRenew(listing.id)}
              disabled={isRenewing}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2",
                "text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                "disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              {isRenewing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {t.listings.renew}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-3 animate-pulse">
      <div className="h-20 w-20 shrink-0 rounded-md bg-muted" />
      <div className="flex flex-1 flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="h-7 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useListings(
    user ? { status: undefined } : {},
  );
  const renewMutation = useRenewListing();
  const markSoldMutation = useMarkSold();

  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [markingSoldId, setMarkingSoldId] = useState<string | null>(null);

  const listings = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages
      .flatMap((page) => page.items)
      .filter((listing) => listing.is_own);
  }, [data]);

  function handleRenew(id: string) {
    setRenewingId(id);
    renewMutation.mutate(id, { onSettled: () => setRenewingId(null) });
  }

  function handleMarkSold(id: string) {
    setMarkingSoldId(id);
    markSoldMutation.mutate(id, { onSettled: () => setMarkingSoldId(null) });
  }

  return (
    <ProtectedPage>
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t.profile.myListings}</h1>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-destructive">{t.common.error}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && listings.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            You haven&apos;t posted any listings yet.
          </p>
          <Link
            href="/listings/new"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4",
              "text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            )}
          >
            Create your first listing
          </Link>
        </div>
      )}

      {/* Listings grid */}
      {listings.length > 0 && (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onRenew={handleRenew}
              onMarkSold={handleMarkSold}
              isRenewing={renewingId === listing.id}
              isMarkingSold={markingSoldId === listing.id}
            />
          ))}
        </div>
      )}
    </div>
    </ProtectedPage>
  );
}
