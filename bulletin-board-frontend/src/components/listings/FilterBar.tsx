"use client";

import { useRef, useCallback } from "react";
import { X, ChevronDown, Sparkles } from "lucide-react";
import type { ListingType, Category } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useCategories } from "@/lib/hooks/use-listings";

interface FilterBarProps {
  currentType: ListingType | null;
  currentCategory: string | null;
  currentSort: string;
  lockedType?: ListingType | null;
  onTypeChange: (type: ListingType | null) => void;
  onCategoryChange: (categorySlug: string | null) => void;
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Popular" },
] as const;

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
    <div className="sticky top-0 z-20 -mx-4 border-b border-border/50 glass-strong px-4">
      <div
        ref={scrollRef}
        className={cn(
          "flex items-center gap-2 overflow-x-auto py-3",
          "scrollbar-none snap-x snap-mandatory",
          "[-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        <div className="flex flex-shrink-0 items-center gap-2 snap-start">
          <button
            type="button"
            onClick={() => handleTypeToggle("service")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-spring whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              currentType === "service"
                ? "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-white shadow-md shadow-primary/25"
                : "glass border border-border/50 text-foreground hover:border-primary/30 hover:shadow-sm",
            )}
          >
            <span className="flex items-center gap-1.5">
              {currentType === "service" && <Sparkles className="h-3.5 w-3.5" />}
              {t.listings.servicesTab}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeToggle("item")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-spring whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              currentType === "item"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25"
                : "glass border border-border/50 text-foreground hover:border-primary/30 hover:shadow-sm",
            )}
          >
            <span className="flex items-center gap-1.5">
              {currentType === "item" && <Sparkles className="h-3.5 w-3.5" />}
              {t.listings.itemsTab}
            </span>
          </button>
        </div>

        <div className="h-6 w-px flex-shrink-0 bg-border/50" />

        {categoriesLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 flex-shrink-0 animate-pulse rounded-full bg-muted/50"
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
                "flex-shrink-0 snap-start rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-spring whitespace-nowrap",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                currentCategory === cat.slug
                  ? "bg-foreground text-background shadow-md"
                  : "glass border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:shadow-sm",
              )}
            >
              {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
              {cat.name}
            </button>
          ))
        ) : null}

        <div className="h-6 w-px flex-shrink-0 bg-border/50" />

        <div className="relative flex-shrink-0 snap-start">
          <label htmlFor="sort-select" className="sr-only">
            Sort listings
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
            className={cn(
              "appearance-none rounded-full border border-border/50 glass py-2 pl-4 pr-9 text-sm font-medium text-foreground",
              "transition-all duration-200 ease-spring hover:border-primary/30 hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 snap-start rounded-full px-4 py-2 text-sm font-semibold",
              "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 ease-spring",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
            )}
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
