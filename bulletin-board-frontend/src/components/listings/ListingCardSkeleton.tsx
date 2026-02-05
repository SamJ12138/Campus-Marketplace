"use client";

import { cn } from "@/lib/utils/cn";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/50",
        className,
      )}
    />
  );
}

export default function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/50 glass">
      <div className="relative aspect-[4/3] w-full">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute bottom-2 left-2 h-7 w-20 rounded-xl" />
        <Skeleton className="absolute right-2 top-2 h-6 w-16 rounded-full" />
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded-lg" />

        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-lg" />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-lg" />
        </div>

        <div className="flex items-center justify-between border-t border-border/50 pt-2.5">
          <Skeleton className="h-3.5 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}
