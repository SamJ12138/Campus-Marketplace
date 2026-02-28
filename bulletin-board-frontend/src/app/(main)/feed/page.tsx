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
// Example listings for empty marketplace state
// ----------------------------------------------------------------
const EXAMPLE_LISTINGS = [
  {
    title: "Organic Chemistry (Wade) 9th Edition",
    price: "$45",
    category: "Textbooks",
    type: "item" as const,
    snippet: "Lightly highlighted, all pages intact. Used for one semester of Orgo I. Can meet at the library.",
  },
  {
    title: "Box Braids - All Lengths Available",
    price: "From $80",
    category: "Hair & Beauty",
    type: "service" as const,
    snippet: "Knotless box braids, medium and small sizes. Hair included in price for lengths up to 30 inches.",
  },
  {
    title: 'MacBook Air M2 13" - Like New',
    price: "$750",
    category: "Electronics",
    type: "item" as const,
    snippet: "256GB, 8GB RAM, Space Gray. Battery cycle count under 50. Includes original charger and box.",
  },
  {
    title: "Organic Chemistry Tutor - Aced Orgo I & II",
    price: "$25/hr",
    category: "Tutoring",
    type: "service" as const,
    snippet: "Biochem major, got A's in both semesters. I break down mechanisms in a way that makes sense.",
  },
  {
    title: "Nike Dunk Low (Panda) - Size 10",
    price: "$75",
    category: "Clothing",
    type: "item" as const,
    snippet: "Worn maybe 5 times, no creasing. Comes with original box. Selling because I got a different colorway.",
  },
  {
    title: "Graduation Photo Sessions - Book Now",
    price: "$75/session",
    category: "Photography",
    type: "service" as const,
    snippet: "30-minute session, 20+ edited photos within a week. I know all the best spots on campus.",
  },
  {
    title: "Personal Training - Strength & Conditioning",
    price: "$20/session",
    category: "Fitness",
    type: "service" as const,
    snippet: "NASM certified. Custom programs for muscle gain, fat loss, or athletic performance.",
  },
  {
    title: "IKEA KALLAX Shelf Unit (White, 4x2)",
    price: "$35",
    category: "Furniture",
    type: "item" as const,
    snippet: "Perfect dorm storage. Fits books, bins, and vinyl. Easy to take apart for transport.",
  },
  {
    title: "Guitar Lessons - Acoustic & Electric",
    price: "$20/hr",
    category: "Music Lessons",
    type: "service" as const,
    snippet: "Music minor, 10 years experience. Chords to fingerpicking and theory. Beginners welcome.",
  },
  {
    title: "2 Tickets to Spring Formal",
    price: "$25 each",
    category: "Tickets",
    type: "item" as const,
    snippet: "Can't make it anymore. Paid $30 each. Digital tickets, I'll transfer them to your student account.",
  },
  {
    title: "Laptop Repair & Cleanup Service",
    price: "From $25",
    category: "Tech Help",
    type: "service" as const,
    snippet: "CS major. Fix slow laptops, replace screens, clean up malware. Most repairs done same day.",
  },
  {
    title: "Gel Nail Sets - Custom Designs",
    price: "$30-45",
    category: "Hair & Beauty",
    type: "service" as const,
    snippet: "French tips, chrome, nail art, and custom designs. Lasts 2-3 weeks. Booking this weekend.",
  },
  {
    title: "Intro to Microeconomics - Mankiw",
    price: "$30",
    category: "Textbooks",
    type: "item" as const,
    snippet: "Clean copy, no writing inside. Includes the online access code (unused). Perfect for Econ 101.",
  },
  {
    title: "Sony WH-1000XM5 Headphones",
    price: "$180",
    category: "Electronics",
    type: "item" as const,
    snippet: "Black, excellent condition. Best noise cancelling for studying in loud dorms. Includes case.",
  },
  {
    title: "Running Coach - 5K to Half Marathon",
    price: "$15/session",
    category: "Fitness",
    type: "service" as const,
    snippet: "Cross-country team member. Custom training plan, run with you, help you hit your goal time.",
  },
  {
    title: "North Face Puffer Jacket - Women's M",
    price: "$90",
    category: "Clothing",
    type: "item" as const,
    snippet: "Black 700-fill down jacket, super warm. Bought last winter for $250. No rips, all zippers work.",
  },
];

