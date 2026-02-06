"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Loader2,
  Eye,
  Trash2,
  RotateCw,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/hooks/use-auth";

// ─── Types ───────────────────────────────────────────────────

interface AdminListing {
  id: string;
  title: string;
  type: string;
  status: string;
  category_name: string | null;
  user_id: string;
  user_name: string;
  user_email: string | null;
  view_count: number;
  message_count: number;
  removal_reason: string | null;
  created_at: string;
  expires_at: string | null;
}

interface AdminListingsResponse {
  items: AdminListing[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

type ListingStatusFilter = "all" | "active" | "expired" | "removed" | "sold";
type ListingTypeFilter = "all" | "service" | "item";

// ─── Constants ───────────────────────────────────────────────

const STATUS_TABS: { label: string; value: ListingStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Removed", value: "removed" },
  { label: "Sold", value: "sold" },
];

const TYPE_OPTIONS: { label: string; value: ListingTypeFilter }[] = [
  { label: "All types", value: "all" },
  { label: "Services", value: "service" },
  { label: "Items", value: "item" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/10 text-success" },
  expired: { label: "Expired", className: "bg-warning/10 text-warning" },
  removed: { label: "Removed", className: "bg-destructive/10 text-destructive" },
  sold: { label: "Sold", className: "bg-primary/10 text-primary" },
};

// ─── Sub-components ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function ListingRow({
  listing,
  isExpanded,
  onToggle,
  onStatusChange,
  isActing,
  isAdmin,
}: {
  listing: AdminListing;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: string, reason?: string) => void;
  isActing: boolean;
  isAdmin: boolean;
}) {
  const [removalReason, setRemovalReason] = useState("");
  const createdDate = new Date(listing.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate max-w-[300px]">
              {listing.title}
            </span>
            <StatusBadge status={listing.status} />
            <span className="text-[10px] text-muted-foreground rounded-full bg-muted px-1.5 py-0.5">
              {listing.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            by {listing.user_name} &middot; {createdDate}
            {listing.category_name && ` &middot; ${listing.category_name}`}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.view_count}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 bg-accent/10">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="font-medium">{listing.view_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Messages</p>
              <p className="font-medium">{listing.message_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Posted by</p>
              <p className="font-medium truncate">{listing.user_name}</p>
              {listing.user_email && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {listing.user_email}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="font-medium">
                {listing.expires_at
                  ? new Date(listing.expires_at).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Removal reason */}
          {listing.removal_reason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive">
                Removal reason
              </p>
              <p className="text-sm mt-1">{listing.removal_reason}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/listings/${listing.id}`}
              target="_blank"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3",
                "text-sm font-medium",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View listing
            </Link>

            {listing.status === "active" && (
              <>
                <input
                  type="text"
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  placeholder="Removal reason..."
                  className={cn(
                    "flex h-9 rounded-md border border-input bg-background px-3 text-sm flex-1 min-w-[150px]",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
                <button
                  type="button"
                  onClick={() =>
                    onStatusChange(listing.id, "removed", removalReason)
                  }
                  disabled={isActing}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-3",
                    "text-sm font-medium text-destructive-foreground",
                    "hover:bg-destructive/90 transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {isActing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  Remove
                </button>
              </>
            )}

            {listing.status === "removed" && (
              <button
                type="button"
                onClick={() => onStatusChange(listing.id, "active")}
                disabled={isActing}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md bg-success px-3",
                  "text-sm font-medium text-white",
                  "hover:bg-success/90 transition-colors",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                {isActing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                Restore
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Permanently delete this listing? This cannot be undone.")) {
                    onStatusChange(listing.id, "__delete__");
                  }
                }}
                disabled={isActing}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md border border-destructive/50 px-3",
                  "text-sm font-medium text-destructive",
                  "hover:bg-destructive/10 transition-colors",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete permanently
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-3 w-12 rounded bg-muted" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminListingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [pagination, setPagination] = useState<AdminListingsResponse["pagination"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListingStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<ListingTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchListings = useCallback(
    async (
      status: ListingStatusFilter,
      type: ListingTypeFilter,
      search: string,
      p: number,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          per_page: 50,
          page: p,
        };
        if (status !== "all") params.status = status;
        if (type !== "all") params.type = type;
        if (search.length >= 2) params.search = search;

        const data = await api.get<AdminListingsResponse>(
          "/api/v1/admin/listings",
          params,
        );
        setListings(data.items);
        setPagination(data.pagination);
      } catch {
        setError(t.errors.generic);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchListings(statusFilter, typeFilter, searchQuery, page);
  }, [statusFilter, typeFilter, page, fetchListings]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length === 0 || searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        setPage(1);
        fetchListings(statusFilter, typeFilter, searchQuery, 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, statusFilter, typeFilter, fetchListings]);

  async function handleStatusChange(
    listingId: string,
    newStatus: string,
    reason?: string,
  ) {
    setActingId(listingId);
    try {
      if (newStatus === "__delete__") {
        await api.delete(`/api/v1/admin/listings/${listingId}`);
        setListings((prev) => prev.filter((l) => l.id !== listingId));
      } else {
        await api.patch(`/api/v1/admin/listings/${listingId}`, {
          status: newStatus,
          removal_reason: reason || undefined,
        });
        setListings((prev) =>
          prev.map((l) =>
            l.id === listingId
              ? { ...l, status: newStatus, removal_reason: reason ?? l.removal_reason }
              : l,
          ),
        );
      }
      setExpandedId(null);
    } catch {
      // Keep expanded
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-sm text-muted-foreground">
            Browse and moderate all listings
          </p>
        </div>
      </div>

      {/* Search + Type filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings..."
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as ListingTypeFilter);
            setPage(1);
          }}
          className={cn(
            "flex h-10 rounded-lg border border-input bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              statusFilter === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Listings list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !error && listings.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No listings found.
            </p>
          </div>
        )}

        {!isLoading &&
          listings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              isExpanded={expandedId === listing.id}
              onToggle={() =>
                setExpandedId((prev) =>
                  prev === listing.id ? null : listing.id,
                )
              }
              onStatusChange={handleStatusChange}
              isActing={actingId === listing.id}
              isAdmin={isAdmin}
            />
          ))}
      </div>

      {/* Pagination */}
      {!isLoading && pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {pagination.total_items} listing{pagination.total_items !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.has_prev}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.has_next}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
