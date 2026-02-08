"use client";

import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  SearchX,
  AlertTriangle,
  ShieldAlert,
  X,
  Search,
  LogIn,
  UserPlus,
  LayoutGrid,
  List,
} from "lucide-react";
import type { ListingType, Listing } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useAuthStore } from "@/lib/hooks/use-auth";
import { useListings } from "@/lib/hooks/use-listings";
import ListingCardSkeleton from "@/components/listings/ListingCardSkeleton";
import ListingGrid, {
  type ViewMode,
} from "@/components/listings/ListingGrid";
import FilterBar from "@/components/listings/FilterBar";
import QuickViewModal from "@/components/listings/QuickViewModal";
import AdHeroBoard from "@/components/ads/AdHeroBoard";

// ----------------------------------------------------------------
// View-mode persistence
// ----------------------------------------------------------------
const VIEW_MODE_KEY = "bb_feed_view_mode";

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === "list" ? "list" : "grid";
}

// ----------------------------------------------------------------
// Safety banner (dismissible)
// ----------------------------------------------------------------
function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("safety_banner_dismissed");
      if (stored === "true") setDismissed(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem("safety_banner_dismissed", "true");
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            {t.safety.safetyTitle}
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            {t.safety.meetPublic} {t.safety.reportSuspicious}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss safety banner"
          className="rounded-md p-1 text-amber-600 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <SearchX className="h-16 w-16 text-muted-foreground/30" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {t.common.noResults}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {hasFilters ? t.listings.emptySearch : t.listings.emptyFeed}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------
// Error state
// ----------------------------------------------------------------
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-16 w-16 text-red-300" />
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {t.common.error}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t.errors.generic}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {t.common.retry}
      </button>
    </div>
  );
}

// ----------------------------------------------------------------
// Sign-in prompt for unauthenticated users
// ----------------------------------------------------------------
function SignInPrompt() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <LogIn className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Sign in to browse the marketplace
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Offers are only visible to members of your campus community. Sign in
          or create an account to get started.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/login?redirect=/feed"
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
          <Link
            href="/register?redirect=/feed"
            className={cn(
              "inline-flex items-center gap-2 rounded-md border border-input px-5 py-2.5",
              "text-sm font-medium text-foreground",
              "hover:bg-accent transition-colors",
            )}
          >
            <UserPlus className="h-4 w-4" />
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Main feed page
// ----------------------------------------------------------------
function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Parse initial state from URL query params
  const rawType = searchParams.get("type");
  const initialType: ListingType | null =
    rawType === "service" || rawType === "item" ? rawType : null;
  const initialCategory = searchParams.get("category") ?? null;
  const initialSort = searchParams.get("sort") ?? "newest";
  const initialSearch = searchParams.get("q") ?? "";

  const [type, setType] = useState<ListingType | null>(initialType);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // View mode (grid / list) — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    setViewMode(getStoredViewMode());
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }, []);

  // Quick-view modal
  const [quickViewListing, setQuickViewListing] = useState<Listing | null>(
    null,
  );

  const handleQuickView = useCallback((listing: Listing) => {
    setQuickViewListing(listing);
  }, []);

  const handleCloseQuickView = useCallback(() => {
    setQuickViewListing(null);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync filter changes to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (sort && sort !== "newest") params.set("sort", sort);
    if (debouncedSearch) params.set("q", debouncedSearch);

    const queryString = params.toString();
    const newPath = queryString ? `/feed?${queryString}` : "/feed";
    router.replace(newPath, { scroll: false });
  }, [type, category, sort, debouncedSearch, router]);

  // Build query filters
  const filters = useMemo(
    () => ({
      type: type ?? undefined,
      category_slug: category ?? undefined,
      sort,
      q: debouncedSearch || undefined,
    }),
    [type, category, sort, debouncedSearch],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings(filters, { enabled: isAuthenticated });

  // Flatten pages into a single array
  const listings: Listing[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Determine page title
  const pageTitle =
    type === "service"
      ? t.listings.servicesTab
      : type === "item"
        ? t.listings.itemsTab
        : "All Offers";

  const hasFilters =
    type !== null ||
    category !== null ||
    sort !== "newest" ||
    debouncedSearch !== "";

  if (!authLoading && !isAuthenticated) {
    return <SignInPrompt />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      {/* Ad hero board */}
      <AdHeroBoard />

      {/* Safety banner */}
      <SafetyBanner />

      {/* Page header + search + view toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
          {user?.campus_name && (
            <p className="text-sm text-muted-foreground">{user.campus_name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              aria-label="Grid view"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              aria-label="List view"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.common.search + "..."}
              aria-label="Search listings"
              className={cn(
                "w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <FilterBar
        currentType={type}
        currentCategory={category}
        currentSort={sort}
        lockedType={initialType}
        onTypeChange={setType}
        onCategoryChange={setCategory}
        onSortChange={setSort}
      />

      {/* Content area */}
      {isLoading ? (
        <ListingGrid listings={[]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </ListingGrid>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : listings.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <ListingGrid
            listings={listings}
            viewMode={viewMode}
            onQuickView={handleQuickView}
          />

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="flex justify-center py-6">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            ) : hasNextPage ? (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="rounded-lg border border-border bg-card px-6 py-2 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Load more
              </button>
            ) : listings.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                You have reached the end of the listings.
              </p>
            ) : null}
          </div>
        </>
      )}

      {/* Quick-view modal */}
      <QuickViewModal
        listing={quickViewListing}
        onClose={handleCloseQuickView}
      />
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense>
      <FeedContent />
    </Suspense>
  );
}
