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
  TrendingUp,
  Megaphone,
  Mail,
  UserPlus,
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

interface ChartDataPoint {
  date: string;
  count: number;
}

interface ChartData {
  period: string;
  daily_users: ChartDataPoint[];
  daily_listings: ChartDataPoint[];
  daily_messages: ChartDataPoint[];
  daily_reports: ChartDataPoint[];
}

// ─── SVG Sparkline chart ─────────────────────────────────────

function MiniChart({
  data,
  color,
  label,
}: {
  data: ChartDataPoint[];
  color: string;
  label: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const width = 280;
  const height = 80;
  const padding = 4;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.count / maxCount) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold">{total.toLocaleString()} total</p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} opacity={i === points.length - 1 ? 1 : 0} />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────

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
    href: "/admin/listings",
    title: "Content Management",
    description: "Browse and moderate all listings",
    icon: Package,
  },
  {
    href: "/admin/ads",
    title: "Ads Management",
    description: "Manage featured carousel ads",
    icon: Megaphone,
  },
  {
    href: "/admin/feedback",
    title: "Feedback",
    description: "View user feedback submissions",
    icon: MessageSquare,
  },
  {
    href: "/admin/applications",
    title: "Applications",
    description: "Review team ambassador applications",
    icon: UserPlus,
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

// ─── Email Test ──────────────────────────────────────────────

function EmailTestCard() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleTestEmail() {
    setStatus("sending");
    setMessage("");
    try {
      const result = await api.post<{ status: string; to: string; provider: string }>(
        "/api/v1/admin/test-email",
      );
      setStatus("success");
      setMessage(`Sent via ${result.provider} to ${result.to}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to send test email");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Email delivery</h3>
        </div>
        <button
          onClick={handleTestEmail}
          disabled={status === "sending"}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            status === "sending"
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {status === "sending" ? "Sending..." : "Send test email"}
        </button>
      </div>
      {message && (
        <p
          className={cn(
            "text-xs",
            status === "success" ? "text-green-600 dark:text-green-400" : "text-destructive",
          )}
        >
          {message}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Sends a test email to your account to verify notification delivery is working.
      </p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [error, setError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartRetry, setChartRetry] = useState(0);

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

  useEffect(() => {
    // Wait until stats have loaded (backend is warm) before fetching charts
    if (!stats) return;

    let cancelled = false;

    async function fetchCharts() {
      setChartError(null);
      try {
        const data = await api.get<ChartData>("/api/v1/admin/stats/charts", {
          period: chartPeriod,
        });
        if (!cancelled) setChartData(data);
      } catch (err) {
        if (!cancelled) {
          const detail =
            err instanceof Error ? err.message : "Unknown error";
          const status =
            err && typeof err === "object" && "status" in err
              ? ` (${(err as { status: number }).status})`
              : "";
          setChartError(`${detail}${status}`);
        }
      }
    }

    fetchCharts();
    return () => {
      cancelled = true;
    };
  }, [stats, chartPeriod, chartRetry]);

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

      {/* Trend Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Activity trends
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["7d", "30d", "90d"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setChartPeriod(period)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  chartPeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {chartError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-6 text-center">
            <p className="text-sm text-destructive">{chartError}</p>
            <button
              type="button"
              onClick={() => setChartRetry((n) => n + 1)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : chartData ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <MiniChart
                data={chartData.daily_users}
                color="hsl(262, 83%, 58%)"
                label="New users"
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <MiniChart
                data={chartData.daily_listings}
                color="hsl(152, 69%, 45%)"
                label="New listings"
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <MiniChart
                data={chartData.daily_messages}
                color="hsl(217, 91%, 60%)"
                label="Messages"
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <MiniChart
                data={chartData.daily_reports}
                color="hsl(0, 84%, 60%)"
                label="Reports"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 h-32 animate-pulse"
              >
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="mt-4 h-16 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Diagnostics */}
      <EmailTestCard />

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick access</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
