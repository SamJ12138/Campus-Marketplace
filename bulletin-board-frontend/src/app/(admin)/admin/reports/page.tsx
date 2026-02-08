"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  MessageSquare,
  Package,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";
import type {
  ReportStatus,
  ReportTargetType,
  ReportReason,
} from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────

type ReportPriority = "low" | "medium" | "high" | "critical";
type ReportResolution =
  | "no_action"
  | "warning_issued"
  | "content_removed"
  | "user_suspended"
  | "user_banned";

interface AdminReport {
  id: string;
  reporter: { id: string; display_name: string };
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  resolution: ReportResolution | null;
  resolution_note: string | null;
  resolved_by: { id: string; display_name: string } | null;
  created_at: string;
}

interface AdminReportsResponse {
  items: AdminReport[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ─── Constants ──────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: ReportStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: t.admin.pending, value: "pending" },
  { label: "Reviewing", value: "reviewing" },
  { label: t.admin.resolved, value: "resolved" },
  { label: t.admin.dismissed, value: "dismissed" },
];

const RESOLUTION_OPTIONS: { label: string; value: ReportResolution }[] = [
  { label: "No Action", value: "no_action" },
  { label: "Warning", value: "warning_issued" },
  { label: "Remove Content", value: "content_removed" },
  { label: t.admin.suspendUserAction, value: "user_suspended" },
  { label: t.admin.banUserAction, value: "user_banned" },
];

const PRIORITY_CONFIG: Record<
  ReportPriority,
  { label: string; className: string }
> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-warning/10 text-warning" },
  high: { label: "High", className: "bg-destructive/10 text-destructive" },
  critical: {
    label: "Critical",
    className: "bg-destructive text-destructive-foreground",
  },
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  pending: { label: t.admin.pending, className: "bg-warning/10 text-warning" },
  reviewing: { label: "Reviewing", className: "bg-primary/10 text-primary" },
  resolved: { label: t.admin.resolved, className: "bg-success/10 text-success" },
  dismissed: { label: t.admin.dismissed, className: "bg-muted text-muted-foreground" },
};

const REASON_LABELS: Record<ReportReason, string> = {
  spam: t.reports.reasonSpam,
  inappropriate: t.reports.reasonInappropriate,
  prohibited: t.reports.reasonProhibited,
  scam: t.reports.reasonScam,
  harassment: t.reports.reasonHarassment,
  other: t.reports.reasonOther,
};

const TARGET_ICONS: Record<ReportTargetType, typeof Package> = {
  listing: Package,
  user: User,
  message: MessageSquare,
};

// ─── Sub-components ─────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: ReportPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const config = STATUS_CONFIG[status];
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

function ReportRow({
  report,
  isExpanded,
  onToggle,
  onResolve,
  isResolving,
}: {
  report: AdminReport;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: (
    reportId: string,
    resolution: ReportResolution,
    note: string,
  ) => void;
  isResolving: boolean;
}) {
  const [resolution, setResolution] = useState<ReportResolution>("no_action");
  const [resolutionNote, setResolutionNote] = useState("");

  const TargetIcon = TARGET_ICONS[report.target_type];
  const createdDate = new Date(report.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const createdTime = new Date(report.created_at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const canResolve = report.status === "pending" || report.status === "reviewed";

  return (
    <div className="border-b border-border last:border-0">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <TargetIcon className="h-4 w-4 text-muted-foreground shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {t.admin.reportedBy.replace(
                "{name}",
                report.reporter.display_name,
              )}
            </span>
            <PriorityBadge priority={report.priority} />
            <StatusBadge status={report.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {REASON_LABELS[report.reason]} &middot; {report.target_type}{" "}
            &middot; {createdDate} at {createdTime}
          </p>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 bg-accent/10">
          {/* Description */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Details
            </p>
            <p className="text-sm">
              {report.description || "No additional description provided."}
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Target type</p>
              <p className="font-medium capitalize">{report.target_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Target ID</p>
              <p className="font-mono text-xs break-all">{report.target_id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reporter</p>
              <p className="font-medium">{report.reporter.display_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Priority</p>
              <PriorityBadge priority={report.priority} />
            </div>
          </div>

          {/* Previous resolution */}
          {report.resolution && (
            <div className="rounded-md border border-border bg-card p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Resolution
              </p>
              <p className="text-sm font-medium">
                {t.admin.actionTaken.replace(
                  "{action}",
                  RESOLUTION_OPTIONS.find(
                    (r) => r.value === report.resolution,
                  )?.label ?? report.resolution,
                )}
              </p>
              {report.resolution_note && (
                <p className="text-sm text-muted-foreground">
                  {report.resolution_note}
                </p>
              )}
              {report.resolved_by && (
                <p className="text-xs text-muted-foreground">
                  Resolved by {report.resolved_by.display_name}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {canResolve && (
            <div className="space-y-3 rounded-md border border-border bg-card p-4">
              <p className="text-sm font-medium">Resolve report</p>

              <div className="space-y-2">
                <label
                  htmlFor={`resolution-${report.id}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Action
                </label>
                <select
                  id={`resolution-${report.id}`}
                  value={resolution}
                  onChange={(e) =>
                    setResolution(e.target.value as ReportResolution)
                  }
                  disabled={isResolving}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`note-${report.id}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t.admin.moderationNote}
                </label>
                <textarea
                  id={`note-${report.id}`}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={2}
                  disabled={isResolving}
                  placeholder="Add a note about this resolution..."
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground resize-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onResolve(report.id, resolution, resolutionNote)
                  }
                  disabled={isResolving}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4",
                    "text-sm font-medium text-primary-foreground",
                    "hover:bg-primary/90 transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {isResolving && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {t.admin.resolveAction}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onResolve(report.id, "no_action", resolutionNote)
                  }
                  disabled={isResolving}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4",
                    "text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {t.admin.dismissAction}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
      <div className="h-4 w-4 rounded bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="h-4 w-4 rounded bg-muted shrink-0" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchReports = useCallback(async (statusFilter: ReportStatus | "all") => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | undefined> = {
        per_page: 50,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const data = await api.get<AdminReportsResponse>(
        "/api/v1/admin/reports",
        params,
      );
      setReports(data.items);
    } catch {
      setError(t.errors.generic);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab, fetchReports]);

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleResolve(
    reportId: string,
    resolution: ReportResolution,
    note: string,
  ) {
    setResolvingId(reportId);

    try {
      await api.patch(`/api/v1/admin/reports/${reportId}`, {
        resolution_type: resolution,
        resolution_note: note || undefined,
      });

      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: resolution === "no_action" ? "dismissed" : "resolved",
                resolution,
                resolution_note: note || null,
              }
            : r,
        ),
      );
      setExpandedId(null);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to resolve report: ${detail}`);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.reportsQueue}</h1>
          <p className="text-sm text-muted-foreground">
            Review and resolve reports from users
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.value
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

      {/* Content */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading && (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <ReportSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No reports to display.
            </p>
          </div>
        )}

        {!isLoading &&
          reports.length > 0 &&
          reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              isExpanded={expandedId === report.id}
              onToggle={() => handleToggle(report.id)}
              onResolve={handleResolve}
              isResolving={resolvingId === report.id}
            />
          ))}
      </div>
    </div>
  );
}
