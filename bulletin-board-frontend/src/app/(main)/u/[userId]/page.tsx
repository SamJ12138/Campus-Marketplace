"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  MessageSquare,
  ShieldAlert,
  Flag,
  CalendarDays,
  Package,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { en as t } from "@/lib/i18n/en";
import { useAuth } from "@/lib/hooks/use-auth";
import { getUserProfile, blockUser } from "@/lib/api/users";
import { useListings } from "@/lib/hooks/use-listings";
import { useUIStore } from "@/lib/stores/ui";
import type { User, Listing } from "@/lib/types";
import { ApiError } from "@/lib/api/client";

function ListingGridCard({ listing }: { listing: Listing }) {
  const thumbnailUrl =
    listing.photos.length > 0
      ? listing.photos[0].thumbnail_url || listing.photos[0].url
      : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/30"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            fill
            className="object-cover"
            unoptimized={thumbnailUrl.includes('r2.dev') || undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium line-clamp-1 group-hover:underline">
          {listing.title}
        </p>
        {listing.price_hint && (
          <p className="text-xs font-semibold text-emerald-600">{formatPrice(listing.price_hint)}</p>
        )}
      </div>
    </Link>
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

export default function PublicUserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const openReportModal = useUIStore((s) => s.openReportModal);

  const [profile, setProfile] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { data: listingsData, isLoading: isLoadingListings } = useListings({
    status: "active",
  });

  const userListings = useMemo(() => {
    if (!listingsData?.pages) return [];
    return listingsData.pages
      .flatMap((page) => page.items)
      .filter((listing) => listing.user.id === userId);
  }, [listingsData, userId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProfile(true);
    setProfileError(null);

    getUserProfile(userId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(
            err instanceof ApiError ? err.detail : t.errors.generic,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleBlock() {
    if (!profile) return;
    setIsBlocking(true);
    try {
      await blockUser(profile.id);
      setIsBlocked(true);
    } catch {
      // Silently handle
    } finally {
      setIsBlocking(false);
    }
  }

  function handleReport() {
    if (!profile) return;
    openReportModal("user", profile.id);
  }

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
        <UserX className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {profileError || t.errors.notFound}
        </p>
        <Link
          href="/feed"
          className="text-sm font-medium text-primary hover:underline"
        >
          Go to feed
        </Link>
      </div>
    );
  }

  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric" },
  );

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* Avatar */}
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover shrink-0"
            unoptimized={profile.avatar_url.includes('r2.dev') || undefined}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary shrink-0">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          {profile.class_year && (
            <p className="text-sm text-muted-foreground">
              {t.profile.classOf.replace("{year}", String(profile.class_year))}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 justify-center sm:justify-start pt-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              {t.profile.listingsCount.replace(
                "{count}",
                String(profile.listing_count),
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {t.profile.memberSince.replace("{date}", memberSince)}
            </div>
          </div>

          {/* Action buttons */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 justify-center sm:justify-start pt-2">
              <button
                type="button"
                onClick={() => router.push(`/messages?to=${userId}`)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4",
                  "text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90 transition-colors",
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </button>

              {!isBlocked ? (
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={isBlocking}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3",
                    "text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {isBlocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  Block User
                </button>
              ) : (
                <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm font-medium text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  Blocked
                </span>
              )}

              <button
                type="button"
                onClick={handleReport}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3",
                  "text-sm font-medium text-destructive",
                  "hover:bg-destructive/10 transition-colors",
                )}
              >
                <Flag className="h-4 w-4" />
                Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Listings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Listings</h2>

        {isLoadingListings && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoadingListings && userListings.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No active listings from this user.
            </p>
          </div>
        )}

        {userListings.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {userListings.map((listing) => (
              <ListingGridCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
