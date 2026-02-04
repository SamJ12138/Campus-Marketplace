"use client";

import { useCallback, useState, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import {
  Heart,
  Eye,
  MapPin,
  Briefcase,
  BookOpen,
  Wrench,
  Car,
  Music,
  Laptop,
  ShoppingBag,
  TrendingUp,
  Clock,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useToggleFavorite } from "@/lib/hooks/use-listings";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";

// ----------------------------------------------------------------
// Category-to-icon map for service listings without photos
// ----------------------------------------------------------------
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  tutoring: BookOpen,
  transportation: Car,
  music: Music,
  technology: Laptop,
  repair: Wrench,
  default: Briefcase,
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  tutoring: "bg-blue-100 text-blue-600",
  transportation: "bg-green-100 text-green-600",
  music: "bg-purple-100 text-purple-600",
  technology: "bg-orange-100 text-orange-600",
  repair: "bg-amber-100 text-amber-600",
  default: "bg-slate-100 text-slate-600",
};

function getCategoryVisual(slug: string) {
  const Icon = CATEGORY_ICON_MAP[slug] ?? CATEGORY_ICON_MAP.default;
  const color = CATEGORY_COLOR_MAP[slug] ?? CATEGORY_COLOR_MAP.default;
  return { Icon, color };
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
interface ListingCardProps {
  listing: Listing;
  onQuickView?: (listing: Listing) => void;
}

export default function ListingCard({ listing, onQuickView }: ListingCardProps) {
  const toggleFavorite = useToggleFavorite();
  const { requireAuth } = useRequireAuth();
  const hasPhoto = listing.photos.length > 0;
  const photoCount = listing.photos.length;
  const timeAgo = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
  });

  // Badges
  const hoursOld = differenceInHours(new Date(), new Date(listing.created_at));
  const isJustPosted = hoursOld < 24;
  const isPopular = listing.view_count > 50;

  // Image carousel state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const imageRef = useRef<HTMLDivElement>(null);

  const currentPhoto =
    hasPhoto && listing.photos[activePhotoIndex]
      ? listing.photos[activePhotoIndex]
      : null;
  const thumbnailUrl = currentPhoto?.thumbnail_url ?? null;

  const handleImageMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (photoCount <= 1 || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;
      const idx = Math.min(
        Math.floor(fraction * photoCount),
        photoCount - 1,
      );
      setActivePhotoIndex(idx);
    },
    [photoCount],
  );

  const handleImageMouseLeave = useCallback(() => {
    setActivePhotoIndex(0);
  }, []);

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

  const { Icon: CategoryIcon, color: categoryColor } = getCategoryVisual(
    listing.category.slug,
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* --- Image / Placeholder --- */}
      <div
        ref={imageRef}
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
        onMouseMove={handleImageMouseMove}
        onMouseLeave={handleImageMouseLeave}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : listing.type === "service" ? (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              categoryColor,
            )}
          >
            <CategoryIcon className="h-16 w-16 opacity-60" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Freshness & popularity badges — top-left */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {isJustPosted && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              <Clock className="h-3 w-3" />
              Just posted
            </span>
          )}
          {isPopular && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              <TrendingUp className="h-3 w-3" />
              Popular
            </span>
          )}
        </div>

        {/* Type badge — top-right */}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
            listing.type === "service"
              ? "bg-blue-600 text-white"
              : "bg-emerald-600 text-white",
          )}
        >
          {listing.type === "service" ? t.listings.servicesTab : t.listings.itemsTab}
        </span>

        {/* Price pill — bottom-left of image */}
        {listing.price_hint && (
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/85 px-3 py-1 text-sm font-bold text-background shadow-lg backdrop-blur-sm">
            {listing.price_hint}
          </span>
        )}

        {/* Quick-view button — bottom-right, visible on hover */}
        {onQuickView && (
          <button
            type="button"
            onClick={handleQuickView}
            aria-label="Quick view"
            className={cn(
              "absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-background/80 p-2 shadow-md backdrop-blur-sm",
              "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
              "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Eye className="h-4 w-4 text-foreground" />
          </button>
        )}

        {/* Image carousel dot indicators */}
        {photoCount > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
            {listing.photos.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  idx === activePhotoIndex
                    ? "w-3 bg-white"
                    : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        )}

        {/* Sold overlay */}
        {listing.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-md bg-red-600 px-4 py-1.5 text-lg font-bold uppercase tracking-wider text-white">
              {t.listings.statusSold}
            </span>
          </div>
        )}
      </div>

      {/* --- Content (simplified) --- */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {listing.title}
        </h3>

        {/* Location */}
        {listing.location_hint && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{listing.location_hint}</span>
          </div>
        )}

        {/* Poster info */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {listing.user.avatar_url ? (
            <img
              src={listing.user.avatar_url}
              alt={listing.user.display_name}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              {listing.user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-foreground/80 truncate max-w-[120px]">
            {listing.user.display_name}
          </span>
        </div>

        {/* Footer: time ago + favorite */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={
              listing.is_favorited
                ? t.listings.removeFavorite
                : t.listings.saveFavorite
            }
            className={cn(
              "rounded-full p-1.5 transition-all duration-200",
              "hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
              listing.is_favorited ? "text-rose-500" : "text-muted-foreground hover:text-rose-400",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-all duration-200",
                listing.is_favorited && "fill-current animate-heart-pop",
              )}
            />
          </button>
        </div>
      </div>
    </Link>
  );
}
