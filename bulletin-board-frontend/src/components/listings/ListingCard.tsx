"use client";

import { useCallback, useState, useRef, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Sparkles,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useToggleFavorite } from "@/lib/hooks/use-listings";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  tutoring: BookOpen,
  transportation: Car,
  music: Music,
  technology: Laptop,
  repair: Wrench,
  default: Briefcase,
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  tutoring: "from-blue-400 to-indigo-500",
  transportation: "from-emerald-400 to-teal-500",
  music: "from-purple-400 to-pink-500",
  technology: "from-orange-400 to-red-500",
  repair: "from-amber-400 to-orange-500",
  default: "from-slate-400 to-slate-500",
};

function getCategoryVisual(slug: string) {
  const Icon = CATEGORY_ICON_MAP[slug] ?? CATEGORY_ICON_MAP.default;
  const gradient = CATEGORY_COLOR_MAP[slug] ?? CATEGORY_COLOR_MAP.default;
  return { Icon, gradient };
}

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

  const hoursOld = differenceInHours(new Date(), new Date(listing.created_at));
  const isJustPosted = hoursOld < 24;
  const isPopular = listing.view_count > 50;

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

  const { Icon: CategoryIcon, gradient: categoryGradient } = getCategoryVisual(
    listing.category.slug,
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 glass",
        "transition-all duration-300 ease-spring",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-2 hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div
        ref={imageRef}
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
        onMouseMove={handleImageMouseMove}
        onMouseLeave={handleImageMouseLeave}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : listing.type === "service" ? (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              categoryGradient,
            )}
          >
            <CategoryIcon className="h-16 w-16 text-white/80" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {isJustPosted && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md animate-wiggle-slow">
              <Sparkles className="h-3 w-3" />
              Just posted
            </span>
          )}
          {isPopular && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
              <TrendingUp className="h-3 w-3" />
              Popular
            </span>
          )}
        </div>

        <span
          className={cn(
            "absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow-md",
            listing.type === "service"
              ? "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-white"
              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
          )}
        >
          {listing.type === "service" ? t.listings.servicesTab : t.listings.itemsTab}
        </span>

        {listing.price_hint && (
          <span className="absolute bottom-2 left-2 rounded-xl bg-foreground/90 px-3 py-1.5 text-sm font-bold text-background shadow-lg backdrop-blur-sm">
            {listing.price_hint}
          </span>
        )}

        {onQuickView && (
          <button
            type="button"
            onClick={handleQuickView}
            aria-label="Quick view"
            className={cn(
              "absolute bottom-2 right-2 flex items-center justify-center rounded-xl glass p-2.5 shadow-md",
              "opacity-0 transition-all duration-200 group-hover:opacity-100",
              "hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Eye className="h-4 w-4 text-foreground" />
          </button>
        )}

        {photoCount > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {listing.photos.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  idx === activePhotoIndex
                    ? "w-4 bg-white shadow-sm"
                    : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        )}

        {listing.status === "sold" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <span className="rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-5 py-2 text-lg font-bold uppercase tracking-wider text-white shadow-lg">
              {t.listings.statusSold}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold font-display leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {listing.title}
        </h3>

        {listing.location_hint && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0 text-primary/60" />
            <span className="truncate">{listing.location_hint}</span>
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          {listing.user.avatar_url ? (
            <Image
              src={listing.user.avatar_url}
              alt={listing.user.display_name}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover ring-2 ring-primary/20"
              unoptimized={listing.user.avatar_url.includes('r2.dev')}
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-[hsl(var(--secondary-accent))]/20 text-[10px] font-bold text-primary">
              {listing.user.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-foreground/80 truncate max-w-[120px]">
            {listing.user.display_name}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          <button
            type="button"
            onClick={handleFavoriteClick}
            disabled={toggleFavorite.isPending}
            aria-label={
              listing.is_favorited
                ? t.listings.removeFavorite
                : t.listings.saveFavorite
            }
            className={cn(
              "rounded-full p-2 transition-all duration-200 ease-spring",
              "hover:bg-rose-50 dark:hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
              listing.is_favorited ? "text-rose-500" : "text-muted-foreground hover:text-rose-400",
              toggleFavorite.isPending && "opacity-50 cursor-not-allowed",
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
