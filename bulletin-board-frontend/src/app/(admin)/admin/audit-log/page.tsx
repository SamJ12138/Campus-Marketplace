"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ScrollText,
  Search,
  Shield,
  User,
  Package,
  KeyRound,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────

const ACTION_ICONS: Record<string, typeof Shield> = {
  report: AlertTriangle,
  user: User,
  listing: Package,
  keyword: KeyRound,
  category: FileText,
};

function getActionIcon(actionType: string) {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (actionType.includes(key)) return icon;
  }
  return Shield;
}

function getActionColor(actionType: string): string {
  if (actionType.includes("banned") || actionType.includes("ban_user") || actionType.includes("deleted"))
    return "text-destructive bg-destructive/10";
  if (actionType.includes("suspended") || actionType.includes("suspend"))
    return "text-warning bg-warning/10";
  if (actionType.includes("active") || actionType.includes("created") || actionType.includes("added"))
    return "text-success bg-success/10";
  if (actionType.includes("removed") || actionType.includes("deactivated"))
    return "text-destructive bg-destructive/10";
  return "text-primary bg-primary/10";
}

function formatActionType(actionType: string): string {
  return actionType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchLog = useCallback(
    async (filter: string, p: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          per_page: 50,
          page: p,
        };
        if (filter.length >= 2) params.action_type = filter;

        const data = await api.get<AuditLogEntry[]>(
          "/api/v1/admin/audit-log",
          params,
        );
        setEntries(data);
      } catch {
        setError(t.errors.generic);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchLog(actionFilter, page);
  }, [page, fetchLog, actionFilter]);

  // Debounced search
  useEffect(() => {
    if (actionFilter.length === 0 || actionFilter.length >= 2) {
      const timer = setTimeout(() => {
        setPage(1);
        fetchLog(actionFilter, 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [actionFilter, fetchLog]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.auditLog}</h1>
          <p className="text-sm text-muted-foreground">
            History of all admin and moderation actions
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action type..."
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Log entries */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse"
              >
                <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ScrollText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No audit log entries found.
            </p>
          </div>
        )}

        {!isLoading &&
          entries.map((entry) => {
            const Icon = getActionIcon(entry.action_type);
            const colorClass = getActionColor(entry.action_type);
            const date = new Date(entry.created_at);
            const dateStr = date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = date.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                    colorClass,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {formatActionType(entry.action_type)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {entry.target_type && (
                      <span className="capitalize">
                        Target: {entry.target_type}
                      </span>
                    )}
                    {entry.target_id && (
                      <span className="font-mono text-[10px] truncate max-w-[120px]">
                        {entry.target_id}
                      </span>
                    )}
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {entry.reason}
                    </p>
                  )}
                  {entry.metadata &&
                    Object.keys(entry.metadata).length > 0 && (
                      <div className="mt-1 rounded bg-accent/50 px-2 py-1 text-[10px] text-muted-foreground font-mono break-all">
                        {JSON.stringify(entry.metadata)}
                      </div>
                    )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <p className="text-[10px] text-muted-foreground">{timeStr}</p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!isLoading && entries.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={entries.length < 50}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
