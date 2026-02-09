"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, HeartOff, Package, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
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
    listing.photos.length > 0
      ? listing.photos[0].thumbnail_url || listing.photos[0].url
      : null;

  return (
    <div className="group relative rounded-2xl border border-border/50 glass overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30">
      {/* Image */}
      <Link href={`/listings/${listing.id}`} className="block">
        <div className="aspect-[4/3] bg-muted relative">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized={thumbnailUrl.includes('r2.dev') || undefined}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Package className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Type badge */}
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md",
              listing.type === "service"
                ? "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-white"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
            )}
          >
            {listing.type === "service" ? "Service" : "Item"}
          </span>

          {/* Price */}
          {listing.price_hint && (
            <span className="absolute bottom-2 left-2 rounded-xl bg-foreground/90 px-3 py-1.5 text-sm font-bold text-background shadow-lg backdrop-blur-sm">
              {formatPrice(listing.price_hint)}
            </span>
          )}
        </div>
      </Link>

      {/* Unfavorite button */}
      <button
        type="button"
        onClick={() => onUnfavorite(listing.id)}
        disabled={isUnfavoriting}
        className={cn(
          "absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full",
          "bg-background/80 backdrop-blur-sm border border-border shadow-md",
          "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 transition-all duration-200",
          "disabled:opacity-50 disabled:pointer-events-none",
        )}
        aria-label="Remove from favourites"
      >
        {isUnfavoriting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <HeartOff className="h-4 w-4" />
        )}
      </button>

      {/* Info */}
      <div className="p-4 space-y-2">
        <Link
          href={`/listings/${listing.id}`}
          className="block"
        >
          <h3 className="text-sm font-semibold font-display line-clamp-2 leading-snug text-foreground transition-colors hover:text-primary">
            {listing.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          {listing.user.avatar_url ? (
            <Image
              src={listing.user.avatar_url}
              alt={listing.user.display_name}
              width={20}
              height={20}
              className="h-5 w-5 rounded-full object-cover ring-1 ring-primary/20"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-[hsl(var(--secondary-accent))]/20 text-[8px] font-bold text-primary">
              {listing.user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {listing.user.display_name}
          </span>
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 glass overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function MyFavouritesPage() {
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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/feed"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 glass hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display">My Favourites</h1>
            <p className="text-sm text-muted-foreground">
              Offers you&apos;ve saved for later
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Heart className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm text-destructive">Failed to load favourites</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && listings.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-[hsl(var(--secondary-accent))]/10">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold font-display">No favourites yet</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                When you find offers you like, tap the heart icon to save them here for easy access later.
              </p>
            </div>
            <Link
              href="/feed"
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl",
                "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] px-6",
                "text-sm font-semibold text-white shadow-md shadow-primary/25",
                "hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 transition-all duration-200",
              )}
            >
              Browse offers
            </Link>
          </div>
        )}

        {/* Grid */}
        {listings.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {listings.length} {listings.length === 1 ? "offer" : "offers"} saved
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
