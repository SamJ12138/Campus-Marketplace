"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  AlertTriangle,
  MessageSquare,
  FileText,
  Shield,
  KeyRound,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { api } from "@/lib/api/client";

interface AdminStats {
  total_users: number;
  active_users_30d: number;
  total_listings: number;
  active_listings: number;
  pending_reports: number;
  messages_today: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: typeof Users;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 space-y-2",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-5 w-5 rounded bg-muted" />
      </div>
      <div className="h-7 w-16 rounded bg-muted" />
      <div className="h-3 w-28 rounded bg-muted" />
    </div>
  );
}

const QUICK_LINKS = [
  {
    href: "/admin/reports",
    title: "Reports Queue",
    description: "Review and resolve user reports",
    icon: AlertTriangle,
  },
  {
    href: "/admin/users",
    title: t.admin.userManagement,
    description: "Manage user accounts and roles",
    icon: Users,
  },
  {
    href: "/admin/keywords",
    title: "Keyword Filters",
    description: "Manage blocked words and phrases",
    icon: KeyRound,
  },
  {
    href: "/admin/audit-log",
    title: t.admin.auditLog,
    description: "View moderation action history",
    icon: FileText,
  },
] as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await api.get<AdminStats>("/api/v1/admin/stats");
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError(t.errors.generic);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.dashboard}</h1>
          <p className="text-sm text-muted-foreground">
            Overview of platform activity
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t.admin.totalUsers}
            value={stats.total_users.toLocaleString()}
            subtitle={`${stats.active_users_30d.toLocaleString()} active in 30 days`}
            icon={Users}
          />
          <StatCard
            title={t.admin.totalListings}
            value={stats.total_listings.toLocaleString()}
            subtitle={`${stats.active_listings.toLocaleString()} currently active`}
            icon={Package}
          />
          <StatCard
            title={t.admin.activeReports}
            value={stats.pending_reports}
            subtitle="Awaiting review"
            icon={AlertTriangle}
            className={
              stats.pending_reports > 0
                ? "border-warning/50"
                : undefined
            }
          />
          <StatCard
            title="Messages today"
            value={stats.messages_today.toLocaleString()}
            icon={MessageSquare}
          />
        </div>
      ) : null}

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick access</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-4 rounded-lg border border-border bg-card p-4",
                  "hover:bg-accent/50 transition-colors",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{link.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
