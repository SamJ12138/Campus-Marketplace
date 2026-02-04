import type { ReactNode } from "react";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import ListingCard from "./ListingCard";
import ListingListItem from "./ListingListItem";

export type ViewMode = "grid" | "list";

interface ListingGridProps {
  listings: Listing[];
  viewMode?: ViewMode;
  onQuickView?: (listing: Listing) => void;
  children?: ReactNode;
}

export default function ListingGrid({
  listings,
  viewMode = "grid",
  onQuickView,
  children,
}: ListingGridProps) {
  // Legacy children-only usage (skeletons)
  if (children) {
    return (
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3">
        {listings.map((listing) => (
          <ListingListItem
            key={listing.id}
            listing={listing}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        // Featured first card spans 2 cols + 2 rows on lg+
        listings.length > 0 &&
          "[&>*:first-child]:lg:col-span-2 [&>*:first-child]:lg:row-span-2",
      )}
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onQuickView={onQuickView}
        />
      ))}
    </div>
  );
}
