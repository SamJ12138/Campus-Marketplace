"use client";

import { useRef, useCallback } from "react";
import { X, ChevronDown } from "lucide-react";
import type { ListingType, Category } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useCategories } from "@/lib/hooks/use-listings";

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------
interface FilterBarProps {
  currentType: ListingType | null;
  currentCategory: string | null;
  currentSort: string;
  lockedType?: ListingType | null;
  onTypeChange: (type: ListingType | null) => void;
  onCategoryChange: (categorySlug: string | null) => void;
  onSortChange: (sort: string) => void;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Popular" },
] as const;

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function FilterBar({
  currentType,
  currentCategory,
  currentSort,
  lockedType,
  onTypeChange,
  onCategoryChange,
  onSortChange,
}: FilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: categories, isLoading: categoriesLoading } = useCategories(
    currentType ?? undefined,
  );

  const hasActiveFilters =
    (currentType !== null && currentType !== lockedType) ||
    currentCategory !== null ||
    currentSort !== "newest";

  const handleClearFilters = useCallback(() => {
    if (!lockedType) onTypeChange(null);
    onCategoryChange(null);
    onSortChange("newest");
  }, [lockedType, onTypeChange, onCategoryChange, onSortChange]);

  const handleTypeToggle = useCallback(
    (type: ListingType) => {
      if (currentType === type) {
        // Don't allow toggling off the locked type
        if (lockedType === type) return;
        onTypeChange(null);
      } else {
        onTypeChange(type);
        onCategoryChange(null);
      }
    },
    [currentType, lockedType, onTypeChange, onCategoryChange],
  );

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <div
        ref={scrollRef}
        className={cn(
          "flex items-center gap-2 overflow-x-auto py-3",
          "scrollbar-none snap-x snap-mandatory",
          "[-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {/* Type toggle pills */}
        <div className="flex flex-shrink-0 items-center gap-1 snap-start">
          <button
            type="button"
            onClick={() => handleTypeToggle("service")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              currentType === "service"
                ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                : "bg-card text-foreground border border-border hover:bg-accent hover:border-primary/30 hover:shadow-sm",
            )}
          >
            {t.listings.servicesTab}
          </button>
          <button
            type="button"
            onClick={() => handleTypeToggle("item")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              currentType === "item"
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "bg-card text-foreground border border-border hover:bg-accent hover:border-primary/30 hover:shadow-sm",
            )}
          >
            {t.listings.itemsTab}
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px flex-shrink-0 bg-border" />

        {/* Category chips */}
        {categoriesLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 flex-shrink-0 animate-pulse rounded-full bg-slate-200"
              />
            ))}
          </>
        ) : categories && categories.length > 0 ? (
          categories.map((cat: Category) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                onCategoryChange(
                  currentCategory === cat.slug ? null : cat.slug,
                )
              }
              className={cn(
                "flex-shrink-0 snap-start rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                currentCategory === cat.slug
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground hover:shadow-sm",
              )}
            >
              {cat.name}
            </button>
          ))
        ) : null}

        {/* Divider */}
        <div className="h-6 w-px flex-shrink-0 bg-border" />

        {/* Sort dropdown */}
        <div className="relative flex-shrink-0 snap-start">
          <label htmlFor="sort-select" className="sr-only">
            Sort listings
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
            className={cn(
              "appearance-none rounded-full border border-border bg-card py-1.5 pl-3 pr-8 text-sm font-medium text-foreground",
              "transition-all duration-200 hover:bg-accent hover:border-primary/30 hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={cn(
              "flex flex-shrink-0 items-center gap-1 snap-start rounded-full px-3 py-1.5 text-sm font-medium",
              "text-rose-600 hover:bg-rose-50 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
            )}
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
