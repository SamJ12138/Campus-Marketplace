"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, HeartOff, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useFavorites, useToggleFavorite } from "@/lib/hooks/use-listings";
import type { Listing } from "@/lib/types";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

function FavoriteCard({
  listing,
  onUnfavorite,
  isUnfavoriting,
}: {
  listing: Listing;
  onUnfavorite: (id: string) => void;
  isUnfavoriting: boolean;
}) {
  const thumbnailUrl =
    listing.photos.length > 0 ? listing.photos[0].thumbnail_url : null;

  return (
    <div className="group relative rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/30">
      {/* Image */}
      <Link href={`/listings/${listing.id}`} className="block">
        <div className="aspect-[4/3] bg-muted">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={listing.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>
      </Link>

      {/* Unfavorite button */}
      <button
        type="button"
        onClick={() => onUnfavorite(listing.id)}
        disabled={isUnfavoriting}
        className={cn(
          "absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full",
          "bg-background/80 backdrop-blur-sm border border-border",
          "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label={t.listings.removeFavorite}
      >
        {isUnfavoriting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <HeartOff className="h-4 w-4" />
        )}
      </button>

      {/* Info */}
      <div className="p-3 space-y-1">
        <Link
          href={`/listings/${listing.id}`}
          className="text-sm font-medium line-clamp-1 hover:underline"
        >
          {listing.title}
        </Link>
        {listing.price_hint && (
          <p className="text-xs text-muted-foreground">{listing.price_hint}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {listing.user.display_name}
        </p>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function SavedListingsPage() {
  const { data, isLoading, isError } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const listings = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  function handleUnfavorite(listingId: string) {
    toggleFavorite.mutate({ listingId, isFavorited: true });
  }

  return (
    <ProtectedPage>
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t.profile.savedListings}</h1>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No saved offers</p>
            <p className="text-sm text-muted-foreground">
              Offers you save will appear here.
            </p>
          </div>
          <Link
            href="/feed"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4",
              "text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            )}
          >
            Browse offers
          </Link>
        </div>
      )}

      {/* Grid */}
      {listings.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {listings.map((listing) => (
            <FavoriteCard
              key={listing.id}
              listing={listing}
              onUnfavorite={handleUnfavorite}
              isUnfavoriting={
                toggleFavorite.isPending &&
                toggleFavorite.variables?.listingId === listing.id
              }
            />
          ))}
        </div>
      )}
    </div>
    </ProtectedPage>
  );
}
