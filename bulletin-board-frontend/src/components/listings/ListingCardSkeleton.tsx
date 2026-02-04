"use client";

import { cn } from "@/lib/utils/cn";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className,
      )}
    />
  );
}

export default function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Image skeleton with price pill placeholder */}
      <div className="relative aspect-[4/3] w-full">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute bottom-2 left-2 h-6 w-16 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        {/* Title */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        {/* Location */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Poster info */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}
