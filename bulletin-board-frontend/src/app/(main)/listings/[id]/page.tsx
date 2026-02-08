"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import {
  Heart,
  Share2,
  Flag,
  Edit3,
  Trash2,
  RotateCw,
  Check,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { en as t } from "@/lib/i18n/en";
import { ListingSchema } from "@/components/seo";
import {
  useListing,
  useToggleFavorite,
  useRenewListing,
  useMarkSold,
  useDeleteListing,
} from "@/lib/hooks/use-listings";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { useUIStore } from "@/lib/stores/ui";

// ----------------------------------------------------------------
// Skeleton for loading state
// ----------------------------------------------------------------
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-6">
      <div className="h-6 w-32 rounded bg-slate-200" />
      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="aspect-[4/3] w-full rounded-xl bg-slate-200" />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="h-5 w-20 rounded-full bg-slate-200" />
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-5 w-24 rounded bg-slate-200" />
          <div className="h-20 w-full rounded bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-12 w-full rounded-lg bg-slate-200" />
          <div className="h-16 w-full rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// 404 state
// ----------------------------------------------------------------
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="h-16 w-16 text-slate-300" />
      <h2 className="mt-4 text-xl font-semibold text-slate-700">
        Offer not found
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        This listing may have been removed or the link is incorrect.
      </p>
      <Link
        href="/feed"
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Back to listings
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------
// Photo gallery with carousel + basic lightbox
// ----------------------------------------------------------------
function PhotoGallery({ photos }: { photos: Listing["photos"] }) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-slate-100">
        <Eye className="h-16 w-16 text-slate-300" />
      </div>
    );
  }

  return (
    <>
      {/* Main carousel */}
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <div className="aspect-[4/3] w-full relative">
          <Image
            src={photos[current].url}
            alt={`Photo ${current + 1} of ${photos.length}`}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="cursor-pointer object-cover"
            onClick={() => setLightboxOpen(true)}
            priority
            unoptimized={photos[current].url.includes('r2.dev') || undefined}
          />
        </div>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                aria-label={`Go to photo ${idx + 1}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  idx === current
                    ? "w-4 bg-white"
                    : "bg-white/60 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setCurrent(idx)}
              className={cn(
                "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                idx === current
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={photo.thumbnail_url || photo.url}
                alt={`Thumbnail ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={(photo.thumbnail_url || photo.url).includes('r2.dev') || undefined}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative max-h-[90vh] max-w-[90vw] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[current].url}
              alt={`Photo ${current + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              priority
              unoptimized={photos[current].url.includes('r2.dev') || undefined}
            />
          </div>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/80">
            {current + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

// ----------------------------------------------------------------
// Confirm modal
// ----------------------------------------------------------------
function ConfirmModal({
  title,
  message,
  confirmLabel,
  isDestructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Location type label
// ----------------------------------------------------------------
function locationLabel(locationType: Listing["location_type"]): string {
  switch (locationType) {
    case "on_campus":
      return t.listings.locationOnCampus;
    case "off_campus":
      return t.listings.locationOffCampus;
    case "remote":
      return t.listings.locationRemote;
    default:
      return locationType;
  }
}

// ----------------------------------------------------------------
// Main listing detail page
// ----------------------------------------------------------------
export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;

  const { data: listing, isLoading, isError } = useListing(listingId);
  const { user: _user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const openReportModal = useUIStore((s) => s.openReportModal);

  const toggleFavorite = useToggleFavorite();
  const renewListing = useRenewListing();
  const markSoldMutation = useMarkSold();
  const deleteListingMutation = useDeleteListing();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSold, setConfirmSold] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  // Handle share
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/listings/${listingId}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    });
  }, [listingId]);

  // Handle favorite
  const handleToggleFavorite = useCallback(() => {
    if (!listing) return;
    requireAuth(() => {
      toggleFavorite.mutate({
        listingId: listing.id,
        isFavorited: listing.is_favorited,
      });
    });
  }, [listing, toggleFavorite, requireAuth]);

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteListingMutation.mutate(listingId, {
      onSuccess: () => {
        router.push("/feed");
      },
    });
  }, [deleteListingMutation, listingId, router]);

  // Handle mark sold
  const handleMarkSold = useCallback(() => {
    markSoldMutation.mutate(listingId, {
      onSuccess: () => {
        setConfirmSold(false);
      },
    });
  }, [markSoldMutation, listingId]);

  // Handle renew
  const handleRenew = useCallback(() => {
    renewListing.mutate(listingId);
  }, [renewListing, listingId]);

  // Computed values
  const timeAgo = useMemo(
    () =>
      listing
        ? formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })
        : "",
    [listing],
  );

  const daysUntilExpiry = useMemo(
    () =>
      listing ? differenceInDays(new Date(listing.expires_at), new Date()) : 0,
    [listing],
  );

  const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry > 0;

  // Loading
  if (isLoading) return <DetailSkeleton />;

  // Error / not found
  if (isError || !listing) return <NotFound />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Structured data for SEO */}
      <ListingSchema listing={listing} />

      {/* Back navigation */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </button>

      {/* Main layout */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Photos column */}
        <div className="lg:col-span-3">
          <PhotoGallery photos={listing.photos} />
        </div>

        {/* Details column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Type + Category badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                listing.type === "service"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700",
              )}
            >
              {listing.type === "service"
                ? t.listings.servicesTab
                : t.listings.itemsTab}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {listing.category.name}
            </span>
            {listing.status === "sold" && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                {t.listings.statusSold}
              </span>
            )}
            {listing.status === "expired" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {t.listings.statusExpired}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold leading-tight text-slate-900">
            {listing.title}
          </h1>

          {/* Price */}
          {listing.price_hint && (
            <p className="text-xl font-bold text-emerald-600">
              {formatPrice(listing.price_hint)}
            </p>
          )}

          {/* Description */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {listing.description}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="font-medium">
              {locationLabel(listing.location_type)}
            </span>
            {listing.location_hint && (
              <span className="text-slate-500">
                - {listing.location_hint}
              </span>
            )}
          </div>

          {/* Availability */}
          {listing.availability && (
            <p className="text-sm text-slate-600">
              <span className="font-medium">Availability:</span>{" "}
              {listing.availability}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {t.listings.viewCount.replace("{count}", String(listing.view_count))}
            </span>
            <span>Posted {timeAgo}</span>
            {daysUntilExpiry > 0 && (
              <span
                className={cn(
                  isExpiringSoon && "font-medium text-amber-600",
                )}
              >
                Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}
              </span>
            )}
            {daysUntilExpiry <= 0 && listing.status !== "sold" && (
              <span className="font-medium text-red-600">Expired</span>
            )}
          </div>

          {/* Poster card */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {listing.user.avatar_url ? (
                <Image
                  src={listing.user.avatar_url}
                  alt={listing.user.display_name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                  unoptimized={listing.user.avatar_url.includes('r2.dev') || undefined}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-bold text-slate-600">
                  {listing.user.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {listing.user.display_name}
                </p>
                {listing.user.class_year && (
                  <p className="text-xs text-slate-500">
                    Class of {listing.user.class_year}
                  </p>
                )}
              </div>
              <Link
                href={`/u/${listing.user.id}`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View Profile
              </Link>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {listing.is_own ? (
              <>
                <Link
                  href={`/listings/${listing.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Edit3 className="h-4 w-4" />
                  {t.common.edit}
                </Link>
                {isExpiringSoon && (
                  <button
                    type="button"
                    onClick={handleRenew}
                    disabled={renewListing.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RotateCw
                      className={cn(
                        "h-4 w-4",
                        renewListing.isPending && "animate-spin",
                      )}
                    />
                    {t.listings.renew}
                  </button>
                )}
                {listing.type === "item" &&
                  listing.status === "active" && (
                    <button
                      type="button"
                      onClick={() => setConfirmSold(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="h-4 w-4" />
                      {t.listings.markSold}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.common.delete}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => requireAuth(() => router.push(`/messages?listing=${listing.id}`))}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-label={
                    listing.is_favorited
                      ? t.listings.removeFavorite
                      : t.listings.saveFavorite
                  }
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                    listing.is_favorited
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      listing.is_favorited && "fill-current",
                    )}
                  />
                  {listing.is_favorited ? "Saved" : "Save"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            {!listing.is_own && (
              <button
                type="button"
                onClick={() => requireAuth(() => openReportModal("listing", listing.id))}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Flag className="h-4 w-4" />
                Report
              </button>
            )}
          </div>

          {/* Safety banner (inline, smaller) */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700">
                {t.safety.meetPublic} {t.safety.noPayments}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copy-link toast */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          Link copied to clipboard!
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Offer"
          message={t.listings.deleteConfirm}
          confirmLabel={t.common.delete}
          isDestructive
          isLoading={deleteListingMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Mark sold confirm modal */}
      {confirmSold && (
        <ConfirmModal
          title="Mark as Sold"
          message="Are you sure you want to mark this item as sold? This will move it out of active listings."
          confirmLabel={t.listings.markSold}
          isLoading={markSoldMutation.isPending}
          onConfirm={handleMarkSold}
          onCancel={() => setConfirmSold(false)}
        />
      )}
    </div>
  );
}
