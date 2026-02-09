"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, MessageCircle, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";

interface QuickViewModalProps {
  listing: Listing | null;
  onClose: () => void;
}

export default function QuickViewModal({
  listing,
  onClose,
}: QuickViewModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Reset state when listing changes
  useEffect(() => {
    setPhotoIndex(0);
    setAvatarError(false);
  }, [listing?.id]);

  // Animate in
  useEffect(() => {
    if (listing) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [listing]);

  // Lock body scroll
  useEffect(() => {
    if (!listing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [listing]);

  // Escape key
  useEffect(() => {
    if (!listing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [listing, onClose]);

  // Focus trap — keep focus inside panel
  useEffect(() => {
    if (!listing || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [listing]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  if (!listing) return null;

  const photos = listing.photos;
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[photoIndex] : null;

  const prevPhoto = () =>
    setPhotoIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  const nextPhoto = () =>
    setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view: ${listing.title}`}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl transition-all duration-300",
          visible ? "translate-y-0 scale-100" : "translate-y-4 scale-95",
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Photo */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {currentPhoto ? (
            <Image
              src={currentPhoto.url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
              priority
              unoptimized={currentPhoto.url.includes('r2.dev') || undefined}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}

          {/* Photo navigation */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    className={cn(
                      "h-2 rounded-full transition-all duration-200",
                      idx === photoIndex
                        ? "w-4 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {listing.title}
            </h2>
            {listing.price_hint && (
              <span className="flex-shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                {formatPrice(listing.price_hint)}
              </span>
            )}
          </div>

          {listing.description && (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {listing.description}
            </p>
          )}

          {/* Poster */}
          <div className="flex items-center gap-2">
            {listing.user.avatar_url && !avatarError ? (
              <Image
                src={listing.user.avatar_url}
                alt={listing.user.display_name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                unoptimized={listing.user.avatar_url.includes('r2.dev') || undefined}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {listing.user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">
              {listing.user.display_name}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <Link
              href={`/listings/${listing.id}`}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View Full Details
            </Link>
            <Link
              href={`/messages?to=${listing.user.id}&listing=${listing.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
