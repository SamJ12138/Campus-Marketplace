"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Mail,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api/client";

// ── Types ──

type ApplicationStatusFilter = "all" | "new" | "reviewed" | "accepted" | "rejected";

interface ApplicationReviewer {
  id: string;
  display_name: string;
}

interface ApplicationItem {
  id: string;
  email: string;
  name: string | null;
  marketing_pitch: string;
  platform_ideas: string | null;
  status: string;
  admin_note: string | null;
  reviewer: ApplicationReviewer | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ApplicationListResponse {
  items: ApplicationItem[];
  total: number;
  page: number;
  per_page: number;
}

interface ApplicationStats {
  new: number;
  reviewed: number;
  accepted: number;
  rejected: number;
  total: number;
}

// ── Constants ──

const STATUS_TABS: { label: string; value: ApplicationStatusFilter; icon: typeof Inbox }[] = [
  { label: "All", value: "all", icon: Inbox },
  { label: "New", value: "new", icon: Clock },
  { label: "Reviewed", value: "reviewed", icon: Eye },
  { label: "Accepted", value: "accepted", icon: CheckCircle2 },
  { label: "Rejected", value: "rejected", icon: XCircle },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

// ── Sub-components ──

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
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

function ApplicationSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
    </div>
  );
}

function ApplicationRow({
  item,
  isExpanded,
  onToggle,
  onStatusChange,
  onNoteUpdate,
}: {
  item: ApplicationItem;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: string) => void;
  onNoteUpdate: (id: string, note: string) => void;
}) {
  const [adminNote, setAdminNote] = useState(item.admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);

  const date = new Date(item.created_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function handleStatusChange(newStatus: string) {
    setStatusSaving(newStatus);
    try {
      await api.patch(`/api/v1/applications/admin/${item.id}`, { status: newStatus });
      onStatusChange(item.id, newStatus);
    } catch {
      // silently fail
    } finally {
      setStatusSaving(null);
    }
  }

  async function handleSaveNote() {
    setSaving(true);
    try {
      await api.patch(`/api/v1/applications/admin/${item.id}`, { admin_note: adminNote });
      onNoteUpdate(item.id, adminNote);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {item.email}
            </span>
            {item.name && (
              <>
                <span className="text-xs text-muted-foreground">&middot;</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {item.name}
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground">&middot;</span>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
          <p className="text-sm text-foreground truncate">{item.marketing_pitch}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="text-sm text-foreground">{item.email}</p>
          </div>

          {/* Name */}
          {item.name && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Name</p>
              <p className="text-sm text-foreground">{item.name}</p>
            </div>
          )}

          {/* Marketing pitch */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Marketing pitch</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{item.marketing_pitch}</p>
          </div>

          {/* Platform ideas */}
          {item.platform_ideas && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Platform ideas</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{item.platform_ideas}</p>
            </div>
          )}

          {/* Reviewer info */}
          {item.reviewer && item.reviewed_at && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Reviewed by</p>
              <p className="text-sm">
                {item.reviewer.display_name}{" "}
                <span className="text-xs text-muted-foreground">
                  on{" "}
                  {new Date(item.reviewed_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
          )}

          {/* Admin note */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Admin note</p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note about this application..."
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={saving || adminNote === (item.admin_note ?? "")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                saving || adminNote === (item.admin_note ?? "")
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {saving ? "Saving..." : "Save note"}
            </button>
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-2">
              Set status:
            </span>
            {item.status !== "reviewed" && (
              <button
                onClick={() => handleStatusChange("reviewed")}
                disabled={statusSaving !== null}
                className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 transition-colors"
              >
                {statusSaving === "reviewed" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                Mark reviewed
              </button>
            )}
            {item.status !== "accepted" && (
              <button
                onClick={() => handleStatusChange("accepted")}
                disabled={statusSaving !== null}
                className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
              >
                {statusSaving === "accepted" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Accept
              </button>
            )}
            {item.status !== "rejected" && (
              <button
                onClick={() => handleStatusChange("rejected")}
                disabled={statusSaving !== null}
                className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              >
                {statusSaving === "rejected" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Reject
              </button>
            )}
            {item.status !== "new" && (
              <button
                onClick={() => handleStatusChange("new")}
                disabled={statusSaving !== null}
                className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
              >
                {statusSaving === "new" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const fetchApplications = useCallback(
    async (filter: ApplicationStatusFilter, p: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          per_page: perPage,
          page: p,
        };
        if (filter !== "all") params.status = filter;

        const data = await api.get<ApplicationListResponse>(
          "/api/v1/applications/admin",
          params,
        );
        setItems(data.items);
        setTotal(data.total);
      } catch {
        setError("Failed to load applications");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<ApplicationStats>("/api/v1/applications/admin/stats");
      setStats(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchApplications(statusFilter, page);
    fetchStats();
  }, [statusFilter, page, fetchApplications, fetchStats]);

  function handleStatusChange(id: string, newStatus: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item,
      ),
    );
    fetchStats();
  }

  function handleNoteUpdate(id: string, note: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, admin_note: note } : item,
      ),
    );
  }

  // Client-side search filter
  const filtered = searchQuery.length >= 2
    ? items.filter(
        (item) =>
          item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
          item.marketing_pitch.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items;

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">
            Team ambassador applications
          </p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats.new}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">New</p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {stats.reviewed}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Reviewed</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {stats.accepted}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">Accepted</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 p-3 text-center">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {stats.rejected}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">Rejected</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.value === "all"
                ? stats?.total
                : stats?.[tab.value as keyof Omit<ApplicationStats, "total">];
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                  setExpandedId(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  statusFilter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count !== undefined && (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px]",
                      statusFilter === tab.value
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-64"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Application list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ApplicationSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card py-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {searchQuery ? "No matching applications" : "No applications yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Applications will appear here when submitted"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ApplicationRow
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              onStatusChange={handleStatusChange}
              onNoteUpdate={handleNoteUpdate}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–
            {Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
