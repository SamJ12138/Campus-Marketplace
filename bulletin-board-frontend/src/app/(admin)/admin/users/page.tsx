"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  Package,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/hooks/use-auth";

// ─── Types ───────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  status: "active" | "suspended" | "banned";
  role: "user" | "moderator" | "admin";
  created_at: string;
}

interface AdminUserDetail extends AdminUser {
  email_verified: boolean;
  avatar_url: string | null;
  class_year: number | null;
  bio: string | null;
  phone_number: string | null;
  suspension_reason: string | null;
  suspension_until: string | null;
  last_active_at: string | null;
  stats: {
    total_listings: number;
    active_listings: number;
    reports_against: number;
    message_threads: number;
  };
}

type UserStatusFilter = "all" | "active" | "suspended" | "banned";

// ─── Constants ───────────────────────────────────────────────

const STATUS_TABS: { label: string; value: UserStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Banned", value: "banned" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/10 text-success" },
  suspended: { label: "Suspended", className: "bg-warning/10 text-warning" },
  banned: { label: "Banned", className: "bg-destructive/10 text-destructive" },
};

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  user: { label: "User", className: "bg-muted text-muted-foreground" },
  moderator: { label: "Moderator", className: "bg-primary/10 text-primary" },
  admin: { label: "Admin", className: "bg-destructive/10 text-destructive" },
};

// ─── Sub-components ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
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

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
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

function UserRow({
  user,
  isExpanded,
  onToggle,
  onAction,
  isActing,
  currentUserRole,
}: {
  user: AdminUser;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (
    userId: string,
    action: "active" | "suspended" | "banned",
    reason?: string,
  ) => void;
  isActing: boolean;
  currentUserRole: string;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionReason, setActionReason] = useState("");

  const createdDate = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (isExpanded && !detail) {
      setDetailLoading(true);
      api
        .get<AdminUserDetail>(`/api/v1/admin/users/${user.id}`)
        .then(setDetail)
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    }
  }, [isExpanded, detail, user.id]);

  const isAdmin = user.role === "admin";
  const canModify = currentUserRole === "admin" && !isAdmin;

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
          {user.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{user.display_name}</span>
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {user.email} &middot; Joined {createdDate}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 bg-accent/10">
          {detailLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              {/* User stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-border bg-card p-3 text-center">
                  <Package className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-lg font-bold mt-1">
                    {detail.stats.total_listings}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Listings</p>
                </div>
                <div className="rounded-md border border-border bg-card p-3 text-center">
                  <Package className="h-4 w-4 mx-auto text-success" />
                  <p className="text-lg font-bold mt-1">
                    {detail.stats.active_listings}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active</p>
                </div>
                <div className="rounded-md border border-border bg-card p-3 text-center">
                  <MessageSquare className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-lg font-bold mt-1">
                    {detail.stats.message_threads}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Threads</p>
                </div>
                <div className="rounded-md border border-border bg-card p-3 text-center">
                  <AlertTriangle className="h-4 w-4 mx-auto text-destructive" />
                  <p className="text-lg font-bold mt-1">
                    {detail.stats.reports_against}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Reports</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium truncate">{detail.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {detail.email_verified ? "Verified" : "Not verified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Last active
                  </p>
                  <p className="font-medium">
                    {detail.last_active_at
                      ? new Date(detail.last_active_at).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
                {detail.class_year && (
                  <div>
                    <p className="text-xs text-muted-foreground">Class year</p>
                    <p className="font-medium">{detail.class_year}</p>
                  </div>
                )}
              </div>

              {/* Suspension info */}
              {detail.suspension_reason && (
                <div className="rounded-md border border-warning/50 bg-warning/10 p-3 space-y-1">
                  <p className="text-xs font-medium text-warning">
                    Suspension reason
                  </p>
                  <p className="text-sm">{detail.suspension_reason}</p>
                  {detail.suspension_until && (
                    <p className="text-xs text-muted-foreground">
                      Until:{" "}
                      {new Date(detail.suspension_until).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {canModify && (
                <div className="space-y-3 rounded-md border border-border bg-card p-4">
                  <p className="text-sm font-medium">User actions</p>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Reason for action..."
                      className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                        "placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {user.status !== "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          onAction(user.id, "active", actionReason)
                        }
                        disabled={isActing}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-md bg-success px-4",
                          "text-sm font-medium text-white",
                          "hover:bg-success/90 transition-colors",
                          "disabled:pointer-events-none disabled:opacity-50",
                        )}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Activate
                      </button>
                    )}
                    {user.status !== "suspended" && (
                      <button
                        type="button"
                        onClick={() =>
                          onAction(user.id, "suspended", actionReason)
                        }
                        disabled={isActing}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-md bg-warning px-4",
                          "text-sm font-medium text-white",
                          "hover:bg-warning/90 transition-colors",
                          "disabled:pointer-events-none disabled:opacity-50",
                        )}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Suspend
                      </button>
                    )}
                    {user.status !== "banned" && (
                      <button
                        type="button"
                        onClick={() =>
                          onAction(user.id, "banned", actionReason)
                        }
                        disabled={isActing}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-4",
                          "text-sm font-medium text-destructive-foreground",
                          "hover:bg-destructive/90 transition-colors",
                          "disabled:pointer-events-none disabled:opacity-50",
                        )}
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Ban
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <p className="text-xs text-muted-foreground italic">
                  Admin accounts cannot be modified by other admins.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Could not load user details.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border animate-pulse">
      <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-3 w-56 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UserStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(
    async (statusFilter: UserStatusFilter, search: string, p: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          per_page: 50,
          page: p,
        };
        if (statusFilter !== "all") params.status = statusFilter;
        if (search.length >= 2) params.search = search;

        const data = await api.get<AdminUser[]>(
          "/api/v1/admin/users",
          params,
        );
        setUsers(data);
      } catch {
        setError(t.errors.generic);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUsers(activeTab, searchQuery, page);
  }, [activeTab, page, fetchUsers]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length === 0 || searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        setPage(1);
        fetchUsers(activeTab, searchQuery, 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, fetchUsers]);

  async function handleAction(
    userId: string,
    newStatus: "active" | "suspended" | "banned",
    reason?: string,
  ) {
    setActingId(userId);
    try {
      await api.patch(`/api/v1/admin/users/${userId}`, {
        status: newStatus,
        suspension_reason: reason || undefined,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: newStatus } : u,
        ),
      );
      setExpandedId(null);
    } catch {
      // Keep expanded to retry
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.userManagement}</h1>
          <p className="text-sm text-muted-foreground">
            Manage user accounts, roles, and access
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setActiveTab(tab.value);
              setPage(1);
            }}
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

      {/* User List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading && (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <UserSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !error && users.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        )}

        {!isLoading &&
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isExpanded={expandedId === user.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === user.id ? null : user.id))
              }
              onAction={handleAction}
              isActing={actingId === user.id}
              currentUserRole={currentUser?.role ?? "user"}
            />
          ))}
      </div>

      {/* Pagination */}
      {!isLoading && users.length >= 50 && (
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
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
