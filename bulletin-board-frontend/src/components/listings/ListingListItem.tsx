"use client";

import { useCallback, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Heart, Eye, MapPin, ShoppingBag } from "lucide-react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useToggleFavorite } from "@/lib/hooks/use-listings";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";

interface ListingListItemProps {
  listing: Listing;
  onQuickView?: (listing: Listing) => void;
}

export default function ListingListItem({
  listing,
  onQuickView,
}: ListingListItemProps) {
  const toggleFavorite = useToggleFavorite();
  const { requireAuth } = useRequireAuth();
  const hasPhoto = listing.photos.length > 0;
  const thumbnailUrl = hasPhoto ? listing.photos[0].thumbnail_url : null;
  const timeAgo = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
  });

  const handleFavoriteClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      requireAuth(() => {
        toggleFavorite.mutate({
          listingId: listing.id,
          isFavorited: listing.is_favorited,
        });
      });
    },
    [toggleFavorite, listing.id, listing.is_favorited, requireAuth],
  );

  const handleQuickView = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onQuickView?.(listing);
    },
    [onQuickView, listing],
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-3",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:border-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            fill
            sizes="80px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
          {listing.title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {listing.price_hint && (
            <span className="font-bold text-foreground">
              {listing.price_hint}
            </span>
          )}
          {listing.location_hint && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{listing.location_hint}</span>
            </span>
          )}
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {onQuickView && (
          <button
            type="button"
            onClick={handleQuickView}
            aria-label="Quick view"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={
            listing.is_favorited
              ? t.listings.removeFavorite
              : t.listings.saveFavorite
          }
          className={cn(
            "rounded-full p-2 transition-all duration-200",
            "hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
            listing.is_favorited
              ? "text-rose-500"
              : "text-muted-foreground hover:text-rose-400",
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-all duration-200",
              listing.is_favorited && "fill-current",
            )}
          />
        </button>
      </div>
    </Link>
  );
}