// ----------------------------------------------------------------
// Empty state
// ----------------------------------------------------------------
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <SearchX className="h-16 w-16 text-muted-foreground/30" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          {t.common.noResults}
        </h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {t.listings.emptySearch}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center">
        <p className="text-sm font-medium text-primary">
          Be the first to post! These are examples of what students list on GimmeDat.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {EXAMPLE_LISTINGS.map((listing) => (
          <div
            key={listing.title}
            className="relative flex flex-col rounded-xl border border-border bg-card p-4 opacity-75"
          >
            <div className="absolute right-3 top-3">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Example
              </span>
            </div>
            <span className="mb-2 inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {listing.type === "service" ? "Service" : "Item"}
            </span>
            <h3 className="text-sm font-semibold leading-snug text-foreground pr-14 line-clamp-2">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-primary">
              {listing.price}
            </p>
            <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {listing.category}
            </span>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
              {listing.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Error state
// ----------------------------------------------------------------
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div>
      <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-4 py-8 text-center dark:border-amber-800 dark:bg-amber-900/20">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h3 className="mt-3 text-lg font-semibold text-foreground">
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

      {/* Show example listings even when API fails */}
      <p className="mb-4 text-sm text-muted-foreground">
        While we fix this, here are examples of what students list on GimmeDat:
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {EXAMPLE_LISTINGS.map((listing) => (
          <div
            key={listing.title}
            className="relative flex flex-col rounded-xl border border-border bg-card p-4 opacity-75"
          >
            <div className="absolute right-3 top-3">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Example
              </span>
            </div>
            <span className="mb-2 inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {listing.type === "service" ? "Service" : "Item"}
            </span>
            <h3 className="text-sm font-semibold leading-snug text-foreground pr-14 line-clamp-2">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-primary">
              {listing.price}
            </p>
            <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {listing.category}
            </span>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
              {listing.snippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Sign-in prompt for unauthenticated users
// ----------------------------------------------------------------
function SignInPrompt() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Sign-in banner */}
      <div className="mb-8 flex flex-col items-center rounded-xl border border-primary/20 bg-primary/5 px-6 py-8 text-center">
        <LogIn className="h-10 w-10 text-primary/60" />
        <h2 className="mt-3 text-xl font-semibold text-foreground">
          Sign in to post and message sellers
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Create a free account with your .edu email to start buying, selling,
          and connecting with students on your campus.
        </p>
        <div className="mt-5 flex items-center gap-3">
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

      {/* Show example listings so visitors can see what the marketplace offers */}
      <h3 className="mb-1 text-lg font-semibold text-foreground">
        What students are posting on GimmeDat
      </h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Here&apos;s a preview of the kinds of items and services available.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {EXAMPLE_LISTINGS.map((listing) => (
          <div
            key={listing.title}
            className="relative flex flex-col rounded-xl border border-border bg-card p-4 opacity-75"
          >
            <div className="absolute right-3 top-3">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Example
              </span>
            </div>
            <span className="mb-2 inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {listing.type === "service" ? "Service" : "Item"}
            </span>
            <h3 className="text-sm font-semibold leading-snug text-foreground pr-14 line-clamp-2">
              {listing.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-primary">
              {listing.price}
            </p>
            <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {listing.category}
            </span>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
              {listing.snippet}
            </p>
          </div>
        ))}
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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("");

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

  // Debounce price inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
    }, 500);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice]);

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

  // Build query filters — only include defined values so TanStack Query
  // sees a structurally different key when filters actually change.
  const filters = useMemo(() => {
    const f: Record<string, string | number> = {};
    if (type) f.type = type;
    if (category) f.category_slug = category;
    if (sort) f.sort = sort;
    if (debouncedSearch) f.q = debouncedSearch;
    if (debouncedMinPrice) f.min_price = Number(debouncedMinPrice);
    if (debouncedMaxPrice) f.max_price = Number(debouncedMaxPrice);
    return f;
  }, [type, category, sort, debouncedSearch, debouncedMinPrice, debouncedMaxPrice]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useListings(filters, { enabled: authLoading || isAuthenticated });

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
    debouncedSearch !== "" ||
    debouncedMinPrice !== "" ||
    debouncedMaxPrice !== "";

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

      {/* Active search indicator */}
      {debouncedSearch && !isPending && !authLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>
            {listings.length === 0
              ? `No results for "${debouncedSearch}"`
              : `${data?.pages[0]?.pagination.total_items ?? listings.length} result${(data?.pages[0]?.pagination.total_items ?? listings.length) !== 1 ? "s" : ""} for "${debouncedSearch}"`}
          </span>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      )}

      {/* Sticky filter bar */}
      <FilterBar
        currentType={type}
        currentCategory={category}
        currentSort={sort}
        lockedType={initialType}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onTypeChange={setType}
        onCategoryChange={setCategory}
        onSortChange={setSort}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
      />

      {/* Content area */}
      {(authLoading || isPending || (isFetching && listings.length === 0)) ? (
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
